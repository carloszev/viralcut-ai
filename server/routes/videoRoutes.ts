import { Router, Request, Response } from 'express';
import { youtubeService, SAMPLE_VIDEOS } from '../services/youtubeService.js';

const router = Router();

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
