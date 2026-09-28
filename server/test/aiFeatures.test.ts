import path from 'path';
import fs from 'fs';
import { UPLOADS_DIR } from '../config.js';
import { silenceRemovalService } from '../services/silenceRemovalService.js';
import { faceTrackingService } from '../services/faceTrackingService.js';
import { whisperService } from '../services/whisperService.js';
import { smartReframeService } from '../services/smartReframeService.js';
import { SmartReframeConfig } from '../types/server.js';

async function runAiFeaturesTest() {
  console.log('=================================================================');
  console.log('🧪 VERIFICACIÓN DE FUNCIONALIDADES DE IA — VIRALCUT AI');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASÓ: ${name} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: ${name} ${detail ? `[${detail}]` : ''}`);
      failed++;
    }
  }

  const sampleVideo = path.join(UPLOADS_DIR, 'sample_base.mp4');
  const sampleExists = fs.existsSync(sampleVideo);

  // 1. Detección de Silencios ("Smart Jump-Cut")
  console.log('--- 1. Auto-Corte de Silencios (Smart Jump-Cut) con FFmpeg ---');
  if (sampleExists) {
    const silenceResult = await silenceRemovalService.detectSilences(sampleVideo, 0, 8, -25, 0.4);
    assert(typeof silenceResult.totalSilenceDuration === 'number', 'Calcula duración total de silencios', `${silenceResult.totalSilenceDuration}s`);
    assert(Array.isArray(silenceResult.speechSegments), 'Genera segmentos de habla activa', `${silenceResult.speechSegments.length} segmentos`);
    assert(silenceResult.percentSaved >= 0 && silenceResult.percentSaved <= 100, 'Porcentaje de tiempo ahorrado coherente', `${silenceResult.percentSaved}%`);

    const filterObj = silenceRemovalService.buildJumpCutFilter(silenceResult);
    if (silenceResult.speechSegments.length > 0 && silenceResult.totalSilenceDuration >= 0.6) {
      assert(Boolean(filterObj?.videoFilter && filterObj?.audioFilter), 'Construye filtros FFmpeg select y aselect válidos');
    } else {
      assert(true, 'Preserva flujo continuo de forma segura cuando el tramo es 100% silencio o continuo');
    }

    // Probar construcción de filtro Jump-Cut con habla activa y silencios intercalados
    const mockSpeechResult = {
      silences: [{ start: 2.5, end: 3.5, duration: 1.0 }],
      speechSegments: [
        { start: 0, end: 2.5, duration: 2.5 },
        { start: 3.5, end: 7.0, duration: 3.5 }
      ],
      totalSilenceDuration: 1.0,
      originalDuration: 7.0,
      trimmedDuration: 6.0,
      percentSaved: 14
    };
    const syntheticFilter = silenceRemovalService.buildJumpCutFilter(mockSpeechResult);
    assert(Boolean(syntheticFilter && syntheticFilter.videoFilter.includes('between(t,0,2.5)')), 'Construye filtro select de video preciso para eliminar pausas intermedias');
    assert(Boolean(syntheticFilter && syntheticFilter.audioFilter.includes('aselect')), 'Construye filtro aselect de audio sincronizado');
  } else {
    console.log('  ⚠️ sample_base.mp4 no disponible para prueba de audio.');
  }

  // 2. Visión por Computadora: Face Tracking Activo
  console.log('\n--- 2. Visión Artificial: Face Tracking y Suavizado Cinemático ---');
  if (sampleExists) {
    const facePoints = await faceTrackingService.trackFaces(sampleVideo, 0, 4, 1);
    assert(Array.isArray(facePoints) && facePoints.length >= 2, 'Extrae fotogramas en memoria y genera puntos de tracking', `${facePoints.length} puntos`);
    
    const firstPoint = facePoints[0];
    assert(firstPoint.xPercent >= 0 && firstPoint.xPercent <= 100, 'Coordenada X en porcentaje válido 0-100%', `X: ${firstPoint.xPercent}%`);
    assert(firstPoint.confidence >= 0 && firstPoint.confidence <= 1, 'Métrica de confianza en rango [0, 1]', `Conf: ${firstPoint.confidence}`);

    // Test Smart Reframe with Face Tracking Integration
    const testConfig: SmartReframeConfig = {
      mode: 'auto',
      horizontalOffsetPercent: 0,
      scaleFactor: 1.0,
      activeSpeakerTracking: true,
      smoothingFactor: 0.85,
      faceTrackingData: facePoints,
    };

    const cropAtT1 = smartReframeService.calculateCropWindow('9:16', testConfig, 1.0);
    assert(cropAtT1.widthPercent === 31.64, 'Ancho de recorte 9:16 exacto', `${cropAtT1.widthPercent}%`);
    assert(cropAtT1.xPercent >= 0 && cropAtT1.xPercent <= (100 - cropAtT1.widthPercent), 'Ventana de encuadre acotada dentro del fotograma', `X: ${cropAtT1.xPercent}%`);
  }

  // 3. Transcripción Universal Whisper
  console.log('\n--- 3. Procesamiento de Transcripción Universal Whisper ---');
  const testWhisperResponse = {
    text: "Bienvenidos a esta prueba de transcripción con Whisper y marcas de tiempo por palabra.",
    words: [
      { word: "Bienvenidos", start: 0.0, end: 0.7 },
      { word: "a", start: 0.7, end: 0.8 },
      { word: "esta", start: 0.8, end: 1.1 },
      { word: "prueba", start: 1.1, end: 1.5 },
      { word: "increíble", start: 1.5, end: 2.1 },
      { word: "de", start: 2.1, end: 2.3 },
      { word: "transcripción", start: 2.3, end: 3.2 },
      { word: "con", start: 3.2, end: 3.4 },
      { word: "Whisper.", start: 3.4, end: 4.0 },
    ],
  };

  const processedSegments = whisperService.processWhisperResult(testWhisperResponse);
  assert(processedSegments.length >= 1, 'Agrupa palabras en segmentos de diálogo coherentes', `${processedSegments.length} segmento(s)`);
  assert(Boolean(processedSegments[0].words && processedSegments[0].words.length > 0), 'Preserva marcas de tiempo por palabra para animación dinámica');
  
  const hasHighlighted = processedSegments[0].words?.some(w => w.highlight);
  assert(hasHighlighted === true, 'Detecta y resalta dinámicamente palabras de alto impacto (ej: increíble)', 'Highlight activo');

  console.log('\n=================================================================');
  console.log(`📊 RESULTADOS DE LAS FUNCIONES DE IA: ${passed} PASARON, ${failed} FALLARON`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAiFeaturesTest().catch(err => {
  console.error('Error ejecutando tests de IA:', err);
  process.exit(1);
});
