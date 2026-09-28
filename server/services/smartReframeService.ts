import { SmartReframeConfig } from '../types/server.js';

export interface CropWindow {
  xPercent: number;      // 0 to 100
  yPercent: number;      // 0 to 100
  widthPercent: number;  // typically 56.25% for 9:16 inside 16:9
  heightPercent: number; // 100%
  targetAspect: '9:16' | '1:1' | '16:9';
}

export class SmartReframeService {
  /**
   * Genera configuración por defecto de Smart Reframe
   */
  public getDefaultReframeConfig(): SmartReframeConfig {
    return {
      mode: 'auto',
      horizontalOffsetPercent: 0,
      scaleFactor: 1.0,
      activeSpeakerTracking: true,
      smoothingFactor: 0.85
    };
  }

  /**
   * Calcula las coordenadas de la ventana de recorte 9:16
   */
  public calculateCropWindow(
    aspectRatio: '9:16' | '1:1' | '16:9',
    config: SmartReframeConfig,
    timeOffset: number = 0
  ): CropWindow {
    if (aspectRatio === '16:9') {
      return {
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        targetAspect: '16:9'
      };
    }

    if (aspectRatio === '1:1') {
      // 1:1 inside 16:9: width is 56.25% (9/16 of width)
      const baseWidth = (9 / 16) * 100;
      let xOffset = (100 - baseWidth) / 2 + config.horizontalOffsetPercent;
      xOffset = Math.max(0, Math.min(100 - baseWidth, xOffset));

      return {
        xPercent: parseFloat(xOffset.toFixed(2)),
        yPercent: 0,
        widthPercent: parseFloat(baseWidth.toFixed(2)),
        heightPercent: 100,
        targetAspect: '1:1'
      };
    }

    // Default 9:16 inside 16:9:
    // Aspect ratio 9:16 = width / height = 0.5625
    // Inside 16:9 (width/height = 1.777): crop width is (9/16) / (16/9) = 81/256 = ~31.64%
    const cropWidthPercent = ( (9 / 16) / (16 / 9) ) * 100; // ~31.64%
    const centerPoint = (100 - cropWidthPercent) / 2;

    let dynamicPan = 0;
    if (config.mode === 'auto' && config.activeSpeakerTracking) {
      if (config.faceTrackingData && config.faceTrackingData.length > 0) {
        // Find nearest face tracking point for timeOffset
        const nearest = config.faceTrackingData.reduce((prev, curr) =>
          Math.abs(curr.time - timeOffset) < Math.abs(prev.time - timeOffset) ? curr : prev
        );
        // Desired crop window X centered around speaker's face
        const desiredX = nearest.xPercent - cropWidthPercent / 2;
        dynamicPan = desiredX - centerPoint;
      } else {
        // Subtle organic speaker tracking micro-motion fallback
        dynamicPan = Math.sin(timeOffset * 0.4) * 4.5;
      }
    }

    let finalX = centerPoint + config.horizontalOffsetPercent + dynamicPan;
    // Bound within visible frame
    finalX = Math.max(0, Math.min(100 - cropWidthPercent, finalX));

    return {
      xPercent: parseFloat(finalX.toFixed(2)),
      yPercent: 0,
      widthPercent: parseFloat(cropWidthPercent.toFixed(2)),
      heightPercent: 100,
      targetAspect: '9:16'
    };
  }
}

export const smartReframeService = new SmartReframeService();
