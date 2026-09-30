
import { byId, errorMessage, showError } from '../dom.js';
import { isAudioCaptureActive, listAudioSources, SYSTEM_SOURCE } from '../audioCapture.js';
import { isCapturing, notify, onChange, state, type View } from '../state.js';

const TITLES: Record<View, string> = { translate: 'Traduzir', transcribe: 'Transcrever', ask: 'Perguntar' };
const MODE_LABELS = { IDLE: 'PARADO', LISTENING: 'TRANSCREVENDO', TRANSLATING: 'TRADUZINDO', ERROR: 'ERRO' } as const;
const SOURCE_STORAGE_KEY = 'source';

const sourceSelect = () => byId<HTMLSelectElement>('source');
const nameInput = () => byId<HTMLInputElement>('sessionName');

export const selectedAudioSource = () => sourceSelect().value || SYSTEM_SOURCE;

function savedSource(): string {
  try { return localStorage.getItem(SOURCE_STORAGE_KEY) || SYSTEM_SOURCE; } catch { return SYSTEM_SOURCE; }
}

async function refreshAudioSources() {
  const sources = await listAudioSources();
  sourceSelect().replaceChildren(...sources.map((s) => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.label;
    return option;
  }));
  const saved = savedSource();
  sourceSelect().value = sources.some((s) => s.id === saved) ? saved : SYSTEM_SOURCE;
}

// --- nome da sessão ---
async function renameSession() {
  const session = state.session;
  if (!session) return;
  const name = nameInput().value.trim() || session.id;
  if (name === session.meta.name) return;
  try {
    await window.api.invoke('sessions:rename', name);
    session.meta.name = name;
    notify();
  } catch (err) {
    showError(errorMessage(err));
  }
}

let shownSessionKey = '';

function render() {
  byId('viewTitle').textContent = TITLES[state.view];

  const pill = byId('statePill');
  pill.textContent = MODE_LABELS[state.mode];
  pill.className = 'pill' + (isCapturing() ? ' on' : state.mode === 'ERROR' ? ' err' : '');

  sourceSelect().disabled = isCapturing();

  nameInput().hidden = state.view === 'translate' || !state.session;
  const key = state.session ? `${state.session.id}|${state.session.meta.name}` : '';
  if (key !== shownSessionKey) {
    shownSessionKey = key;
    nameInput().value = state.session?.meta.name ?? '';
  }
}

export function initHeader() {
  nameInput().onkeydown = (e) => { if (e.key === 'Enter') nameInput().blur(); };
  nameInput().onblur = renameSession;

  sourceSelect().onchange = () => {
    try { localStorage.setItem(SOURCE_STORAGE_KEY, sourceSelect().value); } catch {  }
  };
  navigator.mediaDevices.ondevicechange = () => { if (!isAudioCaptureActive()) refreshAudioSources(); };
  refreshAudioSources();

  byId('bannerClose').onclick = () => { byId('banner').hidden = true; };
  onChange(render);
}
