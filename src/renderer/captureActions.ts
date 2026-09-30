
import { startAudioCapture, stopAudioCapture } from './audioCapture.js';
import { errorMessage, hideError, showError } from './dom.js';
import { selectedAudioSource } from './views/header.js';

export function failCapture(message: string) {
  stopAudioCapture();
  showError(message);
  window.api.invoke('capture:stop', message);
}

export async function beginCapture<T>(startProvider: () => Promise<T>): Promise<T | undefined> {
  hideError();
  try {
    const result = await startProvider();
    await startAudioCapture(selectedAudioSource(), failCapture);
    return result;
  } catch (err) {
    failCapture(errorMessage(err));
    return undefined;
  }
}

export async function endCapture() {
  stopAudioCapture();
  await window.api.invoke('capture:stop');
}
