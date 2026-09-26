import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { UPLOADS_DIR } from '../config.js';

if (ffprobeInstaller && ffprobeInstaller.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

export class VideoDownloader {
  /**
   * Verifica que el archivo de video tenga una estructura MP4 válida y duración legible con ffprobe
   */
  public async isVideoValid(filePath: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) return false;
    try {
      if (fs.statSync(filePath).size < 10000) return false;
      return new Promise<boolean>((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err || !metadata || !metadata.format || !(Number(metadata.format.duration) > 0)) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Descarga el video de YouTube en resolución optimizada (hasta 720p) de forma no bloqueante o síncrona
   */
  public async downloadVideo(videoId: string, youtubeUrl: string): Promise<string | null> {
    if (videoId.startsWith('sample_')) {
      return '/uploads/sample_base.mp4';
    }

    const cleanVideoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetFilename = `${cleanVideoId}.mp4`;
    const targetPath = path.join(UPLOADS_DIR, targetFilename);

    // Si ya existe el video descargado localmente, verificar integridad real antes de retornarlo
    if (fs.existsSync(targetPath)) {
      const valid = await this.isVideoValid(targetPath);
      if (valid) {
        return `/uploads/${targetFilename}`;
      } else {
        console.warn(`[VideoDownloader] Video en caché ${targetFilename} inválido o sin moov atom. Eliminando...`);
        try { fs.unlinkSync(targetPath); } catch {}
      }
    }

    console.log(`[VideoDownloader] Iniciando descarga para ${videoId}...`);

    return new Promise((resolve) => {
      const url = youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`;
      const args = [
        '-m', 'yt_dlp',
        '-f', 'best[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best[height<=720]/best',
        '--recode-video', 'mp4',
        '--max-filesize', '350M',
        '--no-playlist',
        '--socket-timeout', '20',
        '-o', targetPath,
        url
      ];

      const proc = spawn('python', args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let timeoutHandle = setTimeout(() => {
        try {
          proc.kill('SIGTERM');
        } catch {}
        console.warn(`[VideoDownloader] Timeout descargando ${videoId}, usando fallback local.`);
        resolve(null);
      }, 45000);

      proc.on('close', async (code) => {
        clearTimeout(timeoutHandle);
        if (code === 0 && fs.existsSync(targetPath)) {
          const isValid = await this.isVideoValid(targetPath);
          if (isValid) {
            console.log(`[VideoDownloader] Video descargado y verificado con éxito: ${targetFilename} (${(fs.statSync(targetPath).size / 1024 / 1024).toFixed(1)} MB)`);
            resolve(`/uploads/${targetFilename}`);
            return;
          } else {
            console.warn(`[VideoDownloader] El video descargado falló verificación de integridad (moov atom corrupto).`);
            try { fs.unlinkSync(targetPath); } catch {}
          }
        }

        console.warn(`[VideoDownloader] yt-dlp finalizó con código ${code}, usando fallback local.`);
        // Clean up incomplete or partial artifacts
        try {
          const files = fs.readdirSync(UPLOADS_DIR);
          for (const f of files) {
            if (f.startsWith(cleanVideoId) && (f.endsWith('.part') || f.endsWith('.m4a') || f.endsWith('.ytdl'))) {
              fs.unlinkSync(path.join(UPLOADS_DIR, f));
            }
          }
        } catch {}
        resolve(null);
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        console.warn(`[VideoDownloader] Error ejecutando yt-dlp:`, err.message);
        resolve(null);
      });
    });
  }
}

export const videoDownloader = new VideoDownloader();
