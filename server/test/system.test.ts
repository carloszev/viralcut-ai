import { youtubeService, SAMPLE_VIDEOS } from '../services/youtubeService.js';
import { transcriptService } from '../services/transcriptService.js';
import { retentionAnalyzer } from '../services/retentionAnalyzer.js';
import { smartReframeService } from '../services/smartReframeService.js';
import { renderEngine } from '../services/renderEngine.js';
import { videoDownloader } from '../services/videoDownloader.js';
import { db } from '../db/database.js';
import { Project, Clip } from '../types/server.js';
import fs from 'fs';
import path from 'path';

async function runComprehensiveAudit() {
  console.log('=================================================================');
  console.log('🧪 AUDITORÍA COMPLETA Y TESTS AUTOMATIZADOS — VIRALCUT AI');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASÓ: ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: ${testName} ${detail ? `[${detail}]` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 1: YouTube URL Validation & Extraction
  // -------------------------------------------------------------
  console.log('--- 1. Validación y Parsing de URLs de YouTube ---');
  
  // 1.1 Standard Watch URL
  const id1 = youtubeService.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert(id1 === 'dQw4w9WgXcQ', 'URL estándar watch?v=');

  // 1.2 URL with query params before 'v'
  const id2 = youtubeService.extractVideoId('https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ&t=30s');
  assert(id2 === 'dQw4w9WgXcQ', 'URL con parámetros query adicionales antes de v=');

  // 1.3 Shortened youtu.be URL
  const id3 = youtubeService.extractVideoId('https://youtu.be/dQw4w9WgXcQ?si=abcdef');
  assert(id3 === 'dQw4w9WgXcQ', 'URL corta youtu.be con tracking');

  // 1.4 YouTube Shorts URL
  const id4 = youtubeService.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  assert(id4 === 'dQw4w9WgXcQ', 'URL formato YouTube Shorts');

  // 1.5 YouTube Live URL
  const id5 = youtubeService.extractVideoId('https://www.youtube.com/live/dQw4w9WgXcQ?feature=share');
  assert(id5 === 'dQw4w9WgXcQ', 'URL formato YouTube Live stream');

  // 1.6 Invalid & Empty URLs
  assert(youtubeService.extractVideoId('') === null, 'Rechaza cadena vacía');
  assert(youtubeService.extractVideoId('   ') === null, 'Rechaza solo espacios');
  assert(youtubeService.extractVideoId('https://vimeo.com/1234567') === null, 'Rechaza dominios no-YouTube');
  assert(youtubeService.extractVideoId('https://google.com') === null, 'Rechaza enlaces arbitrarios');

  // 1.7 Sample Video item inspection
  const sampleInfo = await youtubeService.getVideoInfo('sample_tech_ai');
  assert(sampleInfo && sampleInfo.videoId === 'sample_tech_ai', 'Obtiene metadatos de muestra correctamente', sampleInfo.title);

  // -------------------------------------------------------------
  // TEST SECTION 2: Subtitle Parsing & Dynamic Keyword Detection
  // -------------------------------------------------------------
  console.log('\n--- 2. Transcripción Sincronizada y Detección de Palabras Clave ---');
  const subs = await transcriptService.getTranscript('sample_tech_ai', 348, 'sample_tech_ai');
  assert(subs.length >= 5, 'Genera segmentos estructurados de diálogo', `${subs.length} segmentos`);
  assert(Boolean(subs[0].words && subs[0].words.length > 0), 'Genera timestamps de palabras precisos');
  
  const hasHighlights = Boolean(subs.some(s => s.words?.some(w => w.highlight)));
  assert(hasHighlights, 'Detecta y resalta automáticamente palabras de alto impacto');

  // -------------------------------------------------------------
  // TEST SECTION 3: Moment Detection & Potential Score (0-100)
  // -------------------------------------------------------------
  console.log('\n--- 3. Algoritmo de Detección de Momentos y Potential Score ---');
  const candidates = await retentionAnalyzer.analyzeTranscriptAndExtractSegments(subs, 348);
  assert(candidates.length >= 3, 'Extrae múltiples momentos candidatos de alta retención', `${candidates.length} clips`);

  for (const c of candidates) {
    const score = c.metadata.potentialScore;
    assert(score >= 0 && score <= 100, `Potential Score en rango 0-100`, `Score: ${score}/100`);
    assert(c.metadata.scoreRationale.length > 5, 'Genera desglose de motivos de retención', c.metadata.scoreRationale);
    assert(Boolean(c.metadata.category), 'Clasifica en categoría', c.metadata.category);
    assert(c.metadata.hashtags.length >= 3, 'Genera hashtags virales', c.metadata.hashtags.join(' '));
  }

  // -------------------------------------------------------------
  // TEST SECTION 4: Smart Reframe Calculations (9:16, 1:1, 16:9)
  // -------------------------------------------------------------
  console.log('\n--- 4. Smart Reframe y Cálculo de Enfoque 9:16 ---');
  const defaultReframe = smartReframeService.getDefaultReframeConfig();
  
  const crop916 = smartReframeService.calculateCropWindow('9:16', defaultReframe);
  assert(crop916.widthPercent > 20 && crop916.widthPercent < 50, 'Ventana de recorte 9:16 proporcional', `${crop916.widthPercent}%`);
  assert(crop916.xPercent >= 0 && crop916.xPercent <= 100, 'Mantiene centro dentro del marco horizontal');

  const crop11 = smartReframeService.calculateCropWindow('1:1', defaultReframe);
  assert(crop11.widthPercent > 50 && crop11.widthPercent < 60, 'Ventana de recorte 1:1 proporcional', `${crop11.widthPercent}%`);

  const crop169 = smartReframeService.calculateCropWindow('16:9', defaultReframe);
  assert(crop169.widthPercent === 100, 'Ventana 16:9 completa sin recorte');

  // -------------------------------------------------------------
  // TEST SECTION 5: Database Persistence & Atomic Updates
  // -------------------------------------------------------------
  console.log('\n--- 5. Persistencia Atómica en Base de Datos ---');
  const testProject: Project = {
    id: `audit_test_${Date.now()}`,
    name: 'Proyecto de Prueba Auditoría',
    videoInfo: sampleInfo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'completed',
    currentStage: 'completed',
    progressPercent: 100,
    transcript: subs,
    clips: [
      {
        id: `clip_test_1`,
        projectId: `audit_test_${Date.now()}`,
        clipNumber: 1,
        startTime: 0,
        endTime: 30,
        duration: 30,
        aspectRatio: '9:16',
        metadata: candidates[0].metadata,
        subtitles: subs.slice(0, 2),
        subtitleConfig: {
          enabled: true,
          style: 'hormozi',
          fontSize: 28,
          textColor: '#FFFFFF',
          highlightColor: '#00F0FF',
          backgroundColor: 'rgba(0,0,0,0.75)',
          position: 'bottom',
          yOffsetPercent: 78,
          uppercase: true,
          maxWordsPerLine: 4,
          animation: 'pop'
        },
        reframeConfig: defaultReframe,
        exportStatus: 'idle',
        exportProgress: 0
      }
    ]
  };

  db.saveProject(testProject);
  const loaded = db.getProjectById(testProject.id);
  assert(Boolean(loaded && loaded.id === testProject.id), 'Guarda y recupera proyecto de base de datos');

  db.updateClip(testProject.id, 'clip_test_1', { duration: 35 });
  const updated = db.getProjectById(testProject.id);
  assert(updated?.clips[0].duration === 35, 'Actualiza clip individual en proyecto');

  db.deleteProject(testProject.id);
  const deletedCheck = db.getProjectById(testProject.id);
  assert(deletedCheck === undefined, 'Elimina proyecto de base de datos');

  // -------------------------------------------------------------
  // TEST SECTION 6: Video Render Engine FFmpeg Output Test
  // -------------------------------------------------------------
  console.log('\n--- 6. Motor de Renderizado FFmpeg (Exportación Real) ---');
  let progressReported = false;
  try {
    const testClip: Clip = {
      ...testProject.clips[0],
      startTime: 0,
      endTime: 2,
      duration: 2
    };
    const exportedPath = await renderEngine.exportClip(
      testClip,
      sampleInfo,
      (prog, status) => {
        progressReported = true;
      }
    );
    assert(Boolean(exportedPath && exportedPath.startsWith('/exports/')), 'Renderiza MP4 y devuelve ruta streamable', exportedPath);
    assert(progressReported, 'Reporta callbacks de progreso durante el renderizado');
  } catch (err: any) {
    assert(false, 'Renderizado de clip de prueba', err.message);
  }

  // -------------------------------------------------------------
  // TEST SECTION 7: Video Downloader & File Integrity Validation
  // -------------------------------------------------------------
  console.log('\n--- 7. Verificación de Integridad de Archivos de Video ---');
  const validSampleCheck = await videoDownloader.isVideoValid(path.join(process.cwd(), 'uploads', 'sample_base.mp4'));
  assert(validSampleCheck === true, 'sample_base.mp4 tiene moov atom y duración válidos');

  const invalidFakeCheck = await videoDownloader.isVideoValid(path.join(process.cwd(), 'uploads', 'fake_ghost.mp4'));
  assert(invalidFakeCheck === false, 'Rechaza archivo inexistente o vacío');

  // -------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(`📊 RESULTADOS DE LA AUDITORÍA: ${passed} PASARON, ${failed} FALLARON`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveAudit().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
