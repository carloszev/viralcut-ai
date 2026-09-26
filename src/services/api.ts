import { AppSettings, Clip, Project, VideoInfo } from '../types/index.js';

const API_BASE = '/api';

export const api = {
  // Video inspection
  async inspectVideo(url: string): Promise<{ success: boolean; videoInfo: VideoInfo; error?: string; message?: string }> {
    const res = await fetch(`${API_BASE}/videos/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  async getSampleVideos(): Promise<{ success: boolean; samples: any[] }> {
    const res = await fetch(`${API_BASE}/videos/samples`);
    return res.json();
  },

  // Projects
  async createProject(params: { url?: string; videoInfo?: VideoInfo }): Promise<{ success: boolean; project: Project; message?: string }> {
    const res = await fetch(`${API_BASE}/projects/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async getProjects(): Promise<{ success: boolean; projects: Project[] }> {
    const res = await fetch(`${API_BASE}/projects`);
    return res.json();
  },

  async getProject(id: string): Promise<{ success: boolean; project: Project; message?: string }> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    return res.json();
  },

  async deleteProject(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Clips
  async updateClip(projectId: string, clipId: string, updates: Partial<Clip>): Promise<{ success: boolean; clip: Clip; message?: string }> {
    const res = await fetch(`${API_BASE}/clips/${clipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, updates }),
    });
    return res.json();
  },

  async exportClip(projectId: string, clipId: string): Promise<{ success: boolean; exportedUrl?: string; clip?: Clip; savedFolder?: string; message?: string }> {
    const res = await fetch(`${API_BASE}/clips/${clipId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    return res.json();
  },

  getClipDownloadUrl(exportedUrl: string, title?: string): string {
    const filename = exportedUrl.split('/').pop() || 'clip.mp4';
    const query = title ? `?name=${encodeURIComponent(title)}` : '';
    return `${API_BASE}/clips/download/${filename}${query}`;
  },

  async openSavedFolder(): Promise<{ success: boolean; folder?: string }> {
    const res = await fetch(`${API_BASE}/clips/open-folder`, {
      method: 'POST',
    });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
