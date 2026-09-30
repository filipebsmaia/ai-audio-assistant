import type { SessionData, SessionSummary, UiEvent } from './types';

export type IpcInvokeMap = {
  'translation:start': (targetLanguage: string) => void;
  'listening:start': () => SessionData;
  'capture:stop': (errorMessage?: string) => void;
  'sessions:list': () => SessionSummary[];
  'sessions:create': () => SessionData;
  'sessions:open': (id: string) => SessionData;
  'sessions:rename': (name: string) => void;
  'qa:ask': (question: string) => string;
  'file:save': (defaultName: string, text: string) => string | null;
};

export type IpcInvokeChannel = keyof IpcInvokeMap;
export type IpcSendChannel = 'audio:chunk';
export type IpcEventChannel = 'ui:event';

export interface RendererApi {
  sendAudio(chunk: Uint8Array): void;
  onEvent(listener: (event: UiEvent) => void): void;
  invoke<K extends IpcInvokeChannel>(channel: K, ...args: Parameters<IpcInvokeMap[K]>): Promise<ReturnType<IpcInvokeMap[K]>>;
}
