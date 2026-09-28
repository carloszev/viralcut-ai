import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { EXPORTS_DIR, UPLOADS_DIR, USER_DOCUMENTS_VIDEOS_DIR, USER_VIDEOS_DIR } from '../config.js';
import { Clip, VideoInfo } from '../types/server.js';
import { smartReframeService } from './smartReframeService.js';
import { silenceRemovalService } from './silenceRemovalService.js';
import { videoDownloader } from './videoDownloader.js';
import { youtubeService } from './youtubeService.js';
import { db } from '../db/database.js';
import { HardwareAccelerator } from './hardwareAccelerator.js';

try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpeg.setFfmpegPath('ffmpeg');
  ffmpeg.setFfprobePath('ffprobe');
  console.log('⚡ [RenderEngine] Usando FFmpeg del sistema (alta velocidad multihilo)');
} catch {
  if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
  if (ffprobeInstaller && ffprobeInstaller.path) {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }
}

export interface ExportProgressCallback {
  (progressPercent: number, status: string): void;
}

export class RenderEngine {
  /**
   * Limpia archivos exportados antiguos si superan el límite
   */
  private cleanupOldExports(maxFiles: number = 30) {
    try {
      const files = fs.readdirSync(EXPORTS_DIR)
        .filter(f => f.endsWith('.mp4'))
        .map(f => ({
          name: f,
          path: path.join(EXPORTS_DIR, f),
          time: fs.statSync(path.join(EXPORTS_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxFiles) {
        const toDelete = files.slice(maxFiles);
        for (const file of toDelete) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.warn(`Could not delete old export ${file.name}:`, e);
          }
        }
      }
    } catch (e) {
      console.warn('Export cleanup error:', e);
    }
  }

  /**
   * Renderiza y exporta un clip a MP4 vertical 1080x1920 con Smart Reframe y Smart Jump-Cut
   */
  public async exportClip(
    clip: Clip,
    videoInfo: VideoInfo,
    onProgress: ExportProgressCallback
  ): Promise<string> {
    this.cleanupOldExports(30);

    const filename = `viralcut_${clip.id}_${Date.now()}.mp4`;
    const outputPath = path.join(EXPORTS_DIR, filename);

    // Determine input source (must be a valid local file on disk)
    const localBaseFallback = path.join(UPLOADS_DIR, 'sample_base.mp4');
    let inputSource = videoInfo.localVideoPath;
    if (inputSource && !fs.existsSync(inputSource)) {
      inputSource = undefined;
    }

    if (!inputSource && videoInfo.videoSourceUrl) {
      if (videoInfo.videoSourceUrl.startsWith('/uploads/')) {
        const localFromUploads = path.join(UPLOADS_DIR, path.basename(videoInfo.videoSourceUrl));
        if (fs.existsSync(localFromUploads)) {
          inputSource = localFromUploads;
        }
      }
    }

    const isSample = !videoInfo.videoId || videoInfo.videoId.startsWith('sample_');

    // If local file is missing and this is a YouTube video, download it on demand now
    if ((!inputSource || !fs.existsSync(inputSource)) && !isSample) {
      const vid = videoInfo.videoId || (videoInfo.url ? youtubeService.extractVideoId(videoInfo.url) : null);
      const targetUrl = videoInfo.url || (vid ? `https://www.youtube.com/watch?v=${vid}` : null);
      if (vid && targetUrl) {
        onProgress(8, 'Descargando video fuente de YouTube para renderizar el clip en alta calidad...');
        console.log(`[RenderEngine] Descargando video fuente para clip ${clip.id} (VideoId: ${vid})...`);
        const downloadedUrl = await videoDownloader.downloadVideo(vid, targetUrl);
        if (downloadedUrl) {
          const downloadedPath = path.join(UPLOADS_DIR, path.basename(downloadedUrl));
          if (fs.existsSync(downloadedPath)) {
            inputSource = downloadedPath;
            videoInfo.localVideoPath = downloadedPath;
            videoInfo.videoSourceUrl = downloadedUrl;
          }
        }
      }
    }

    if (!inputSource || !fs.existsSync(inputSource)) {
      if (isSample && fs.existsSync(localBaseFallback)) {
        inputSource = localBaseFallback;
      } else {
        throw new Error('No se encontró el archivo de video fuente local para renderizar el clip.');
      }
    }

    const startSec = Math.max(0, clip.startTime);
    const durationSec = Math.max(1, clip.duration || (clip.endTime - clip.startTime));

    // Calculate face tracking dynamic offset if available
    let faceOffsetPercent = 0;
    if (clip.reframeConfig?.faceTrackingData && clip.reframeConfig.faceTrackingData.length > 0) {
      const avgFaceX = clip.reframeConfig.faceTrackingData.reduce((acc, p) => acc + p.xPercent, 0) / clip.reframeConfig.faceTrackingData.length;
      faceOffsetPercent = parseFloat((avgFaceX - 50).toFixed(2));
    }

    const totalHorizontalOffset = (clip.reframeConfig?.horizontalOffsetPercent || 0) + faceOffsetPercent;

    return new Promise(async (resolve, reject) => {
      onProgress(5, 'Iniciando pipeline de transcodificación FFmpeg ultra-rápida...');

      // 1. Detect optimal hardware encoder (GPU NVENC/QSV/AMF or CPU UltraFast)
      const accel = await HardwareAccelerator.getOptimalEncoder();

      // Target resolution mapping:
      // Default to 1080x1920 (Pro Full HD 9:16) for blistering speed and native TikTok/Reels compatibility.
      const resMode = clip.resolution || (clip as any).exportQuality || '1080p';
      let targetW = 1080;
      let targetH = 1920;
      let scaleFlags = 'flags=fast_bilinear';

      if (resMode === '4k') {
        targetW = 2160;
        targetH = 3840;
        scaleFlags = 'flags=fast_bilinear';
      } else if (resMode === '720p') {
        targetW = 720;
        targetH = 1280;
        scaleFlags = 'flags=fast_bilinear';
      } else {
        targetW = 1080;
        targetH = 1920;
        scaleFlags = 'flags=fast_bilinear';
      }

      const targetFps = db.getSettings()?.exportFps || 60;

      // IA Pixel Restoration & Anti-Blur Sharpness:
      // High-speed unsharp filter for zero lag and maximum clarity
      const pixelEnhanceFilter = clip.pixelEnhance !== false
        ? ',unsharp=3:3:0.8:3:3:0.0,eq=contrast=1.03:saturation=1.04'
        : '';

      let filterString = '';
      if (clip.reframeConfig?.mode === 'split_screen' && clip.aspectRatio === '9:16') {
        // Podcast 2-Speaker Split Screen (Enfoque en ambos oradores)
        const spk1X = `max(0, min(iw - (ih*9/16), (iw * 0.28) - ((ih*9/16)/2)))`;
        filterString = `fps=${targetFps},crop=w='min(iw, ih*9/16)':h='ih':x='${spk1X}':y=0${pixelEnhanceFilter},scale=${targetW}:${targetH}:${scaleFlags}`;
      } else if (clip.aspectRatio === '9:16') {
        // Precise float-safe 9:16 crop expression: ih*9/16 with face tracking centering
        const xOffsetExpr = `(iw - (ih*9/16))/2 + (${totalHorizontalOffset} * iw / 100)`;
        
        // Dynamic Zoom Expression: Hook Booster (0-2.5s initial snap) and/or Smart Punch-In
        let zoomExpr = '1.0';
        if (clip.hookBooster && clip.punchInZoom) {
          zoomExpr = `if(lt(t, 2.5), (1.25 - 0.10*t), if(between(mod(t, 12), 4, 8), 1.18, 1.0))`;
        } else if (clip.hookBooster) {
          zoomExpr = `if(lt(t, 2.5), (1.25 - 0.10*t), 1.0)`;
        } else if (clip.punchInZoom) {
          zoomExpr = `if(between(mod(t, 12), 4, 8), 1.18, 1.0)`;
        }

        if (zoomExpr !== '1.0') {
          filterString = `fps=${targetFps},crop=w='min(iw, ih*9/16)/${zoomExpr}':h='ih/${zoomExpr}':x='max(0, min(iw - ow, ${xOffsetExpr}))':y='(ih - oh)/2'${pixelEnhanceFilter},scale=${targetW}:${targetH}:${scaleFlags}`;
        } else {
          filterString = `fps=${targetFps},crop=w='min(iw, ih*9/16)':h='ih':x='max(0, min(iw - ow, ${xOffsetExpr}))':y=0${pixelEnhanceFilter},scale=${targetW}:${targetH}:${scaleFlags}`;
        }
      } else if (clip.aspectRatio === '1:1') {
        const sqSize = resMode === '4k' ? 2160 : (resMode === '720p' ? 720 : 1080);
        filterString = `fps=${targetFps},crop=w='min(iw, ih)':h='min(iw, ih)':x='(iw-ow)/2':y='(ih-oh)/2'${pixelEnhanceFilter},scale=${sqSize}:${sqSize}:${scaleFlags}`;
      } else {
        const horizW = resMode === '4k' ? 3840 : (resMode === '720p' ? 1280 : 1920);
        const horizH = resMode === '4k' ? 2160 : (resMode === '720p' ? 720 : 1080);
        filterString = `fps=${targetFps}${pixelEnhanceFilter},scale=${horizW}:${horizH}:force_original_aspect_ratio=decrease,pad=${horizW}:${horizH}:(ow-iw)/2:(oh-ih)/2`;
      }

      // Feature 5: Vocal Presence Audio Filter (Sub-second processing, removes hum/hiss and punches voice)
      let audioFilterString = 'volume=1.2';
      if (clip.audioEnhance !== false) {
        audioFilterString = 'highpass=f=80,lowpass=f=12000,acompressor=threshold=-18dB:ratio=3:attack=5:release=50:makeup=2.5dB,volume=1.2';
      }

      if (clip.smartJumpCut && fs.existsSync(inputSource)) {
        try {
          onProgress(10, 'Analizando y recortando pausas muertas (Smart Jump-Cut)...');
          const silenceResult = await silenceRemovalService.detectSilences(inputSource, startSec, durationSec);
          const jumpCut = silenceRemovalService.buildJumpCutFilter(silenceResult);
          if (jumpCut) {
            filterString = `${jumpCut.videoFilter},${filterString}`;
            audioFilterString = `${jumpCut.audioFilter},${audioFilterString}`;
            clip.silenceDurationRemoved = silenceResult.totalSilenceDuration;
            console.log(`[RenderEngine] Smart Jump-Cut aplicado: ${silenceResult.totalSilenceDuration}s de silencio eliminados.`);
          }
        } catch (jumpCutErr) {
          console.warn('[RenderEngine] Jump-cut warning:', jumpCutErr);
        }
      }

      const command = ffmpeg(inputSource);

      const inputOpts: string[] = [
        '-ss', startSec.toString(),
        '-threads', '0'
      ];
      if (inputSource.startsWith('http://') || inputSource.startsWith('https://')) {
        inputOpts.push(
          '-user_agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
      }
      command.inputOptions(inputOpts);

      command
        .setDuration(durationSec)
        .videoFilters(filterString)
        .videoCodec(accel.encoder)
        .audioCodec('aac')
        .audioBitrate('192k')
        .audioFilters(audioFilterString)
        .outputOptions([
          ...accel.outputOptions,
          '-r', `${targetFps}`,
          '-g', `${targetFps}`,
          '-keyint_min', `${Math.round(targetFps / 2)}`,
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('start', (cmdLine) => {
          console.log(`FFmpeg iniciado para clip ${clip.id} [${accel.name}]:`, cmdLine);
          onProgress(15, `Procesando con ${accel.name}...`);
        })
        .on('progress', (prog) => {
          let percent = 50;
          if (prog.timemark) {
            const parts = prog.timemark.split(':');
            if (parts.length === 3) {
              const sec = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
              if (durationSec > 0) {
                percent = Math.min(98, Math.max(15, Math.round((sec / durationSec) * 83 + 15)));
              }
            }
          } else if (prog.percent) {
            percent = Math.min(98, Math.max(15, Math.round(prog.percent)));
          }
          onProgress(percent, `Renderizando video: ${percent}% completado`);
        })
        .on('end', () => {
          onProgress(100, 'Clip listo para descargar');
          console.log(`Exportación completada: ${outputPath}`);
          this.copyToUserVideos(outputPath, clip);
          resolve(`/exports/${filename}`);
        })
        .on('error', (err) => {
          console.error('Error durante el renderizado FFmpeg:', err);
          reject(new Error(`Error en motor FFmpeg al exportar clip: ${err.message}`));
        });

      command.run();
    });
  }

  /**
   * Guarda automáticamente una copia directa en Documentos/Videos y Videos del usuario
   */
  public copyToUserVideos(sourcePath: string, clip: Clip): string[] {
    const savedLocations: string[] = [];
    try {
      const cleanTitle = (clip.metadata?.title || `clip_${clip.clipNumber}`)
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_')
        .slice(0, 40);
      const targetFilename = `ViralCut_Clip_${clip.clipNumber}_${cleanTitle}.mp4`;

      const targetDirs = [USER_DOCUMENTS_VIDEOS_DIR, USER_VIDEOS_DIR];
      for (const dir of targetDirs) {
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          const destination = path.join(dir, targetFilename);
          fs.copyFileSync(sourcePath, destination);
          savedLocations.push(destination);
          console.log(`[Auto-Save] Guardado en: ${destination}`);
        } catch (e) {
          console.warn(`[Auto-Save] Error copiando a ${dir}:`, e);
        }
      }
    } catch (err) {
      console.warn('Error en copyToUserVideos:', err);
    }
    return savedLocations;
  }
}

export const renderEngine = new RenderEngine();
