// Formato do áudio que circula no app: PCM16 mono little-endian a 24 kHz, em chunks de 200 ms.

export const SAMPLE_RATE = 24000;
export const CHUNK_MS = 200;
/** RMS acima disso conta como fala (VAD simples). */
export const SPEECH_RMS = 0.01;

/** Nível RMS de um chunk PCM16, de 0 a 1. */
export function rms(pcm: Buffer): number {
  const samples = Math.floor(pcm.length / 2);
  if (!samples) return 0;
  let sum = 0;
  for (let i = 0; i < samples * 2; i += 2) {
    const v = pcm.readInt16LE(i) / 32768;
    sum += v * v;
  }
  return Math.sqrt(sum / samples);
}

/** Envolve PCM16 mono num arquivo WAV (cabeçalho RIFF de 44 bytes). */
export function toWav(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // tamanho do bloco fmt
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits por amostra
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
