

export type CaptureMode = 'IDLE' | 'LISTENING' | 'TRANSLATING' | 'ERROR';

export type Segment = {
  timestamp: string;
  clock: string;
  text: string;
};

export type SessionMeta = { name: string; createdAt: string };
export type SessionData = { id: string; meta: SessionMeta; segments: Segment[] };
export type SessionSummary = { id: string; name: string };

export type TranslationPart = 'source' | 'target';

export type UiEvent =
  | { kind: 'state'; mode: CaptureMode }
  | { kind: 'translation'; part: TranslationPart; text: string }
  | { kind: 'transcript-delta'; text: string }
  | { kind: 'segment'; segment: Segment }
  | { kind: 'error'; message: string };
