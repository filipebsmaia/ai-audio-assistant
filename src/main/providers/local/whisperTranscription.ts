import { config } from '../../config';
import { toWav } from '../../audio/pcm';
import { createSpeechSegmenter } from '../../audio/speechSegmenter';
import { createSerialQueue } from '../../lib/serialQueue';
import type { TranscriptionHandlers, TranscriptionProvider } from '../types';

const SILENCE_MS = 500;
const MAX_SEGMENT_MS = 3000;
const NON_SPEECH = /^[\[(].*[\])]$/; 

async function transcribeWav(endpoint: string, wav: Buffer): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'segment.wav');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  const response = await fetch(endpoint, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${await response.text()}`);
  const { text = '' } = (await response.json()) as { text?: string };
  const trimmed = text.trim();
  return NON_SPEECH.test(trimmed) ? '' : trimmed;
}

export function createWhisperTranscription(baseUrl = config.localWhisperUrl): TranscriptionProvider {
  const endpoint = `${baseUrl}/inference`;
  let handlers: TranscriptionHandlers | null = null;
  let active = false;
  let chunks: Buffer[] = [];

  const queue = createSerialQueue((err) => {
    if (active) handlers?.onError(`Whisper local indisponível em ${endpoint}: ${err.message}. Rode docker compose up -d whisper`);
  });

  const segmenter = createSpeechSegmenter({
    silenceMs: SILENCE_MS,
    maxMs: MAX_SEGMENT_MS,
    onAudio: (chunk) => chunks.push(chunk),
    onEnd: (start) => {
      const pcm = Buffer.concat(chunks);
      chunks = [];
      queue.run(async () => {
        const startedAt = Date.now();
        const text = await transcribeWav(endpoint, toWav(pcm));
        console.log(`[whisper] ${pcm.length / 48}ms de áudio → ${Date.now() - startedAt}ms`);
        if (text) handlers?.onSegment(start, text);
      });
    },
  });

  return {
    name: 'local (whisper.cpp)',

    start(h) {
      handlers = h;
      active = true;
      chunks = [];
      segmenter.reset();
    },

    sendAudio(pcm, level) {
      if (active) segmenter.push(pcm, level);
    },

    async stop() {
      if (!active) return;
      segmenter.flush();
      await queue.drain();
      active = false;
    },
  };
}
