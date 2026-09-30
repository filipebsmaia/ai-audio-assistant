import OpenAI from 'openai';
import { config, requireOpenAIKey } from '../../config';

const INSTRUCTIONS = `You answer questions about an audio transcript.
Use ONLY the transcript below. If the answer is not in it, say so plainly.
Cite the approximate time as [HH:MM:SS] for the parts you rely on.
Answer in the same language as the question.`;

const MAX_TRANSCRIPT_CHARS = 500_000;

export async function answerQuestion(question: string, transcript: string): Promise<string> {
  // Limitação: acima de 500k caracteres mantém só o fim da transcrição; // talvez compactar?
  const text = transcript.length > MAX_TRANSCRIPT_CHARS
    ? '[... início da transcrição truncado ...]\n' + transcript.slice(-MAX_TRANSCRIPT_CHARS)
    : transcript;
  const client = new OpenAI({ apiKey: requireOpenAIKey() });
  const response = await client.responses.create({
    model: config.openai.chatModel,
    instructions: INSTRUCTIONS,
    input: `Transcript:\n${text}\n\nQuestion: ${question}`,
  });
  return response.output_text;
}
