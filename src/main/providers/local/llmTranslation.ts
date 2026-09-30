import { config } from '../../config';
import { createSerialQueue } from '../../lib/serialQueue';
import { createWhisperTranscription } from './whisperTranscription';
import type { TranslationHandlers, TranslationProvider } from '../types';

const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'Brazilian Portuguese', en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', ja: 'Japanese',
};

async function translateText(endpoint: string, text: string, targetLanguage: string): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: `Translate the user's text to ${LANGUAGE_NAMES[targetLanguage] ?? targetLanguage}. Output only the translation, nothing else.` },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_tokens: 256,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return (body.choices?.[0]?.message?.content ?? '').trim();
}

export function createLlmTranslation(baseUrl = config.localLlmUrl): TranslationProvider {
  const endpoint = `${baseUrl}/v1/chat/completions`;
  const whisper = createWhisperTranscription();
  let handlers: TranslationHandlers | null = null;
  let active = false;

  const queue = createSerialQueue((err) => {
    if (active) handlers?.onError(`LLM local indisponível em ${endpoint}: ${err.message}. Rode docker compose up -d llm`);
  });

  return {
    name: 'local (whisper.cpp + llama.cpp)',

    start(targetLanguage, h) {
      handlers = h;
      active = true;
      whisper.start({
        onDelta: () => {},
        onSegment: (_start, text) => {
          h.onText('source', text + ' ');
          queue.run(async () => {
            const startedAt = Date.now();
            const translated = await translateText(endpoint, text, targetLanguage);
            console.log(`[local-translate] ${Date.now() - startedAt}ms`);
            if (translated) h.onText('target', translated + ' ');
          });
        },
        onError: h.onError,
      });
    },

    sendAudio: (pcm, level) => whisper.sendAudio(pcm, level),

    async stop() {
      await whisper.stop();
      await queue.drain();
      active = false;
    },
  };
}
