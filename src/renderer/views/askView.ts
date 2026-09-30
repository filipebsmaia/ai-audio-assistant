
import { byId, el, errorMessage, stickToBottom } from '../dom.js';
import { fileTimestamp, safeFileName, saveText } from '../save.js';
import { onChange, setView, state } from '../state.js';

type Exchange = { question: string; answer: string };
let exchanges: Exchange[] = [];
let exchangesSessionId: string | null = null;

const question = () => byId<HTMLTextAreaElement>('question');
const sendButton = () => byId<HTMLButtonElement>('askBtn');

async function ask() {
  const text = question().value.trim();
  if (!text || sendButton().disabled) return;
  question().value = '';
  question().style.height = '';

  const thread = byId('aThread');
  const row = el('div', 'row-user');
  row.appendChild(el('div', 'msg user', text));
  const answerBubble = el('div', 'msg thinking', 'Pensando');
  stickToBottom(thread, () => thread.append(row, answerBubble));
  byId('aEmpty').hidden = true;
  sendButton().disabled = true;

  let answer: string;
  try {
    answer = await window.api.invoke('qa:ask', text);
  } catch (err) {
    answer = `Erro: ${errorMessage(err)}`;
  }
  answerBubble.className = 'msg';
  stickToBottom(thread, () => { answerBubble.textContent = answer; });
  exchanges.push({ question: text, answer });
  sendButton().disabled = false;
  question().focus();
}

function renderInfo() {
  const info = byId('aInfo');
  const session = state.session;
  if (!session) {
    info.textContent = 'Nenhuma sessão aberta. Clique em 🎙 Ouvir ou em ＋ Nova sessão.';
    return;
  }
  const count = session.segments.length;
  const link = el('a', '', 'ver transcrição →');
  link.onclick = () => setView('transcribe');
  info.replaceChildren(document.createTextNode(`${count} segmento${count === 1 ? '' : 's'} em "${session.meta.name}" · `), link);
}

function render() {
  const sessionId = state.session?.id ?? null;
  if (sessionId !== exchangesSessionId) {
    exchangesSessionId = sessionId;
    exchanges = [];
    byId('aThread').replaceChildren(byId('aEmpty'));
  }
  byId('aEmpty').hidden = exchanges.length > 0;
  renderInfo();
}

const formatExchanges = () => exchanges.map((x) => `**Pergunta:** ${x.question}\n\n**Resposta:** ${x.answer}\n`).join('\n---\n\n');

export function initAskView() {
  sendButton().onclick = ask;
  question().onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };
  question().oninput = () => {
    question().style.height = 'auto';
    question().style.height = `${question().scrollHeight}px`;
  };
  byId('aSave').onclick = () => saveText(`perguntas_${safeFileName(state.session?.meta.name ?? fileTimestamp())}.md`, formatExchanges());
  onChange(render);
}
