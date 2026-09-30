
import { config } from '../../config';
import { createSpeechSegmenter, type SpeechSegmenter } from '../../audio/speechSegmenter';
import { connectRealtime, type RealtimeSocket } from './realtimeSocket';
import type { TranscriptionProvider } from '../types';

const URL = 'wss://api.openai.com/v1/realtime?intent=transcription';

type Commit = { start: Date; sentAt: number };

export function createOpenAITranscription(): TranscriptionProvider {
  let socket: RealtimeSocket | null = null;
  let segmenter: SpeechSegmenter | null = null;
  const awaitingCommitted: Commit[] = [];
  const awaitingTranscript = new Map<string, Commit>();

  return {
    name: 'openai',

    start(handlers) {
      awaitingCommitted.length = 0;
      awaitingTranscript.clear();

      const s = connectRealtime(URL, {
        onOpen: () => s.send({
          type: 'session.update',
          session: {
            type: 'transcription',
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                transcription: { model: config.openai.transcriptionModel, delay: 'low' },
                turn_detection: null,
              },
            },
          },
        }),
        onEvent: (e) => {
          if (e.type === 'input_audio_buffer.committed') {
            const commit = awaitingCommitted.shift();
            if (commit) awaitingTranscript.set(e.item_id, commit);
          } else if (e.type === 'conversation.item.input_audio_transcription.delta') {
            handlers.onDelta(e.delta);
          } else if (e.type === 'conversation.item.input_audio_transcription.completed') {
            const commit = awaitingTranscript.get(e.item_id);
            awaitingTranscript.delete(e.item_id);
            if (commit) console.log(`[transcription] commit → completed ${Date.now() - commit.sentAt}ms`);
            const text = String(e.transcript ?? '').trim();
            if (text) handlers.onSegment(commit?.start ?? new Date(), text);
          }
        },
        onError: (message) => handlers.onError(`Transcrição: ${message}`),
      });

      socket = s;
      segmenter = createSpeechSegmenter({
        silenceMs: 700,
        maxMs: 15000,
        onAudio: (chunk) => s.send({ type: 'input_audio_buffer.append', audio: chunk.toString('base64') }),
        onEnd: (start) => {
          s.send({ type: 'input_audio_buffer.commit' });
          awaitingCommitted.push({ start, sentAt: Date.now() });
        },
      });
    },

    sendAudio(pcm, level) {
      if (socket?.isOpen()) segmenter?.push(pcm, level);
    },

    async stop() {
      const s = socket;
      if (!s) return;
      segmenter?.flush();
      socket = segmenter = null;
      await s.close({ until: () => !awaitingCommitted.length && !awaitingTranscript.size });
    },
  };
}
