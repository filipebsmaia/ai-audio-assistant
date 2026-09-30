
import { all, byId } from '../dom.js';
import { beginCapture, endCapture } from '../captureActions.js';
import { isCapturing, onChange, setSession, state } from '../state.js';

async function startListening() {
  const session = await beginCapture(() => window.api.invoke('listening:start'));
  if (session) setSession(session);
}

function render() {
  const capturing = isCapturing();
  const startTranslation = byId<HTMLButtonElement>('tStart');
  startTranslation.hidden = state.mode === 'TRANSLATING';
  startTranslation.disabled = capturing;
  byId('tStop').hidden = state.mode !== 'TRANSLATING';
  byId<HTMLSelectElement>('target').disabled = capturing;
  all<HTMLButtonElement>('.listen-start').forEach((b) => { b.hidden = state.mode === 'LISTENING'; b.disabled = capturing; });
  all('.listen-stop').forEach((b) => { b.hidden = state.mode !== 'LISTENING'; });
}

export function initCaptureControls() {
  byId('tStart').onclick = () => beginCapture(() => window.api.invoke('translation:start', byId<HTMLSelectElement>('target').value));
  byId('tStop').onclick = endCapture;
  all('.listen-start').forEach((b) => { b.onclick = startListening; });
  all('.listen-stop').forEach((b) => { b.onclick = endCapture; });
  onChange(render);
}
