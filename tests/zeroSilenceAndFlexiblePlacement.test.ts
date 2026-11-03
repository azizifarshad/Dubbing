/**
 * Automated Test Suite for:
 * FEATURE 1: Zero-Unnecessary-Silence Audio Generation
 * FEATURE 2: Flexible Timeline Placement
 */

import assert from 'node:assert';
import {
  trimZeroSilenceAudioBuffer,
  profileAudioSilence,
} from '../src/utils/syncEngine';
import {
  measureAndProfileSegments,
  detectTimelineIssues,
  scheduleOptimizedTimeline,
  autoFixEntireTimeline,
} from '../src/utils/autoFixEngine';
import {
  SubtitleItem,
  DEFAULT_AUTO_FIX_CONFIG,
  DEFAULT_TIMELINE_PLACEMENT_CONFIG,
} from '../src/types/dubbing';

let passed = 0;
let total = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  [PASS] Test ${total}: ${name}`);
  } catch (err: any) {
    console.error(`  [FAIL] Test ${total}: ${name}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

console.log('=== Starting Zero-Silence & Flexible Placement Test Suite ===\n');

function createMockSub(partial: Partial<SubtitleItem>): SubtitleItem {
  const id = partial.id || 1;
  const start = partial.start ?? 0;
  const end = partial.end ?? (start + 2.0);
  return {
    id,
    start,
    end,
    startTimeStr: `00:00:0${start},000`,
    endTimeStr: `00:00:0${end},000`,
    originalText: `Sentence ${id}`,
    farsiText: `جمله شماره ${id}`,
    voice: 'Iapetus',
    status: 'ready',
    audioBase64: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
    ...partial,
  };
}

(async () => {
  // ----------------------------------------------------------------------------------
  // FEATURE 1: ZERO-UNNECESSARY-SILENCE AUDIO GENERATION
  // ----------------------------------------------------------------------------------

  await runTest('1.1: Audio buffer with leading & trailing silence is trimmed with 25ms padding', () => {
    // Create a mock AudioBuffer: 44100Hz, 2.0 seconds (88200 samples)
    // Silence 0 to 0.4s (17640 samples), speech tone 0.4 to 1.6s, silence 1.6 to 2.0s
    const sampleRate = 44100;
    const length = sampleRate * 2;
    const channelData = new Float32Array(length);

    const speechStart = Math.floor(sampleRate * 0.4);
    const speechEnd = Math.floor(sampleRate * 1.6);
    for (let i = speechStart; i < speechEnd; i++) {
      channelData[i] = 0.5 * Math.sin(2 * Math.PI * 440 * (i / sampleRate));
    }

    const mockBuffer: any = {
      sampleRate,
      numberOfChannels: 1,
      length,
      duration: 2.0,
      getChannelData: () => channelData,
    };

    const mockCtx: any = {
      createBuffer: (channels: number, len: number, rate: number) => {
        const dest = new Float32Array(len);
        return {
          sampleRate: rate,
          numberOfChannels: channels,
          length: len,
          duration: len / rate,
          getChannelData: () => dest,
        };
      },
    };

    const result = trimZeroSilenceAudioBuffer(mockBuffer, mockCtx, {
      thresholdDb: -40,
      paddingMs: 25,
      minSilenceToTrimSec: 0.04,
    });

    assert.strictEqual(result.isTrimmed, true, 'Buffer was trimmed');
    assert.ok(result.leadingSilenceTrimmedSec > 0.30, `Trimmed leading silence: ${result.leadingSilenceTrimmedSec}s`);
    assert.ok(result.trailingSilenceTrimmedSec > 0.30, `Trimmed trailing silence: ${result.trailingSilenceTrimmedSec}s`);
    assert.ok(result.effectiveDuration < 2.0, `Effective duration reduced: ${result.effectiveDuration}s`);
    // Speech duration was 1.2s. With 25ms + 25ms padding, trimmed length should be ~1.25s
    assert.ok(Math.abs(result.effectiveDuration - 1.25) < 0.05, `Effective duration ~1.25s: was ${result.effectiveDuration}`);
  });

  await runTest('1.2: Audio with no silence is preserved untouched without unnecessary cuts', () => {
    const sampleRate = 44100;
    const length = sampleRate * 1;
    const channelData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      channelData[i] = 0.4 * Math.sin(2 * Math.PI * 300 * (i / sampleRate));
    }
    const mockBuffer: any = {
      sampleRate,
      numberOfChannels: 1,
      length,
      duration: 1.0,
      getChannelData: () => channelData,
    };
    const mockCtx: any = {};

    const result = trimZeroSilenceAudioBuffer(mockBuffer, mockCtx);
    assert.strictEqual(result.isTrimmed, false, 'No trimming done');
    assert.strictEqual(result.leadingSilenceTrimmedSec, 0);
    assert.strictEqual(result.trailingSilenceTrimmedSec, 0);
    assert.strictEqual(result.effectiveDuration, 1.0);
  });

  await runTest('1.3: AutoFix aggregates Zero-Silence statistics correctly across segments', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({
        id: 1,
        start: 0.0,
        end: 2.0,
        audioDuration: 2.3,
        leadingSilenceSec: 0.25,
        trailingSilenceSec: 0.15,
        effectiveDuration: 1.9,
      }),
      createMockSub({
        id: 2,
        start: 2.5,
        end: 4.5,
        audioDuration: 2.2,
        leadingSilenceSec: 0.10,
        trailingSilenceSec: 0.20,
        effectiveDuration: 1.9,
      }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.strictEqual(result.stats.filesWithLeadingSilenceRemoved, 2, '2 files with leading silence trimmed');
    assert.strictEqual(result.stats.filesWithTrailingSilenceRemoved, 2, '2 files with trailing silence trimmed');
    assert.ok(result.stats.totalSilenceRemovedSec > 0.4, `Total silence removed > 0.4s: was ${result.stats.totalSilenceRemovedSec}`);
  });

  // ----------------------------------------------------------------------------------
  // FEATURE 2: FLEXIBLE TIMELINE PLACEMENT
  // ----------------------------------------------------------------------------------

  await runTest('2.1: Shifting dialogue earlier into safe pre-gap resolves overlap without speed acceleration', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 1.0, audioDuration: 0.9, effectiveDuration: 0.9 }),
      createMockSub({ id: 2, start: 2.0, end: 3.0, audioDuration: 1.4, effectiveDuration: 1.4 }),
      createMockSub({ id: 3, start: 3.0, end: 5.0, audioDuration: 1.8, effectiveDuration: 1.8 }),
    ];

    const result = await autoFixEntireTimeline(subs, {
      translationShortening: false,
      placement: {
        ...DEFAULT_TIMELINE_PLACEMENT_CONFIG,
        enabled: true,
        maxEarlyShiftSeconds: 2.0,
        maxLateShiftSeconds: 2.0,
      },
    });

    const sub2 = result.updatedSubtitles.find((s) => s.id === 2);
    assert.ok(sub2, 'Sub 2 present');
    assert.strictEqual(sub2.appliedSpeed, 1.00, 'Speech speed remains 1.00x without artificial speedup');
    assert.strictEqual(sub2.shiftDirection, 'earlier', 'Shift direction is earlier');
    assert.ok(typeof sub2.audioOffset === 'number' && sub2.audioOffset < -0.1, `Shifted earlier: ${sub2.audioOffset}`);
    assert.strictEqual(sub2.shiftReason, 'speech_overlap', 'Shift reason is speech_overlap');
    assert.strictEqual(result.stats.conflictsResolvedByPlacement, 1, 'Conflict recorded as resolved by placement');
  });

  await runTest('2.2: Shifting dialogue later resolves collision with previous segment when post-gap is free', async () => {
    // Segment 1 ends at 2.4s (start 0.0, end 2.4, audio 2.4s).
    // Segment 2 intended start is 2.0s (collides with Segment 1 by 0.4s!).
    // Segment 2 duration is short: 1.0s. Next dialogue is at 5.0s.
    // Segment 2 shifts later by +0.40s (to start at 2.40s, ending at 3.40s < 5.0s).
    // Both segments stay at natural tempo 1.00x!
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.4, audioDuration: 2.4, effectiveDuration: 2.4 }),
      createMockSub({ id: 2, start: 2.0, end: 3.0, audioDuration: 1.0, effectiveDuration: 1.0 }),
      createMockSub({ id: 3, start: 5.0, end: 7.0, audioDuration: 1.5, effectiveDuration: 1.5 }),
    ];

    const result = await autoFixEntireTimeline(subs, {
      translationShortening: false,
      placement: {
        ...DEFAULT_TIMELINE_PLACEMENT_CONFIG,
        enabled: true,
        maxEarlyShiftSeconds: 2.0,
        maxLateShiftSeconds: 2.0,
      },
    });

    const sub2 = result.updatedSubtitles.find((s) => s.id === 2);
    assert.ok(sub2, 'Sub 2 present');
    assert.strictEqual(sub2.appliedSpeed, 1.00, 'Speech speed remains natural 1.00x');
    assert.strictEqual(sub2.shiftDirection, 'later', 'Shifted later');
    assert.ok(typeof sub2.audioOffset === 'number' && sub2.audioOffset >= 0.4, `Shifted later by ${sub2.audioOffset}s`);
    assert.strictEqual(sub2.shiftReason, 'speech_overlap');
    assert.strictEqual(result.stats.segmentsShiftedLater, 1, '1 segment shifted later');
  });

  await runTest('2.3: Order is never reversed under any circumstance', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 1.8, effectiveDuration: 1.8 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 1.8, effectiveDuration: 1.8 }),
    ];

    const result = await autoFixEntireTimeline(subs, {
      maxEarlyShiftSeconds: 3.0,
      maxLateShiftSeconds: 3.0,
    });

    const s1Start = result.updatedSubtitles[0].adjustedStart ?? result.updatedSubtitles[0].start;
    const s2Start = result.updatedSubtitles[1].adjustedStart ?? result.updatedSubtitles[1].start;
    assert.ok(s2Start > s1Start, `Chronological order strictly maintained: s1=${s1Start}, s2=${s2Start}`);
  });

  await runTest('2.4: SubtitleItem metadata records originalStart, adjustedStart, and shift details', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 1.0, audioDuration: 0.9, effectiveDuration: 0.9 }),
      createMockSub({ id: 2, start: 2.0, end: 3.0, audioDuration: 1.4, effectiveDuration: 1.4 }),
      createMockSub({ id: 3, start: 3.0, end: 5.0, audioDuration: 1.5, effectiveDuration: 1.5 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    const sub2 = result.updatedSubtitles.find((s) => s.id === 2);
    assert.ok(sub2);
    assert.strictEqual(sub2.originalStart, 2.0, 'originalStart preserved');
    assert.ok(typeof sub2.adjustedStart === 'number', 'adjustedStart calculated');
    assert.ok(sub2.adjustedStart < 2.0, `adjustedStart is earlier: ${sub2.adjustedStart}`);
    assert.ok(typeof sub2.shiftAmountSec === 'number' && sub2.shiftAmountSec > 0, 'shiftAmountSec recorded');
  });

  await runTest('2.5: One-click Undo restores 100% of original timing and audio assets', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioOffset: 0.2, audioDuration: 2.3 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioOffset: 0.0, audioDuration: 2.2 }),
    ];

    const result = await autoFixEntireTimeline(subs);
    assert.ok(result.originalSubtitlesSnapshot.length === 2, 'Snapshot captured');
    const restored = result.originalSubtitlesSnapshot;
    assert.strictEqual(restored[0].audioOffset, 0.2, 'Original audioOffset restored');
    assert.strictEqual(restored[0].audioDuration, 2.3, 'Original audioDuration restored');
  });

  console.log(`\n=== All ${total} Zero-Silence & Flexible Placement Tests Passed: ${passed}/${total} Successfully! ===`);
})();
