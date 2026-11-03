import {
  SubtitleItem,
  DetectedOverlap,
  OverlapSummary,
  OverlapSeverity,
  OverlapThresholds,
  DEFAULT_OVERLAP_THRESHOLDS,
  BulkSpeedHistorySnapshot,
} from '../types/dubbing';
import {
  timeStretchAudioBufferWSOLA,
  profileAudioSilence,
  extractEffectiveSpeechBuffer,
} from './syncEngine';
import {
  getAudioContext,
  decodeBase64ToAudioBuffer,
  audioBufferToWav,
} from './audioMixer';

/**
 * Converts a Blob to a Base64 string in both browser and node test environments.
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

/**
 * Classifies the severity of an audio overlap based on duration and percentage
 * relative to the shorter conflicting audio segment.
 */
export function classifyOverlapSeverity(
  durationSec: number,
  percentage: number,
  thresholds: OverlapThresholds = DEFAULT_OVERLAP_THRESHOLDS
): OverlapSeverity {
  if (durationSec <= thresholds.minOverlapDurationSec) {
    return 'none';
  }

  // Moderate threshold check
  if (durationSec > thresholds.moderateMaxSec && percentage > thresholds.moderateMaxPercent) {
    return 'severe';
  }

  if (durationSec > thresholds.minorMaxSec || percentage > thresholds.minorMaxPercent) {
    return 'moderate';
  }

  return 'minor';
}

/**
 * Detects and classifies all timeline overlaps across audio segments.
 * Accurately differentiates active speech overlaps, intentional multi-speaker
 * dialogues, and silence-only overlaps caused by leading/trailing digital dead margins.
 */
export function detectAudioOverlaps(
  subtitles: SubtitleItem[],
  thresholds: OverlapThresholds = DEFAULT_OVERLAP_THRESHOLDS
): OverlapSummary {
  const overlaps: DetectedOverlap[] = [];
  const segmentOverlapMap: Record<number, DetectedOverlap[]> = {};

  if (!subtitles || subtitles.length < 2) {
    return {
      totalOverlaps: 0,
      affectedSegmentCount: 0,
      severeCount: 0,
      moderateCount: 0,
      minorCount: 0,
      silenceCount: 0,
      intentionalCount: 0,
      totalOverlapDurationSec: 0,
      overlaps: [],
      segmentOverlapMap: {},
    };
  }

  // Prepare segment metadata sorted strictly by timeline start time
  interface PreparedSegment {
    sub: SubtitleItem;
    start: number;
    audioDuration: number;
    effectiveDuration: number;
    end: number;
    leadingSilence: number;
    trailingSilence: number;
    speechStart: number;
    speechEnd: number;
  }

  const prepared: PreparedSegment[] = subtitles
    .map((sub) => {
      const offset = typeof sub.audioOffset === 'number' ? sub.audioOffset : 0;
      const start = Math.max(0, sub.start + offset);
      // If audio was already processed and stretched to its target buffer,
      // sub.audioDuration is already the exact physical duration of the audio asset.
      // If it hasn't been stretched yet, but a virtual tempo is set, divide by that virtual tempo.
      const hasProcessedBuffer = Boolean(sub.processedAudioBase64);
      const virtualTempo = hasProcessedBuffer ? 1.0 : (sub.appliedSpeed || sub.timeStretchRatio || sub.playbackRate || 1.0);
      
      const rawAudioDur = sub.audioDuration || Math.max(0.1, sub.end - sub.start);
      const audioDuration = Math.round((rawAudioDur / virtualTempo) * 1000) / 1000;
      
      const rawEffDur = sub.effectiveDuration || rawAudioDur;
      const effectiveDuration = Math.round((rawEffDur / virtualTempo) * 1000) / 1000;

      const leadingSilence = (sub.leadingSilenceSec || 0) / virtualTempo;
      const trailingSilence = (sub.trailingSilenceSec || 0) / virtualTempo;

      const speechStart = start + leadingSilence;
      const speechEnd = Math.max(speechStart + 0.05, start + audioDuration - trailingSilence);

      return {
        sub,
        start,
        audioDuration,
        effectiveDuration,
        end: start + audioDuration,
        leadingSilence,
        trailingSilence,
        speechStart,
        speechEnd,
      };
    })
    .sort((a, b) => a.start - b.start);

  const affectedSubIds = new Set<number>();
  let severeCount = 0;
  let moderateCount = 0;
  let minorCount = 0;
  let silenceCount = 0;
  let intentionalCount = 0;
  let totalOverlapDurationSec = 0;

  for (let i = 0; i < prepared.length - 1; i++) {
    const first = prepared[i];

    for (let j = i + 1; j < prepared.length; j++) {
      const second = prepared[j];

      // If the second segment starts after the first segment ends, no overlap with subsequent segments
      if (second.start >= first.end) {
        break;
      }

      // Calculate total audio file box overlap
      const overlapDurationSec = Math.round((first.end - second.start) * 100) / 100;
      if (overlapDurationSec <= thresholds.minOverlapDurationSec) {
        continue;
      }

      // Percentage relative to the shorter segment
      const shorterDur = Math.max(0.1, Math.min(first.audioDuration, second.audioDuration));
      const overlapPercentage = Math.round((overlapDurationSec / shorterDur) * 100);

      // Check if original English dialogue overlapped in source video
      const origOverlapSec = first.sub.end - second.sub.start;
      const isOriginalOverlap = origOverlapSec > 0.20;
      const isIntentional = Boolean(first.sub.isIntentionalOverlap || second.sub.isIntentionalOverlap || isOriginalOverlap);

      // Distinguish speech overlap vs silence-only overlap
      // Active speech overlap occurs if first speechEnd > second speechStart
      const activeSpeechOverlap = first.speechEnd - second.speechStart;
      const isSilenceOverlap = activeSpeechOverlap <= thresholds.minOverlapDurationSec;

      const severity = classifyOverlapSeverity(overlapDurationSec, overlapPercentage, thresholds);

      let descriptionFa = '';
      if (isIntentional) {
        descriptionFa = `هم‌پوشانی تعمدی بین دیالوگ #${first.sub.id} و #${second.sub.id} (${overlapDurationSec}s)`;
        intentionalCount++;
      } else if (isSilenceOverlap) {
        descriptionFa = `تداخل در سکوت حاشیه‌ای بین دیالوگ #${first.sub.id} و #${second.sub.id} (${overlapDurationSec}s - کلام برخورد ندارد)`;
        silenceCount++;
      } else {
        descriptionFa = `تداخل گفتار بین دیالوگ #${first.sub.id} و #${second.sub.id} به مدت ${overlapDurationSec} ثانیه (${overlapPercentage}٪)`;
        if (severity === 'severe') severeCount++;
        else if (severity === 'moderate') moderateCount++;
        else if (severity === 'minor') minorCount++;
      }

      const overlapObj: DetectedOverlap = {
        id: `overlap_${first.sub.id}_${second.sub.id}`,
        firstSubId: first.sub.id,
        secondSubId: second.sub.id,
        firstSubText: first.sub.farsiText || first.sub.originalText,
        secondSubText: second.sub.farsiText || second.sub.originalText,
        firstStart: Math.round(first.start * 100) / 100,
        firstEnd: Math.round(first.end * 100) / 100,
        secondStart: Math.round(second.start * 100) / 100,
        secondEnd: Math.round(second.end * 100) / 100,
        overlapDurationSec,
        overlapPercentage,
        severity,
        isSilenceOverlap,
        isIntentional,
        descriptionFa,
      };

      overlaps.push(overlapObj);
      affectedSubIds.add(first.sub.id);
      affectedSubIds.add(second.sub.id);
      totalOverlapDurationSec += overlapDurationSec;

      // Map to segment lookup
      if (!segmentOverlapMap[first.sub.id]) segmentOverlapMap[first.sub.id] = [];
      segmentOverlapMap[first.sub.id].push(overlapObj);

      if (!segmentOverlapMap[second.sub.id]) segmentOverlapMap[second.sub.id] = [];
      segmentOverlapMap[second.sub.id].push(overlapObj);
    }
  }

  return {
    totalOverlaps: overlaps.length,
    affectedSegmentCount: affectedSubIds.size,
    severeCount,
    moderateCount,
    minorCount,
    silenceCount,
    intentionalCount,
    totalOverlapDurationSec: Math.round(totalOverlapDurationSec * 100) / 100,
    overlaps,
    segmentOverlapMap,
  };
}

/**
 * Returns all detected overlaps involving a specific subtitle item.
 */
export function getOverlapsForSegment(
  summary: OverlapSummary,
  subId: number
): DetectedOverlap[] {
  return summary.segmentOverlapMap[subId] || [];
}

/**
 * Automatically and intelligently resolves ALL audio overlaps across the entire project in a single operation.
 * 1. Analyzes timeline in chronological order.
 * 2. Backs up original raw TTS audio to `originalAudioBase64` if not already saved.
 * 3. Trims dead leading and trailing digital silence.
 * 4. Determines the available window before the next dialogue starts (guaranteeing >= 40ms silence gap).
 * 5. Applies pitch-preserved WSOLA time-stretching with smart pre-gap absorption.
 * 6. Generates a history snapshot so the user can Undo anytime.
 */
export async function autoResolveAllOverlaps(
  subtitles: SubtitleItem[],
  audioCtx?: BaseAudioContext | null,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{
  updatedSubtitles: SubtitleItem[];
  resolvedCount: number;
  historySnapshot: BulkSpeedHistorySnapshot;
  messageFa: string;
}> {
  const historySnapshot: BulkSpeedHistorySnapshot = {
    timestamp: Date.now(),
    descriptionFa: 'برطرف‌سازی هوشمند ۱-کلیکه تمام تداخل‌ها',
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
      updatedSubtitles: [],
      resolvedCount: 0,
      historySnapshot,
      messageFa: 'پروژه فاقد دیالوگ است.',
    };
  }

  const sorted = [...subtitles].sort((a, b) => {
    const aStart = a.start + (a.audioOffset || 0);
    const bStart = b.start + (b.audioOffset || 0);
    return aStart - bStart;
  });

  const ctx = audioCtx || (typeof window !== 'undefined' ? getAudioContext() : null);
  const updatedMap = new Map<number, SubtitleItem>();
  let resolvedCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const sub = sorted[i];
    const pristineRawAudio = sub.originalAudioBase64 || sub.audioBase64;

    if (!pristineRawAudio) {
      updatedMap.set(sub.id, sub);
      continue;
    }

    const currentOffset = typeof sub.audioOffset === 'number' ? sub.audioOffset : 0;
    const currentStart = Math.max(0, sub.start + currentOffset);
    const targetDur = Math.max(0.15, sub.end - sub.start);

    // Look at next subtitle
    const nextSub = i < sorted.length - 1 ? sorted[i + 1] : null;
    let availableWindow = targetDur;
    let nextStart = Infinity;

    if (nextSub) {
      const nextOffset = typeof nextSub.audioOffset === 'number' ? nextSub.audioOffset : 0;
      nextStart = Math.max(0, nextSub.start + nextOffset);
      const isIntentional = Boolean(sub.isIntentionalOverlap || nextSub.isIntentionalOverlap);

      if (!isIntentional) {
        const distanceToNext = nextStart - currentStart;
        if (distanceToNext > 0.10) {
          // Leave 40ms breathing room before next speech
          availableWindow = Math.min(targetDur + 0.40, distanceToNext - 0.04);
        }
      }
    }

    let rawBuffer: AudioBuffer | null = null;
    let speechActiveDuration = sub.effectiveDuration || sub.audioDuration || targetDur;
    let leadingSilence = sub.leadingSilenceSec || 0;
    let trailingSilence = sub.trailingSilenceSec || 0;

    if (ctx) {
      try {
        rawBuffer = await decodeBase64ToAudioBuffer(pristineRawAudio);
        const prof = profileAudioSilence(rawBuffer);
        leadingSilence = prof.leadingSilenceSec;
        trailingSilence = prof.trailingSilenceSec;
        speechActiveDuration = prof.effectiveDuration;
      } catch (_) {}
    }

    const currentSpeechEnd = currentStart + speechActiveDuration;
    const isCollidingWithNext = Boolean(
      nextSub &&
      !sub.isIntentionalOverlap &&
      !nextSub.isIntentionalOverlap &&
      currentSpeechEnd > nextStart - 0.04
    );
    const isOverflowingTarget = speechActiveDuration > availableWindow * 1.02;

    if (isCollidingWithNext || isOverflowingTarget) {
      onProgress?.(i + 1, sorted.length, `در حال فشرده‌سازی هوشمند دیالوگ #${sub.id}...`);

      let workingBuffer = rawBuffer;
      if (rawBuffer && ctx && (leadingSilence > 0.03 || trailingSilence > 0.03)) {
        workingBuffer = extractEffectiveSpeechBuffer(rawBuffer, ctx, {
          leadingSilenceSec: leadingSilence,
          trailingSilenceSec: trailingSilence,
          effectiveDuration: speechActiveDuration,
          rawDuration: rawBuffer.duration,
          peakAmplitude: 0,
          hasClipping: false,
        });
        speechActiveDuration = workingBuffer.duration;
      }

      let neededTempo = Math.round((speechActiveDuration / Math.max(0.15, availableWindow)) * 100) / 100;
      let finalOffset = currentOffset;

      // Smart pre-gap silence absorption: if needed tempo is high (> 1.35x), utilize silence before current line
      if (neededTempo > 1.35 && i > 0) {
        const prevSub = sorted[i - 1];
        const prevOffset = typeof prevSub.audioOffset === 'number' ? prevSub.audioOffset : 0;
        const prevEnd = Math.max(0, prevSub.start + prevOffset) + (prevSub.audioDuration || (prevSub.end - prevSub.start));
        if (currentStart > prevEnd + 0.10) {
          const preGap = Math.min(0.30, Math.round((currentStart - prevEnd - 0.05) * 100) / 100);
          finalOffset = Math.round((currentOffset - preGap) * 100) / 100;
          availableWindow += preGap;
          neededTempo = Math.round((speechActiveDuration / Math.max(0.15, availableWindow)) * 100) / 100;
        }
      }

      // Safe clamp: allow up to 1.38x to preserve speech clarity
      const safeTempo = Math.min(1.38, Math.max(1.02, neededTempo));
      let processedBase64 = pristineRawAudio;
      let newDuration = Math.round((speechActiveDuration / safeTempo) * 100) / 100;

      if (workingBuffer && ctx) {
        try {
          const stretchedBuffer = timeStretchAudioBufferWSOLA(workingBuffer, safeTempo, ctx);
          const wavBlob = audioBufferToWav(stretchedBuffer);
          processedBase64 = await blobToBase64(wavBlob);
          newDuration = Math.round(stretchedBuffer.duration * 100) / 100;
        } catch (wsolaErr) {
          console.warn(`[AutoResolve] WSOLA error for line #${sub.id}:`, wsolaErr);
        }
      }

      updatedMap.set(sub.id, {
        ...sub,
        originalAudioBase64: pristineRawAudio,
        processedAudioBase64: processedBase64,
        audioBase64: processedBase64,
        audioDuration: newDuration,
        effectiveDuration: newDuration,
        appliedSpeed: safeTempo,
        timeStretchRatio: safeTempo,
        playbackRate: 1.0,
        syncStatus: 'synchronized',
        audioOffset: finalOffset,
      });
      resolvedCount++;
    } else {
      updatedMap.set(sub.id, sub);
    }
  }

  const updatedSubtitles = subtitles.map((s) => updatedMap.get(s.id) || s);

  return {
    updatedSubtitles,
    resolvedCount,
    historySnapshot,
    messageFa:
      resolvedCount > 0
        ? `تعداد ${resolvedCount} دیالوگ با فشرده‌سازی هوشمند و حذف کامل تداخل‌ها همگام شدند.`
        : 'تمام دیالوگ‌ها همگام هستند و هیچ تداخلی وجود ندارد.',
  };
}

/**
 * Intelligently compacts empty silence gaps between consecutive dialogue clips
 * and shifts cramped segments earlier into available silence to open up room
 * for subsequent dialogues that would otherwise collide (Magnetic Gap Compaction).
 */
export function compactEmptyGapsAndOpenSpace(
  subtitles: SubtitleItem[],
  minPauseSec: number = 0.12,
  maxEarlyShiftSec: number = 2.0
): {
  updatedSubtitles: SubtitleItem[];
  compactedCount: number;
  totalCompactedSec: number;
  messageFa: string;
} {
  if (!subtitles || subtitles.length === 0) {
    return { updatedSubtitles: [], compactedCount: 0, totalCompactedSec: 0, messageFa: 'هیچ دیالوگی یافت نشد.' };
  }

  const sorted = [...subtitles].sort((a, b) => a.start - b.start);
  let compactedCount = 0;
  let totalCompactedSec = 0;

  const result: SubtitleItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = { ...sorted[i] };
    const curOffset = typeof cur.audioOffset === 'number' ? cur.audioOffset : 0;
    const curDur = typeof cur.audioDuration === 'number' ? cur.audioDuration : (cur.end - cur.start);
    const curVoiceStart = Math.max(0, cur.start + curOffset);

    if (i === 0) {
      result.push(cur);
      continue;
    }

    const prev = result[i - 1];
    const prevOffset = typeof prev.audioOffset === 'number' ? prev.audioOffset : 0;
    const prevDur = typeof prev.audioDuration === 'number' ? prev.audioDuration : (prev.end - prev.start);
    const prevVoiceEnd = Math.max(0, prev.start + prevOffset) + prevDur;

    // Check gap between previous voice end and current voice start
    const gapSec = curVoiceStart - prevVoiceEnd;

    // Check if downstream segments have tension or if current segment collides with next
    let hasDownstreamTension = false;
    for (let k = i; k < sorted.length - 1; k++) {
      const s1 = sorted[k];
      const s2 = sorted[k + 1];
      const s1End = Math.max(0, s1.start + (s1.audioOffset || 0)) + (s1.audioDuration || (s1.end - s1.start));
      const s2Start = Math.max(0, s2.start + (s2.audioOffset || 0));
      if (s1End > s2Start + 0.04) {
        hasDownstreamTension = true;
        break;
      }
    }

    // If there is an unnecessarily large empty silence (> 0.25s) before current voice and downstream needs space:
    if (hasDownstreamTension && gapSec > minPauseSec + 0.15) {
      const allowableShift = Math.min(maxEarlyShiftSec, gapSec - minPauseSec);
      if (allowableShift > 0.04) {
        const newOffset = Number((curOffset - allowableShift).toFixed(3));
        cur.audioOffset = newOffset;
        compactedCount++;
        totalCompactedSec += allowableShift;
      }
    }

    result.push(cur);
  }

  // Preserve original ordering of subtitles array
  const resultMap = new Map(result.map((s) => [s.id, s]));
  const finalSubtitles = subtitles.map((s) => resultMap.get(s.id) || s);

  return {
    updatedSubtitles: finalSubtitles,
    compactedCount,
    totalCompactedSec: Number(totalCompactedSec.toFixed(3)),
    messageFa:
      compactedCount > 0
        ? `تعداد ${compactedCount} دیالوگ به جلو کشیده شدند و ${totalCompactedSec.toFixed(2)} ثانیه فضای خالی برای باز شدن تداخل دیالوگ‌های بعدی آزاد شد.`
        : 'فواصل زمانی بین صداها بهینه هستند و نیاز به جابجایی وجود ندارد.',
  };
}
