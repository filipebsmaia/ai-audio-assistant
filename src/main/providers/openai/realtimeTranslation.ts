
import { config } from '../../config';
import { SPEECH_RMS } from '../../audio/pcm';
import { connectRealtime, type RealtimeSocket } from './realtimeSocket';
import type { TranslationProvider } from '../types';

const BURST_GAP_MS = 1500;
const ONSET_QUIET_MS = 700;

export function createOpenAITranslation(): TranslationProvider {
  let socket: RealtimeSocket | null = null;
  let firstChunkAt = 0, lastDeltaAt = 0, lastLoudAt = 0, speechOnsetAt = 0;
  let gotSource = false, gotTarget = false;

  return {
    name: 'openai',

    start(targetLanguage, handlers) {
      firstChunkAt = lastDeltaAt = lastLoudAt = speechOnsetAt = 0;
      gotSource = gotTarget = false;
      const since = () => `+${Date.now() - firstChunkAt}ms`;

      const s = connectRealtime(`wss://api.openai.com/v1/realtime/translations?model=${config.openai.translationModel}`, {
        onOpen: () => s.send({
          type: 'session.update',
          session: {
            audio: {
              input: { transcription: { model: config.openai.sourceTranscriptionModel } },
              output: { language: targetLanguage },
            },
          },
        }),
        onEvent: (e) => {
          if (e.type === 'session.input_transcript.delta') {
            if (!gotSource) { gotSource = true; console.log(`[translation] first source transcript ${since()}`); }
            handlers.onText('source', e.delta);
          } else if (e.type === 'session.output_transcript.delta') {
            const now = Date.now();
            if (!gotTarget) { gotTarget = true; console.log(`[translation] first translation ${since()}`); }
            if (now - lastDeltaAt >= BURST_GAP_MS && speechOnsetAt) {
              console.log(`[translation] speech onset → translation ${now - speechOnsetAt}ms`);
            }
            speechOnsetAt = 0;
            lastDeltaAt = now;
            handlers.onText('target', e.delta);
          }
        },
        onError: (message) => handlers.onError(`Tradução: ${message}`),
      });
      socket = s;
    },

    sendAudio(pcm, level) {
      if (!socket?.isOpen()) return;
      const now = Date.now();
      if (!firstChunkAt) { firstChunkAt = now; console.log('[translation] audio captured'); }
      if (level > SPEECH_RMS) {
        if (!speechOnsetAt && now - lastLoudAt >= ONSET_QUIET_MS) speechOnsetAt = now;
        lastLoudAt = now;
      }
      socket.send({ type: 'session.input_audio_buffer.append', audio: pcm.toString('base64') });
    },

    async stop() {
      const s = socket;
      socket = null;
      await s?.close({ send: { type: 'session.close' }, until: 'session.closed' });
    },
  };
}
