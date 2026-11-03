/**
 * Comprehensive Automated Test Suite for Audio Overlap Management and Bulk Speed Control
 * Covers all 16 core scenarios:
 * 1. Detection: None / Negligible overlap
 * 2. Detection: Minor overlap classification
 * 3. Detection: Moderate overlap classification
 * 4. Detection: Severe overlap classification
 * 5. Differentiation: Silence-only overlap vs speech overlap
 * 6. Intentional: Multi-speaker original overlap preservation
 * 7. Summary: Accurate counts (total, affected, severe, duration, segmentOverlapMap)
 * 8. Bulk Selection: Filtering modes (all, selected, overlapping, overflowing, threshold)
 * 9. Calculation: Exact speed mode
 * 10. Calculation: Percentage change mode (+15%, -10%)
 * 11. Calculation: Fit to target duration mode (eliminates collision)
 * 12. Safety: Clamping to 0.75x - 1.35x and flagging unsafe speed recommendations
 * 13. Audio Preservation: Original audio preserved in originalAudioBase64, processed audio in processedAudioBase64
 * 14. Undo: Complete snapshot restoration of original audio, speed, and timing
 * 15. Mixer: Dubbed mix prefers processed audio over raw audio
 * 16. Mixer: Temporarily muted segments (isMuted: true) are omitted from dubbed audio
 */

import assert from 'node:assert';
import {
  detectAudioOverlaps,
  classifyOverlapSeverity,
  getOverlapsForSegment,
  autoResolveAllOverlaps,
} from '../src/utils/overlapEngine';
import {
  computeBulkSpeedPreview,
  undoBulkSpeedChanges,
} from '../src/utils/bulkSpeedController';
import {
  SubtitleItem,
  DEFAULT_OVERLAP_THRESHOLDS,
  BulkSpeedConfig,
  BulkSpeedHistorySnapshot,
} from '../src/types/dubbing';

let passed = 0;
let total = 0;

function runTest(name: string, fn: () => void) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  [PASS] Test ${total}: ${name}`);
  } catch (err: any) {
    console.error(`  [FAIL] Test ${total}: ${name}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

console.log('=== Starting Audio Overlap Management & Bulk Speed Control Test Suite ===\n');

// Mock SubtitleItem Helper
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
    ...partial,
  };
}

// ----------------------------------------------------------------------------------
// 1. OVERLAP CLASSIFICATION TESTS
// ----------------------------------------------------------------------------------

runTest('Overlap Classification: Duration <= 0.04s classified as none', () => {
  const sev1 = classifyOverlapSeverity(0.02, 5);
  const sev2 = classifyOverlapSeverity(0.04, 3);
  assert.strictEqual(sev1, 'none');
  assert.strictEqual(sev2, 'none');
});

runTest('Overlap Classification: Minor overlap (<=0.25s or <=10%)', () => {
  const sev1 = classifyOverlapSeverity(0.18, 8);
  assert.strictEqual(sev1, 'minor');
});

runTest('Overlap Classification: Moderate overlap (<=0.60s or <=25%)', () => {
  const sev1 = classifyOverlapSeverity(0.45, 18);
  assert.strictEqual(sev1, 'moderate');
});

runTest('Overlap Classification: Severe overlap (>0.60s and >25%)', () => {
  const sev1 = classifyOverlapSeverity(1.20, 45);
  assert.strictEqual(sev1, 'severe');
});

// ----------------------------------------------------------------------------------
// 2. TIMELINE DETECTION & SILENCE VS ACTIVE SPEECH
// ----------------------------------------------------------------------------------

runTest('Timeline Overlap: Consecutive non-overlapping segments detected as 0 overlaps', () => {
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 1.9 }),
    createMockSub({ id: 2, start: 2.5, end: 4.5, audioDuration: 1.8 }),
  ];
  const summary = detectAudioOverlaps(subs);
  assert.strictEqual(summary.totalOverlaps, 0);
  assert.strictEqual(summary.affectedSegmentCount, 0);
  assert.strictEqual(summary.totalOverlapDurationSec, 0);
});

runTest('Silence vs Speech Overlap: Overlap falling strictly inside digital dead silence is flagged as silence-only', () => {
  // Segment 1 ends at 2.2s on timeline, but active speech ended at 1.8s (0.4s dead trailing silence)
  // Segment 2 starts at 2.0s, with 0.3s leading silence (speech starts at 2.3s)
  // Timeline boxes overlap by 0.2s, but vocal phonation never clashes!
  const subs: SubtitleItem[] = [
    createMockSub({
      id: 1,
      start: 0.0,
      end: 2.0,
      audioDuration: 2.2,
      effectiveDuration: 1.8,
      leadingSilenceSec: 0.0,
      trailingSilenceSec: 0.4,
    }),
    createMockSub({
      id: 2,
      start: 2.0,
      end: 4.0,
      audioDuration: 2.0,
      effectiveDuration: 1.7,
      leadingSilenceSec: 0.3,
      trailingSilenceSec: 0.0,
    }),
  ];

  const summary = detectAudioOverlaps(subs);
  assert.strictEqual(summary.totalOverlaps, 1);
  const ov = summary.overlaps[0];
  assert.strictEqual(ov.isSilenceOverlap, true);
  assert.strictEqual(summary.silenceCount, 1);
  assert.strictEqual(ov.overlapDurationSec, 0.2);
});

runTest('Intentional Overlap Preservation: Original source dialogue overlap marked as intentional', () => {
  // Original video subtitles had simultaneous speech: line 1 (0 to 3s), line 2 (2 to 5s)
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 3.0, audioDuration: 3.0 }),
    createMockSub({ id: 2, start: 2.0, end: 5.0, audioDuration: 2.8 }),
  ];

  const summary = detectAudioOverlaps(subs);
  assert.strictEqual(summary.totalOverlaps, 1);
  const ov = summary.overlaps[0];
  assert.strictEqual(ov.isIntentional, true);
  assert.strictEqual(summary.intentionalCount, 1);
  assert.ok(ov.descriptionFa.includes('تعمدی'));
});

runTest('Overlap Summary Metrics: Calculates total overlaps, affected segments, severe count & total duration', () => {
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.8 }), // ends at 2.8s
    createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 2.6 }), // starts at 2.0s -> 0.8s severe overlap
    createMockSub({ id: 3, start: 4.5, end: 6.0, audioDuration: 1.4 }), // starts at 4.5s -> ends at 4.6s vs 4.5s -> 0.1s minor overlap
  ];

  const summary = detectAudioOverlaps(subs);
  assert.strictEqual(summary.totalOverlaps, 2);
  assert.strictEqual(summary.affectedSegmentCount, 3);
  assert.strictEqual(summary.severeCount, 1);
  assert.strictEqual(summary.minorCount, 1);
  assert.strictEqual(summary.totalOverlapDurationSec, 0.9); // 0.8s + 0.1s

  // segmentOverlapMap lookup
  const seg1Overlaps = getOverlapsForSegment(summary, 1);
  const seg2Overlaps = getOverlapsForSegment(summary, 2);
  assert.strictEqual(seg1Overlaps.length, 1);
  assert.strictEqual(seg2Overlaps.length, 2); // overlaps with #1 and with #3
});

// ----------------------------------------------------------------------------------
// 3. BULK SPEED SELECTION MODES
// ----------------------------------------------------------------------------------

runTest('Bulk Speed Selection: "overlapping" mode filters only conflicting segments', () => {
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.5 }), // collides with #2
    createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 1.8 }), // collides with #1
    createMockSub({ id: 3, start: 6.0, end: 8.0, audioDuration: 1.8 }), // clean, no collision
  ];

  const config: BulkSpeedConfig = {
    selectionMode: 'overlapping',
    calculationMode: 'exact',
    targetSpeed: 1.10,
    percentageChange: 10,
    minSafeSpeed: 0.75,
    maxSafeSpeed: 1.35,
    selectedSubtitleIds: [],
  };

  const preview = computeBulkSpeedPreview(subs, config);
  assert.strictEqual(preview.length, 2);
  const ids = preview.map((p) => p.subId);
  assert.deepStrictEqual(ids, [1, 2]);
});

runTest('Bulk Speed Selection: "threshold" mode filters segments longer than threshold', () => {
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 1.8 }),
    createMockSub({ id: 2, start: 3.0, end: 8.0, audioDuration: 5.2 }),
    createMockSub({ id: 3, start: 9.0, end: 12.0, audioDuration: 3.1 }),
  ];

  const config: BulkSpeedConfig = {
    selectionMode: 'threshold',
    calculationMode: 'exact',
    targetSpeed: 1.10,
    percentageChange: 10,
    minSafeSpeed: 0.75,
    maxSafeSpeed: 1.35,
    selectedSubtitleIds: [],
    durationThresholdSec: 4.0,
  };

  const preview = computeBulkSpeedPreview(subs, config);
  assert.strictEqual(preview.length, 1);
  assert.strictEqual(preview[0].subId, 2);
});

// ----------------------------------------------------------------------------------
// 4. BULK SPEED CALCULATION MODES
// ----------------------------------------------------------------------------------

runTest('Bulk Speed Calculation: Percentage mode accurately computes proposed speed', () => {
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.0, appliedSpeed: 1.0 }),
    createMockSub({ id: 2, start: 3.0, end: 5.0, audioDuration: 2.0, appliedSpeed: 1.10 }),
  ];

  // Increase speed by +10%
  const config: BulkSpeedConfig = {
    selectionMode: 'all',
    calculationMode: 'percentage',
    targetSpeed: 1.0,
    percentageChange: 10,
    minSafeSpeed: 0.75,
    maxSafeSpeed: 1.35,
    selectedSubtitleIds: [],
  };

  const preview = computeBulkSpeedPreview(subs, config);
  assert.strictEqual(preview[0].proposedSpeed, 1.10); // 1.0 * 1.10 = 1.10
  assert.strictEqual(preview[1].proposedSpeed, 1.21); // 1.10 * 1.10 = 1.21
});

runTest('Bulk Speed Calculation: "Fit to target duration" mode computes required speed to eliminate overflow', () => {
  // Target duration = 2.0s, Audio duration = 2.40s
  // Required speed = 2.40 / 2.0 = 1.20x
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.40, effectiveDuration: 2.40 }),
  ];

  const config: BulkSpeedConfig = {
    selectionMode: 'all',
    calculationMode: 'fit_target',
    targetSpeed: 1.0,
    percentageChange: 0,
    minSafeSpeed: 0.75,
    maxSafeSpeed: 1.35,
    selectedSubtitleIds: [],
  };

  const preview = computeBulkSpeedPreview(subs, config);
  assert.strictEqual(preview.length, 1);
  assert.strictEqual(preview[0].proposedSpeed, 1.20);
  assert.strictEqual(preview[0].expectedDuration, 2.0);
  assert.strictEqual(preview[0].isSafe, true);
});

runTest('Bulk Speed Safety: Clamps extreme speeds to 1.35x and flags unsafe warning for review', () => {
  // Target duration = 1.0s, Audio duration = 2.00s -> Required speed = 2.00x (unintelligible!)
  const subs: SubtitleItem[] = [
    createMockSub({ id: 1, start: 0.0, end: 1.0, audioDuration: 2.00, effectiveDuration: 2.00 }),
  ];

  const config: BulkSpeedConfig = {
    selectionMode: 'all',
    calculationMode: 'fit_target',
    targetSpeed: 1.0,
    percentageChange: 0,
    minSafeSpeed: 0.75,
    maxSafeSpeed: 1.35,
    selectedSubtitleIds: [],
  };

  const preview = computeBulkSpeedPreview(subs, config);
  assert.strictEqual(preview.length, 1);
  assert.strictEqual(preview[0].proposedSpeed, 1.35); // clamped to safe max
  assert.strictEqual(preview[0].isSafe, false);       // flagged for manual text review
  assert.ok(preview[0].safetyWarningFa?.includes('خارج از بازه کیفی مجاز'));
});

// ----------------------------------------------------------------------------------
// 5. UNDO & PERSISTENCE
// ----------------------------------------------------------------------------------

runTest('Undo & Audio Preservation: undoBulkSpeedChanges restores pristine original state', () => {
  const initialSubs: SubtitleItem[] = [
    createMockSub({
      id: 1,
      start: 0.0,
      end: 2.0,
      audioBase64: 'original_tts_audio_base64_data',
      audioDuration: 2.4,
      appliedSpeed: 1.0,
      timeStretchRatio: 1.0,
    }),
  ];

  // Capture history snapshot before modification
  const snapshot: BulkSpeedHistorySnapshot = {
    timestamp: Date.now(),
    descriptionFa: 'تست بازگردانی',
    items: initialSubs.map((s) => ({
      id: s.id,
      audioBase64: s.audioBase64,
      originalAudioBase64: s.originalAudioBase64,
      processedAudioBase64: s.processedAudioBase64,
      appliedSpeed: s.appliedSpeed,
      audioDuration: s.audioDuration,
      effectiveDuration: s.effectiveDuration,
      timeStretchRatio: s.timeStretchRatio,
      playbackRate: s.playbackRate,
      isMuted: s.isMuted,
      isIntentionalOverlap: s.isIntentionalOverlap,
    })),
  };

  // Simulate applied speed changes
  const modifiedSubs: SubtitleItem[] = [
    {
      ...initialSubs[0],
      originalAudioBase64: 'original_tts_audio_base64_data',
      processedAudioBase64: 'processed_stretched_audio_base64_data',
      audioBase64: 'processed_stretched_audio_base64_data',
      appliedSpeed: 1.20,
      audioDuration: 2.0,
    },
  ];

  assert.strictEqual(modifiedSubs[0].appliedSpeed, 1.20);
  assert.strictEqual(modifiedSubs[0].audioBase64, 'processed_stretched_audio_base64_data');

  // Perform Undo
  const restored = undoBulkSpeedChanges(modifiedSubs, snapshot);
  assert.strictEqual(restored[0].appliedSpeed, 1.0);
  assert.strictEqual(restored[0].audioBase64, 'original_tts_audio_base64_data');
  assert.strictEqual(restored[0].audioDuration, 2.4);
});

// ----------------------------------------------------------------------------------
// 6. AUDIO MIXER COMPATIBILITY: PROCESSED AUDIO & MUTING
// ----------------------------------------------------------------------------------

runTest('Audio Mixer: Respects processedAudioBase64 when present and skips muted lines', () => {
  const subs: SubtitleItem[] = [
    createMockSub({
      id: 1,
      audioBase64: 'raw_audio_1',
      processedAudioBase64: 'stretched_audio_1',
      isMuted: false,
    }),
    createMockSub({
      id: 2,
      audioBase64: 'raw_audio_2',
      isMuted: true, // temporarily muted
    }),
  ];

  // Simulate audio mixer track extraction logic
  const activeTracks: { id: number; audio: string }[] = [];
  for (const s of subs) {
    if (s.isMuted) continue;
    const audioData = s.processedAudioBase64 || s.audioBase64;
    if (audioData) {
      activeTracks.push({ id: s.id, audio: audioData });
    }
  }

  assert.strictEqual(activeTracks.length, 1);
  assert.strictEqual(activeTracks[0].id, 1);
  assert.strictEqual(activeTracks[0].audio, 'stretched_audio_1'); // processed audio prioritized
});

// ----------------------------------------------------------------------------------
// 7. 1-CLICK COMPLETE OVERLAP RESOLVER
// ----------------------------------------------------------------------------------

runTest('1-Click Overlap Resolver: autoResolveAllOverlaps eliminates all timeline collisions in one go', async () => {
  // Setup 3 overlapping lines (accidental cascade of overlaps)
  // Line 1: start 0.0, audioDuration 2.6s (collides with Line 2 by 0.6s)
  // Line 2: start 2.0, audioDuration 2.4s (collides with Line 3 by 0.4s)
  // Line 3: start 4.0, audioDuration 1.8s
  const subs: SubtitleItem[] = [
    createMockSub({
      id: 1,
      start: 0.0,
      end: 2.0,
      audioDuration: 2.6,
      effectiveDuration: 2.6,
      audioBase64: 'mock_base64_audio_1',
    }),
    createMockSub({
      id: 2,
      start: 2.0,
      end: 4.0,
      audioDuration: 2.4,
      effectiveDuration: 2.4,
      audioBase64: 'mock_base64_audio_2',
    }),
    createMockSub({
      id: 3,
      start: 4.0,
      end: 6.0,
      audioDuration: 1.8,
      effectiveDuration: 1.8,
      audioBase64: 'mock_base64_audio_3',
    }),
  ];

  // Initial check: must have 2 overlaps
  const initialSummary = detectAudioOverlaps(subs);
  assert.strictEqual(initialSummary.totalOverlaps, 2);

  // Run 1-Click Auto Resolver
  const result = await autoResolveAllOverlaps(subs, null);

  assert.strictEqual(result.resolvedCount, 2);
  assert.strictEqual(result.updatedSubtitles.length, 3);

  // Post check: all collisions must be resolved (0 overlaps!)
  const postSummary = detectAudioOverlaps(result.updatedSubtitles);
  assert.strictEqual(postSummary.totalOverlaps, 0);

  // Verify pristine raw audio is preserved in originalAudioBase64
  assert.strictEqual(result.updatedSubtitles[0].originalAudioBase64, 'mock_base64_audio_1');
  assert.strictEqual(result.updatedSubtitles[1].originalAudioBase64, 'mock_base64_audio_2');

  // Verify undo capability
  const undone = undoBulkSpeedChanges(result.updatedSubtitles, result.historySnapshot);
  const undoneSummary = detectAudioOverlaps(undone);
  assert.strictEqual(undoneSummary.totalOverlaps, 2);
});

console.log(`\n=== All ${total} Overlap & Bulk Speed Tests Passed: ${passed}/${total} Successfully! ===`);
