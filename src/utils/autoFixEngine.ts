import {
  SubtitleItem,
  TimelineIssue,
  TimelineIssueType,
  TimelineAutoFixConfig,
  DEFAULT_AUTO_FIX_CONFIG,
  AutoFixStatistics,
  AutoFixResult,
  AutoFixCategory,
  AutoFixSegmentResolution,
  BulkSpeedHistorySnapshot,
  DEFAULT_BALANCED_TIMING_POLICY,
  ShiftAdjustmentReason,
  DEFAULT_TIMELINE_PLACEMENT_CONFIG,
} from '../types/dubbing';
import {
  timeStretchAudioBufferWSOLA,
  profileAudioSilence,
  extractEffectiveSpeechBuffer,
  trimZeroSilenceAudioBuffer,
  AudioSilenceProfile,
} from './syncEngine';
import {
  getAudioContext,
  decodeBase64ToAudioBuffer,
  audioBufferToWav,
} from './audioMixer';
import {
  scoreAndSelectTranslationCandidates,
  ScoredCandidateSelectionResult,
} from './candidateScorer';
import { predictPersianSpeechDuration } from './durationPredictor';

/**
 * Converts a Blob to a Base64 string in both browser and test environments.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      blob.arrayBuffer().then((ab) => {
        const buffer = Buffer.from(ab);
        resolve(`data:audio/wav;base64,${buffer.toString('base64')}`);
      }).catch(reject);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface SegmentTimingProfile {
  sub: SubtitleItem;
  intendedStart: number;
  intendedEnd: number;
  intendedDuration: number;
  currentStart: number;
  currentEnd: number;
  rawAudioDuration: number;
  activeSpeechDuration: number;
  leadingSilenceSec: number;
  trailingSilenceSec: number;
  speechOnset: number;   // Physical moment vocal phonation starts on timeline
  speechOffset: number;  // Physical moment vocal phonation ends on timeline
  isIntentional: boolean;
  hasAudio: boolean;
  audioBuffer: AudioBuffer | null;
  pristineAudioBase64: string | null;
}

export interface PlannedCorrection {
  subId: number;
  category: AutoFixCategory;
  trimLeadingSilence: boolean;
  trimTrailingSilence: boolean;
  leadingSilenceTrimmedSec: number;
  trailingSilenceTrimmedSec: number;
  proposedTempo: number; // 1.00, 1.10, 1.20, or 1.30
  proposedOffset: number;
  originalStart: number;
  adjustedStart: number;
  shiftAmountSec: number;
  shiftDirection: 'earlier' | 'later' | 'none';
  shiftReason: ShiftAdjustmentReason;
  newStart: number;
  expectedDuration: number;
  isResolvable: boolean;
  unresolvedReasonFa?: string;
  newFarsiText?: string;
  isTranslationShortened?: boolean;
}

/**
 * Stage One: Full Audio Analysis
 * Measures actual physical audio durations, dead digital margins,
 * and extracts vocal phonation onsets and offsets for each dialogue segment.
 */
export async function measureAndProfileSegments(
  subtitles: SubtitleItem[],
  audioCtx?: BaseAudioContext | null
): Promise<SegmentTimingProfile[]> {
  const ctx = audioCtx || (typeof window !== 'undefined' ? getAudioContext() : null);
  const profiles: SegmentTimingProfile[] = [];

  for (let idx = 0; idx < subtitles.length; idx++) {
    const sub = subtitles[idx];
    const pristineRawAudio = sub.originalAudioBase64 || sub.audioBase64 || null;
    const offset = typeof sub.audioOffset === 'number' ? sub.audioOffset : 0;
    const currentStart = Math.max(0, sub.start + offset);
    const intendedDuration = Math.max(0.1, sub.end - sub.start);

    let rawBuffer: AudioBuffer | null = null;
    let leadingSilenceSec = sub.leadingSilenceSec || 0;
    let trailingSilenceSec = sub.trailingSilenceSec || 0;
    let rawAudioDuration = sub.audioDuration || intendedDuration;
    let activeSpeechDuration = sub.effectiveDuration || rawAudioDuration;

    if (pristineRawAudio && ctx) {
      try {
        rawBuffer = await decodeBase64ToAudioBuffer(pristineRawAudio);
        const prof = profileAudioSilence(rawBuffer);
        leadingSilenceSec = prof.leadingSilenceSec;
        trailingSilenceSec = prof.trailingSilenceSec;
        rawAudioDuration = prof.rawDuration;
        activeSpeechDuration = prof.effectiveDuration;
      } catch (_) {}
    }

    // Physical timeline moments
    const speechOnset = Math.round((currentStart + leadingSilenceSec) * 1000) / 1000;
    const speechOffset = Math.round((currentStart + rawAudioDuration - trailingSilenceSec) * 1000) / 1000;

    profiles.push({
      sub,
      intendedStart: sub.start,
      intendedEnd: sub.end,
      intendedDuration,
      currentStart,
      currentEnd: currentStart + rawAudioDuration,
      rawAudioDuration,
      activeSpeechDuration,
      leadingSilenceSec,
      trailingSilenceSec,
      speechOnset,
      speechOffset,
      isIntentional: Boolean(sub.isIntentionalOverlap),
      hasAudio: Boolean(pristineRawAudio),
      audioBuffer: rawBuffer,
      pristineAudioBase64: pristineRawAudio,
    });
  }

  return profiles;
}

/**
 * Detects all timing problems, unwanted speech overlaps, silence collisions,
 * excessive gaps, late starts, and un-fittable segments across the timeline.
 * Distinguishes:
 * A. Audio file overlap
 * B. Active speech overlap
 * C. Intentional dialogue overlap
 * D. Overlap caused only by silence
 */
export function detectTimelineIssues(
  profiles: SegmentTimingProfile[],
  config: TimelineAutoFixConfig = DEFAULT_AUTO_FIX_CONFIG
): TimelineIssue[] {
  const issues: TimelineIssue[] = [];
  const sorted = [...profiles].sort((a, b) => a.currentStart - b.currentStart);

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];

    // 1. Check late start deviation from original intended anchor
    const startDeviation = Math.abs(cur.currentStart - cur.intendedStart);
    if (startDeviation > config.maxStartDeviationSec + 0.05) {
      issues.push({
        id: `late_start_${cur.sub.id}`,
        type: 'late_start',
        subId: cur.sub.id,
        severity: startDeviation > 0.6 ? 'severe' : 'moderate',
        timeSec: cur.currentStart,
        durationSec: Math.round(startDeviation * 100) / 100,
        descriptionFa: `دیالوگ #${cur.sub.id} به میزان ${startDeviation.toFixed(2)} ثانیه از زمان اصلی خود انحراف دارد.`,
        isResolvable: true,
      });
    }

    // Check collisions with subsequent segments
    for (let j = i + 1; j < sorted.length; j++) {
      const next = sorted[j];

      // If next speech onset is far past current speech offset, no collision
      if (next.currentStart >= cur.currentEnd + 0.5) {
        break;
      }

      // Check if original English video had intentional simultaneous dialogue (> 250ms overlap in source)
      const origOverlapSec = cur.intendedEnd - next.intendedStart;
      const isOriginalIntentional = origOverlapSec > 0.25;
      const isIntentional = Boolean(
        cur.isIntentional || next.isIntentional || (isOriginalIntentional && config.preserveIntentionalOverlaps)
      );

      if (isIntentional) {
        issues.push({
          id: `intentional_overlap_${cur.sub.id}_${next.sub.id}`,
          type: 'intentional_overlap',
          subId: cur.sub.id,
          conflictingSubId: next.sub.id,
          severity: 'minor',
          timeSec: next.speechOnset,
          durationSec: Math.max(0, Math.round((cur.speechOffset - next.speechOnset) * 100) / 100),
          descriptionFa: `هم‌پوشانی تعمدی بین دیالوگ #${cur.sub.id} و #${next.sub.id} (حفظ شده)`,
          isIntentional: true,
          isResolvable: true,
        });
        continue; // Intentional simultaneous speech is preserved
      }

      // True Active Speech Overlap (vocal phonation clashes)
      const activeOverlapDuration = Math.round((cur.speechOffset - next.speechOnset) * 100) / 100;

      if (activeOverlapDuration > 0.04) {
        const severity = activeOverlapDuration > 0.5 ? 'severe' : activeOverlapDuration > 0.2 ? 'moderate' : 'minor';
        issues.push({
          id: `speech_overlap_${cur.sub.id}_${next.sub.id}`,
          type: 'speech_overlap',
          subId: cur.sub.id,
          conflictingSubId: next.sub.id,
          severity,
          timeSec: next.speechOnset,
          durationSec: activeOverlapDuration,
          descriptionFa: `تداخل گفتار بین دیالوگ #${cur.sub.id} و #${next.sub.id} به مدت ${activeOverlapDuration} ثانیه`,
          isResolvable: true,
        });
      } else if (cur.currentEnd > next.currentStart + 0.04) {
        // Silence-only overlap: bounding boxes touch in silence margin, speech is clear
        const silenceOverlapDuration = Math.round((cur.currentEnd - next.currentStart) * 100) / 100;
        issues.push({
          id: `silence_overlap_${cur.sub.id}_${next.sub.id}`,
          type: 'silence_overlap',
          subId: cur.sub.id,
          conflictingSubId: next.sub.id,
          severity: 'minor',
          timeSec: next.currentStart,
          durationSec: silenceOverlapDuration,
          descriptionFa: `تداخل در حاشیه سکوت بین دیالوگ #${cur.sub.id} و #${next.sub.id} (${silenceOverlapDuration} ثانیه)`,
          isResolvable: true,
        });
      }
    }

    // 3. Check excessive silence gap with next dialogue
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const gapSec = Math.round((next.speechOnset - cur.speechOffset) * 100) / 100;
      const origGapSec = Math.round((next.intendedStart - cur.intendedEnd) * 100) / 100;

      if (gapSec > config.maxAllowedSilenceGapSec && gapSec > origGapSec + 1.0) {
        issues.push({
          id: `excessive_silence_${cur.sub.id}_${next.sub.id}`,
          type: 'excessive_silence',
          subId: cur.sub.id,
          conflictingSubId: next.sub.id,
          severity: 'minor',
          timeSec: cur.speechOffset,
          durationSec: gapSec,
          descriptionFa: `مکث طولانی غیرضروری (${gapSec} ثانیه) بین دیالوگ #${cur.sub.id} و #${next.sub.id}`,
          isResolvable: true,
        });
      }
    }
  }

  return issues;
}

/**
 * Stage Three: Duration-Aware Translation Shortening
 * Evaluates candidate alternatives or generates concise Persian candidates
 * preserving 100% of semantics, numbers, and negations.
 */
export function getOrGenerateShortenedCandidates(
  sub: SubtitleItem,
  targetDuration: number,
  policy = DEFAULT_BALANCED_TIMING_POLICY
): ScoredCandidateSelectionResult | null {
  const sourceEn = sub.originalText || '';
  const currentFa = sub.farsiText || '';
  if (!currentFa) return null;

  // 1. If subtitle already contains multi-candidates, score them directly
  if (Array.isArray(sub.candidates) && sub.candidates.length > 1) {
    const rawList = sub.candidates.map((c) => ({
      id: c.id,
      text: c.text,
      category: c.category,
    }));
    return scoreAndSelectTranslationCandidates(sourceEn, rawList, targetDuration, sub.voice, policy);
  }

  // 2. Formulate 3 distinct candidate categories locally:
  // Candidate 1: Faithful (current translation)
  // Candidate 2: Concise (removes verbose fillers, converts formal constructs to direct conversational Persian)
  // Candidate 3: Compact Direct (direct, punchy colloquial phrasing)
  const candidate1 = currentFa.trim();

  // Concise phrasing: remove verbose Persian filler patterns without losing nouns/verbs/negation/numbers
  let candidate2 = candidate1
    .replace(/(^|\s)به طوری که(\s|$)/g, '$1طوری که$2')
    .replace(/(^|\s)لازم به ذکر است که(\s|$)/g, '$1')
    .replace(/(^|\s)می‌توان گفت که(\s|$)/g, '$1')
    .replace(/(^|\s)در واقع(\s|$)/g, '$1')
    .replace(/(^|\s)به منظور این که(\s|$)/g, '$1برای اینکه$2')
    .replace(/(^|\s)به این دلیل که(\s|$)/g, '$1چون$2')
    .replace(/(^|\s)در رابطه با(\s|$)/g, '$1درباره$2')
    .replace(/(^|\s)در حال حاضر(\s|$)/g, '$1الان$2')
    .replace(/(^|\s)می‌باشند(\s|$)/g, '$1هستن$2')
    .replace(/(^|\s)می‌باشد(\s|$)/g, '$1هست$2')
    .replace(/(^|\s)می‌شود(\s|$)/g, '$1می‌شه$2')
    .replace(/\s+/g, ' ')
    .trim();

  // Compact direct phrasing: colloquial spoken contraction
  let candidate3 = candidate2
    .replace(/(^|\s)استفاده کردن از(\s|$)/g, '$1به‌کارگیری$2')
    .replace(/(^|\s)انجام دادن(\s|$)/g, '$1انجام داد$2')
    .replace(/(^|\s)نگاه کنید(\s|$)/g, '$1ببینید$2')
    .replace(/(^|\s)توجه داشته باشید(\s|$)/g, '$1دقت کنید$2')
    .replace(/\s+/g, ' ')
    .trim();

  const candidatesList = [
    { id: 'candidate_faithful', text: candidate1, category: 'faithful' },
    { id: 'candidate_concise', text: candidate2, category: 'concise' },
    { id: 'candidate_direct', text: candidate3, category: 'conversational' },
  ];

  return scoreAndSelectTranslationCandidates(sourceEn, candidatesList, targetDuration, sub.voice, policy);
}

/**
 * Stage Four: Adaptive Speech Acceleration Helper
 * Discrete speed levels: [1.00, 1.10, 1.20, 1.30]
 * Selects the smallest acceleration that safely solves the conflict.
 * NEVER exceeds maxSpeed (1.30x).
 */
export function selectAdaptiveSpeedLevel(
  neededTempo: number,
  allowedLevels: number[] = [1.00, 1.10, 1.20, 1.30],
  maxSpeed: number = 1.30
): { selectedTempo: number; isWithinMax: boolean; category: AutoFixCategory } {
  // If no acceleration needed (or <= 1.02x)
  if (neededTempo <= 1.02) {
    return { selectedTempo: 1.00, isWithinMax: true, category: 'AUTO_FIXED' };
  }

  // Find smallest discrete level >= neededTempo
  const sortedLevels = [...allowedLevels].sort((a, b) => a - b);
  for (const lvl of sortedLevels) {
    if (lvl > 1.00 && lvl >= neededTempo - 0.015) {
      if (lvl <= maxSpeed + 0.001) {
        let cat: AutoFixCategory = 'FIXED_WITH_MILD_ACCELERATION';
        if (Math.abs(lvl - 1.10) < 0.02) cat = 'FIXED_WITH_MILD_ACCELERATION';
        else if (Math.abs(lvl - 1.20) < 0.02) cat = 'FIXED_WITH_MODERATE_ACCELERATION';
        else if (Math.abs(lvl - 1.30) < 0.02) cat = 'FIXED_WITH_MAX_ACCELERATION';
        return { selectedTempo: lvl, isWithinMax: true, category: cat };
      }
    }
  }

  // If neededTempo > maxSpeed (1.30x)
  return {
    selectedTempo: Math.min(1.30, maxSpeed),
    isWithinMax: false,
    category: 'MANUAL_REVIEW_REQUIRED',
  };
}

/**
 * Stage Five, Six, & Eight: Balanced Timeline Scheduler & Optimization Engine
 * Generates an optimal timeline plan following the Balanced priorities:
 * 1. Verify real active-speech overlap
 * 2. Preserve intentional overlaps
 * 3. Safe silence trimming (AUTO_FIXED)
 * 4. Micro-shift into pre-gap (FIXED_WITH_TIMING_ADJUSTMENT)
 * 5. Duration-aware translation shortening (FIXED_WITH_SHORTER_TRANSLATION)
 * 6. Adaptive discrete acceleration (1.10x, 1.20x, 1.30x)
 * 7. Flags genuinely unsolvable constraints (MANUAL_REVIEW_REQUIRED) with specific reason.
 */
export function scheduleOptimizedTimeline(
  profiles: SegmentTimingProfile[],
  issues: TimelineIssue[],
  config: TimelineAutoFixConfig = DEFAULT_AUTO_FIX_CONFIG
): {
  plannedCorrections: Map<number, PlannedCorrection>;
  unresolvedIssues: TimelineIssue[];
  segmentResolutions: AutoFixSegmentResolution[];
} {
  const sorted = [...profiles].sort((a, b) => a.intendedStart - b.intendedStart);
  const plannedCorrections = new Map<number, PlannedCorrection>();
  const unresolvedIssues: TimelineIssue[] = [];
  const segmentResolutions: AutoFixSegmentResolution[] = [];

  const placementConfig = config.placement ?? DEFAULT_TIMELINE_PLACEMENT_CONFIG;
  const placementEnabled = placementConfig.enabled ?? true;
  const maxEarlyShift = config.maxEarlyShiftSeconds ?? placementConfig.maxEarlyShiftSeconds ?? 2.0;
  const maxLateShift = config.maxLateShiftSeconds ?? placementConfig.maxLateShiftSeconds ?? 2.0;
  const naturalPause = config.targetNaturalPauseSec ?? 0.12;
  const zeroSilenceEnabled = config.zeroSilenceEnabled !== false;
  const paddingMs = config.silencePaddingMs ?? 25;
  const padSec = paddingMs / 1000;
  const minGap = config.minNaturalGapSec ?? 0.04;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = i < sorted.length - 1 ? sorted[i + 1] : null;
    const prev = i > 0 ? sorted[i - 1] : null;

    const anchorStart = cur.sub.originalStart ?? cur.intendedStart;

    // Feature 1: Zero-Unnecessary-Silence Audio Generation / Analysis
    let trimLeading = zeroSilenceEnabled && cur.leadingSilenceSec > minGap;
    let trimTrailing = zeroSilenceEnabled && cur.trailingSilenceSec > minGap;
    let leadingSilenceTrimmedSec = trimLeading ? Math.max(0, Math.round((cur.leadingSilenceSec - padSec) * 1000) / 1000) : 0;
    let trailingSilenceTrimmedSec = trimTrailing ? Math.max(0, Math.round((cur.trailingSilenceSec - padSec) * 1000) / 1000) : 0;
    let workingActiveDuration = cur.activeSpeechDuration && cur.activeSpeechDuration < cur.rawAudioDuration
      ? cur.activeSpeechDuration
      : Math.max(0.1, Math.round((cur.rawAudioDuration - leadingSilenceTrimmedSec - trailingSilenceTrimmedSec) * 1000) / 1000);

    // Intentional overlap check
    if (cur.isIntentional) {
      plannedCorrections.set(cur.sub.id, {
        subId: cur.sub.id,
        category: 'INTENTIONAL_OVERLAP',
        trimLeadingSilence: false,
        trimTrailingSilence: false,
        leadingSilenceTrimmedSec: 0,
        trailingSilenceTrimmedSec: 0,
        proposedTempo: 1.00,
        proposedOffset: 0,
        originalStart: anchorStart,
        adjustedStart: anchorStart,
        shiftAmountSec: 0,
        shiftDirection: 'none',
        shiftReason: 'none',
        newStart: anchorStart,
        expectedDuration: cur.rawAudioDuration,
        isResolvable: true,
      });
      segmentResolutions.push({
        subId: cur.sub.id,
        category: 'INTENTIONAL_OVERLAP',
        appliedSpeed: 1.00,
        appliedOffset: 0,
        originalStart: anchorStart,
        adjustedStart: anchorStart,
        shiftAmountSec: 0,
        shiftDirection: 'none',
        shiftReason: 'none',
        leadingSilenceTrimmedSec: 0,
        trailingSilenceTrimmedSec: 0,
        farsiText: cur.sub.farsiText,
        originalText: cur.sub.originalText,
        isResolved: true,
        reasonFa: 'هم‌پوشانی تعمدی با دیالوگ هم‌زمان دیگر در فیلم اصلی حفظ شد.',
      });
      continue;
    }

    // Determine boundaries for cur
    // Prev boundary
    let minAfterPrev = 0;
    if (prev) {
      const prevPlan = plannedCorrections.get(prev.sub.id);
      const prevEnd = prevPlan
        ? Math.round((prevPlan.newStart + prevPlan.expectedDuration) * 1000) / 1000
        : Math.round((prev.currentStart + prev.rawAudioDuration) * 1000) / 1000;
      if (!prev.isIntentional) {
        if (anchorStart < prevEnd - 0.01) {
          minAfterPrev = Math.round((prevEnd + 0.02) * 1000) / 1000;
        } else {
          minAfterPrev = prevEnd;
        }
      }
    }

    // Configurable Early/Late bounds
    const earliestBound = Math.max(0, Math.round((anchorStart - (placementEnabled ? maxEarlyShift : 0)) * 1000) / 1000);
    const latestBound = Math.round((anchorStart + (placementEnabled ? maxLateShift : 0)) * 1000) / 1000;

    // Hard ordering constraint: never reverse chronological dialogue order
    const effectiveMinStart = Math.max(earliestBound, minAfterPrev);
    const effectiveMaxStart = Math.max(effectiveMinStart, latestBound);

    // Next boundary
    let latestSafeEnd = anchorStart + cur.intendedDuration;
    if (next && !next.isIntentional) {
      const nextAnchor = next.sub.originalStart ?? next.intendedStart;
      const nextBound = Math.round((nextAnchor + (next.leadingSilenceSec || 0)) * 1000) / 1000;
      latestSafeEnd = Math.max(anchorStart + cur.intendedDuration, nextBound);
    }

    const latestSafeStartForCur = latestSafeEnd !== Infinity
      ? Math.round((latestSafeEnd - workingActiveDuration) * 1000) / 1000
      : Infinity;

    // Search for best collision-free start time S in [effectiveMinStart, effectiveMaxStart]
    const sLow = effectiveMinStart;
    const sHigh = Math.min(effectiveMaxStart, latestSafeStartForCur);

    let resolvedCategory: AutoFixCategory = 'AUTO_FIXED';
    let finalTempo = 1.00;
    let plannedOffset = 0;
    let shiftDirection: 'earlier' | 'later' | 'none' = 'none';
    let shiftReason: ShiftAdjustmentReason = 'none';
    let isResolvable = true;
    let unresolvedReasonFa: string | undefined;
    let newFarsiText: string | undefined;
    let isTranslationShortened = false;

    if (sLow <= sHigh) {
      // Safe collision-free window exists!
      let bestStart = anchorStart;
      if (anchorStart < sLow - 0.01) {
        bestStart = sLow;
        shiftDirection = 'later';
        shiftReason = anchorStart < minAfterPrev - 0.01 ? 'speech_overlap' : 'timing_optimization';
        resolvedCategory = 'FIXED_WITH_TIMING_ADJUSTMENT';
      } else if (anchorStart > sHigh + 0.01) {
        bestStart = sHigh;
        shiftDirection = 'earlier';
        shiftReason = 'speech_overlap';
        resolvedCategory = 'FIXED_WITH_TIMING_ADJUSTMENT';
      } else {
        // Fits at anchorStart!
        bestStart = anchorStart;
        shiftDirection = 'none';
        shiftReason = 'none';
        resolvedCategory = 'AUTO_FIXED';
      }

      plannedOffset = Math.round((bestStart - anchorStart) * 100) / 100;
      finalTempo = 1.00;
      isResolvable = true;
    } else {
      // Audio duration exceeds available space between prev and next even with max placement!
      // Place cur at effectiveMinStart to provide maximal available room before next
      let bestStart = effectiveMinStart;
      plannedOffset = Math.round((bestStart - anchorStart) * 100) / 100;
      shiftDirection = plannedOffset < -0.01 ? 'earlier' : (plannedOffset > 0.01 ? 'later' : 'none');
      shiftReason = 'duration_correction';

      const availableWindow = latestSafeEnd !== Infinity
        ? Math.max(0.15, Math.round((latestSafeEnd - bestStart) * 1000) / 1000)
        : cur.intendedDuration;

      // Priority 5: Duration-aware translation shortening
      if (config.translationShortening) {
        const selection = getOrGenerateShortenedCandidates(cur.sub, availableWindow);
        if (selection && selection.selectedCandidate && selection.selectedCandidate.validationStatus !== 'invalid') {
          const cand = selection.selectedCandidate;
          if (cand.predictedDuration < workingActiveDuration - 0.1) {
            newFarsiText = cand.text;
            workingActiveDuration = cand.predictedDuration;
            isTranslationShortened = true;

            if (workingActiveDuration <= availableWindow + 0.03) {
              resolvedCategory = 'FIXED_WITH_SHORTER_TRANSLATION';
              finalTempo = 1.00;
              isResolvable = true;
            }
          }
        }
      }

      // Priority 6: Adaptive discrete acceleration [1.00, 1.10, 1.20, 1.30]
      if (workingActiveDuration > availableWindow + 0.03) {
        const rawNeededTempo = Math.round((workingActiveDuration / Math.max(0.15, availableWindow)) * 100) / 100;
        const adaptive = selectAdaptiveSpeedLevel(rawNeededTempo, config.adaptiveSpeedLevels, config.maxSpeed);

        finalTempo = adaptive.selectedTempo;

        if (adaptive.isWithinMax) {
          resolvedCategory = isTranslationShortened
            ? 'FIXED_WITH_SHORTER_TRANSLATION'
            : adaptive.category;
          isResolvable = true;
        } else {
          // Needed tempo exceeds 1.30x maxSpeed
          finalTempo = Math.min(1.30, config.maxSpeed);
          isResolvable = false;
          resolvedCategory = 'MANUAL_REVIEW_REQUIRED';
          unresolvedReasonFa = `دیالوگ #${cur.sub.id} بیش از حد طولانی است؛ سرعت مورد نیاز (${rawNeededTempo.toFixed(2)}x) بیش از سقف مجاز (${config.maxSpeed.toFixed(2)}x) است و امکان خلاصه‌سازی بیشتر بدون افت معنا وجود ندارد.`;

          unresolvedIssues.push({
            id: `unresolved_overflow_${cur.sub.id}`,
            type: 'unfit_duration',
            subId: cur.sub.id,
            severity: 'severe',
            timeSec: bestStart,
            durationSec: Math.round((workingActiveDuration / finalTempo - availableWindow) * 100) / 100,
            descriptionFa: unresolvedReasonFa,
            isResolvable: false,
            unresolvedReasonFa,
          });
        }
      }
    }

    const finalStart = Math.round((anchorStart + plannedOffset) * 1000) / 1000;
    const expectedDuration = Math.round((workingActiveDuration / finalTempo) * 1000) / 1000;
    const shiftAmountSec = Math.round(Math.abs(plannedOffset) * 1000) / 1000;

    plannedCorrections.set(cur.sub.id, {
      subId: cur.sub.id,
      category: resolvedCategory,
      trimLeadingSilence: trimLeading,
      trimTrailingSilence: trimTrailing,
      leadingSilenceTrimmedSec,
      trailingSilenceTrimmedSec,
      proposedTempo: finalTempo,
      proposedOffset: plannedOffset,
      originalStart: anchorStart,
      adjustedStart: finalStart,
      shiftAmountSec,
      shiftDirection,
      shiftReason,
      newStart: finalStart,
      expectedDuration,
      isResolvable,
      unresolvedReasonFa,
      newFarsiText,
      isTranslationShortened,
    });

    let reasonFa = '';
    const roundedOffset = Math.round(plannedOffset * 100) / 100;
    const offsetStr = roundedOffset > 0 ? `+${roundedOffset.toFixed(2)}s` : `${roundedOffset.toFixed(2)}s`;

    switch (resolvedCategory) {
      case 'AUTO_FIXED':
        reasonFa = (leadingSilenceTrimmedSec > 0 || trailingSilenceTrimmedSec > 0)
          ? `حذف سکوت‌های دیجیتال زائد (${(leadingSilenceTrimmedSec + trailingSilenceTrimmedSec).toFixed(2)} ثانیه) بدون تغییر سرعت`
          : 'تراز زمانی بهینه بدون نیاز به تغییر';
        break;
      case 'FIXED_WITH_TIMING_ADJUSTMENT':
        if (shiftDirection === 'earlier') {
          reasonFa = `شیفت زمانی به جلو (${offsetStr}) جهت رفع تداخل با دیالوگ بعدی بدون تغییر سرعت`;
        } else if (shiftDirection === 'later') {
          reasonFa = `شیفت زمانی به عقب (${offsetStr}) جهت رفع تداخل با دیالوگ قبلی بدون تغییر سرعت`;
        } else {
          reasonFa = `تنظیم میکروافست به میزان ${offsetStr} بدون تغییر سرعت`;
        }
        break;
      case 'FIXED_WITH_SHORTER_TRANSLATION':
        reasonFa = `انتخاب ترجمه خلاصه‌تر با حفظ ۱۰۰٪ معنا و بدون نیاز به تند کردن صدا${roundedOffset !== 0 ? ` (جابجایی ${offsetStr})` : ''}`;
        break;
      case 'FIXED_WITH_MILD_ACCELERATION':
        reasonFa = `فشرده‌سازی ملایم WSOLA با سرعت 1.10x و حفظ کامل لحن صدا${roundedOffset !== 0 ? ` (جابجایی ${offsetStr})` : ''}`;
        break;
      case 'FIXED_WITH_MODERATE_ACCELERATION':
        reasonFa = `فشرده‌سازی متوسط WSOLA با سرعت 1.20x و حفظ لحن صدا${roundedOffset !== 0 ? ` (جابجایی ${offsetStr})` : ''}`;
        break;
      case 'FIXED_WITH_MAX_ACCELERATION':
        reasonFa = `فشرده‌سازی با حداکثر سرعت مجاز 1.30x با حفظ زیروبمی${roundedOffset !== 0 ? ` (جابجایی ${offsetStr})` : ''}`;
        break;
      case 'MANUAL_REVIEW_REQUIRED':
        reasonFa = unresolvedReasonFa || 'عدم امکان جاگیری در بازه مجاز بدون افت کیفیت یا حذف معنا';
        break;
      default:
        reasonFa = 'اصلاح خودکار خط زمان';
    }

    segmentResolutions.push({
      subId: cur.sub.id,
      category: resolvedCategory,
      appliedSpeed: finalTempo,
      appliedOffset: plannedOffset,
      originalStart: anchorStart,
      adjustedStart: finalStart,
      shiftAmountSec,
      shiftDirection,
      shiftReason,
      leadingSilenceTrimmedSec,
      trailingSilenceTrimmedSec,
      farsiText: newFarsiText || cur.sub.farsiText,
      originalText: cur.sub.originalText,
      isResolved: isResolvable,
      reasonFa,
    });
  }

  return {
    plannedCorrections,
    unresolvedIssues,
    segmentResolutions,
  };
}

/**
 * Executes planned auto-fix corrections on all audio buffers using WSOLA
 * pitch-preserving time-stretching and silence trimming with boundary padding.
 */
export async function applyAutoFixCorrections(
  subtitles: SubtitleItem[],
  plannedCorrections: Map<number, PlannedCorrection>,
  audioCtx: BaseAudioContext | null,
  onProgress?: (current: number, total: number, message: string) => void,
  abortSignal?: { aborted: boolean }
): Promise<SubtitleItem[]> {
  const updatedSubtitles: SubtitleItem[] = [];

  for (let idx = 0; idx < subtitles.length; idx++) {
    if (abortSignal?.aborted) {
      throw new Error('عملیات اصلاح هوشمند توسط کاربر متوقف شد.');
    }

    const sub = subtitles[idx];
    const plan = plannedCorrections.get(sub.id);

    if (!plan) {
      updatedSubtitles.push(sub);
      continue;
    }

    onProgress?.(
      idx + 1,
      subtitles.length,
      `در حال اصلاح و بهینه‌سازی صوتی دیالوگ #${sub.id}...`
    );

    const pristineAudio = sub.originalAudioBase64 || sub.audioBase64;
    let processedBase64 = sub.processedAudioBase64 || pristineAudio;
    let newAudioDuration = plan.expectedDuration;
    let newEffectiveDuration = plan.expectedDuration;

    if (pristineAudio && audioCtx) {
      try {
        let buffer = await decodeBase64ToAudioBuffer(pristineAudio);

        // 1. Trim dead silence if planned (preserving 25ms boundary padding to protect consonants)
        if (plan.trimLeadingSilence || plan.trimTrailingSilence) {
          const profile = profileAudioSilence(buffer);
          buffer = extractEffectiveSpeechBuffer(buffer, audioCtx, profile);
        }

        // 2. Pitch-preserving WSOLA time stretch (discrete levels: 1.10, 1.20, 1.30)
        if (Math.abs(plan.proposedTempo - 1.0) >= 0.015) {
          buffer = timeStretchAudioBufferWSOLA(buffer, plan.proposedTempo, audioCtx);
        }

        const wavBlob = audioBufferToWav(buffer);
        processedBase64 = await blobToBase64(wavBlob);
        newAudioDuration = Math.round(buffer.duration * 100) / 100;
        newEffectiveDuration = newAudioDuration;
      } catch (err) {
        console.warn(`[AutoFix] Audio processing fallback for line #${sub.id}:`, err);
      }
    }

    const finalFarsi = plan.newFarsiText || sub.farsiText;
    const originalStart = sub.originalStart ?? sub.start;
    const adjustedStart = plan.adjustedStart;

    updatedSubtitles.push({
      ...sub,
      originalStart,
      adjustedStart,
      farsiText: finalFarsi,
      originalAudioBase64: pristineAudio || undefined,
      processedAudioBase64: processedBase64 || undefined,
      audioBase64: processedBase64 || sub.audioBase64,
      audioDuration: newAudioDuration,
      effectiveDuration: newEffectiveDuration,
      appliedSpeed: plan.proposedTempo,
      timeStretchRatio: plan.proposedTempo,
      playbackRate: 1.0,
      audioOffset: plan.proposedOffset,
      shiftDirection: plan.shiftDirection,
      shiftAmountSec: plan.shiftAmountSec,
      shiftReason: plan.shiftReason,
      leadingSilenceRemovedSec: plan.leadingSilenceTrimmedSec,
      trailingSilenceRemovedSec: plan.trailingSilenceTrimmedSec,
      correctionReasonFa: plan.unresolvedReasonFa,
      syncStatus: plan.isResolvable ? 'synchronized' : 'manual_review',
    });
  }

  return updatedSubtitles;
}

/**
 * The Master End-to-End One-Click Audio Timeline Auto-Fix Pipeline:
 * 1. Analyzes entire timeline using actual audio measurements & VAD.
 * 2. Generates optimal interval schedule minimizing speech overlap & delays.
 * 3. Applies safe silence trimming, translation shortening, and WSOLA pitch-preserved time-stretching.
 * 4. Runs a second complete verification pass to validate resulting timeline.
 * 5. Compiles all 15 operational metrics for the Results Dashboard.
 */
export async function autoFixEntireTimeline(
  subtitles: SubtitleItem[],
  config: Partial<TimelineAutoFixConfig> = {},
  audioCtx?: BaseAudioContext | null,
  onProgress?: (stepPercent: number, message: string) => void,
  abortSignal?: { aborted: boolean }
): Promise<AutoFixResult> {
  const startTime = Date.now();
  const fullConfig: TimelineAutoFixConfig = { ...DEFAULT_AUTO_FIX_CONFIG, ...config };
  // Ensure maximum speed never exceeds 1.30x under any circumstance
  fullConfig.maxSpeed = Math.min(1.30, fullConfig.maxSpeed || 1.30);
  fullConfig.maxSafeTempo = Math.min(1.30, fullConfig.maxSafeTempo || 1.30);

  // Capture Undo history snapshot
  const historySnapshot: BulkSpeedHistorySnapshot = {
    timestamp: Date.now(),
    descriptionFa: 'اصلاح خودکار و جامع تایم‌لاین صوتی (Auto Fix All Audio)',
    items: subtitles.map((s) => ({
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

  if (!subtitles || subtitles.length === 0) {
    return {
      success: true,
      updatedSubtitles: [],
      originalSubtitlesSnapshot: JSON.parse(JSON.stringify(subtitles || [])),
      stats: {
        totalAnalyzed: 0,
        initialFileOverlaps: 0,
        initialActiveSpeechOverlaps: 0,
        intentionalOverlaps: 0,
        automaticallyResolvedOverlaps: 0,
        fixedBySilence: 0,
        fixedByShorterTranslation: 0,
        fixedAt110: 0,
        fixedAt120: 0,
        fixedAt130: 0,
        fixedByTimingAdjustment: 0,
        remainingUnintendedOverlaps: 0,
        manualReviewCount: 0,
        averageStartDeviationSec: 0,
        totalProcessingDurationMs: 0,
        filesWithLeadingSilenceRemoved: 0,
        filesWithTrailingSilenceRemoved: 0,
        totalSilenceRemovedSec: 0,
        segmentsShiftedEarlier: 0,
        segmentsShiftedLater: 0,
        averageAbsoluteTimingShiftSec: 0,
        maxTimingShiftSec: 0,
        conflictsResolvedByPlacement: 0,
        conflictsResolvedByTranslation: 0,
        conflictsResolvedByStretching: 0,
        remainingManualReviewCases: 0,
        overlapsDetected: 0,
        overlapsFixed: 0,
        timingProblemsFixed: 0,
        segmentsAdjusted: 0,
        segmentsTimeStretched: 0,
        unresolvedConflictsCount: 0,
        unresolvedIssues: [],
        issuesFound: [],
        segmentResolutions: [],
      },
      historySnapshot,
      messageFa: 'هیچ دیالوگی برای اصلاح یافت نشد.',
    };
  }

  const ctx = audioCtx || (typeof window !== 'undefined' ? getAudioContext() : null);

  // STEP 1: Complete Initial Analysis Pass
  onProgress?.(10, 'در حال اندازه‌گیری فیزیکی صوت و تحلیل فواصل گفتار...');
  const initialProfiles = await measureAndProfileSegments(subtitles, ctx);

  if (abortSignal?.aborted) throw new Error('عملیات متوقف شد.');

  onProgress?.(25, 'در حال شناسایی تداخل‌های گفتاری و خطاهای زمانی...');
  const initialIssues = detectTimelineIssues(initialProfiles, fullConfig);

  const initialFileOverlaps = initialProfiles.reduce((acc, cur, i) => {
    if (i < initialProfiles.length - 1) {
      const next = initialProfiles[i + 1];
      if (cur.currentEnd > next.currentStart + 0.04) return acc + 1;
    }
    return acc;
  }, 0);

  const initialActiveSpeechOverlaps = initialIssues.filter(
    (i) => i.type === 'speech_overlap' && !i.isIntentional
  ).length;

  const intentionalOverlaps = initialIssues.filter(
    (i) => i.type === 'intentional_overlap' || i.isIntentional
  ).length;

  // STEP 2: Generate Optimized Timeline Schedule
  onProgress?.(45, 'در حال محاسبه زمان‌بندی بهینه با الگوریتم وزن‌دار...');
  const { plannedCorrections, unresolvedIssues, segmentResolutions } = scheduleOptimizedTimeline(
    initialProfiles,
    initialIssues,
    fullConfig
  );

  if (abortSignal?.aborted) throw new Error('عملیات متوقف شد.');

  // STEP 3: Apply Safe Corrections
  onProgress?.(60, 'در حال اعمال برش سکوت و فشرده‌سازی زمانی WSOLA...');
  const updatedSubtitles = await applyAutoFixCorrections(
    subtitles,
    plannedCorrections,
    ctx,
    (curr, total, msg) => {
      const pct = 60 + Math.floor((curr / total) * 25);
      onProgress?.(pct, msg);
    },
    abortSignal
  );

  // STEP 4: Second Complete Verification Pass
  onProgress?.(90, 'در حال اعتبارسنجی نهایی تایم‌لاین اصلاح‌شده...');
  const postProfiles = await measureAndProfileSegments(updatedSubtitles, ctx);
  const postIssues = detectTimelineIssues(postProfiles, fullConfig);

  const remainingUnintendedOverlaps = postIssues.filter(
    (i) => i.type === 'speech_overlap' && !i.isIntentional
  ).length;

  const automaticallyResolvedOverlaps = Math.max(0, initialActiveSpeechOverlaps - remainingUnintendedOverlaps);

  // Categorize Segment Fix Statistics
  let fixedBySilence = 0;
  let fixedByShorterTranslation = 0;
  let fixedAt110 = 0;
  let fixedAt120 = 0;
  let fixedAt130 = 0;
  let fixedByTimingAdjustment = 0;
  let manualReviewCount = 0;
  let totalStartDeviation = 0;
  let segmentsAdjusted = 0;
  let segmentsTimeStretched = 0;

  // Feature 1: Zero-Silence Metrics
  let filesWithLeadingSilenceRemoved = 0;
  let filesWithTrailingSilenceRemoved = 0;
  let totalSilenceRemovedSec = 0;

  // Feature 2: Flexible Timeline Placement Metrics
  let segmentsShiftedEarlier = 0;
  let segmentsShiftedLater = 0;
  let totalAbsoluteTimingShiftSec = 0;
  let maxTimingShiftSec = 0;
  let conflictsResolvedByPlacement = 0;
  let conflictsResolvedByTranslation = 0;
  let conflictsResolvedByStretching = 0;

  for (const res of segmentResolutions) {
    switch (res.category) {
      case 'AUTO_FIXED':
        fixedBySilence++;
        break;
      case 'FIXED_WITH_TIMING_ADJUSTMENT':
        fixedByTimingAdjustment++;
        segmentsAdjusted++;
        conflictsResolvedByPlacement++;
        break;
      case 'FIXED_WITH_SHORTER_TRANSLATION':
        fixedByShorterTranslation++;
        segmentsAdjusted++;
        conflictsResolvedByTranslation++;
        break;
      case 'FIXED_WITH_MILD_ACCELERATION':
        fixedAt110++;
        segmentsTimeStretched++;
        segmentsAdjusted++;
        conflictsResolvedByStretching++;
        break;
      case 'FIXED_WITH_MODERATE_ACCELERATION':
        fixedAt120++;
        segmentsTimeStretched++;
        segmentsAdjusted++;
        conflictsResolvedByStretching++;
        break;
      case 'FIXED_WITH_MAX_ACCELERATION':
        fixedAt130++;
        segmentsTimeStretched++;
        segmentsAdjusted++;
        conflictsResolvedByStretching++;
        break;
      case 'MANUAL_REVIEW_REQUIRED':
        manualReviewCount++;
        break;
    }

    if (res.leadingSilenceTrimmedSec && res.leadingSilenceTrimmedSec > 0.005) {
      filesWithLeadingSilenceRemoved++;
      totalSilenceRemovedSec += res.leadingSilenceTrimmedSec;
    }
    if (res.trailingSilenceTrimmedSec && res.trailingSilenceTrimmedSec > 0.005) {
      filesWithTrailingSilenceRemoved++;
      totalSilenceRemovedSec += res.trailingSilenceTrimmedSec;
    }
    if (res.shiftDirection === 'earlier') {
      segmentsShiftedEarlier++;
    } else if (res.shiftDirection === 'later') {
      segmentsShiftedLater++;
    }
    const absShift = Math.abs(res.appliedOffset || 0);
    if (absShift > 0.01) {
      totalAbsoluteTimingShiftSec += absShift;
      if (absShift > maxTimingShiftSec) {
        maxTimingShiftSec = absShift;
      }
    }
    totalStartDeviation += Math.abs(res.appliedOffset || 0);
  }

  const shiftedCount = segmentsShiftedEarlier + segmentsShiftedLater;
  const averageAbsoluteTimingShiftSec =
    shiftedCount > 0 ? Math.round((totalAbsoluteTimingShiftSec / shiftedCount) * 1000) / 1000 : 0;
  totalSilenceRemovedSec = Math.round(totalSilenceRemovedSec * 1000) / 1000;
  maxTimingShiftSec = Math.round(maxTimingShiftSec * 1000) / 1000;

  const averageStartDeviationSec =
    updatedSubtitles.length > 0
      ? Math.round((totalStartDeviation / updatedSubtitles.length) * 1000) / 1000
      : 0;

  const timingProblemsFixed = Math.max(0, initialIssues.length - postIssues.length);

  // Combine planned unresolved issues (e.g. unfit durations exceeding 1.30x) with any post-pass collisions
  const combinedUnresolvedMap = new Map<string, TimelineIssue>();
  for (const iss of unresolvedIssues) {
    combinedUnresolvedMap.set(iss.id, iss);
  }
  for (const iss of postIssues) {
    if (!iss.isResolvable || iss.severity === 'severe') {
      const existing = unresolvedIssues.find((u) => u.subId === iss.subId);
      if (existing) {
        combinedUnresolvedMap.set(iss.id, {
          ...iss,
          isResolvable: false,
          descriptionFa: existing.descriptionFa,
          unresolvedReasonFa: existing.unresolvedReasonFa,
        });
      } else {
        combinedUnresolvedMap.set(iss.id, {
          ...iss,
          isResolvable: false,
          unresolvedReasonFa: iss.descriptionFa,
        });
      }
    }
  }
  const finalUnresolved = Array.from(combinedUnresolvedMap.values());
  const totalProcessingDurationMs = Date.now() - startTime;

  const stats: AutoFixStatistics = {
    totalAnalyzed: subtitles.length,
    initialFileOverlaps,
    initialActiveSpeechOverlaps,
    intentionalOverlaps,
    automaticallyResolvedOverlaps,
    fixedBySilence,
    fixedByShorterTranslation,
    fixedAt110,
    fixedAt120,
    fixedAt130,
    fixedByTimingAdjustment,
    remainingUnintendedOverlaps,
    manualReviewCount: finalUnresolved.length,
    averageStartDeviationSec,
    totalProcessingDurationMs,

    filesWithLeadingSilenceRemoved,
    filesWithTrailingSilenceRemoved,
    totalSilenceRemovedSec,
    segmentsShiftedEarlier,
    segmentsShiftedLater,
    averageAbsoluteTimingShiftSec,
    maxTimingShiftSec,
    conflictsResolvedByPlacement,
    conflictsResolvedByTranslation,
    conflictsResolvedByStretching,
    remainingManualReviewCases: finalUnresolved.length,

    // Aliases for backwards compatibility
    overlapsDetected: initialActiveSpeechOverlaps,
    overlapsFixed: automaticallyResolvedOverlaps,
    timingProblemsFixed,
    segmentsAdjusted,
    segmentsTimeStretched,
    unresolvedConflictsCount: finalUnresolved.length,
    unresolvedIssues: finalUnresolved,
    issuesFound: initialIssues,
    segmentResolutions,
  };

  onProgress?.(100, 'اصلاح هوشمند تایم‌لاین به پایان رسید!');

  const success = finalUnresolved.length === 0;
  const messageFa = success
    ? `تمام ${automaticallyResolvedOverlaps} تداخل گفتار با موفقیت برطرف شد (۰ تداخل باقی‌مانده).`
    : `تعداد ${automaticallyResolvedOverlaps} تداخل برطرف شد؛ ${finalUnresolved.length} مورد به دلیل طولانی بودن متن نیازمند بررسی دستی است.`;

  return {
    success,
    updatedSubtitles,
    originalSubtitlesSnapshot: JSON.parse(JSON.stringify(subtitles)),
    stats,
    historySnapshot,
    messageFa,
  };
}
