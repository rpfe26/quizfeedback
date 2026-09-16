const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');
const http = require('node:http');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3050;

// Démarrer le serveur interne pour l'accès complet aux APIs H5P et SQLite
async function startInternalServer() {
  try {
    const serverModule = await import('../server/server.mjs');
    console.log('[Electron] Serveur interne démarré sur le port', PORT);
  } catch (err) {
    console.warn('[Electron] Le serveur sera accessible en externe ou déjà lancé:', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 650,
    title: 'QuizFeedback • Feedbacks Pascal Pansu & Export LogiQuiz',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const isDev = process.env.ELECTRON_DEV === '1';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5180');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // En production : charger via l'URL du serveur interne local
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  // Ouvrir les liens externes (Quiz Wizard, La Digitale, etc.) dans le navigateur par défaut
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Menu de l'application
function setupMenu() {
  const template = [
    {
      label: 'QuizFeedback',
      submenu: [
        { role: 'about', label: 'À propos de QuizFeedback' },
        { type: 'separator' },
        { role: 'hide', label: 'Masquer QuizFeedback' },
        { role: 'hideOthers', label: 'Masquer les autres' },
        { role: 'unhide', label: 'Tout afficher' },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter QuizFeedback' }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'forceReload', label: 'Rechargement forcé' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' }
      ]
    },
    {
      label: 'Aide & Outils',
      submenu: [
        {
          label: 'Accéder à Quiz Wizard en ligne',
          click: () => shell.openExternal('https://app.getquizwizard.com/create-content/source')
        },
        {
          label: 'Télécharger LogiQuiz (La Digitale)',
          click: () => shell.openExternal('https://ladigitale.dev/logiquiz/')
        },
        {
          label: 'Publier sur Digiquiz (La Digitale)',
          click: () => shell.openExternal('https://digiquiz.ladigitale.dev/')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  setupMenu();
  await startInternalServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
