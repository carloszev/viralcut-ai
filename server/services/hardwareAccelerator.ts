import { spawn } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export interface HardwareEncoderConfig {
  encoder: string;
  name: string;
  type: 'nvidia' | 'intel' | 'amd' | 'cpu';
  outputOptions: string[];
}

export class HardwareAccelerator {
  private static cachedConfig: HardwareEncoderConfig | null = null;
  private static isProbing: boolean = false;

  /**
   * Detecta y prueba en tiempo real si el hardware del usuario soporta codificación acelerada por GPU
   */
  public static async getOptimalEncoder(): Promise<HardwareEncoderConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const defaultCpuConfig: HardwareEncoderConfig = {
      encoder: 'libx264',
      name: 'CPU Software (x264 UltraFast Turbo)',
      type: 'cpu',
      outputOptions: [
        '-preset', 'ultrafast',
        '-tune', 'fastdecode',
        '-crf', '21',
        '-threads', '0'
      ]
    };

    if (this.isProbing) {
      return defaultCpuConfig;
    }

    this.isProbing = true;

    try {
      // 1. Probar NVIDIA NVENC (h264_nvenc)
      const hasNvidia = await this.testEncoder('h264_nvenc');
      if (hasNvidia) {
        console.log('⚡ [HardwareAccelerator] ¡GPU NVIDIA NVENC detectada y lista para aceleración!');
        this.cachedConfig = {
          encoder: 'h264_nvenc',
          name: 'NVIDIA NVENC Hardware GPU',
          type: 'nvidia',
          outputOptions: [
            '-preset', 'fast',
            '-rc', 'vbr',
            '-cq', '22',
            '-spatial-aq', '1',
            '-threads', '0'
          ]
        };
        this.isProbing = false;
        return this.cachedConfig;
      }

      // 2. Probar Intel QuickSync (h264_qsv)
      const hasIntel = await this.testEncoder('h264_qsv');
      if (hasIntel) {
        console.log('⚡ [HardwareAccelerator] ¡Intel QuickSync Video (QSV) detectado y listo!');
        this.cachedConfig = {
          encoder: 'h264_qsv',
          name: 'Intel QuickSync Hardware GPU',
          type: 'intel',
          outputOptions: [
            '-preset', 'veryfast',
            '-global_quality', '22',
            '-threads', '0'
          ]
        };
        this.isProbing = false;
        return this.cachedConfig;
      }

      // 3. Probar AMD AMF (h264_amf)
      const hasAmd = await this.testEncoder('h264_amf');
      if (hasAmd) {
        console.log('⚡ [HardwareAccelerator] ¡AMD AMF GPU detectada y lista!');
        this.cachedConfig = {
          encoder: 'h264_amf',
          name: 'AMD AMF Hardware GPU',
          type: 'amd',
          outputOptions: [
            '-preset', 'speed',
            '-rc', 'cbr',
            '-b:v', '5M',
            '-threads', '0'
          ]
        };
        this.isProbing = false;
        return this.cachedConfig;
      }
    } catch (err) {
      console.warn('[HardwareAccelerator] Advertencia durante detección GPU:', err);
    }

    console.log('ℹ️ [HardwareAccelerator] Usando motor de alta velocidad CPU (libx264 ultrafast multihilo)');
    this.cachedConfig = defaultCpuConfig;
    this.isProbing = false;
    return this.cachedConfig;
  }

  /**
   * Ejecuta un fotograma de prueba sin bloquear para validar soporte real del driver de video
   */
  private static testEncoder(encoderName: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proc = spawn(ffmpegInstaller.path, [
          '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=0.05',
          '-c:v', encoderName,
          '-f', 'null', 'NUL'
        ], {
          windowsHide: true,
          stdio: 'ignore'
        });

        const timeout = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch {}
          resolve(false);
        }, 1200);

        proc.on('close', (code) => {
          clearTimeout(timeout);
          resolve(code === 0);
        });

        proc.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }
}
