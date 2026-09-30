
import { byId, el, stickToBottom } from '../dom.js';
import { safeFileName, saveText } from '../save.js';
import { notify, onChange, state } from '../state.js';
import type { Segment, SessionData } from '../../shared/types';

function segmentBubble(segment: Segment) {
  const bubble = el('div', 'msg');
  bubble.append(el('span', 'ts', segment.timestamp), document.createTextNode(segment.text));
  return bubble;
}

const live = () => byId('live');

function clearLive() {
  live().hidden = true;
  live().textContent = '';
}

export function appendTranscriptDelta(text: string) {
  stickToBottom(byId('sThread'), () => {
    live().hidden = false;
    live().textContent += text;
  });
  notify();
}

export function appendSegment(segment: Segment) {
  state.session?.segments.push(segment);
  stickToBottom(byId('sThread'), () => {
    clearLive();
    byId('sList').appendChild(segmentBubble(segment));
  });
  notify();
}

let renderedSession: SessionData | null = null;

function render() {
  const session = state.session;
  
  if (session !== renderedSession) {
    renderedSession = session;
    byId('sList').replaceChildren(...(session?.segments ?? []).map(segmentBubble));
    clearLive();
    byId('sThread').scrollTop = byId('sThread').scrollHeight;
  }
  const count = session?.segments.length ?? 0;
  byId('sCount').textContent = `${count} segmento${count === 1 ? '' : 's'}${session ? ` · ${session.meta.name}` : ''}`;
  byId('sEmpty').hidden = count > 0 || !live().hidden;
}

export function initTranscribeView() {
  byId('sSave').onclick = () => {
    const session = state.session;
    if (!session) return saveText('transcricao.txt', '');
    saveText(`${safeFileName(session.meta.name)}.txt`, session.segments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n') + '\n');
  };
  onChange(render);
}
