import fs from 'fs';
import path from 'path';
import { DB_FILE, SETTINGS_FILE } from '../config.js';
import { Project, AppSettings, Clip } from '../types/server.js';

interface DatabaseSchema {
  projects: Project[];
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  geminiApiKey: '',
  openaiApiKey: '',
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
        this.data = {
          projects: Array.isArray(parsed?.projects) ? parsed.projects : []
        };
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

  // Projects CRUD
  public getAllProjects(): Project[] {
    const list = Array.isArray(this.data.projects) ? this.data.projects : [];
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getProjectById(id: string): Project | undefined {
    if (!Array.isArray(this.data.projects)) return undefined;
    return this.data.projects.find((p) => p.id === id);
  }

  public saveProject(project: Project): Project {
    if (!Array.isArray(this.data.projects)) {
      this.data.projects = [];
    }
    const idx = this.data.projects.findIndex((p) => p.id === project.id);
    project.updatedAt = new Date().toISOString();

    if (idx >= 0) {
      this.data.projects[idx] = project;
    } else {
      this.data.projects.unshift(project);
    }
    this.save();
    return project;
  }

  public deleteProject(id: string): boolean {
    if (!Array.isArray(this.data.projects)) return false;
    const initialLen = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    if (this.data.projects.length !== initialLen) {
      this.save();
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
    this.save();
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
