import WebSocket from 'ws';
import { requireOpenAIKey } from '../../config';

export type RealtimeEvent = { type: string; [key: string]: any };

export type RealtimeSocketHandlers = {
  onOpen(): void;
  onEvent(event: RealtimeEvent): void;
  onError(message: string): void;
};

export type CloseOptions = {
  send?: object;
  until?: string | (() => boolean);
  timeoutMs?: number;
};

export type RealtimeSocket = {
  send(event: object): void;
  isOpen(): boolean;
  close(options?: CloseOptions): Promise<void>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function connectRealtime(url: string, handlers: RealtimeSocketHandlers): RealtimeSocket {
  const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${requireOpenAIKey()}` } });
  const seenTypes = new Set<string>();
  let closing = false;

  const fail = (message: string) => { if (!closing) handlers.onError(message); };

  ws.on('open', () => handlers.onOpen());
  ws.on('message', (data) => {
    const event: RealtimeEvent = JSON.parse(data.toString());
    seenTypes.add(event.type);
    if (event.type === 'error') fail(event.error?.message ?? JSON.stringify(event));
    else handlers.onEvent(event);
  });
  ws.on('error', (err) => fail(err.message));
  ws.on('close', (code, reason) => fail(`conexão fechada (${code} ${reason.toString()})`));

  const socket: RealtimeSocket = {
    send(event) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    },
    isOpen: () => ws.readyState === WebSocket.OPEN,
    async close({ send, until, timeoutMs = 3000 } = {}) {
      closing = true;
      if (send) socket.send(send);
      const done = typeof until === 'string' ? () => seenTypes.has(until) : until ?? (() => true);
      for (let waited = 0; waited < timeoutMs && socket.isOpen() && !done(); waited += 100) await sleep(100);
      ws.close();
    },
  };
  return socket;
}
