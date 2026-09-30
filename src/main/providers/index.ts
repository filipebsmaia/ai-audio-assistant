
import { config } from '../config';
import { createWhisperTranscription } from './local/whisperTranscription';
import { createLlmTranslation } from './local/llmTranslation';
import { createOpenAITranscription } from './openai/realtimeTranscription';
import { createOpenAITranslation } from './openai/realtimeTranslation';
import type { TranscriptionProvider, TranslationProvider } from './types';

export function createTranscriptionProvider(): TranscriptionProvider {
  return config.transcriptionProvider === 'local' ? createWhisperTranscription() : createOpenAITranscription();
}

export function createTranslationProvider(): TranslationProvider {
  return config.translationProvider === 'local' ? createLlmTranslation() : createOpenAITranslation();
}
