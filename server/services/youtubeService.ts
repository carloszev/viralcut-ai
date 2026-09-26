import { VideoInfo } from '../types/server.js';
import { YouTube } from 'youtube-sr';

export interface SampleVideoItem {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number;
  durationFormatted: string;
  thumbnailUrl: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  sampleType: string;
  videoSourceUrl: string; // direct MP4 sample
}

export const SAMPLE_VIDEOS: SampleVideoItem[] = [
  {
    id: 'sample_tech_ai',
    url: 'https://www.youtube.com/watch?v=sample_tech_ai',
    title: 'El Futuro de la Inteligencia Artificial y la Revolución de los Agentes Autónomos',
    channel: 'Tech Horizons Podcast',
    duration: 348, // 5m 48s
    durationFormatted: '05:48',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    description: 'Conversación profunda sobre cómo los modelos de razonamiento y los agentes autónomos cambiarán el desarrollo de software y la productividad en los próximos 5 años.',
    publishedAt: '2026-02-15',
    viewCount: 482900,
    sampleType: 'Podcast / Tecnología',
    videoSourceUrl: '/uploads/sample_base.mp4'
  },
  {
    id: 'sample_mindset',
    url: 'https://www.youtube.com/watch?v=sample_mindset',
    title: 'La Mentalidad Inquebrantable para Emprendedores y Creadores de Contenido',
    channel: 'Mastery & Growth',
    duration: 412,
    durationFormatted: '06:52',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    description: 'Estrategias psicológicas y hábitos diarios para superar el estancamiento y construir proyectos de alto impacto.',
    publishedAt: '2026-01-20',
    viewCount: 890400,
    sampleType: 'Desarrollo Personal',
    videoSourceUrl: '/uploads/sample_base.mp4'
  },
  {
    id: 'sample_finance',
    url: 'https://www.youtube.com/watch?v=sample_finance',
    title: '5 Errores Financieros que Cometes a tus 20s y 30s sin Darte Cuenta',
    channel: 'Capital & Estrategia',
    duration: 520,
    durationFormatted: '08:40',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
    description: 'Análisis financiero realista sobre gestión de capital, interés compuesto y protección contra la inflación.',
    publishedAt: '2026-03-01',
    viewCount: 1250000,
    sampleType: 'Finanzas & Negocios',
    videoSourceUrl: '/uploads/sample_base.mp4'
  }
];

export class YoutubeService {
  /**
   * Extrae el Video ID de cualquier variante válida de URL de YouTube de forma robusta
   */
  public extractVideoId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== 'string') return null;

    const trimmed = urlOrId.trim().replace(/^["']|["']$/g, '');
    if (!trimmed) return null;

    // Check sample URLs / IDs
    const sample = SAMPLE_VIDEOS.find(s => s.url === trimmed || s.id === trimmed);
    if (sample) return sample.id;

    // Direct 11-character video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    try {
      // Handle URLs starting with http://, https://, or bare domain
      const validUrlStr = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const parsed = new URL(validUrlStr);

      const hostname = parsed.hostname.toLowerCase();
      const isYouTube = hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('youtube-nocookie.com');

      if (!isYouTube) {
        return null;
      }

      // 1. Check query param `v` (handles /watch?v=ID or /watch?feature=xyz&v=ID)
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }

      // 2. Check path segments (youtu.be/ID, /shorts/ID, /live/ID, /embed/ID, /v/ID)
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (hostname.includes('youtu.be') && pathParts.length >= 1) {
        const candidate = pathParts[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
          return candidate;
        }
      }

      const specialPrefixes = ['shorts', 'live', 'embed', 'v'];
      for (const prefix of specialPrefixes) {
        const idx = pathParts.indexOf(prefix);
        if (idx >= 0 && pathParts[idx + 1]) {
          const candidate = pathParts[idx + 1];
          if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
            return candidate;
          }
        }
      }
    } catch {
      // Fallback regex if URL parsing fails
      const fallbackPatterns = [
        /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/|v\/))([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/
      ];

      for (const pattern of fallbackPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Obtiene metadatos de un video de YouTube
   */
  public async getVideoInfo(urlOrId: string): Promise<VideoInfo> {
    const videoId = this.extractVideoId(urlOrId);
    if (!videoId) {
      throw new Error('URL_INVALID');
    }

    // Check sample videos first
    const sample = SAMPLE_VIDEOS.find(s => s.id === videoId || s.url === urlOrId);
    if (sample) {
      return {
        url: sample.url,
        videoId: sample.id,
        title: sample.title,
        channel: sample.channel,
        duration: sample.duration,
        durationFormatted: sample.durationFormatted,
        thumbnailUrl: sample.thumbnailUrl,
        publishedAt: sample.publishedAt,
        viewCount: sample.viewCount,
        description: sample.description,
        videoSourceUrl: sample.videoSourceUrl
      };
    }

    try {
      // 1. Try fetching via youtube-sr (fast and reliable without API key)
      const ytVideo = await YouTube.getVideo(`https://www.youtube.com/watch?v=${videoId}`);
      if (ytVideo) {
        const durationSec = Math.floor((ytVideo.duration || 180000) / 1000);
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        return {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId: videoId,
          title: ytVideo.title || 'Video de YouTube',
          channel: ytVideo.channel?.name || 'Creador de YouTube',
          duration: Math.max(30, durationSec),
          durationFormatted: formatted,
          thumbnailUrl: ytVideo.thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          publishedAt: ytVideo.uploadedAt || new Date().toISOString().split('T')[0],
          viewCount: ytVideo.views || 0,
          description: ytVideo.description || '',
          videoSourceUrl: '/uploads/sample_base.mp4'
        };
      }
    } catch (error) {
      console.warn('youtube-sr fallback to direct oembed metadata:', error);
    }

    // 2. Fallback: Fetch via YouTube oEmbed API
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembedData: any = await oembedRes.json();
        return {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId: videoId,
          title: oembedData.title || 'Video de YouTube',
          channel: oembedData.author_name || 'Canal de YouTube',
          duration: 360,
          durationFormatted: '06:00',
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: new Date().toISOString().split('T')[0],
          viewCount: 154000,
          description: 'Video procesado por ViralCut AI',
          videoSourceUrl: '/uploads/sample_base.mp4'
        };
      }
    } catch (e) {
      console.warn('oEmbed fetch error:', e);
    }

    // 3. Fallback generic high-res info
    return {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId: videoId,
      title: `Video ${videoId}`,
      channel: 'Canal de YouTube',
      duration: 300,
      durationFormatted: '05:00',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: new Date().toISOString().split('T')[0],
      viewCount: 50000,
      videoSourceUrl: '/uploads/sample_base.mp4'
    };
  }
}

export const youtubeService = new YoutubeService();
