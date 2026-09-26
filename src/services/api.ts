import { AppSettings, Clip, Project, VideoInfo } from '../types/index.js';

const API_BASE = '/api';

async function safeFetch<T>(url: string, options?: RequestInit, defaultErrorMessage: string = 'Error de conexión'): Promise<T> {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return (data || { success: false, message: `Error HTTP ${res.status}` }) as T;
    }
    return (data || { success: true }) as T;
  } catch (err: any) {
    console.warn(`[API] Error de red en ${url}:`, err);
    return { success: false, message: err?.message || defaultErrorMessage } as unknown as T;
  }
}

export const api = {
  // Video inspection
  async inspectVideo(url: string): Promise<{ success: boolean; videoInfo?: VideoInfo; error?: string; message?: string }> {
    return safeFetch<{ success: boolean; videoInfo?: VideoInfo; error?: string; message?: string }>(
      `${API_BASE}/videos/inspect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      },
      'No se pudo acceder al video de YouTube'
    );
  },

  async getSampleVideos(): Promise<{ success: boolean; samples: any[] }> {
    return safeFetch<{ success: boolean; samples: any[] }>(
      `${API_BASE}/videos/samples`,
      undefined,
      'No se pudieron cargar los videos de muestra'
    );
  },

  // Projects
  async createProject(params: { url?: string; videoInfo?: VideoInfo }): Promise<{ success: boolean; project?: Project; message?: string }> {
    return safeFetch<{ success: boolean; project?: Project; message?: string }>(
      `${API_BASE}/projects/create`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      'No se pudo crear el proyecto'
    );
  },

  async getProjects(): Promise<{ success: boolean; projects: Project[] }> {
    const res = await safeFetch<{ success: boolean; projects?: Project[] }>(
      `${API_BASE}/projects`,
      undefined,
      'No se pudieron cargar los proyectos'
    );
    return {
      success: res.success,
      projects: res.projects || []
    };
  },

  async getProject(id: string): Promise<{ success: boolean; project?: Project; message?: string }> {
    return safeFetch<{ success: boolean; project?: Project; message?: string }>(
      `${API_BASE}/projects/${id}`,
      undefined,
      'No se pudo obtener el proyecto'
    );
  },

  async deleteProject(id: string): Promise<{ success: boolean; message?: string }> {
    return safeFetch<{ success: boolean; message?: string }>(
      `${API_BASE}/projects/${id}`,
      { method: 'DELETE' },
      'No se pudo eliminar el proyecto'
    );
  },

  // Clips
  async updateClip(projectId: string, clipId: string, updates: Partial<Clip>): Promise<{ success: boolean; clip?: Clip; message?: string }> {
    return safeFetch<{ success: boolean; clip?: Clip; message?: string }>(
      `${API_BASE}/clips/${clipId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, updates }),
      },
      'No se pudo actualizar el clip'
    );
  },

  async exportClip(projectId: string, clipId: string): Promise<{ success: boolean; exportedUrl?: string; clip?: Clip; savedFolder?: string; message?: string }> {
    return safeFetch<{ success: boolean; exportedUrl?: string; clip?: Clip; savedFolder?: string; message?: string }>(
      `${API_BASE}/clips/${clipId}/export`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      },
      'Error durante la exportación del clip'
    );
  },

  getClipDownloadUrl(exportedUrl: string, title?: string): string {
    const filename = exportedUrl.split('/').pop() || 'clip.mp4';
    const query = title ? `?name=${encodeURIComponent(title)}` : '';
    return `${API_BASE}/clips/download/${filename}${query}`;
  },

  async openSavedFolder(): Promise<{ success: boolean; folder?: string }> {
    return safeFetch<{ success: boolean; folder?: string }>(
      `${API_BASE}/clips/open-folder`,
      { method: 'POST' },
      'No se pudo abrir la carpeta en Windows'
    );
  },

  // Settings
  async getSettings(): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await safeFetch<{ success: boolean; settings?: AppSettings }>(
      `${API_BASE}/settings`,
      undefined,
      'No se pudo cargar la configuración'
    );
    return {
      success: res.success,
      settings: res.settings || {
        theme: 'dark',
        defaultAspectRatio: '9:16',
        defaultSubtitleStyle: 'hormozi',
        exportQuality: '1080p',
        exportFps: 60,
        autoReframeEnabled: true,
      }
    };
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings?: AppSettings }> {
    return safeFetch<{ success: boolean; settings?: AppSettings }>(
      `${API_BASE}/settings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      },
      'No se pudo guardar la configuración'
    );
  },
};
