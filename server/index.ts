import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PORT, EXPORTS_DIR, UPLOADS_DIR } from './config.js';
import videoRoutes from './routes/videoRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import clipRoutes from './routes/clipRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file servers for uploaded media and rendered clips
app.use('/exports', (req, res, next) => {
  res.setHeader('Accept-Ranges', 'bytes');
  if (req.query.download === '1') {
    const filename = req.path.split('/').pop() || 'clip.mp4';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }
  next();
}, express.static(EXPORTS_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// API Routes
app.use('/api/videos', videoRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clips', clipRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    version: '1.1.0',
    service: 'ViralCut AI Engine',
    timestamp: new Date().toISOString()
  });
});

// Production Frontend Static Files (Single unified container)
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/exports') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en el procesamiento de video.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`⚡ ViralCut AI Server listening on http://localhost:${PORT}`);
});
