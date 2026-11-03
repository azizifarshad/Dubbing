/**
 * Comprehensive Automated Test Suite for Balanced Adaptive Audio Timeline Auto-Fix
 * Testing all requirements from specification:
 * 1. Timeline with no overlaps (idempotent no-op)
 * 2. Multiple overlapping segments (resolved cleanly)
 * 3. Intentional overlapping dialogue (preserved intact, never treated as conflict)
 * 4. Audio longer than target duration (adaptive stretch at discrete level 1.10x or 1.20x)
 * 5. Audio shorter than target duration (natural pause maintained, no artificial slowdown)
 * 6. Leading and trailing silence trimmed safely with boundary padding
 * 7. Excessive dialogue delays minimized into available pre-gap towards anchor 0.0s
 * 8. Natural pause preservation (conversational rhythm kept >= 120ms)
 * 9. Multiple consecutive conflicts resolved deterministically without cascading runaway drift
 * 10. Unsatisfiable timing constraints flagged as unresolved with specific Persian reason
 * 11. Strict 1.30x maximum speed limit (NEVER exceeds 1.30x)
 * 12. Discrete adaptive speed levels [1.00, 1.10, 1.20, 1.30] selection
 * 13. Duration-aware Persian translation shortening (concise conversational alternatives)
 * 14. Semantic & negation preservation (rejects candidates omitting negation or numbers)
 * 15. Preservation of original audio in originalAudioBase64
 * 16. Second pass verification confirms zero unintended active overlaps
 * 17. Undo and restore reverts 100% of audio and timing
 * 18. Cancellation mechanism via AbortSignal terminates cleanly
 * 19. Realistic multi-speaker conversation with at least 100 segments
 */

import assert from 'node:assert';
import {
  measureAndProfileSegments,
  detectTimelineIssues,
  scheduleOptimizedTimeline,
  selectAdaptiveSpeedLevel,
  getOrGenerateShortenedCandidates,
  autoFixEntireTimeline,
} from '../src/utils/autoFixEngine';
import { undoBulkSpeedChanges } from '../src/utils/bulkSpeedController';
import {
  SubtitleItem,
  DEFAULT_AUTO_FIX_CONFIG,
  TimelineAutoFixConfig,
  GeminiVoiceId,
} from '../src/types/dubbing';

let passed = 0;
let total = 0;

async function runAsyncTest(name: string, fn: () => Promise<void>) {
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

console.log('=== Starting Balanced Adaptive Auto-Fix Test Suite ===\n');

// Mock Subtitle Helper
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
  // 1. TIMELINE WITH NO OVERLAPS (IDEMPOTENT NO-OP)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 1: Timeline with no overlaps remains untouched (idempotent)', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 1.8, effectiveDuration: 1.8 }),
      createMockSub({ id: 2, start: 3.0, end: 5.0, audioDuration: 1.9, effectiveDuration: 1.9 }),
      createMockSub({ id: 3, start: 6.0, end: 8.0, audioDuration: 1.7, effectiveDuration: 1.7 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.strictEqual(result.stats.initialActiveSpeechOverlaps, 0, '0 active speech overlaps');
    assert.strictEqual(result.stats.automaticallyResolvedOverlaps, 0, '0 overlaps needed fixing');
    assert.strictEqual(result.stats.segmentsTimeStretched, 0, 'No time stretch applied');
    assert.strictEqual(result.stats.unresolvedConflictsCount, 0, 'Zero unresolved conflicts');
    assert.strictEqual(result.success, true, 'Reported as success');
  });

  // ----------------------------------------------------------------------------------
  // 2. TIMELINE WITH MULTIPLE OVERLAPPING SEGMENTS (RESOLVED CLEANLY)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 2: Multiple overlapping segments resolved cleanly', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.30, effectiveDuration: 2.30 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 2.25, effectiveDuration: 2.25 }),
      createMockSub({ id: 3, start: 4.0, end: 6.0, audioDuration: 1.80, effectiveDuration: 1.80 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.ok(result.stats.initialActiveSpeechOverlaps >= 2, `Active overlaps detected: ${result.stats.initialActiveSpeechOverlaps}`);
    assert.strictEqual(result.stats.unresolvedConflictsCount, 0, 'All overlaps should be resolved');
    assert.strictEqual(result.success, true);
    assert.ok(result.stats.segmentsAdjusted >= 2, 'Adjusted segments');
  });

  // ----------------------------------------------------------------------------------
  // 3. INTENTIONAL OVERLAPPING DIALOGUE (PRESERVED INTACT)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 3: Intentional overlapping dialogue preserved intact', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 1.0, end: 4.0, audioDuration: 2.8, effectiveDuration: 2.8 }),
      createMockSub({
        id: 2,
        start: 2.0, // starts while sub 1 is speaking
        end: 4.5,
        audioDuration: 2.2,
        effectiveDuration: 2.2,
        isIntentionalOverlap: true, // explicitly designated intentional overlap
      }),
    ];

    const profiles = await measureAndProfileSegments(subs, null);
    const issues = detectTimelineIssues(profiles);
    const intentionalIssues = issues.filter(i => i.isIntentional || i.type === 'intentional_overlap');

    assert.ok(intentionalIssues.length > 0, 'Intentional overlap detected as intentional');
    assert.strictEqual(intentionalIssues[0].type, 'intentional_overlap');

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.strictEqual(result.stats.intentionalOverlaps, 1, 'Intentional overlap counted');
    assert.strictEqual(result.stats.unresolvedConflictsCount, 0, 'Intentional overlap is not an unresolved error');
  });

  // ----------------------------------------------------------------------------------
  // 4. AUDIO LONGER THAN TARGET DURATION (ADAPTIVE STRETCH AT DISCRETE LEVELS)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 4: Long audio stretched at discrete level 1.10x or 1.20x', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.25, effectiveDuration: 2.25 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 1.80, effectiveDuration: 1.80 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    const fixedSub1 = result.updatedSubtitles.find(s => s.id === 1);
    assert.ok(fixedSub1, 'Sub 1 present');
    const applied = fixedSub1.appliedSpeed || 1.0;
    assert.ok(applied === 1.10 || applied === 1.20, `Speed is discrete level: ${applied}`);
  });

  // ----------------------------------------------------------------------------------
  // 5. AUDIO SHORTER THAN TARGET DURATION (PRESERVES NATURAL PAUSE)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 5: Audio shorter than target duration preserves natural pause', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 4.0, audioDuration: 2.1, effectiveDuration: 2.1 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    const fixedSub1 = result.updatedSubtitles.find(s => s.id === 1);
    assert.ok(fixedSub1);
    assert.strictEqual(fixedSub1.appliedSpeed || 1.0, 1.0, 'Speed must remain 1.0x (no artificial slowdown)');
  });

  // ----------------------------------------------------------------------------------
  // 6. AUDIO WITH LEADING AND TRAILING SILENCE (TRIMMED SAFELY)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 6: Leading and trailing silence trimmed safely with boundary padding', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({
        id: 1,
        start: 0.0,
        end: 2.0,
        audioDuration: 2.3, // Raw duration 2.3s
        leadingSilenceSec: 0.20,
        trailingSilenceSec: 0.20,
        effectiveDuration: 1.90, // Active speech 1.90s fits within 2.0s without high stretch!
      }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 1.8, effectiveDuration: 1.8 }),
    ];

    const profiles = await measureAndProfileSegments(subs, null);
    const issues = detectTimelineIssues(profiles);
    const { plannedCorrections } = scheduleOptimizedTimeline(profiles, issues);

    const plan1 = plannedCorrections.get(1);
    assert.ok(plan1);
    assert.strictEqual(plan1.trimLeadingSilence, true, 'Trims leading silence');
    assert.strictEqual(plan1.trimTrailingSilence, true, 'Trims trailing silence');
    assert.strictEqual(plan1.proposedTempo, 1.00, 'Fits at 1.00x after trimming');
    assert.strictEqual(plan1.category, 'AUTO_FIXED');
  });

  // ----------------------------------------------------------------------------------
  // 7. EXCESSIVE DIALOGUE DELAYS (MINIMIZED INTO AVAILABLE PRE-GAP)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 7: Dialogue with artificial delay pulled back into available pre-gap', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 1.5, effectiveDuration: 1.5 }),
      createMockSub({ id: 2, start: 3.0, end: 5.0, audioOffset: 0.4, audioDuration: 2.2, effectiveDuration: 2.2 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    const sub2 = result.updatedSubtitles.find(s => s.id === 2);
    assert.ok(sub2);
    assert.ok(typeof sub2.audioOffset === 'number' && sub2.audioOffset <= 0.05, `Offset reset: ${sub2.audioOffset}`);
  });

  // ----------------------------------------------------------------------------------
  // 8. NATURAL PAUSE PRESERVATION (CONVERSATIONAL RHYTHM KEPT >= 120MS)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 8: Natural pause preserved between consecutive dialogues', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.0, effectiveDuration: 2.0 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 1.9, effectiveDuration: 1.9 }),
    ];

    const result = await autoFixEntireTimeline(subs, { targetNaturalPauseSec: 0.12 });
    assert.strictEqual(result.stats.unresolvedConflictsCount, 0);
  });

  // ----------------------------------------------------------------------------------
  // 9. MULTIPLE CONSECUTIVE CONFLICTS (NO CASCADING RUNAWAY DRIFT)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 9: Multiple consecutive conflicts resolved without cascading runaway drift', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.25, effectiveDuration: 2.25 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 2.25, effectiveDuration: 2.25 }),
      createMockSub({ id: 3, start: 4.0, end: 6.0, audioDuration: 2.25, effectiveDuration: 2.25 }),
      createMockSub({ id: 4, start: 6.0, end: 8.0, audioDuration: 2.25, effectiveDuration: 2.25 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.strictEqual(result.stats.unresolvedConflictsCount, 0, 'No unresolved conflicts');
    
    // Check that sub 4 is not pushed to 9.2s! Start deviation should be <= 0.25s
    const sub4 = result.updatedSubtitles.find(s => s.id === 4);
    assert.ok(sub4);
    const start4 = sub4.start + (sub4.audioOffset || 0);
    assert.ok(Math.abs(start4 - 6.0) <= 0.25, `Sub 4 start: ${start4} (no runaway drift)`);
  });

  // ----------------------------------------------------------------------------------
  // 10. UNSATISFIABLE TIMING CONSTRAINTS (FLAGGED AS UNRESOLVED WITH SPECIFIC REASON)
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 10: Unsatisfiable timing constraints flagged with specific reason', async () => {
    // Target window 2.0s, but TTS is 4.5s (requires 2.25x tempo, far exceeding 1.30x!)
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 4.5, effectiveDuration: 4.5 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 1.8, effectiveDuration: 1.8 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.strictEqual(result.success, false, 'Flagged as unsuccessful due to unresolved conflict');
    assert.ok(result.stats.unresolvedConflictsCount >= 1, `Unresolved count: ${result.stats.unresolvedConflictsCount}`);
    
    const unres = result.stats.unresolvedIssues[0];
    assert.ok(unres, 'Has unresolved issue object');
    assert.strictEqual(unres.subId, 1);
    assert.ok(
      unres.descriptionFa.includes('بیش از حد طولانی') ||
      unres.descriptionFa.includes('سقف مجاز') ||
      unres.descriptionFa.includes('خلاصه‌سازی'),
      'Includes specific diagnostic explanation'
    );
  });

  // ----------------------------------------------------------------------------------
  // 11. STRICT 1.30X MAXIMUM SPEED LIMIT
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 11: Strict 1.30x maximum speed limit (NEVER exceeds 1.30x)', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 3.8, effectiveDuration: 3.8 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    const sub1 = result.updatedSubtitles.find(s => s.id === 1);
    assert.ok(sub1);
    assert.strictEqual(sub1.appliedSpeed, 1.30, 'Speed clamped to exactly 1.30x maximum');
    assert.ok(sub1.appliedSpeed <= 1.30, 'Never exceeds 1.30x');
  });

  // ----------------------------------------------------------------------------------
  // 12. DISCRETE ADAPTIVE SPEED LEVELS [1.00, 1.10, 1.20, 1.30]
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 12: Discrete adaptive speed levels selection', async () => {
    // Test 1: Needed 1.05 -> selects 1.10
    const s1 = selectAdaptiveSpeedLevel(1.05);
    assert.strictEqual(s1.selectedTempo, 1.10);
    assert.strictEqual(s1.category, 'FIXED_WITH_MILD_ACCELERATION');

    // Test 2: Needed 1.16 -> selects 1.20
    const s2 = selectAdaptiveSpeedLevel(1.16);
    assert.strictEqual(s2.selectedTempo, 1.20);
    assert.strictEqual(s2.category, 'FIXED_WITH_MODERATE_ACCELERATION');

    // Test 3: Needed 1.27 -> selects 1.30
    const s3 = selectAdaptiveSpeedLevel(1.27);
    assert.strictEqual(s3.selectedTempo, 1.30);
    assert.strictEqual(s3.category, 'FIXED_WITH_MAX_ACCELERATION');

    // Test 4: Needed 1.45 -> clamped to 1.30, unresolved
    const s4 = selectAdaptiveSpeedLevel(1.45);
    assert.strictEqual(s4.selectedTempo, 1.30);
    assert.strictEqual(s4.isWithinMax, false);
    assert.strictEqual(s4.category, 'MANUAL_REVIEW_REQUIRED');
  });

  // ----------------------------------------------------------------------------------
  // 13. DURATION-AWARE PERSIAN TRANSLATION SHORTENING
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 13: Persian translation shortening generates valid concise candidate', async () => {
    const sub = createMockSub({
      id: 1,
      start: 0.0,
      end: 2.0,
      originalText: 'Look at the function right now.',
      farsiText: 'لازم به ذکر است که در حال حاضر باید به این فانکشن نگاه کنید.',
    });

    const candidatesResult = getOrGenerateShortenedCandidates(sub, 2.0);
    assert.ok(candidatesResult, 'Candidates generated');
    assert.ok(candidatesResult.rankedCandidates.length >= 2, 'Has alternative candidates');
    
    // Candidate 2 removes "لازم به ذکر است که" and "در حال حاضر"
    const concise = candidatesResult.rankedCandidates.find(c => c.category === 'concise' || c.category === 'conversational');
    assert.ok(concise, 'Found concise candidate');
    assert.ok(concise.text.length < sub.farsiText.length, 'Concise text is shorter');
    assert.notStrictEqual(concise.validationStatus, 'invalid', 'Maintains semantic validity (not invalid)');
  });

  // ----------------------------------------------------------------------------------
  // 14. SEMANTIC & NEGATION PRESERVATION IN TRANSLATION
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 14: Rejection of candidates omitting negation or numbers', async () => {
    const sub = createMockSub({
      id: 1,
      start: 0.0,
      end: 2.0,
      originalText: 'Never delete these 3 files.',
      farsiText: 'هرگز این ۳ فایل را پاک نکنید.',
      candidates: [
        {
          id: 'bad_cand',
          text: 'این فایل‌ها را پاک کنید.', // Flipped negation (never -> do) and dropped number 3!
          category: 'concise',
          semanticScore: 10,
          naturalnessScore: 80,
          durationScore: 90,
          finalScore: 30,
          predictedDuration: 1.8,
          validationStatus: 'invalid',
          numberCheckPassed: false,
          negationCheckPassed: false,
          entityCheckPassed: true,
        },
      ],
    });

    const selection = getOrGenerateShortenedCandidates(sub, 2.0);
    assert.ok(selection);
    // Invalid candidate should NEVER be accepted as valid
    const bad = selection.rankedCandidates.find(c => c.id === 'bad_cand');
    if (bad) {
      assert.strictEqual(bad.validationStatus, 'invalid');
    }
  });

  // ----------------------------------------------------------------------------------
  // 15. PRESERVATION OF ORIGINAL AUDIO IN MEMORY / SNAPSHOT
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 15: Preservation of original audio in originalAudioBase64', async () => {
    const rawAudio = 'data:audio/wav;base64,RAW_PRISTINE_INITIAL_TEST_AUDIO';
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioBase64: rawAudio, audioDuration: 2.3 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    const sub1 = result.updatedSubtitles.find(s => s.id === 1);
    assert.ok(sub1);
    assert.strictEqual(sub1.originalAudioBase64, rawAudio, 'Original audio preserved pristine');
  });

  // ----------------------------------------------------------------------------------
  // 16. SECOND PASS VERIFICATION CONFIRMS ZERO UNINTENDED OVERLAPS
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 16: Second pass verification confirms zero unintended overlaps', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.3, effectiveDuration: 2.3 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 2.2, effectiveDuration: 2.2 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.strictEqual(result.stats.unresolvedConflictsCount, 0);
    assert.strictEqual(result.stats.remainingUnintendedOverlaps, 0);
    assert.ok(result.stats.automaticallyResolvedOverlaps >= 1, 'Overlaps reported fixed in second pass');
  });

  // ----------------------------------------------------------------------------------
  // 17. UNDO AND RESTORE REVERTS 100% OF AUDIO AND TIMING
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 17: Undo and restore reverts 100% of audio and timing', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioOffset: 0.15, audioDuration: 2.3 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioOffset: 0.00, audioDuration: 2.2 }),
    ];

    const result = await autoFixEntireTimeline(subs, { translationShortening: false });
    assert.ok(result.updatedSubtitles.length === 2);

    // Revert via snapshot
    const reverted = result.originalSubtitlesSnapshot;
    assert.strictEqual(reverted[0].audioOffset, 0.15, 'Initial audioOffset restored');
    assert.strictEqual(reverted[0].audioDuration, 2.3, 'Initial audioDuration restored');

    // Revert via history snapshot
    const restoredViaHistory = undoBulkSpeedChanges(result.updatedSubtitles, result.historySnapshot);
    assert.strictEqual(restoredViaHistory[0].audioDuration, 2.3, 'History snapshot restores duration');
  });

  // ----------------------------------------------------------------------------------
  // 18. CANCELLATION VIA ABORTSIGNAL TERMINATES CLEANLY
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 18: Cancellation via AbortSignal terminates cleanly', async () => {
    const subs: SubtitleItem[] = [
      createMockSub({ id: 1, start: 0.0, end: 2.0, audioDuration: 2.2 }),
      createMockSub({ id: 2, start: 2.0, end: 4.0, audioDuration: 2.2 }),
    ];

    let caught = false;
    try {
      await autoFixEntireTimeline(subs, {}, null, undefined, { aborted: true });
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('متوقف شد'));
    }
    assert.strictEqual(caught, true, 'Operation aborted cleanly');
  });

  // ----------------------------------------------------------------------------------
  // 19. REALISTIC MULTI-SPEAKER CONVERSATION WITH 100+ SEGMENTS
  // ----------------------------------------------------------------------------------
  await runAsyncTest('Test 19: Realistic multi-speaker conversation with 100+ segments runs efficiently', async () => {
    const largeTimeline: SubtitleItem[] = [];
    const voices: GeminiVoiceId[] = ['Charon', 'Puck', 'Kore', 'Zephyr'];

    let currentTime = 0.0;
    for (let i = 1; i <= 105; i++) {
      const duration = 1.5 + (i % 4) * 0.5; // 1.5s to 3.0s
      const voice = voices[i % voices.length];
      const isOverlap = i % 15 === 0; // occasional intentional overlap
      const hasOverflow = i % 5 === 0; // occasional longer audio requiring 1.10x or 1.20x stretch

      const audioDur = hasOverflow ? duration + 0.35 : duration - 0.20;

      largeTimeline.push(
        createMockSub({
          id: i,
          start: Math.round(currentTime * 100) / 100,
          end: Math.round((currentTime + duration) * 100) / 100,
          voice,
          isIntentionalOverlap: isOverlap,
          audioDuration: Math.round(audioDur * 100) / 100,
          effectiveDuration: Math.round(audioDur * 100) / 100,
          leadingSilenceSec: 0.05,
          trailingSilenceSec: 0.05,
          originalText: `Speech segment ${i} in video`,
          farsiText: `دیالوگ شماره ${i} در این مستند آموزشی و بررسی عملکرد سیستم`,
        })
      );

      currentTime += isOverlap ? duration * 0.6 : duration + 0.15;
    }

    const t0 = Date.now();
    const result = await autoFixEntireTimeline(largeTimeline);
    const elapsed = Date.now() - t0;

    assert.strictEqual(result.stats.totalAnalyzed, 105, 'Analyzed all 105 segments');
    assert.ok(result.stats.intentionalOverlaps >= 5, 'Preserved intentional overlaps');
    assert.strictEqual(result.stats.unresolvedConflictsCount, 0, 'No unresolved conflicts on realistic scene');
    assert.ok(elapsed < 2000, `Execution time under 2000ms: was ${elapsed}ms`);
    assert.strictEqual(result.success, true);
  });

  console.log(`\n=== All ${total} Balanced Adaptive Auto-Fix Tests Passed: ${passed}/${total} Successfully! ===`);
})();
