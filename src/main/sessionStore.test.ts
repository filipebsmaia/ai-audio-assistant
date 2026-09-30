import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// config.ts reads DATA_DIR on import: point it to a temp dir before loading the store
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'listener-test-'));
process.env.DATA_DIR = dataDir;
const store: typeof import('./sessionStore') = require('./sessionStore');

describe('sessionStore', () => {
  it('creates a session, appends segments, lists and renames it', () => {
    const id = store.createSession();
    const start = new Date(Date.parse(store.loadSession(id).meta.createdAt) + 5000);

    const segment = store.appendSegment(id, start, 'hello world');
    assert.equal(segment.timestamp, '00:00:05');
    assert.equal(store.loadSession(id).segments.length, 1);
    assert.match(fs.readFileSync(path.join(dataDir, 'sessions', id, 'transcript.txt'), 'utf8'), /\] hello world\n$/);

    store.renameSession(id, 'Meeting');
    assert.deepEqual(store.listSessions()[0], { id, name: 'Meeting' });
  });

  it('formats the transcript as "[HH:MM:SS] text" lines', () => {
    const segments = [
      { timestamp: '00:00:05', clock: '19:30:05', text: 'first' },
      { timestamp: '00:00:12', clock: '19:30:12', text: 'second' },
    ];
    assert.equal(store.formatTranscript(segments), '[00:00:05] first\n[00:00:12] second');
  });

  it('rejects session ids containing a path (../)', () => {
    assert.throws(() => store.loadSession('../outside'));
  });
});
