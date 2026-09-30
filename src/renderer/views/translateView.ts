
import { byId, el, stickToBottom } from '../dom.js';
import { fileTimestamp, saveText } from '../save.js';
import type { TranslationPart } from '../../shared/types';

const NEW_BUBBLE_GAP_MS = 1500;

type Pair = { source: string; target: string; sourceEl: HTMLElement; targetEl: HTMLElement };
const pairs: Pair[] = [];
let lastTextAt = 0;

export function appendTranslation(part: TranslationPart, text: string) {
  const thread = byId('tThread');
  const now = Date.now();
  if (!pairs.length || now - lastTextAt >= NEW_BUBBLE_GAP_MS) {
    const pair: Pair = { source: '', target: '', sourceEl: el('div', 'orig'), targetEl: el('div', 'trans') };
    const bubble = el('div', 'msg');
    bubble.append(pair.sourceEl, pair.targetEl);
    stickToBottom(thread, () => thread.appendChild(bubble));
    pairs.push(pair);
  }
  lastTextAt = now;
  const pair = pairs[pairs.length - 1];
  stickToBottom(thread, () => {
    if (part === 'source') pair.sourceEl.textContent = (pair.source += text);
    else pair.targetEl.textContent = (pair.target += text);
  });
  byId('tEmpty').hidden = true;
}

const formatPairs = () => pairs.map((p) => `Original: ${p.source.trim()}\nTradução: ${p.target.trim()}`).join('\n\n') + '\n';

export function initTranslateView() {
  byId('tSave').onclick = () => saveText(`traducao_${fileTimestamp()}.txt`, pairs.length ? formatPairs() : '');
}
