
import fs from 'fs';
import { dialog, ipcMain, type BrowserWindow } from 'electron';
import { config } from './config';
import { rms } from './audio/pcm';
import * as sessions from './sessionStore';
import { answerQuestion } from './providers/openai/questionAnswering';
import type { TranscriptionProvider, TranslationProvider } from './providers/types';
import type { IpcInvokeChannel, IpcInvokeMap } from '../shared/api';
import type { CaptureMode, UiEvent } from '../shared/types';

type Providers = { transcription: TranscriptionProvider; translation: TranslationProvider };

function handle<K extends IpcInvokeChannel>(
  channel: K,
  handler: (...args: Parameters<IpcInvokeMap[K]>) => ReturnType<IpcInvokeMap[K]> | Promise<ReturnType<IpcInvokeMap[K]>>,
) {
  ipcMain.handle(channel, (_event, ...args) => handler(...(args as Parameters<IpcInvokeMap[K]>)));
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null, { transcription, translation }: Providers) {
  let mode: CaptureMode = 'IDLE';
  let currentSessionId: string | null = null;

  const emit = (event: UiEvent) => getWindow()?.webContents.send('ui:event', event);
  const setMode = (next: CaptureMode) => { mode = next; emit({ kind: 'state', mode }); };
  const isCapturing = () => mode === 'LISTENING' || mode === 'TRANSLATING';
  const assertIdle = (message = 'Já existe uma captura ativa') => { if (isCapturing()) throw new Error(message); };
  const requireSession = () => {
    if (!currentSessionId) throw new Error('Nenhuma sessão aberta');
    return currentSessionId;
  };

  const stopAll = () => Promise.all([translation.stop(), transcription.stop()]);
  async function fail(message: string) {
    console.error('[error]', message);
    emit({ kind: 'error', message });
    await stopAll();
    setMode('ERROR');
  }

  let chunksPerSecond = 0, peakLevel = 0;
  if (config.logAudioLevels) {
    setInterval(() => {
      if (chunksPerSecond) console.log(`[audio] ${chunksPerSecond} chunks/s, rms max ${peakLevel.toFixed(4)}`);
      chunksPerSecond = peakLevel = 0;
    }, 1000);
  }

  ipcMain.on('audio:chunk', (_event, data: Uint8Array) => {
    const pcm = Buffer.from(data);
    const level = rms(pcm);
    chunksPerSecond++;
    peakLevel = Math.max(peakLevel, level);
    if (mode === 'TRANSLATING') translation.sendAudio(pcm, level);
    else if (mode === 'LISTENING') transcription.sendAudio(pcm, level);
  });

  // --- captura ---
  handle('translation:start', (targetLanguage) => {
    assertIdle();
    translation.start(targetLanguage, {
      onText: (part, text) => emit({ kind: 'translation', part, text }),
      onError: fail,
    });
    setMode('TRANSLATING');
  });

  handle('listening:start', () => {
    assertIdle();
    const id = (currentSessionId ??= sessions.createSession());
    transcription.start({
      onDelta: (text) => emit({ kind: 'transcript-delta', text }),
      onSegment: (start, text) => emit({ kind: 'segment', segment: sessions.appendSegment(id, start, text) }),
      onError: fail,
    });
    setMode('LISTENING');
    return sessions.loadSession(id);
  });

  handle('capture:stop', async (errorMessage) => {
    if (errorMessage) return fail(errorMessage);
    await stopAll();
    setMode('IDLE');
  });

  handle('sessions:list', () => sessions.listSessions());
  handle('sessions:create', () => sessions.loadSession((currentSessionId = sessions.createSession())));
  handle('sessions:open', (id) => {
    assertIdle('Pare a captura antes de trocar de sessão');
    const session = sessions.loadSession(id);
    currentSessionId = id;
    return session;
  });
  handle('sessions:rename', (name) => sessions.renameSession(requireSession(), name));

  handle('qa:ask', async (question) => {
    const { segments } = sessions.loadSession(requireSession());
    if (!segments.length) return 'A transcrição desta sessão está vazia.';
    return answerQuestion(question, sessions.formatTranscript(segments));
  });

  handle('file:save', async (defaultName, text) => {
    const win = getWindow();
    const result = win ? await dialog.showSaveDialog(win, { defaultPath: defaultName }) : await dialog.showSaveDialog({ defaultPath: defaultName });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, text, 'utf8');
    return result.filePath;
  });
}
