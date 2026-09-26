import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

const router = Router();

// GET /api/settings
router.get('/', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    success: true,
    settings
  });
});

// POST /api/settings
router.post('/', (req: Request, res: Response) => {
  const updates = req.body;
  const updated = db.updateSettings(updates);
  res.json({
    success: true,
    settings: updated
  });
});

export default router;
