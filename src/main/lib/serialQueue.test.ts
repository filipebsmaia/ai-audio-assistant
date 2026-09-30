import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSerialQueue } from './serialQueue';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('createSerialQueue', () => {
  it('runs tasks one at a time, in order', async () => {
    const done: number[] = [];
    const queue = createSerialQueue(() => {});
    queue.run(async () => { await sleep(30); done.push(1); });
    queue.run(async () => { done.push(2); });
    await queue.drain();
    assert.deepEqual(done, [1, 2]);
  });

  it('reports a failed task and keeps running the next ones', async () => {
    const done: number[] = [];
    const errors: string[] = [];
    const queue = createSerialQueue((err) => errors.push(err.message));
    queue.run(async () => { throw new Error('boom'); });
    queue.run(async () => { done.push(2); });
    await queue.drain();
    assert.deepEqual(errors, ['boom']);
    assert.deepEqual(done, [2]);
  });
});
