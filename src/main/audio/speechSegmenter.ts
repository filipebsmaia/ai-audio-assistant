import { CHUNK_MS, SPEECH_RMS } from './pcm';

export type SpeechSegmenterOptions = {
  silenceMs: number;
  maxMs: number;
  onAudio(chunk: Buffer): void;
  onEnd(start: Date): void;
};

export type SpeechSegmenter = {
  push(chunk: Buffer, level: number): void;
  flush(): void;
  reset(): void;
};

export function createSpeechSegmenter(options: SpeechSegmenterOptions): SpeechSegmenter {
  let start: Date | null = null;
  let bufferedMs = 0;
  let silenceMs = 0;
  let preroll: Buffer | null = null; 

  function reset() {
    start = null;
    bufferedMs = silenceMs = 0;
    preroll = null;
  }

  function end() {
    const segmentStart = start!;
    reset();
    options.onEnd(segmentStart);
  }

  function append(chunk: Buffer) {
    options.onAudio(chunk);
    bufferedMs += CHUNK_MS;
  }

  return {
    push(chunk, level) {
      const loud = level > SPEECH_RMS;
      if (!start) {
        if (!loud) {
          preroll = chunk;
          return;
        }
        start = new Date(Date.now() - (preroll ? CHUNK_MS : 0));
        if (preroll) append(preroll);
      }
      append(chunk);
      silenceMs = loud ? 0 : silenceMs + CHUNK_MS;
      if (silenceMs >= options.silenceMs || bufferedMs >= options.maxMs) end();
    },
    flush() {
      if (start) end();
    },
    reset,
  };
}
