import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rms, toWav } from './pcm';

describe('rms', () => {
  it('returns 0 for silence and for an empty buffer', () => {
    assert.equal(rms(Buffer.alloc(9600)), 0);
    assert.equal(rms(Buffer.alloc(0)), 0);
  });

  it('returns 1 for a full-scale signal', () => {
    const full = Buffer.alloc(4);
    full.writeInt16LE(-32768, 0);
    full.writeInt16LE(-32768, 2);
    assert.equal(rms(full), 1);
  });
});

describe('toWav', () => {
  it('writes a 44-byte RIFF header for PCM16 mono 24 kHz', () => {
    const pcm = Buffer.alloc(9600);
    const wav = toWav(pcm);
    assert.equal(wav.length, 44 + pcm.length);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(22), 1); // mono
    assert.equal(wav.readUInt32LE(24), 24000);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.equal(wav.readUInt32LE(40), pcm.length);
  });
});
