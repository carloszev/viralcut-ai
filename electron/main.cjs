const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 4000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Single instance lock (prevent multiple windows opening)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function checkServerReady(timeoutMs = 25000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      const req = http.get(`${SERVER_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => {
        retry();
      });
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        console.warn('[Electron] Timeout esperando al servidor backend.');
        resolve(false);
      } else {
        setTimeout(poll, 400);
      }
    };

    poll();
  });
}

function startBackendServer() {
  const isDev = !app.isPackaged;
  const projectRoot = isDev ? path.resolve(__dirname, '..') : path.resolve(process.resourcesPath, 'app');

  console.log('[Electron] Iniciando servidor backend en:', projectRoot);

  // Check if server is already running on port 4000
  http.get(`${SERVER_URL}/api/health`, (res) => {
    if (res.statusCode === 200) {
      console.log('[Electron] Servidor ya activo en http://localhost:4000');
    }
  }).on('error', () => {
    // 1. Check for bundled server first (production packaged or pre-compiled)
    const bundlePath = path.resolve(projectRoot, 'dist-server', 'index.cjs');
    if (fs.existsSync(bundlePath)) {
      try {
        console.log('[Electron] Cargando servidor Express empaquetado:', bundlePath);
        process.env.NODE_ENV = 'production';
        process.env.PORT = `${SERVER_PORT}`;
        process.env.VIRALCUT_DIST_DIR = path.resolve(projectRoot, 'dist');
        require(bundlePath);
        return;
      } catch (err) {
        console.error('[Electron] Error al cargar bundle compilado:', err);
      }
    }

    // 2. Fallback to tsx in development
    try {
      const tsxPath = path.resolve(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
      const serverEntry = path.resolve(projectRoot, 'server', 'index.ts');

      serverProcess = spawn(tsxPath, [serverEntry], {
        cwd: projectRoot,
        env: { ...process.env, NODE_ENV: 'production', PORT: `${SERVER_PORT}` },
        windowsHide: true,
        stdio: 'inherit'
      });

      serverProcess.on('error', (err) => {
        console.error('[Electron] Error al iniciar backend:', err);
      });
    } catch (e) {
      console.error('[Electron] Error al spawnear backend:', e);
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'ViralCut AI — Editor Inteligente',
    backgroundColor: '#030712',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  Menu.setApplicationMenu(null);

  // Open external links in default system browser (not inside desktop window)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startBackendServer();
  await checkServerReady();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
    } catch (_) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGKILL');
    } catch (_) {}
  }
});
