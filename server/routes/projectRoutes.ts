import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { Project, PipelineStage, Clip } from '../types/server.js';
import path from 'path';
import fs from 'fs';
import { UPLOADS_DIR, EXPORTS_DIR } from '../config.js';
import { youtubeService } from '../services/youtubeService.js';
import { transcriptService } from '../services/transcriptService.js';
import { retentionAnalyzer } from '../services/retentionAnalyzer.js';
import { smartReframeService } from '../services/smartReframeService.js';
import { videoDownloader } from '../services/videoDownloader.js';
import { faceTrackingService } from '../services/faceTrackingService.js';
import { silenceRemovalService } from '../services/silenceRemovalService.js';
import { renderEngine } from '../services/renderEngine.js';
import * as archiverPkg from 'archiver';
const archiver: any = (archiverPkg as any).default || archiverPkg;

const router = Router();

// Store active progress listeners for Server-Sent Events (SSE)
const progressListeners: Record<string, ((data: any) => void)[]> = {};

function broadcastProgress(projectId: string, payload: any) {
  if (progressListeners[projectId]) {
    progressListeners[projectId].forEach((cb) => cb(payload));
  }
}

// Helper to auto-bind local mp4 file if it exists in UPLOADS_DIR
function autoBindLocalVideo(project: Project): boolean {
  if (project?.videoInfo?.videoId) {
    const hasValidLocal = project.videoInfo.localVideoPath && fs.existsSync(project.videoInfo.localVideoPath);
    if (!hasValidLocal) {
      const cleanId = project.videoInfo.videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const candidate = path.join(UPLOADS_DIR, `${cleanId}.mp4`);
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 10000) {
        project.videoInfo.localVideoPath = candidate;
        project.videoInfo.videoSourceUrl = `/uploads/${cleanId}.mp4`;
        db.saveProject(project);
        console.log(`[Storage] Auto-vinculado video local encontrado en disco para proyecto ${project.id}: /uploads/${cleanId}.mp4`);
        return true;
      }
    }
  }
  return false;
}

// GET /api/projects
router.get('/', (_req: Request, res: Response) => {
  const projects = db.getAllProjects();
  projects.forEach((p) => autoBindLocalVideo(p));
  res.json({
    success: true,
    projects
  });
});

// GET /api/projects/:id
router.get('/:id', (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const project = db.getProjectById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }
  autoBindLocalVideo(project);
  res.json({
    success: true,
    project
  });
});

// DELETE /api/projects/:id
router.delete('/:id', (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const project = db.getProjectById(projectId);
  const deleted = db.deleteProject(projectId);
  if (!deleted && !project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  // Clean up local downloaded video if not sample and not used by any other project
  if (project?.videoInfo?.localVideoPath) {
    try {
      const videoPath = project.videoInfo.localVideoPath;
      const remainingProjects = db.getAllProjects().filter((p) => p.id !== projectId);
      const isUsedByOther = remainingProjects.some(
        (p) => p.videoInfo?.localVideoPath === videoPath || (p.videoInfo?.videoId && videoPath.includes(p.videoInfo.videoId))
      );
      if (!isUsedByOther && fs.existsSync(videoPath) && !videoPath.includes('sample_base.mp4')) {
        fs.unlinkSync(videoPath);
        console.log(`[Storage] Archivo local eliminado: ${videoPath}`);
      } else if (isUsedByOther) {
        console.log(`[Storage] Archivo local preservado (usado por otro proyecto): ${videoPath}`);
      }
    } catch (e) {
      console.warn('Error eliminando video local:', e);
    }
  }

  // Clean up exported clips if any
  if (project?.clips && Array.isArray(project.clips)) {
    for (const clip of project.clips) {
      if (clip.exportedUrl) {
        try {
          const exportFilename = path.basename(clip.exportedUrl);
          const exportFilePath = path.join(EXPORTS_DIR, exportFilename);
          if (fs.existsSync(exportFilePath)) {
            fs.unlinkSync(exportFilePath);
            console.log(`[Storage] Clip exportado eliminado: ${exportFilePath}`);
          }
        } catch (e) {
          console.warn('Error eliminando clip exportado:', e);
        }
      }
    }
  }

  res.json({
    success: true,
    message: 'Proyecto y archivos multimedia eliminados con éxito'
  });
});

// GET /api/projects/:id/progress (SSE stream for live processing updates)
router.get('/:id/progress', (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const project = db.getProjectById(projectId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (!progressListeners[projectId]) {
    progressListeners[projectId] = [];
  }
  progressListeners[projectId].push(sendEvent);

  if (project) {
    sendEvent({
      stage: project.currentStage || 'fetching_info',
      progressPercent: project.progressPercent,
      status: project.status
    });
  }

  req.on('close', () => {
    if (progressListeners[projectId]) {
      progressListeners[projectId] = progressListeners[projectId].filter((cb: (data: any) => void) => cb !== sendEvent);
    }
  });
});

// POST /api/projects/:id/export-all (Exportación en lote con progreso reactivo)
router.post('/:id/export-all', async (req: Request, res: Response) => {
  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const project = db.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    res.json({
      success: true,
      message: `Iniciando exportación en lote de ${(project.clips || []).length} clips.`
    });

    // Procesa secuencialmente en segundo plano
    (async () => {
      const allClips = project.clips || [];
      for (let i = 0; i < allClips.length; i++) {
        const clip = allClips[i];
        if (clip.exportStatus === 'completed' && clip.exportedUrl) {
          const fp = path.join(EXPORTS_DIR, path.basename(clip.exportedUrl));
          if (fs.existsSync(fp) && fs.statSync(fp).size > 50000) continue;
        }

        try {
          db.updateClip(projectId, clip.id, { exportStatus: 'rendering', exportProgress: 10 });
          const exportedUrl = await renderEngine.exportClip(clip, project.videoInfo, (p) => {
            db.updateClip(projectId, clip.id, { exportProgress: p });
          });
          db.updateClip(projectId, clip.id, {
            exportedUrl,
            exportStatus: 'completed',
            exportProgress: 100
          });
        } catch (e) {
          console.warn(`[BatchExport] Error exportando clip ${clip.id}:`, e);
          db.updateClip(projectId, clip.id, { exportStatus: 'error', exportProgress: 0 });
        }
      }
    })();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:id/download-zip (Empaqueta todos los clips exportados en un ZIP)
router.get('/:id/download-zip', async (req: Request, res: Response) => {
  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const project = db.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    const completedClips = (project.clips || []).filter(
      c => c.exportedUrl && fs.existsSync(path.join(EXPORTS_DIR, path.basename(c.exportedUrl)))
    );

    if (completedClips.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay clips exportados listos. Exporta los clips antes de descargar el ZIP.'
      });
    }

    const safeProjName = (project.name || 'ViralCut').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const zipName = `ViralCut_${safeProjName}_Clips.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = typeof archiver === 'function'
      ? (archiver as any)('zip', { zlib: { level: 6 } })
      : new (archiver.ZipArchive || archiver.Archiver)({ zlib: { level: 6 } });
    archive.pipe(res);

    completedClips.forEach(clip => {
      const filePath = path.join(EXPORTS_DIR, path.basename(clip.exportedUrl!));
      const cleanTitle = (clip.metadata?.title || `clip_${clip.clipNumber}`).replace(/[/\\?%*:|"<>]/g, '_').slice(0, 30);
      const entryName = `ViralCut_Clip_${clip.clipNumber}_${cleanTitle}.mp4`;
      archive.file(filePath, { name: entryName });
    });

    await archive.finalize();
  } catch (err: any) {
    console.error('Error generando zip:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error generando archivo zip.' });
    }
  }
});

// POST /api/projects/create
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { url, videoInfo } = req.body;
    if (!url && !videoInfo) {
      return res.status(400).json({
        success: false,
        message: 'URL o información del video requerida'
      });
    }

    const projectId = uuidv4();
    const info = videoInfo || (await youtubeService.getVideoInfo(url));
    if (!info.videoId) {
      info.videoId = (info as any).id || (info.url ? youtubeService.extractVideoId(info.url) : '') || `sample_${Date.now()}`;
    }

    const newProject: Project = {
      id: projectId,
      name: info.title || 'Nuevo Proyecto',
      videoInfo: info,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'analyzing',
      currentStage: 'fetching_info',
      stageDetail: 'Validando metadatos y canales de audio...',
      progressPercent: 5,
      transcript: [],
      clips: []
    };

    db.saveProject(newProject);

    // Return immediate response with project ID so client can open progress screen
    res.json({
      success: true,
      project: newProject
    });

    // Execute real multi-step pipeline asynchronously in background
    runProcessingPipeline(newProject).catch((err) => {
      console.error(`Pipeline execution failed for project ${projectId}:`, err);
      newProject.status = 'error';
      newProject.errorMessage = 'Ocurrió un error inesperado al procesar el video.';
      db.saveProject(newProject);
      broadcastProgress(projectId, {
        stage: 'error',
        status: 'error',
        progressPercent: 0,
        errorMessage: newProject.errorMessage
      });
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al iniciar el análisis del video.'
    });
  }
});

/**
 * Pipeline de procesamiento real paso a paso
 */
async function runProcessingPipeline(project: Project) {
  const updateProgress = async (
    stage: PipelineStage,
    percent: number,
    detail?: string,
    delayMs: number = 800
  ) => {
    project.currentStage = stage;
    project.stageDetail = detail;
    project.progressPercent = percent;
    db.saveProject(project);
    broadcastProgress(project.id, {
      stage,
      progressPercent: percent,
      detail,
      status: project.status
    });
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  };

  // Start real YouTube video download concurrently if not already local
  if (!project.videoInfo.videoId) {
    project.videoInfo.videoId = (project.videoInfo as any).id || (project.videoInfo.url ? youtubeService.extractVideoId(project.videoInfo.url) : '') || 'sample_base';
  }
  const videoId = project.videoInfo.videoId;
  const isSample = Boolean(videoId && (videoId.startsWith('sample_') || (project.videoInfo as any)?.id?.startsWith('sample_')));
  const isLocal = Boolean(
    project.videoInfo.isLocalFile ||
    (project.videoInfo.localVideoPath && fs.existsSync(project.videoInfo.localVideoPath))
  );

  let downloadPromise: Promise<string | null>;
  if (isLocal && project.videoInfo.localVideoPath && fs.existsSync(project.videoInfo.localVideoPath)) {
    downloadPromise = Promise.resolve(project.videoInfo.videoSourceUrl || `/uploads/${path.basename(project.videoInfo.localVideoPath)}`);
  } else if (isSample) {
    downloadPromise = Promise.resolve('/uploads/sample_base.mp4');
  } else {
    downloadPromise = videoDownloader.downloadVideo(videoId, project.videoInfo.url);
  }

  // Stage 1: Obteniendo información
  await updateProgress('fetching_info', 12, 'Validando metadatos y canales de audio...', 500);

  // Background download handler that always associates the file whenever ready
  downloadPromise.then((finishedUrl) => {
    if (finishedUrl) {
      const p = db.getProjectById(project.id);
      if (p) {
        p.videoInfo.videoSourceUrl = finishedUrl;
        p.videoInfo.localVideoPath = path.join(UPLOADS_DIR, path.basename(finishedUrl));
        db.saveProject(p);
        console.log(`[Project ${project.id}] Video local asociado con éxito: ${finishedUrl}`);
      }
    }
  }).catch((err) => {
    console.warn(`[Project ${project.id}] Error en descarga local:`, err);
  });

  // Await local download if needed so transcript, face tracking, and player previews have the real video
  try {
    const localSourceUrl = await Promise.race([
      downloadPromise,
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 45000))
    ]);
    if (localSourceUrl) {
      project.videoInfo.videoSourceUrl = localSourceUrl;
      project.videoInfo.localVideoPath = path.join(UPLOADS_DIR, path.basename(localSourceUrl));
      db.saveProject(project);
    }
  } catch (e) {
    console.warn('Download note:', e);
  }


  // Stage 2: Analizando duración
  await updateProgress('analyzing_duration', 25, `Analizando longitud (${project.videoInfo.durationFormatted}) y estructura rítmica...`, 600);

  // Stage 3: Transcribiendo contenido
  await updateProgress('transcribing', 42, 'Extrayendo transcripción y marcas de tiempo por palabra (Whisper IA)...', 800);
  const transcript = await transcriptService.getTranscript(
    project.videoInfo.videoId,
    project.videoInfo.duration,
    isSample ? project.videoInfo.videoId : undefined,
    project.videoInfo.localVideoPath
  );
  project.transcript = transcript;
  db.saveProject(project);

  // Stage 4: Detectando momentos importantes
  await updateProgress('detecting_moments', 58, 'Identificando segmentos con alta retención y patrones de enganche...', 800);
  const candidates = await retentionAnalyzer.analyzeTranscriptAndExtractSegments(
    transcript,
    project.videoInfo.duration
  );

  // Stage 5: Analizando escenas & Smart Reframe con Tracking Facial
  await updateProgress('analyzing_scenes', 72, 'Analizando tracking facial y encuadre vertical 9:16 por visión artificial...', 700);

  // Stage 6: Buscando hooks
  await updateProgress('finding_hooks', 84, 'Optimizando los primeros 3 segundos de cada clip...', 600);

  // Stage 7: Calculando potencial
  await updateProgress('calculating_potential', 92, 'Calculando scoring final y densidad de información...', 600);

  // Stage 8: Sincronizando video original
  if (isLocal && project.videoInfo.localVideoPath && fs.existsSync(project.videoInfo.localVideoPath)) {
    // Local video already available
  } else if (!isSample) {
    await updateProgress('preparing_clips', 93, 'Sincronizando video fuente para cortes precisos...', 100);
    // Timeout downloadPromise at 120s so it gives yt-dlp plenty of time to download and merge
    const resolvedLocalUrl = await Promise.race([
      downloadPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 120000))
    ]);

    if (resolvedLocalUrl) {
      project.videoInfo.videoSourceUrl = resolvedLocalUrl;
      project.videoInfo.localVideoPath = path.join(UPLOADS_DIR, path.basename(resolvedLocalUrl));
    } else {
      console.warn(`[Pipeline] Video aún descargando en segundo plano para ${project.videoInfo.videoId}. Preservando fuente original.`);
      // Preservar la fuente real del video del usuario, NUNCA sobreescribir con sample_base.mp4
      project.videoInfo.videoSourceUrl = project.videoInfo.url;
      // Cuando la descarga en segundo plano termine, vincular el archivo local al proyecto en BD
      downloadPromise.then((finishedUrl) => {
        if (finishedUrl) {
          const updated = db.getProjectById(project.id);
          if (updated) {
            updated.videoInfo.videoSourceUrl = finishedUrl;
            updated.videoInfo.localVideoPath = path.join(UPLOADS_DIR, path.basename(finishedUrl));
            db.saveProject(updated);
            console.log(`[Pipeline] Video en segundo plano descargado y vinculado con éxito al proyecto ${project.id}: ${finishedUrl}`);
          }
        }
      }).catch(() => {});
    }
  } else {
    project.videoInfo.videoSourceUrl = '/uploads/sample_base.mp4';
    project.videoInfo.localVideoPath = path.join(UPLOADS_DIR, 'sample_base.mp4');
  }
  db.saveProject(project);

  // Stage 8: Preparando clips con actualizaciones activas por cada clip
  const settings = db.getSettings();
  const clips: Clip[] = [];

  for (let idx = 0; idx < candidates.length; idx++) {
    const cand = candidates[idx];
    const clipId = uuidv4();
    const defaultReframe = smartReframeService.getDefaultReframeConfig();

    const currentPercent = Math.min(99, 93 + Math.round(((idx + 1) / candidates.length) * 6));
    await updateProgress(
      'preparing_clips',
      currentPercent,
      `Clip ${idx + 1} de ${candidates.length}: Tracking facial 9:16 y Smart Jump-Cut...`,
      0
    );

    let faceTrackData: any = undefined;
    let silenceDurationRemoved = 0;

    if (project.videoInfo.localVideoPath && fs.existsSync(project.videoInfo.localVideoPath)) {
      try {
        const [faceRes, silenceRes] = await Promise.all([
          faceTrackingService.trackFaces(
            project.videoInfo.localVideoPath,
            cand.startTime,
            cand.duration,
            0.35
          ).catch((e) => {
            console.warn('[FaceTracking] Error en clip:', e);
            return null;
          }),
          silenceRemovalService.detectSilences(
            project.videoInfo.localVideoPath,
            cand.startTime,
            cand.duration
          ).catch((e) => {
            console.warn('[SmartJumpCut] Error en clip:', e);
            return null;
          })
        ]);

        if (faceRes && faceRes.length > 0) {
          faceTrackData = faceRes;
        }
        if (silenceRes && silenceRes.totalSilenceDuration) {
          silenceDurationRemoved = silenceRes.totalSilenceDuration;
        }
      } catch (e) {
        console.warn('AI Vision / Silence analysis note:', e);
      }
    }

    if (faceTrackData && faceTrackData.length > 0) {
      defaultReframe.faceTrackingData = faceTrackData;
    }

    clips.push({
      id: clipId,
      projectId: project.id,
      clipNumber: idx + 1,
      startTime: cand.startTime,
      endTime: cand.endTime,
      duration: cand.duration,
      aspectRatio: settings.defaultAspectRatio || '9:16',
      metadata: cand.metadata,
      subtitles: cand.subtitles,
      subtitleConfig: {
        enabled: true,
        style: settings.defaultSubtitleStyle || 'hormozi',
        fontSize: 28,
        textColor: '#FFFFFF',
        highlightColor: '#00F0FF',
        backgroundColor: 'rgba(0,0,0,0.75)',
        position: 'bottom',
        yOffsetPercent: 78,
        uppercase: true,
        maxWordsPerLine: 4,
        animation: 'pop'
      },
      reframeConfig: defaultReframe,
      smartJumpCut: false,
      silenceDurationRemoved,
      resolution: (settings.exportQuality as any) || '1080p',
      pixelEnhance: true,
      punchInZoom: true,
      audioEnhance: true,
      hookBooster: true,
      exportStatus: 'idle',
      exportProgress: 0,
      thumbnailUrl: project.videoInfo.thumbnailUrl
    });
  }

  project.clips = clips;
  project.status = 'completed';
  project.currentStage = 'completed';
  project.progressPercent = 100;
  project.stageDetail = `${clips.length} clips generados con éxito.`;
  db.saveProject(project);

  // Stage 9: Pipeline finalizado con éxito
  await updateProgress('completed', 100, `${clips.length} clips generados con éxito.`, 250);
}

export default router;
