
import { all, byId, el, errorMessage, showError } from '../dom.js';
import { isCapturing, onChange, setSession, setView, state, type View } from '../state.js';
import type { SessionData } from '../../shared/types';

function sessionDateLabel(id: string) {
  const m = id.match(/^\d{4}-(\d{2})-(\d{2})_(\d{2})(\d{2})/);
  return m ? `${m[2]}/${m[1]} ${m[3]}:${m[4]}` : id;
}

function showSession(session: SessionData) {
  if (state.view === 'translate') state.view = 'transcribe';
  setSession(session);
}

async function openSession(id: string) {
  if (isCapturing()) return;
  try {
    showSession(await window.api.invoke('sessions:open', id));
  } catch (err) {
    showError(errorMessage(err));
  }
}

export async function refreshSessionList() {
  const sessions = await window.api.invoke('sessions:list');
  byId('sessionList').replaceChildren(...sessions.map((s) => {
    const item = el('button', 'item');
    item.dataset.id = s.id;
    item.append(document.createTextNode(s.name === s.id ? 'Sessão' : s.name), el('small', '', sessionDateLabel(s.id)));
    item.onclick = () => openSession(s.id);
    return item;
  }));
  render();
}

let listedSessionKey = '';

function render() {
  const capturing = isCapturing();
  all('.nav').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
  byId<HTMLButtonElement>('newSession').disabled = capturing;
  all('#sessionList .item').forEach((item) => {
    item.classList.toggle('locked', capturing);
    item.classList.toggle('active', item.dataset.id === state.session?.id);
    item.title = capturing ? 'Pare a captura para trocar de sessão' : '';
  });
  
  const key = state.session ? `${state.session.id}|${state.session.meta.name}` : '';
  if (key !== listedSessionKey) {
    listedSessionKey = key;
    refreshSessionList();
  }
}

export function initSidebar() {
  all('.nav').forEach((button) => {
    button.onclick = () => {
      setView(button.dataset.view as View);
      if (state.view === 'ask') byId('question').focus();
    };
  });
  byId('newSession').onclick = async () => {
    try {
      showSession(await window.api.invoke('sessions:create'));
    } catch (err) {
      showError(errorMessage(err));
    }
  };
  onChange(render);
  refreshSessionList();
}
