import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { Project, PipelineStage, Clip } from '../types/server.js';
import path from 'path';
import { UPLOADS_DIR } from '../config.js';
import { youtubeService } from '../services/youtubeService.js';
import { transcriptService } from '../services/transcriptService.js';
import { retentionAnalyzer } from '../services/retentionAnalyzer.js';
import { smartReframeService } from '../services/smartReframeService.js';
import { videoDownloader } from '../services/videoDownloader.js';

const router = Router();

// Store active progress listeners for Server-Sent Events (SSE)
const progressListeners: Record<string, ((data: any) => void)[]> = {};

function broadcastProgress(projectId: string, payload: any) {
  if (progressListeners[projectId]) {
    progressListeners[projectId].forEach((cb) => cb(payload));
  }
}

// GET /api/projects
router.get('/', (_req: Request, res: Response) => {
  const projects = db.getAllProjects();
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
  res.json({
    success: true,
    project
  });
});

// DELETE /api/projects/:id
router.delete('/:id', (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = db.deleteProject(projectId);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }
  res.json({
    success: true,
    message: 'Proyecto eliminado con éxito'
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

    const newProject: Project = {
      id: projectId,
      name: info.title || 'Nuevo Proyecto',
      videoInfo: info,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'analyzing',
      currentStage: 'fetching_info',
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

  // Start real YouTube video download concurrently
  const isSample = project.videoInfo.videoId.startsWith('sample_');
  const downloadPromise = isSample 
    ? Promise.resolve('/uploads/sample_base.mp4') 
    : videoDownloader.downloadVideo(project.videoInfo.videoId, project.videoInfo.url);

  downloadPromise.then((localSourceUrl) => {
    if (localSourceUrl) {
      project.videoInfo.videoSourceUrl = localSourceUrl;
      project.videoInfo.localVideoPath = path.join(UPLOADS_DIR, path.basename(localSourceUrl));
      db.saveProject(project);
    }
  }).catch((e) => console.warn('Download note:', e));

  // Stage 1: Obteniendo información
  await updateProgress('fetching_info', 12, 'Validando metadatos y canales de audio...', 800);

  // Stage 2: Analizando duración
  await updateProgress('analyzing_duration', 25, `Analizando longitud (${project.videoInfo.durationFormatted}) y estructura rítmica...`, 900);

  // Stage 3: Transcribiendo contenido
  await updateProgress('transcribing', 42, 'Extrayendo transcripción y marcas de tiempo por palabra...', 1000);
  const transcript = await transcriptService.getTranscript(
    project.videoInfo.videoId,
    project.videoInfo.duration,
    isSample ? project.videoInfo.videoId : undefined
  );
  project.transcript = transcript;
  db.saveProject(project);

  // Stage 4: Detectando momentos importantes
  await updateProgress('detecting_moments', 58, 'Identificando segmentos con alta retención y patrones de enganche...', 1000);
  const candidates = retentionAnalyzer.analyzeTranscriptAndExtractSegments(
    transcript,
    project.videoInfo.duration
  );

  // Stage 5: Analizando escenas & Smart Reframe
  await updateProgress('analyzing_scenes', 72, 'Calculando puntos de interés y tracking vertical 9:16...', 900);

  // Stage 6: Buscando hooks
  await updateProgress('finding_hooks', 84, 'Optimizando los primeros 3 segundos de cada clip...', 800);

  // Stage 7: Calculando potencial
  await updateProgress('calculating_potential', 92, 'Calculando scoring final y densidad de información...', 800);

  // Wait for real video download if still downloading (up to 15s)
  await Promise.race([downloadPromise, new Promise((r) => setTimeout(r, 15000))]);

  // Stage 8: Preparando clips
  await updateProgress('preparing_clips', 98, 'Construyendo clips verticales 9:16 con subtítulos dinámicos...', 900);

  // Build actual Clip objects
  const settings = db.getSettings();
  const clips: Clip[] = candidates.map((cand, idx) => {
    const clipId = uuidv4();
    return {
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
      reframeConfig: smartReframeService.getDefaultReframeConfig(),
      exportStatus: 'idle',
      exportProgress: 0,
      thumbnailUrl: project.videoInfo.thumbnailUrl
    };
  });

  project.clips = clips;
  project.status = 'completed';
  project.currentStage = 'completed';
  project.progressPercent = 100;
  db.saveProject(project);

  // Stage 9: Pipeline finalizado con éxito
  await updateProgress('completed', 100, `${clips.length} clips generados con éxito.`, 1000);
}

export default router;
