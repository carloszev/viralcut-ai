import { spawn } from 'child_process';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export interface FaceTrackPoint {
  time: number;
  xPercent: number;   // 0 to 100
  yPercent: number;   // 0 to 100
  confidence: number; // 0 to 1
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class FaceTrackingService {
  private ffmpegPath: string;

  constructor() {
    this.ffmpegPath = ffmpegInstaller && ffmpegInstaller.path ? ffmpegInstaller.path : 'ffmpeg';
  }

  /**
   * Escanea el fragmento del video en memoria y detecta las coordenadas del rostro/hablante principal
   * usando análisis de crominancia facial YCbCr, concentración de gradientes y suavizado cinemático
   */
  public async trackFaces(
    videoPath: string,
    startTime: number,
    duration: number,
    samplingFps: number = 0.35
  ): Promise<FaceTrackPoint[]> {
    if (!fs.existsSync(videoPath)) {
      return this.generateDefaultTrack(duration);
    }

    const frameWidth = 160;
    const frameHeight = 90;
    const frameBytes = frameWidth * frameHeight * 3; // RGB24
    const safeDuration = Math.max(1, duration);

    return new Promise((resolve) => {
      let isSettled = false;
      const safeResolve = (points: FaceTrackPoint[]) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutHandle);
          resolve(points);
        }
      };

      const args = [
        '-ss', Math.max(0, startTime).toString(),
        '-t', safeDuration.toString(),
        '-i', videoPath,
        '-vf', `fps=${samplingFps},scale=${frameWidth}:${frameHeight}`,
        '-f', 'rawvideo',
        '-pix_fmt', 'rgb24',
        'pipe:1',
      ];

      const child = spawn(this.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'ignore'] });

      // Safety timeout: Face tracking must never hang the pipeline
      const timeoutHandle = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {}
        console.warn(`[FaceTracking] Timeout (5s) alcanzado para clip en ${startTime}s. Aplicando fallback.`);
        safeResolve(this.generateDefaultTrack(duration));
      }, 5000);

      let bufferAccumulator = Buffer.alloc(0);
      const rawPoints: FaceTrackPoint[] = [];
      let frameIndex = 0;

      child.stdout.on('data', (chunk: Buffer) => {
        if (isSettled) return;
        bufferAccumulator = Buffer.concat([bufferAccumulator, chunk]);

        while (bufferAccumulator.length >= frameBytes) {
          const frameBuffer = bufferAccumulator.subarray(0, frameBytes);
          bufferAccumulator = bufferAccumulator.subarray(frameBytes);

          const time = parseFloat((frameIndex / samplingFps).toFixed(2));
          const point = this.analyzeFrameForFace(frameBuffer, frameWidth, frameHeight, time);
          rawPoints.push(point);
          frameIndex++;
        }
      });

      child.on('close', (code) => {
        if (code !== 0 || rawPoints.length === 0) {
          console.warn(`[FaceTracking] FFmpeg finalizó con código ${code}. Aplicando fallback.`);
          return safeResolve(this.generateDefaultTrack(duration));
        }

        // Apply cinematic Exponential Moving Average (EMA) smoothing
        const smoothedPoints = this.applyCinematicSmoothing(rawPoints);
        console.log(
          `[FaceTracking] Analizados ${smoothedPoints.length} fotogramas clave. Promedio centro X: ${
            (smoothedPoints.reduce((acc, p) => acc + p.xPercent, 0) / smoothedPoints.length).toFixed(1)
          }%`
        );
        safeResolve(smoothedPoints);
      });

      child.on('error', (err) => {
        console.warn('[FaceTracking] Error en proceso FFmpeg:', err.message);
        safeResolve(this.generateDefaultTrack(duration));
      });
    });
  }

  /**
   * Analiza un fotograma RGB24 para encontrar el centro de masa del rostro
   */
  private analyzeFrameForFace(
    buffer: Buffer,
    width: number,
    height: number,
    time: number
  ): FaceTrackPoint {
    let sumX = 0;
    let sumY = 0;
    let skinPixelsCount = 0;

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // Scan frame pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 3;
        const r = buffer[offset];
        const g = buffer[offset + 1];
        const b = buffer[offset + 2];

        // Convert RGB to YCbCr space
        const cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
        const cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128;

        // Human skin tone cluster in YCbCr: Cb in [77, 127], Cr in [133, 173]
        // Face vertical prior: Faces are mostly located in upper 70% of video
        const isUpperHalf = y < height * 0.75;
        const isSkin = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && r > 60 && g > 40 && b > 20 && r > g;

        if (isSkin && isUpperHalf) {
          // Weight pixels closer to vertical golden ratio (~35% from top)
          const weight = 1 + (1 - Math.abs(y - height * 0.35) / height);
          sumX += x * weight;
          sumY += y * weight;
          skinPixelsCount += weight;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const minAcceptableSkinPixels = (width * height) * 0.008; // at least 0.8% of pixels

    if (skinPixelsCount >= minAcceptableSkinPixels && minX < maxX) {
      const avgX = sumX / skinPixelsCount;
      const avgY = sumY / skinPixelsCount;

      const xPercent = Math.max(15, Math.min(85, parseFloat(((avgX / width) * 100).toFixed(2))));
      const yPercent = Math.max(10, Math.min(80, parseFloat(((avgY / height) * 100).toFixed(2))));
      const confidence = Math.min(0.95, parseFloat((skinPixelsCount / ((width * height) * 0.08)).toFixed(2)));

      return {
        time,
        xPercent,
        yPercent,
        confidence,
        box: {
          x: Math.round((minX / width) * 100),
          y: Math.round((minY / height) * 100),
          width: Math.round(((maxX - minX) / width) * 100),
          height: Math.round(((maxY - minY) / height) * 100),
        },
      };
    }

    // Default center if no clear face detected in this particular frame
    return {
      time,
      xPercent: 50,
      yPercent: 35,
      confidence: 0.3,
    };
  }

  /**
   * Suaviza la trayectoria para evitar vibraciones o movimientos espasmódicos
   */
  private applyCinematicSmoothing(points: FaceTrackPoint[]): FaceTrackPoint[] {
    if (points.length <= 1) return points;

    const smoothed: FaceTrackPoint[] = [];
    const alpha = 0.35; // Smoothing factor (lower = smoother camera pan)

    let currentX = points[0].xPercent;
    let currentY = points[0].yPercent;

    for (const pt of points) {
      // If confidence is low, pull back slightly towards previous position
      const effectiveAlpha = pt.confidence > 0.5 ? alpha : alpha * 0.5;

      currentX = currentX * (1 - effectiveAlpha) + pt.xPercent * effectiveAlpha;
      currentY = currentY * (1 - effectiveAlpha) + pt.yPercent * effectiveAlpha;

      smoothed.push({
        time: pt.time,
        xPercent: parseFloat(currentX.toFixed(2)),
        yPercent: parseFloat(currentY.toFixed(2)),
        confidence: pt.confidence,
        box: pt.box,
      });
    }

    return smoothed;
  }

  /**
   * Genera una trayectoria por defecto centrada
   */
  private generateDefaultTrack(duration: number): FaceTrackPoint[] {
    const points: FaceTrackPoint[] = [];
    for (let t = 0; t <= duration; t += 2) {
      points.push({
        time: t,
        xPercent: 50,
        yPercent: 35,
        confidence: 0.5,
      });
    }
    return points;
  }
}

export const faceTrackingService = new FaceTrackingService();
