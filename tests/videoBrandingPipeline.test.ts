import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('Video Automation & Branding Pipeline Test Suite', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'branding_test_'));
  const dummyVideo = path.join(tempDir, 'dummy_source.mp4');
  const dummyAudio = path.join(tempDir, 'dummy_dubbed.wav');
  const outputMp4 = path.join(tempDir, 'output_dubbed.mp4');

  it('Setup: generate short dummy video and audio via FFmpeg', () => {
    // Generate 1-sec test video (1280x720 24fps)
    const vRes = spawnSync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'testsrc=duration=1:size=1280x720:rate=24',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      dummyVideo
    ]);
    assert.strictEqual(vRes.status, 0, 'Failed to create test video');

    // Generate 1-sec audio sine wave
    const aRes = spawnSync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:duration=1',
      '-c:a', 'pcm_s16le',
      dummyAudio
    ]);
    assert.strictEqual(aRes.status, 0, 'Failed to create test audio');
  });

  it('Test 1: Run mux_video.py with full branding (Intro + Logo Watermark)', () => {
    const pyScript = path.resolve('mux_video.py');
    const res = spawnSync('python', [
      pyScript,
      '--video', dummyVideo,
      '--audio', dummyAudio,
      '--output', outputMp4,
      '--preset', 'ultrafast'
    ], { encoding: 'utf-8' });

    assert.strictEqual(res.status, 0, `mux_video.py failed: ${res.stderr || res.stdout}`);
    const parsed = JSON.parse(res.stdout.trim());
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.included_intro, true);
    assert.strictEqual(parsed.included_logo, true);
    assert.ok(fs.existsSync(outputMp4));
    assert.ok(fs.statSync(outputMp4).size > 100000);
  });

  it('Test 2: Run mux_video.py with --no-intro (Only Logo Watermark)', () => {
    const noIntroMp4 = path.join(tempDir, 'no_intro.mp4');
    const pyScript = path.resolve('mux_video.py');
    const res = spawnSync('python', [
      pyScript,
      '--video', dummyVideo,
      '--audio', dummyAudio,
      '--output', noIntroMp4,
      '--no-intro',
      '--preset', 'ultrafast'
    ], { encoding: 'utf-8' });

    assert.strictEqual(res.status, 0, `mux_video.py failed: ${res.stderr || res.stdout}`);
    const parsed = JSON.parse(res.stdout.trim());
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.included_intro, false);
    assert.strictEqual(parsed.included_logo, true);
    assert.ok(fs.existsSync(noIntroMp4));
  });

  it('Test 3: Cleanup temporary test artifacts', () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });
});
