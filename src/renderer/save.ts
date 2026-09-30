
import { errorMessage, showError, toast } from './dom.js';

const pad = (n: number) => String(n).padStart(2, '0');

export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'arquivo';

export function fileTimestamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export async function saveText(defaultName: string, text: string) {
  if (!text.trim()) return toast('Nada para salvar ainda');
  try {
    const file = await window.api.invoke('file:save', defaultName, text);
    if (file) toast(`Salvo em ${file}`);
  } catch (err) {
    showError(errorMessage(err));
  }
}
