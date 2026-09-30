
import type { CaptureMode, SessionData } from '../shared/types';

export type View = 'translate' | 'transcribe' | 'ask';

export const state = {
  mode: 'IDLE' as CaptureMode,
  view: 'translate' as View,
  session: null as SessionData | null,
};

const listeners: Array<() => void> = [];

export function onChange(listener: () => void) {
  listeners.push(listener);
}

export function notify() {
  for (const listener of listeners) listener();
}

export const isCapturing = () => state.mode === 'LISTENING' || state.mode === 'TRANSLATING';

export function setView(view: View) {
  state.view = view;
  notify();
}

export function setSession(session: SessionData) {
  state.session = session;
  notify();
}
