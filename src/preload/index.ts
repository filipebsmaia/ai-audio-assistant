import { contextBridge, ipcRenderer } from 'electron';
import type { RendererApi } from '../shared/api';
import type { UiEvent } from '../shared/types';

const api: RendererApi = {
  sendAudio: (chunk) => ipcRenderer.send('audio:chunk', chunk),
  onEvent: (listener) => { ipcRenderer.on('ui:event', (_event, data: UiEvent) => listener(data)); },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
};

contextBridge.exposeInMainWorld('api', api);
