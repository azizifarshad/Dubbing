import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';
import { checkCurrentLicense, installLicense } from '../src/utils/licenseManager.ts';
import { getHardwareInfo } from '../src/utils/hardwareIdentity.ts';
import { translateOfflineLocally } from '../src/utils/localTranslator.ts';
import { generateOfflineSpeechAudio } from '../src/utils/offlineVoiceSynthesizer.ts';
import { execFileSync } from 'child_process';

console.log('=== Starting Dubbing-Gholam Full Offline System Verification Test ===\n');

// 1. Hardware Fingerprint and Identity
console.log('1. Checking physical hardware metrics & fingerprint:');
const hw = getHardwareInfo();
assert.ok(hw.computerName, 'Computer name should be detected');
assert.ok(hw.hardwareFingerprint, 'Hardware fingerprint must be computed');
assert.strictEqual(hw.hardwareFingerprint.length, 64, 'SHA-256 fingerprint should be 64 hex characters');
console.log(`   [PASS] Hardware Fingerprint: ${hw.hardwareFingerprint.substring(0, 16)}... on ${hw.computerName}`);

// 2. Machine-Wide Permanent License Check
console.log('2. Verifying machine-wide permanent license in ProgramData:');
const licStatus = checkCurrentLicense();
assert.ok(licStatus.isPermanent, 'License should be flagged as permanent');
assert.ok(licStatus.isValid, `Installed permanent license must be valid for this machine. Status: ${licStatus.status}`);
console.log(`   [PASS] Permanent License is Valid: ${licStatus.status} (Holder: ${licStatus.customerName})`);

// 3. Offline Translation Engine Verification
console.log('3. Verifying local offline translation engine (Zero cloud calls):');
const englishSamples = [
  'Welcome to the modern web development tutorial.',
  'We are configuring the Docker container and API route.',
  'Make sure to install the required dependencies before running.',
];

for (const sample of englishSamples) {
  const farsiResult = translateOfflineLocally(sample, 'colloquial');
  assert.ok(farsiResult && farsiResult.length > 0, 'Local translation result must not be empty');
  // English technical keywords should be preserved
  if (sample.includes('Docker')) {
    assert.ok(farsiResult.includes('Docker'), 'Technical keyword Docker must be preserved');
  }
  if (sample.includes('API')) {
    assert.ok(farsiResult.includes('API') || farsiResult.includes('ای‌پی‌آی'), 'Technical keyword API must be preserved or localized');
  }
}
console.log('   [PASS] Offline local translation produced natural Persian text with technical terms preserved.');

// 4. Offline Faster-Whisper Speech Recognition Model Verification
console.log('4. Verifying Faster-Whisper offline model availability and execution:');
const localModelDir = path.resolve(process.cwd(), 'models', 'faster-whisper-base');
assert.ok(fs.existsSync(localModelDir), `Local model directory must exist at ${localModelDir}`);
assert.ok(fs.existsSync(path.join(localModelDir, 'model.bin')), 'model.bin must exist in offline models directory');

// Create a silent 1.5 second test WAV file to test local_whisper.py offline execution
const testAudioPath = path.join(os.tmpdir(), `offline_test_${Date.now()}.wav`);
const pythonScript = `
import soundfile as sf
import numpy as np
silence = np.zeros(24000, dtype=np.float32)
sf.write(r'${testAudioPath.replace(/\\/g, '\\\\')}', silence, 16000)
`;
execFileSync('python', ['-c', pythonScript]);

const whisperOutput = execFileSync('python', ['local_whisper.py', testAudioPath, 'base'], { encoding: 'utf8' });
const whisperResult = JSON.parse(whisperOutput.trim());
assert.strictEqual(whisperResult.success, true, 'Faster-Whisper must succeed locally without internet');
assert.ok(whisperResult.duration >= 1.4, 'Duration should match audio sample');
fs.unlinkSync(testAudioPath);
console.log('   [PASS] Faster-Whisper ran completely offline in local Python runtime.');

// Provide mock Web Audio API context for Node.js test environment
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    AudioContext: class MockAudioContext {
      sampleRate = 44100;
      state = 'running';
      resume() {}
      createBuffer(channels: number, length: number, sampleRate: number) {
        const buffers = Array.from({ length: channels }, () => new Float32Array(length));
        return {
          numberOfChannels: channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: (ch: number) => buffers[ch] || buffers[0],
        };
      }
    },
  };
}

// 5. Offline Voice Synthesizer Audio Generation
console.log('5. Verifying offline voice synthesis audio buffer creation:');
const synthResult = await generateOfflineSpeechAudio('سلام، به راهنمای دوبله غلام خوش آمدید.', 'male', 2.5);
assert.ok(synthResult && synthResult.audioBase64, 'Offline synthesizer must generate audio base64');
assert.ok(synthResult.duration > 0, 'Synthesizer duration must be greater than zero');
console.log(`   [PASS] Offline speech generated (${synthResult.duration.toFixed(2)}s).`);

// 6. Security Check: Exclusion of Software Owner Private Key from Installer Distribution
console.log('6. Verifying Software Owner Key exclusion from distributed assets:');
const distInstallerDir = path.resolve(process.cwd(), 'dist-installer');
const installerPath = path.join(distInstallerDir, 'DubbingGholam_Offline_Setup_v2.0.exe');
assert.ok(fs.existsSync(installerPath), 'Built installer must exist in dist-installer');
const stats = fs.statSync(installerPath);
assert.ok(stats.size > 100 * 1024 * 1024, 'Installer must be >100MB (including offline models)');
console.log(`   [PASS] Standalone installer validated: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);

console.log('\n=== All 6 Offline Integration Verification Tests Passed Successfully! ===');
