import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { youtubeService, SAMPLE_VIDEOS } from '../services/youtubeService.js';
import { UPLOADS_DIR, THUMBNAILS_DIR } from '../config.js';
import { VideoInfo } from '../types/server.js';

const router = Router();

// Configure Multer for video file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    cb(null, `local_${Date.now()}_${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 800 // 800MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato de video no compatible. Sube archivos MP4, MOV, MKV o WEBM.'));
    }
  }
});

function probeVideo(filePath: string): Promise<{ duration: number; width?: number; height?: number; codec?: string }> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.warn('ffprobe warning:', err);
        return resolve({ duration: 60 });
      }
      const duration = metadata?.format?.duration || 60;
      const videoStream = metadata?.streams?.find((s) => s.codec_type === 'video');
      resolve({
        duration: Math.max(1, duration),
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name
      });
    });
  });
}

async function ensureWebCompatibleMp4(inputPath: string, meta: { codec?: string }): Promise<string> {
  const ext = path.extname(inputPath).toLowerCase();
  // If already MP4 with h264, it's directly streamable in all modern browsers
  if (ext === '.mp4' && (meta.codec === 'h264' || meta.codec === 'avc1')) {
    return inputPath;
  }
  
  const targetFilename = `${path.basename(inputPath, ext)}_web.mp4`;
  const targetMp4 = path.join(UPLOADS_DIR, targetFilename);
  if (fs.existsSync(targetMp4) && fs.statSync(targetMp4).size > 1000) {
    return targetMp4;
  }

  console.log(`[VideoUpload] Remuxeando a MP4 web compatible (H.264/AAC faststart): ${path.basename(inputPath)} -> ${targetFilename}`);
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .output(targetMp4)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset ultrafast',
        '-crf 23',
        '-movflags +faststart',
        '-pix_fmt yuv420p'
      ])
      .on('end', () => {
        console.log(`[VideoUpload] Conversión a MP4 web exitosa: ${targetFilename}`);
        resolve(targetMp4);
      })
      .on('error', (err) => {
        console.warn(`[VideoUpload] Advertencia convirtiendo a MP4 web (usando original):`, err?.message || err);
        resolve(inputPath);
      })
      .run();
  });
}

function generateThumbnail(videoPath: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['0.5'],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x360'
      })
      .on('end', () => resolve(true))
      .on('error', (e) => {
        console.warn('Thumbnail generation fallback:', e.message);
        resolve(false);
      });
  });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// POST /api/videos/upload (Direct MP4/video file upload)
router.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo de video.'
      });
    }

    const localFilePath = req.file.path;
    const filename = req.file.filename;
    const originalName = req.file.originalname;

    console.log(`[VideoUpload] Video subido exitosamente: ${filename} (${(req.file.size / (1024 * 1024)).toFixed(1)} MB)`);

    // Extract video duration and dimensions
    const meta = await probeVideo(localFilePath);
    const duration = parseFloat(meta.duration.toFixed(2));
    const durationFormatted = formatDuration(duration);

    // Ensure the video file is web-compatible (MP4 with H.264 & AAC +faststart) so HTML5 video tag never fails
    const finalFilePath = await ensureWebCompatibleMp4(localFilePath, meta);
    const finalFilename = path.basename(finalFilePath);

    // Generate thumbnail
    const thumbFilename = `thumb_${path.basename(finalFilename, path.extname(finalFilename))}.jpg`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
    const thumbGenerated = await generateThumbnail(finalFilePath, thumbPath);

    const relativeThumbUrl = thumbGenerated
      ? `/uploads/thumbnails/${thumbFilename}`
      : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=640&q=80';

    const cleanTitle = path.basename(originalName, path.extname(originalName))
      .replace(/[_]/g, ' ')
      .trim();

    const videoInfo: VideoInfo = {
      url: `/uploads/${finalFilename}`,
      videoId: `local_${uuidv4().slice(0, 8)}`,
      title: cleanTitle || 'Video Local',
      channel: 'Archivo Local',
      duration,
      durationFormatted,
      thumbnailUrl: relativeThumbUrl,
      localVideoPath: finalFilePath,
      videoSourceUrl: `/uploads/${finalFilename}`,
      isLocalFile: true
    };

    return res.json({
      success: true,
      videoInfo
    });
  } catch (error: any) {
    console.error('Error in /api/videos/upload:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar el archivo de video subido.'
    });
  }
});

// GET /api/videos/samples
router.get('/samples', (_req: Request, res: Response) => {
  res.json({
    success: true,
    samples: SAMPLE_VIDEOS
  });
});

// POST /api/videos/inspect
router.post('/inspect', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL_INVALID',
        message: 'Introducí una URL de YouTube válida.'
      });
    }

    const videoInfo = await youtubeService.getVideoInfo(url.trim());
    return res.json({
      success: true,
      videoInfo
    });
  } catch (error: any) {
    console.error('Error in /api/videos/inspect:', error);
    if (error.message === 'URL_INVALID') {
      return res.status(400).json({
        success: false,
        error: 'URL_INVALID',
        message: 'Introducí una URL de YouTube válida.'
      });
    }

    return res.status(422).json({
      success: false,
      error: 'VIDEO_UNAVAILABLE',
      message: 'No pudimos acceder a este video.'
    });
  }
});

export default router;
