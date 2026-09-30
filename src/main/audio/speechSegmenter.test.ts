import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechSegmenter } from './speechSegmenter';

const LOUD = 0.5;
const QUIET = 0;
const chunk = (id: number) => Buffer.from([id, 0]);

function setup(silenceMs = 700, maxMs = 15000) {
  const audio: number[] = [];
  const ends: Date[] = [];
  const segmenter = createSpeechSegmenter({ silenceMs, maxMs, onAudio: (c) => audio.push(c[0]), onEnd: (s) => ends.push(s) });
  return { segmenter, audio, ends };
}

describe('createSpeechSegmenter', () => {
  it('emits nothing for silence only', () => {
    const { segmenter, audio, ends } = setup();
    for (let i = 0; i < 20; i++) segmenter.push(chunk(i), QUIET);
    assert.deepEqual(audio, []);
    assert.equal(ends.length, 0);
  });

  it('ends the segment after speech followed by silence, including one pre-roll chunk', () => {
    const { segmenter, audio, ends } = setup();
    segmenter.push(chunk(1), QUIET);
    segmenter.push(chunk(2), QUIET);
    segmenter.push(chunk(3), LOUD);
    for (let i = 4; i <= 7; i++) segmenter.push(chunk(i), QUIET); // 800 ms of silence
    assert.deepEqual(audio, [2, 3, 4, 5, 6, 7]);
    assert.equal(ends.length, 1);
  });

  it('cuts continuous speech at the max segment length', () => {
    const { segmenter, ends } = setup(700, 3000);
    for (let i = 0; i < 15; i++) segmenter.push(chunk(100), LOUD); // 15 × 200 ms = 3 s
    assert.equal(ends.length, 1);
  });

  it('does not resend a previous pre-roll chunk in the next segment', () => {
    const { segmenter, audio } = setup(700, 3000);
    segmenter.push(chunk(9), QUIET); // becomes the pre-roll
    for (let i = 0; i < 15; i++) segmenter.push(chunk(100), LOUD); // forced cut
    audio.length = 0;
    segmenter.push(chunk(101), LOUD); // speech right after the cut
    assert.deepEqual(audio, [101]);
  });

  it('flush() ends the open segment once', () => {
    const { segmenter, ends } = setup();
    segmenter.push(chunk(1), LOUD);
    segmenter.flush();
    segmenter.flush(); // no-op
    assert.equal(ends.length, 1);
  });
});
