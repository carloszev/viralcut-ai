import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { db } from '../db/database.js';
import { renderEngine } from '../services/renderEngine.js';
import { USER_DOCUMENTS_VIDEOS_DIR, USER_VIDEOS_DIR, EXPORTS_DIR } from '../config.js';
import { Clip } from '../types/server.js';
import { socialCopyService } from '../services/socialCopyService.js';
import { translationService } from '../services/translationService.js';

const router = Router();

// PATCH /api/clips/:id
router.patch('/:id', (req: Request, res: Response) => {
  const clipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { projectId, updates } = req.body;

  if (!projectId || !updates) {
    return res.status(400).json({
      success: false,
      message: 'projectId y updates son requeridos'
    });
  }

  const updatedClip = db.updateClip(projectId, clipId, updates);
  if (!updatedClip) {
    return res.status(404).json({
      success: false,
      message: 'Clip o proyecto no encontrado'
    });
  }

  res.json({
    success: true,
    clip: updatedClip
  });
});

// POST /api/clips/:id/export
router.post('/:id/export', async (req: Request, res: Response) => {
  try {
    const clipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { projectId, clip: incomingClip, forceReRender } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'projectId es requerido'
      });
    }

    const project = db.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) {
      return res.status(404).json({
        success: false,
        message: 'Clip no encontrado'
      });
    }

    // Check if configuration changed by comparing incoming settings against the currently stored clip
    let configChanged = false;
    if (incomingClip && typeof incomingClip === 'object') {
      configChanged = Boolean(
        (incomingClip.startTime !== undefined && Math.abs(incomingClip.startTime - clip.startTime) > 0.05) ||
        (incomingClip.endTime !== undefined && Math.abs(incomingClip.endTime - clip.endTime) > 0.05) ||
        (incomingClip.aspectRatio !== undefined && incomingClip.aspectRatio !== clip.aspectRatio) ||
        (incomingClip.punchInZoom !== undefined && incomingClip.punchInZoom !== clip.punchInZoom) ||
        (incomingClip.audioEnhance !== undefined && incomingClip.audioEnhance !== clip.audioEnhance) ||
        (incomingClip.hookBooster !== undefined && incomingClip.hookBooster !== clip.hookBooster) ||
        (incomingClip.pixelEnhance !== undefined && incomingClip.pixelEnhance !== clip.pixelEnhance) ||
        (incomingClip.resolution !== undefined && incomingClip.resolution !== clip.resolution) ||
        (incomingClip.smartJumpCut !== undefined && incomingClip.smartJumpCut !== clip.smartJumpCut) ||
        (incomingClip.reframeConfig?.horizontalOffsetPercent !== undefined &&
          incomingClip.reframeConfig.horizontalOffsetPercent !== clip.reframeConfig?.horizontalOffsetPercent)
      );

      // Si cambió alguna configuración de IA o tiempo, invalidar archivo previo para garantizar render nuevo
      if (configChanged) {
        incomingClip.exportedUrl = undefined;
        incomingClip.exportStatus = 'idle';
      }

      db.updateClip(projectId, clipId, incomingClip);
      Object.assign(clip, incomingClip);
    }

    const targetFolder = fs.existsSync(USER_DOCUMENTS_VIDEOS_DIR) 
      ? USER_DOCUMENTS_VIDEOS_DIR 
      : USER_VIDEOS_DIR;

    // Solo reutilizar exportación previa si el archivo existe en disco y NO cambió la configuración ni se forzó render
    if (clip.exportedUrl && !forceReRender && !configChanged) {
      const existingFile = path.join(EXPORTS_DIR, path.basename(clip.exportedUrl));
      if (fs.existsSync(existingFile)) {
        const fileSize = fs.statSync(existingFile).size;
        if (fileSize > 50000) {
          renderEngine.copyToUserVideos(existingFile, clip);
          return res.json({
            success: true,
            exportedUrl: clip.exportedUrl,
            clip,
            savedFolder: targetFolder
          });
        } else {
          console.warn(`[Export] Archivo previo ${clip.exportedUrl} corrupto o incompleto (${fileSize} bytes). Re-renderizando de forma limpia...`);
          try { fs.unlinkSync(existingFile); } catch {}
        }
      }
    }

    // Set status to rendering
    db.updateClip(projectId, clipId, {
      exportStatus: 'rendering',
      exportProgress: 10
    });

    // Start FFmpeg rendering
    let lastProgress = 10;
    const exportedUrl = await renderEngine.exportClip(
      clip,
      project.videoInfo,
      (progressPercent, statusText) => {
        if (progressPercent - lastProgress >= 5 || progressPercent === 100) {
          lastProgress = progressPercent;
          db.updateClip(projectId, clipId, {
            exportStatus: 'rendering',
            exportProgress: progressPercent
          });
          console.log(`[Export ${clipId}] ${progressPercent}% - ${statusText}`);
        }
      }
    );

    const finalizedClip = db.updateClip(projectId, clipId, {
      exportedUrl,
      exportStatus: 'completed',
      exportProgress: 100
    });

    res.json({
      success: true,
      exportedUrl,
      clip: finalizedClip,
      savedFolder: targetFolder
    });
  } catch (error: any) {
    console.error('Error in /api/clips/:id/export:', error);
    const { projectId } = req.body;
    const clipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (projectId && clipId) {
      db.updateClip(projectId, clipId, {
        exportStatus: 'error',
        exportProgress: 0
      });
    }

    res.status(500).json({
      success: false,
      message: error?.message || 'Error durante la exportación del clip.'
    });
  }
});

// GET /api/clips/download/:filename (Descarga directa segura con Content-Disposition: attachment)
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const rawFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const cleanFilename = path.basename(rawFilename);
    const resolvedExportsDir = path.resolve(EXPORTS_DIR);
    const resolvedPath = path.resolve(EXPORTS_DIR, cleanFilename);

    if (!resolvedPath.startsWith(resolvedExportsDir) || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: 'El archivo de video no existe o ha expirado.'
      });
    }

    const downloadName = req.query.name 
      ? path.basename(String(req.query.name)).replace(/["\r\n\0]/g, '_') 
      : cleanFilename;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    res.download(resolvedPath, downloadName, (err) => {
      if (err && !res.headersSent) {
        console.warn('[ClipRoutes] Error al enviar stream de descarga:', err.message);
        res.status(500).json({ success: false, message: 'Error al descargar el archivo.' });
      }
    });
  } catch (err: any) {
    console.error('Error in /api/clips/download/:filename:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error procesando la descarga.' });
    }
  }
});

// POST /api/clips/open-folder (Abre la carpeta Documentos/Videos en el explorador de Windows)
router.post('/open-folder', (_req: Request, res: Response) => {
  try {
    const targetFolder = fs.existsSync(USER_DOCUMENTS_VIDEOS_DIR) 
      ? USER_DOCUMENTS_VIDEOS_DIR 
      : USER_VIDEOS_DIR;

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    spawn('explorer.exe', [targetFolder], { detached: true, stdio: 'ignore' });

    res.json({
      success: true,
      folder: targetFolder
    });
  } catch (error: any) {
    console.error('Error opening folder:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo abrir la carpeta en el explorador.'
    });
  }
});

// GET /api/clips/:id/social-pack (Genera títulos virales, descripción SEO y comentario fijado)
router.get('/:id/social-pack', (req: Request, res: Response) => {
  try {
    const clipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const projectId = req.query.projectId as string;

    const projects = db.getAllProjects();
    let foundClip: Clip | undefined;

    if (projectId) {
      const proj = db.getProjectById(projectId);
      foundClip = proj?.clips?.find(c => c.id === clipId);
    } else {
      for (const p of projects) {
        const c = p.clips?.find(c => c.id === clipId);
        if (c) {
          foundClip = c;
          break;
        }
      }
    }

    if (!foundClip) {
      return res.status(404).json({ success: false, message: 'Clip no encontrado' });
    }

    const socialPack = socialCopyService.generateSocialPack(
      foundClip.clipNumber,
      foundClip.metadata,
      foundClip.subtitles
    );

    res.json({
      success: true,
      socialPack
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/clips/:id/translate (Traduce subtítulos a EN, PT, FR, DE, ES)
router.post('/:id/translate', async (req: Request, res: Response) => {
  try {
    const clipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    let { projectId } = req.body;
    const targetLang = req.body.language || req.body.targetLanguage || req.body.lang;

    if (!targetLang) {
      return res.status(400).json({ success: false, message: 'language o targetLanguage es requerido' });
    }

    if (!projectId) {
      const allProjects = db.getAllProjects();
      for (const p of allProjects) {
        if (p.clips?.some(c => c.id === clipId)) {
          projectId = p.id;
          break;
        }
      }
    }

    if (!projectId) {
      return res.status(404).json({ success: false, message: 'No se encontró el proyecto para este clip' });
    }

    const project = db.getProjectById(projectId);
    const clip = project?.clips?.find(c => c.id === clipId);
    if (!clip) {
      return res.status(404).json({ success: false, message: 'Clip no encontrado' });
    }

    const translatedSubtitles = await translationService.translateSubtitles(clip.subtitles || [], targetLang);
    const updated = db.updateClip(projectId, clipId, {
      subtitles: translatedSubtitles
    });

    res.json({
      success: true,
      subtitles: translatedSubtitles,
      language: targetLang,
      targetLanguage: targetLang,
      clip: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
