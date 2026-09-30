
import type { TranslationPart } from '../../shared/types';

export type TranscriptionHandlers = {
  onDelta(text: string): void;
  onSegment(start: Date, text: string): void;
  onError(message: string): void;
};

export interface TranscriptionProvider {
  readonly name: string;
  start(handlers: TranscriptionHandlers): void;
  sendAudio(pcm: Buffer, level: number): void;
  stop(): Promise<void>;
}

export type TranslationHandlers = {
  onText(part: TranslationPart, text: string): void;
  onError(message: string): void;
};

export interface TranslationProvider {
  readonly name: string;
  start(targetLanguage: string, handlers: TranslationHandlers): void;
  sendAudio(pcm: Buffer, level: number): void;
  stop(): Promise<void>;
}
