import path from 'path';
import { app, BrowserWindow, desktopCapturer, session } from 'electron';
import { registerIpcHandlers } from './ipc';
import { createTranscriptionProvider, createTranslationProvider } from './providers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    backgroundColor: '#212121',
    title: 'AI Audio Assistant',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  const transcription = createTranscriptionProvider();
  const translation = createTranslationProvider();
  console.log(`[providers] transcrição: ${transcription.name} | tradução: ${translation.name}`);

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then((sources) => callback({ video: sources[0], audio: 'loopback' }))
      .catch((err) => { console.error('[capture]', err); callback({}); });
  });

  registerIpcHandlers(() => mainWindow, { transcription, translation });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
