import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { db } from '../db/database.js';
import { renderEngine } from '../services/renderEngine.js';
import { USER_DOCUMENTS_VIDEOS_DIR, USER_VIDEOS_DIR, EXPORTS_DIR } from '../config.js';
import { Clip } from '../types/server.js';

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
    const { projectId } = req.body;

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

    const targetFolder = fs.existsSync(USER_DOCUMENTS_VIDEOS_DIR) 
      ? USER_DOCUMENTS_VIDEOS_DIR 
      : USER_VIDEOS_DIR;

    // Si ya fue exportado y existe en disco, copiar a Documentos/Videos y responder de inmediato
    if (clip.exportedUrl) {
      const existingFile = path.join(EXPORTS_DIR, path.basename(clip.exportedUrl));
      if (fs.existsSync(existingFile)) {
        renderEngine.copyToUserVideos(existingFile, clip);
        return res.json({
          success: true,
          exportedUrl: clip.exportedUrl,
          clip,
          savedFolder: targetFolder
        });
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
      message: 'Error durante la exportación del clip.'
    });
  }
});

// GET /api/clips/download/:filename (Descarga directa segura con Content-Disposition: attachment)
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const rawFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const cleanFilename = path.basename(rawFilename);
    const filePath = path.join(EXPORTS_DIR, cleanFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'El archivo de video no existe o ha expirado.'
      });
    }

    const downloadName = req.query.name 
      ? path.basename(String(req.query.name)).replace(/["\r\n]/g, '_') 
      : cleanFilename;
    res.setHeader('Content-Type', 'video/mp4');
    res.download(filePath, downloadName, (err) => {
      if (err && !res.headersSent) {
        console.warn('Download error:', err);
        res.status(500).send('Error al descargar el archivo.');
      }
    });
  } catch (err: any) {
    console.error('Error in /api/clips/download/:filename:', err);
    res.status(500).json({ success: false, message: 'Error procesando la descarga.' });
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

export default router;
