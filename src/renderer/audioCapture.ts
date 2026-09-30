// Captura de áudio no renderer: áudio do sistema (loopback) ou uma entrada (mic, Stereo Mix, cabo virtual).
// Envia ao main chunks PCM16 mono 24 kHz de 200 ms (4800 amostras).

export const SYSTEM_SOURCE = 'system';

// AudioWorklet inline (Blob URL): converte Float32 → Int16 e agrupa em 4800 amostras.
const PCM16_WORKLET = `
class Pcm16 extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(4800); this.n = 0; }
  process(inputs) {
    const ch = inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === 4800) {
        this.port.postMessage(this.buf.buffer, [this.buf.buffer]);
        this.buf = new Int16Array(4800); this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm16', Pcm16);`;

let active: { stream: MediaStream; context: AudioContext } | null = null;

export const isAudioCaptureActive = () => active !== null;

async function openStream(source: string): Promise<MediaStream> {
  if (source === SYSTEM_SOURCE) {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stream.getVideoTracks().forEach((track) => {
      track.stop(); stream.removeTrack(track);
    });
    return stream;
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: source }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
}

export async function startAudioCapture(source: string, onError: (message: string) => void) {
  const stream = await openStream(source);
  const track = stream.getAudioTracks()[0];
  if (!track) throw new Error('Nenhuma trilha de áudio disponível');
  track.onended = () => onError('A captura de áudio foi encerrada');

  const context = new AudioContext({ sampleRate: 24000 });
  await context.audioWorklet.addModule(URL.createObjectURL(new Blob([PCM16_WORKLET], { type: 'application/javascript' })));
  const worklet = new AudioWorkletNode(context, 'pcm16', { channelCount: 1, channelCountMode: 'explicit' });
  worklet.port.onmessage = (event) => window.api.sendAudio(new Uint8Array(event.data));
  const mute = context.createGain();
  mute.gain.value = 0;
  context.createMediaStreamSource(stream).connect(worklet).connect(mute).connect(context.destination);
  active = { stream, context };
}

export function stopAudioCapture() {
  if (!active) return;
  active.stream.getTracks().forEach((track) => { track.onended = null; track.stop(); });
  active.context.close();
  active = null;
}

/** Opções do seletor: áudio do sistema (saída padrão) + todas as entradas. */
export async function listAudioSources(): Promise<{ id: string; label: string }[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const output = devices.find((d) => d.kind === 'audiooutput' && d.deviceId === 'default');
  const inputs = devices.filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
  const outputName = output?.label.replace(/^(Default|Padrão) - /, '');
  return [
    { id: SYSTEM_SOURCE, label: `🔊 Áudio do sistema${outputName ? ` (${outputName})` : ''}` },
    ...inputs.map((d, i) => ({ id: d.deviceId, label: `🎙 ${d.label || `Entrada ${i + 1}`}` })),
  ];
}

