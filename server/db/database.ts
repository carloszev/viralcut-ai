import fs from 'fs';
import path from 'path';
import { DB_FILE, SETTINGS_FILE, UPLOADS_DIR } from '../config.js';
import { Project, AppSettings, Clip } from '../types/server.js';

interface DatabaseSchema {
  projects: Project[];
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  geminiApiKey: '',
  openaiApiKey: '',
  groqApiKey: '',
  defaultAspectRatio: '9:16',
  defaultSubtitleStyle: 'hormozi',
  exportQuality: '1080p',
  exportFps: 60,
  autoReframeEnabled: true,
};

class Database {
  private data: DatabaseSchema = { projects: [] };
  private settings: AppSettings = { ...defaultSettings };
  private saveTimeout: NodeJS.Timeout | null = null;
  private settingsTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
    // Flush to disk when node exits
    process.on('beforeExit', () => {
      this.flushSync();
    });
    process.on('SIGINT', () => {
      this.flushSync();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.flushSync();
      process.exit(0);
    });
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const rawProjects = Array.isArray(parsed?.projects) ? parsed.projects : [];
        this.data = {
          projects: rawProjects.map((p: any) => this.normalizeProject(p))
        };
        this.flushSync();
      } else {
        this.save(true);
      }

      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        this.settings = { ...defaultSettings, ...JSON.parse(raw) };
      } else {
        this.saveSettings();
      }
    } catch (error) {
      console.error('Error loading database:', error);
      this.data = { projects: [] };
      this.settings = { ...defaultSettings };
    }
  }

  /**
   * Escritura sincronizada inmediata a disco sin temporales para evitar EPERM en Windows
   */
  public flushSync() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database to disk:', error);
    }
  }

  /**
   * Guardado con debounce para evitar escribir al disco 30 veces por segundo en renderizados
   */
  public save(immediate: boolean = false) {
    if (immediate) {
      this.flushSync();
      return;
    }
    if (this.saveTimeout) {
      return;
    }
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (error) {
        console.error('Error saving database:', error);
      }
    }, 250);
  }

  private saveSettings() {
    if (this.settingsTimeout) {
      return;
    }
    this.settingsTimeout = setTimeout(() => {
      this.settingsTimeout = null;
      try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8');
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }, 250);
  }

  public normalizeProject(project: Project): Project {
    if (!project) return project;
    if (project.videoInfo) {
      const rawId = project.videoInfo.videoId || '';
      const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (cleanId) {
        const candidateFile = path.join(UPLOADS_DIR, `${cleanId}.mp4`);
        if (fs.existsSync(candidateFile)) {
          project.videoInfo.localVideoPath = candidateFile;
          project.videoInfo.videoSourceUrl = `/uploads/${cleanId}.mp4`;
        }
      }
    }
    if (Array.isArray(project.clips)) {
      for (const clip of project.clips) {
        if (!clip.subtitleConfig) {
          clip.subtitleConfig = {
            enabled: true,
            style: 'hormozi',
            fontSize: 28,
            textColor: '#FFFFFF',
            highlightColor: '#00F0FF',
            backgroundColor: 'rgba(0,0,0,0.75)',
            position: 'bottom',
            yOffsetPercent: 78,
            uppercase: true,
            maxWordsPerLine: 4,
            animation: 'pop',
          };
        } else {
          clip.subtitleConfig.enabled = true;
        }
      }
    }
    return project;
  }

  // Projects CRUD
  public getAllProjects(): Project[] {
    const list = Array.isArray(this.data.projects) ? this.data.projects : [];
    return list
      .map((p) => this.normalizeProject(p))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getProjectById(id: string): Project | undefined {
    if (!Array.isArray(this.data.projects)) return undefined;
    const found = this.data.projects.find((p) => p.id === id);
    return found ? this.normalizeProject(found) : undefined;
  }

  public saveProject(project: Project): Project {
    if (!Array.isArray(this.data.projects)) {
      this.data.projects = [];
    }
    const normalized = this.normalizeProject(project);
    const idx = this.data.projects.findIndex((p) => p.id === normalized.id);
    normalized.updatedAt = new Date().toISOString();

    if (idx >= 0) {
      this.data.projects[idx] = normalized;
    } else {
      this.data.projects.unshift(normalized);
    }
    this.save(true);
    return normalized;
  }

  public deleteProject(id: string): boolean {
    if (!Array.isArray(this.data.projects)) return false;
    const initialLen = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    if (this.data.projects.length !== initialLen) {
      this.save(true);
      return true;
    }
    return false;
  }

  // Clips Management
  public updateClip(projectId: string, clipId: string, updates: Partial<Clip>): Clip | null {
    const project = this.getProjectById(projectId);
    if (!project || !Array.isArray(project.clips)) return null;

    const clipIndex = project.clips.findIndex((c) => c.id === clipId);
    if (clipIndex < 0) return null;

    project.clips[clipIndex] = {
      ...project.clips[clipIndex],
      ...updates,
    };
    project.updatedAt = new Date().toISOString();
    this.save(true);
    return project.clips[clipIndex];
  }

  // Settings
  public getSettings(): AppSettings {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.settings;
  }
}

export const db = new Database();
