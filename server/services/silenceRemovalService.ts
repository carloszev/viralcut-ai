import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

export interface SilenceInterval {
  start: number; // in seconds relative to clip start
  end: number;   // in seconds relative to clip start
  duration: number;
}

export interface SpeechSegment {
  start: number; // relative to clip start
  end: number;   // relative to clip start
  duration: number;
}

export interface SilenceAnalysisResult {
  silences: SilenceInterval[];
  speechSegments: SpeechSegment[];
  totalSilenceDuration: number;
  originalDuration: number;
  trimmedDuration: number;
  percentSaved: number;
}

export class SilenceRemovalService {
  /**
   * Analiza un segmento de video para detectar intervalos de silencio mediante silencedetect de FFmpeg
   */
  public async detectSilences(
    videoPath: string,
    clipStart: number,
    clipDuration: number,
    noiseThresholdDb: number = -28,
    minSilenceSec: number = 0.55
  ): Promise<SilenceAnalysisResult> {
    if (!fs.existsSync(videoPath)) {
      return this.emptyResult(clipDuration);
    }

    return new Promise((resolve) => {
      let isSettled = false;
      let ffmpegInstance: any = null;

      const safeResolve = (result: SilenceAnalysisResult) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutHandle);
          resolve(result);
        }
      };

      const timeoutHandle = setTimeout(() => {
        try {
          if (ffmpegInstance && ffmpegInstance.ffmpegProc) {
            ffmpegInstance.ffmpegProc.kill('SIGKILL');
          }
        } catch {}
        console.warn(`[SmartJumpCut] Timeout (5s) alcanzado para clip en ${clipStart}s. Usando fallback.`);
        safeResolve(this.emptyResult(clipDuration));
      }, 5000);

      const silences: SilenceInterval[] = [];
      let currentSilenceStart: number | null = null;
      const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null';

      const command = ffmpeg(videoPath)
        .inputOptions([
          '-ss', Math.max(0, clipStart).toString(),
          '-vn',
          '-sn'
        ])
        .noVideo()
        .setDuration(Math.max(1, clipDuration))
        .audioFilters(`silencedetect=noise=${noiseThresholdDb}dB:d=${minSilenceSec}`)
        .outputOptions(['-f', 'null'])
        .output(nullSink);

      command.on('stderr', (line: string) => {
        if (isSettled) return;
        // Parse "silence_start: 3.412"
        const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
        if (startMatch) {
          currentSilenceStart = parseFloat(startMatch[1]);
        }

        // Parse "silence_end: 4.821 | silence_duration: 1.409"
        const endMatch = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
        if (endMatch) {
          const endVal = parseFloat(endMatch[1]);
          const durVal = parseFloat(endMatch[2]);
          const startVal = currentSilenceStart !== null ? currentSilenceStart : Math.max(0, endVal - durVal);

          silences.push({
            start: parseFloat(startVal.toFixed(2)),
            end: parseFloat(Math.min(clipDuration, endVal).toFixed(2)),
            duration: parseFloat(durVal.toFixed(2)),
          });
          currentSilenceStart = null;
        }
      });

      command.on('end', () => {
        // If silence was still ongoing at the end of the clip
        if (currentSilenceStart !== null && currentSilenceStart < clipDuration) {
          const dur = clipDuration - currentSilenceStart;
          if (dur >= minSilenceSec) {
            silences.push({
              start: parseFloat(currentSilenceStart.toFixed(2)),
              end: parseFloat(clipDuration.toFixed(2)),
              duration: parseFloat(dur.toFixed(2)),
            });
          }
        }

        const result = this.computeSpeechSegments(silences, clipDuration);
        console.log(
          `[SmartJumpCut] Clip duración: ${clipDuration}s | Silencios detectados: ${silences.length} | Tiempo ahorrado: ${result.totalSilenceDuration}s (${result.percentSaved}%)`
        );
        safeResolve(result);
      });

      command.on('error', (err) => {
        console.warn('[SmartJumpCut] FFmpeg silencedetect error (fallback sin jump-cut):', err.message);
        safeResolve(this.emptyResult(clipDuration));
      });

      ffmpegInstance = command;
      command.run();
    });
  }

  /**
   * Genera los segmentos de habla activa a partir de los silencios detectados
   */
  private computeSpeechSegments(silences: SilenceInterval[], totalDuration: number): SilenceAnalysisResult {
    // Sort silences by start timestamp
    const sorted = [...silences].sort((a, b) => a.start - b.start);
    const speechSegments: SpeechSegment[] = [];

    let cursor = 0;
    for (const s of sorted) {
      if (s.start > cursor + 0.1) {
        speechSegments.push({
          start: parseFloat(cursor.toFixed(2)),
          end: parseFloat(s.start.toFixed(2)),
          duration: parseFloat((s.start - cursor).toFixed(2)),
        });
      }
      cursor = Math.max(cursor, s.end);
    }

    if (cursor < totalDuration - 0.1) {
      speechSegments.push({
        start: parseFloat(cursor.toFixed(2)),
        end: parseFloat(totalDuration.toFixed(2)),
        duration: parseFloat((totalDuration - cursor).toFixed(2)),
      });
    }

    const totalSilence = sorted.reduce((acc, curr) => acc + curr.duration, 0);
    const trimmedDur = Math.max(1, totalDuration - totalSilence);
    const percentSaved = Math.min(100, Math.round((totalSilence / totalDuration) * 100));

    return {
      silences: sorted,
      speechSegments,
      totalSilenceDuration: parseFloat(totalSilence.toFixed(2)),
      originalDuration: parseFloat(totalDuration.toFixed(2)),
      trimmedDuration: parseFloat(trimmedDur.toFixed(2)),
      percentSaved,
    };
  }

  /**
   * Genera las expresiones de filtros select y aselect de FFmpeg para aplicar el Smart Jump-Cut
   */
  public buildJumpCutFilter(analysis: SilenceAnalysisResult): { videoFilter: string; audioFilter: string } | null {
    if (!analysis.speechSegments || analysis.speechSegments.length <= 1 || analysis.totalSilenceDuration < 0.6) {
      return null;
    }

    // Build boolean expression: between(t, s1, e1)+between(t, s2, e2)+...
    const conditions = analysis.speechSegments
      .map((seg) => `between(t,${seg.start},${seg.end})`)
      .join('+');

    const videoFilter = `select='${conditions}',setpts=N/FRAME_RATE/TB`;
    const audioFilter = `aselect='${conditions}',asetpts=N/SR/TB`;

    return { videoFilter, audioFilter };
  }

  private emptyResult(duration: number): SilenceAnalysisResult {
    return {
      silences: [],
      speechSegments: [{ start: 0, end: duration, duration }],
      totalSilenceDuration: 0,
      originalDuration: duration,
      trimmedDuration: duration,
      percentSaved: 0,
    };
  }
}

export const silenceRemovalService = new SilenceRemovalService();
