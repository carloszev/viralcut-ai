async function runChaosEdgeCaseTests() {
  console.log('====================================================');
  console.log('🌪️  EJECUTANDO TESTS DE CAOS Y CASOS LÍMITE (FASE 11)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string, detail?: string) {
    if (cond) {
      console.log(`  ✓ PASÓ: ${name} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: ${name} ${detail ? `[${detail}]` : ''}`);
      failed++;
    }
  }

  const BASE = 'http://localhost:4000/api';

  // Wait for server ready (up to 5 retries)
  for (let i = 0; i < 5; i++) {
    try {
      const ping = await fetch('http://localhost:4000/api/health');
      if (ping.ok) break;
    } catch {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // 1. Invalid URLs
  console.log('--- 1. Validación de URLs inválidas y malformadas ---');
  const resEmpty = await fetch(`${BASE}/videos/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: '' })
  });
  assert(resEmpty.status === 400, 'Rechaza URL vacía con 400', `Status: ${resEmpty.status}`);

  const resVimeo = await fetch(`${BASE}/videos/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://vimeo.com/987654321' })
  });
  assert(resVimeo.status === 400, 'Rechaza dominios no-YouTube con 400', `Status: ${resVimeo.status}`);

  const resGibberish = await fetch(`${BASE}/videos/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'random-gibberish-string' })
  });
  assert(resGibberish.status === 400, 'Rechaza texto no-URL con 400', `Status: ${resGibberish.status}`);

  // 2. Non-existent Project / Clip / File
  console.log('\n--- 2. Manejo de recursos inexistentes ---');
  const resBadProj = await fetch(`${BASE}/projects/non-existent-uuid-1234`);
  assert(resBadProj.status === 404, 'Proyecto inexistente responde 404', `Status: ${resBadProj.status}`);

  const resBadDelete = await fetch(`${BASE}/projects/non-existent-uuid-1234`, { method: 'DELETE' });
  assert(resBadDelete.status === 404, 'Eliminar proyecto inexistente responde 404', `Status: ${resBadDelete.status}`);

  const resBadExport = await fetch(`${BASE}/clips/non-existent-clip/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: 'non-existent-proj' })
  });
  assert(resBadExport.status === 404, 'Exportar clip inexistente responde 404', `Status: ${resBadExport.status}`);

  const resBadDownload = await fetch(`${BASE}/clips/download/ghost_video_99999.mp4`);
  assert(resBadDownload.status === 404, 'Descargar archivo inexistente responde 404', `Status: ${resBadDownload.status}`);

  // 3. Path Traversal Protection
  console.log('\n--- 3. Protección contra Path Traversal y Seguridad ---');
  const resTraversal = await fetch(`${BASE}/clips/download/..%2F..%2Fpackage.json`);
  assert(resTraversal.status === 404, 'Protección contra path traversal responde 404', `Status: ${resTraversal.status}`);

  // 4. Settings Update & Persistence
  console.log('\n--- 4. Actualización y Persistencia de Settings ---');
  const resSettingsGet = await fetch(`${BASE}/settings`);
  const settingsData = await resSettingsGet.json();
  assert(settingsData.success === true && settingsData.settings, 'Obtiene settings actuales');

  const prevAspect = settingsData.settings.defaultAspectRatio;
  const testAspect = prevAspect === '9:16' ? '1:1' : '9:16';
  const resSettingsPost = await fetch(`${BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ defaultAspectRatio: testAspect })
  });
  const updatedSettings = await resSettingsPost.json();
  assert(updatedSettings.settings.defaultAspectRatio === testAspect, 'Modifica y persiste settings correctamente');

  // Revert back
  await fetch(`${BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ defaultAspectRatio: prevAspect })
  });

  console.log('\n====================================================');
  console.log(`📊 RESULTADOS TESTS DE CAOS: ${passed} PASARON, ${failed} FALLARON`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runChaosEdgeCaseTests().catch((e) => {
  console.error('Fatal in chaos test:', e);
  process.exit(1);
});
