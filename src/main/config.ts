import path from 'path';

try {
  process.loadEnvFile();
} catch {
  // 
}

const env = process.env;

export type ProviderKind = 'openai' | 'local';
const providerKind = (value: string | undefined): ProviderKind => (value === 'local' ? 'local' : 'openai');

export const config = {
  openai: {
    apiKey: env.OPENAI_API_KEY ?? '',
    translationModel: env.OPENAI_TRANSLATION_MODEL || 'gpt-realtime-translate',
    sourceTranscriptionModel: env.OPENAI_SOURCE_TRANSCRIPTION_MODEL || 'gpt-realtime-whisper',
    transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-live-transcribe',
    chatModel: env.OPENAI_CHAT_MODEL || 'gpt-6.1-sol',
  },
  transcriptionProvider: providerKind(env.TRANSCRIPTION_PROVIDER),
  translationProvider: providerKind(env.TRANSLATION_PROVIDER),
  localWhisperUrl: env.LOCAL_WHISPER_URL || 'http://localhost:8080',
  localLlmUrl: env.LOCAL_LLM_URL || 'http://localhost:8081',
  dataDir: path.resolve(env.DATA_DIR || 'data'),
  logAudioLevels: env.LOG_AUDIO_LEVELS === '1',
};

export function requireOpenAIKey(): string {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY não definido no .env (para rodar sem OpenAI, use os providers "local")');
  }
  return config.openai.apiKey;
}
