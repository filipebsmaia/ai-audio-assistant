import fs from 'fs';
import path from 'path';
import { config } from './config';
import type { Segment, SessionData, SessionMeta, SessionSummary } from '../shared/types';

const sessionsDir = () => path.join(config.dataDir, 'sessions');

const pad = (n: number) => String(n).padStart(2, '0');
const clockTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

function sessionDir(id: string): string {
  if (!/^[\w-]+$/.test(id)) throw new Error(`Sessão inválida: ${id}`);
  return path.join(sessionsDir(), id);
}

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file: string, data: unknown) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

export function createSession(): string {
  const now = new Date();
  const base = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  let id = base;
  for (let i = 2; fs.existsSync(sessionDir(id)); i++) id = `${base}-${i}`;
  const dir = sessionDir(id);
  fs.mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, 'metadata.json'), { name: id, createdAt: now.toISOString() } satisfies SessionMeta);
  writeJson(path.join(dir, 'transcript.json'), []);
  return id;
}

export function listSessions(): SessionSummary[] {
  if (!fs.existsSync(sessionsDir())) return [];
  return fs.readdirSync(sessionsDir())
    .filter((id) => fs.existsSync(path.join(sessionsDir(), id, 'metadata.json')))
    .sort()
    .reverse()
    .map((id) => ({ id, name: readJson<SessionMeta>(path.join(sessionsDir(), id, 'metadata.json')).name }));
}

export function loadSession(id: string): SessionData {
  const dir = sessionDir(id);
  const transcriptFile = path.join(dir, 'transcript.json');
  return {
    id,
    meta: readJson<SessionMeta>(path.join(dir, 'metadata.json')),
    segments: fs.existsSync(transcriptFile) ? readJson<Segment[]>(transcriptFile) : [],
  };
}

export function appendSegment(id: string, start: Date, text: string): Segment {
  const { meta, segments } = loadSession(id);
  const segment: Segment = { timestamp: elapsed(start.getTime() - Date.parse(meta.createdAt)), clock: clockTime(start), text };
  segments.push(segment);
  writeJson(path.join(sessionDir(id), 'transcript.json'), segments);
  fs.appendFileSync(path.join(sessionDir(id), 'transcript.txt'), `[${segment.clock}] ${text}\n`);
  return segment;
}

export function renameSession(id: string, name: string): void {
  const file = path.join(sessionDir(id), 'metadata.json');
  writeJson(file, { ...readJson<SessionMeta>(file), name });
}

export function formatTranscript(segments: Segment[]): string {
  return segments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n');
}
