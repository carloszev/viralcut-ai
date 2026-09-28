/**
 * Utilidad robusta para descarga directa, instantánea y sin bloqueos de archivos MP4 en el navegador
 */
export async function triggerBrowserFileDownload(downloadUrl: string, fileName: string): Promise<boolean> {
  // Asegurar URL absoluta si viene como ruta relativa
  const fullUrl = downloadUrl.startsWith('http') 
    ? downloadUrl 
    : `${window.location.origin}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;

  console.log('[DownloadHelper] Iniciando descarga directa para:', fileName, 'desde:', fullUrl);

  let success = false;

  // Método 1: Iframe invisible (técnica estándar de Google Drive / Dropbox para evitar bloqueador de popups en callbacks async)
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.border = 'none';
    iframe.src = fullUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch (_) {}
    }, 45000);

    success = true;
  } catch (iframeErr) {
    console.warn('[DownloadHelper] Aviso en iframe download:', iframeErr);
  }

  // Método 2: Enlace <a> con atributo download
  try {
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('rel', 'noopener noreferrer');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      } catch (_) {}
    }, 2000);

    success = true;
  } catch (linkErr) {
    console.warn('[DownloadHelper] Aviso en anchor download:', linkErr);
  }

  // Método 3: window.open de respaldo si los anteriores fallan
  if (!success) {
    try {
      window.open(fullUrl, '_blank');
      success = true;
    } catch (_) {}
  }

  return success;
}
