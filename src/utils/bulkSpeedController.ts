import {
  SubtitleItem,
  BulkSpeedConfig,
  BulkSpeedPreviewItem,
  BulkSpeedHistorySnapshot,
  OverlapSummary,
  OverlapSeverity,
} from '../types/dubbing';
import { detectAudioOverlaps } from './overlapEngine';
import {
  timeStretchAudioBufferWSOLA,
  stretchAudioViaRubberBandServer,
  profileAudioSilence,
} from './syncEngine';
import {
  getAudioContext,
  decodeBase64ToAudioBuffer,
  audioBufferToWav,
} from './audioMixer';

/**
 * Converts a Blob to a Base64 string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      // In Node test environment fallback
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
 * Computes a list of preview adjustments for bulk speed control
 * adhering to selection modes, calculation modes, and safe boundaries.
 */
export function computeBulkSpeedPreview(
  subtitles: SubtitleItem[],
  config: BulkSpeedConfig,
  overlapSummary?: OverlapSummary
): BulkSpeedPreviewItem[] {
  const summary = overlapSummary || detectAudioOverlaps(subtitles);
  const minSafe = typeof config.minSafeSpeed === 'number' ? config.minSafeSpeed : 0.75;
  const maxSafe = typeof config.maxSafeSpeed === 'number' ? config.maxSafeSpeed : 1.35;

  // Filter subtitles based on selection mode
  const targetSubtitles = subtitles.filter((sub) => {
    const rawAudioDur = sub.audioDuration || Math.max(0.1, sub.end - sub.start);
    const targetDur = Math.max(0.1, sub.end - sub.start);

    switch (config.selectionMode) {
      case 'all':
        return true;
      case 'selected':
        return config.selectedSubtitleIds.includes(sub.id);
      case 'overlapping': {
        const ovs = summary.segmentOverlapMap[sub.id] || [];
        // Only consider non-intentional, non-silence overlaps
        return ovs.some((ov) => !ov.isIntentional && !ov.isSilenceOverlap && ov.severity !== 'none');
      }
      case 'overflowing':
        return rawAudioDur > targetDur * 1.04;
      case 'threshold': {
        const thresh = config.durationThresholdSec || 4.0;
        return rawAudioDur >= thresh;
      }
      default:
        return true;
    }
  });

  return targetSubtitles.map((sub) => {
    const targetDur = Math.max(0.1, sub.end - sub.start);
    const originalDur = sub.audioDuration || targetDur;
    const currentSpeed = sub.appliedSpeed || sub.timeStretchRatio || sub.playbackRate || 1.0;
    const hasAudio = Boolean(sub.audioBase64 || sub.originalAudioBase64);

    let calculatedSpeed = currentSpeed;
    let idealRequiredSpeed = currentSpeed;

    if (config.calculationMode === 'exact') {
      calculatedSpeed = config.targetSpeed;
      idealRequiredSpeed = config.targetSpeed;
    } else if (config.calculationMode === 'percentage') {
      const multiplier = 1 + (config.percentageChange / 100);
      calculatedSpeed = Math.round(currentSpeed * multiplier * 100) / 100;
      idealRequiredSpeed = calculatedSpeed;
    } else if (config.calculationMode === 'fit_target') {
      // Find whether next subtitle starts earlier than target duration
      const currentStart = Math.max(0, sub.start + (sub.audioOffset || 0));
      const sortedSubs = [...subtitles].sort((a, b) => (a.start + (a.audioOffset || 0)) - (b.start + (b.audioOffset || 0)));
      const subIdx = sortedSubs.findIndex((s) => s.id === sub.id);
      const nextSub = subIdx >= 0 && subIdx < sortedSubs.length - 1 ? sortedSubs[subIdx + 1] : null;

      let availWindow = targetDur;
      if (nextSub && !sub.isIntentionalOverlap && !nextSub.isIntentionalOverlap) {
        const nextStart = Math.max(0, nextSub.start + (nextSub.audioOffset || 0));
        const dist = nextStart - currentStart;
        if (dist > 0.15) {
          availWindow = Math.min(targetDur + 0.35, dist - 0.04);
        }
      }

      const pristineRatio = sub.processedAudioBase64 ? 1.0 : currentSpeed;
      const baseDuration = (sub.effectiveDuration || originalDur) * pristineRatio;
      idealRequiredSpeed = Math.round((baseDuration / Math.max(0.15, availWindow)) * 100) / 100;
      calculatedSpeed = Math.max(1.0, idealRequiredSpeed);
    }

    // Safety checks
    const isWithinSafeRange = calculatedSpeed >= minSafe && calculatedSpeed <= maxSafe;
    let proposedSpeed = calculatedSpeed;
    let safetyWarningFa: string | undefined;

    if (!isWithinSafeRange) {
      // Clamped to safe range but flagged for user manual review
      proposedSpeed = Math.min(maxSafe, Math.max(minSafe, calculatedSpeed));
      safetyWarningFa = `سرعت مورد نیاز (${calculatedSpeed.toFixed(2)}x) خارج از بازه کیفی مجاز (${minSafe}x تا ${maxSafe}x) است؛ به ${proposedSpeed.toFixed(2)}x محدود شد تا بررسی دستی انجام گیرد.`;
    }

    const ovs = summary.segmentOverlapMap[sub.id] || [];
    const highestSeverity = ovs.reduce<OverlapSeverity>((acc, ov) => {
      if (ov.severity === 'severe') return 'severe';
      if (ov.severity === 'moderate' && acc !== 'severe') return 'moderate';
      if (ov.severity === 'minor' && acc === 'none') return 'minor';
      return acc;
    }, 'none');

    const expectedDuration = Math.round((originalDur * (currentSpeed / proposedSpeed)) * 100) / 100;

    return {
      subId: sub.id,
      originalText: sub.originalText,
      farsiText: sub.farsiText || sub.originalText,
      originalDuration: Math.round(originalDur * 100) / 100,
      targetDuration: Math.round(targetDur * 100) / 100,
      currentSpeed: Math.round(currentSpeed * 100) / 100,
      proposedSpeed: Math.round(proposedSpeed * 100) / 100,
      expectedDuration,
      severity: highestSeverity,
      isSafe: isWithinSafeRange,
      safetyWarningFa,
      hasAudio,
      isMuted: sub.isMuted,
      isIntentional: sub.isIntentionalOverlap,
    };
  });
}

/**
 * Applies proposed bulk speed changes using pitch-preserved time-stretch (WSOLA or server RubberBand).
 * Preserves the pristine original TTS audio in `originalAudioBase64`, saves the stretched audio
 * in `processedAudioBase64`, updates active `audioBase64`, and generates a history snapshot for undo.
 */
export async function applyBulkSpeedChanges(
  subtitles: SubtitleItem[],
  previewItems: BulkSpeedPreviewItem[],
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{
  updatedSubtitles: SubtitleItem[];
  historySnapshot: BulkSpeedHistorySnapshot;
}> {
  // 1. Capture snapshot for Undo
  const historySnapshot: BulkSpeedHistorySnapshot = {
    timestamp: Date.now(),
    descriptionFa: `تنظیم سرعت دسته‌جمعی برای ${previewItems.length} دیالوگ`,
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

  const previewMap = new Map<number, BulkSpeedPreviewItem>();
  for (const item of previewItems) {
    previewMap.set(item.subId, item);
  }

  const updatedSubtitles: SubtitleItem[] = [];
  const ctx = typeof window !== 'undefined' ? getAudioContext() : null;

  for (let idx = 0; idx < subtitles.length; idx++) {
    const sub = subtitles[idx];
    const preview = previewMap.get(sub.id);

    if (!preview) {
      updatedSubtitles.push(sub);
      continue;
    }

    onProgress?.(
      idx + 1,
      previewItems.length,
      `در حال تنظیم سرعت دیالوگ #${sub.id} به ${preview.proposedSpeed}x...`
    );

    // Pristine original audio preservation:
    // If originalAudioBase64 is not yet set, save current audioBase64 into it
    const pristineRawAudio = sub.originalAudioBase64 || sub.audioBase64;
    const baseSpeed = sub.originalAudioBase64 ? 1.0 : (sub.appliedSpeed || sub.timeStretchRatio || 1.0);
    const speedRatio = preview.proposedSpeed / baseSpeed;

    let processedBase64 = sub.processedAudioBase64;
    let newAudioDuration = preview.expectedDuration;
    let newEffectiveDuration = sub.effectiveDuration
      ? Math.round((sub.effectiveDuration / speedRatio) * 100) / 100
      : preview.expectedDuration;

    if (pristineRawAudio && Math.abs(speedRatio - 1.0) >= 0.015) {
      // 1. Try studio-grade server RubberBand first
      let stretchSuccess = false;
      try {
        const serverResult = await stretchAudioViaRubberBandServer(pristineRawAudio, preview.proposedSpeed);
        if (serverResult.success && serverResult.audioBase64) {
          processedBase64 = serverResult.audioBase64;
          if (serverResult.duration > 0) {
            newAudioDuration = Math.round(serverResult.duration * 100) / 100;
          }
          stretchSuccess = true;
        }
      } catch (_) {
        stretchSuccess = false;
      }

      // 2. Client-side WSOLA fallback if server was unavailable or failed
      if (!stretchSuccess && ctx) {
        try {
          const rawBuffer = await decodeBase64ToAudioBuffer(pristineRawAudio);
          const stretchedBuffer = timeStretchAudioBufferWSOLA(rawBuffer, preview.proposedSpeed, ctx);
          const silenceProfile = profileAudioSilence(stretchedBuffer);
          const wavBlob = audioBufferToWav(stretchedBuffer);
          processedBase64 = await blobToBase64(wavBlob);
          newAudioDuration = Math.round(stretchedBuffer.duration * 100) / 100;
          newEffectiveDuration = Math.round(silenceProfile.effectiveDuration * 100) / 100;
        } catch (wsolaErr) {
          console.warn(`[BulkSpeed] WSOLA fallback encountered an error for #${sub.id}:`, wsolaErr);
        }
      }
    } else if (Math.abs(preview.proposedSpeed - 1.0) < 0.015) {
      // Speed reset back to 1.0x: restore pristine audio
      processedBase64 = pristineRawAudio;
      newAudioDuration = preview.originalDuration;
    }

    updatedSubtitles.push({
      ...sub,
      originalAudioBase64: pristineRawAudio,
      processedAudioBase64: processedBase64,
      audioBase64: processedBase64 || sub.audioBase64,
      appliedSpeed: preview.proposedSpeed,
      timeStretchRatio: preview.proposedSpeed,
      playbackRate: 1.0, // Stretched via WSOLA; plays at normal rate 1.0
      audioDuration: newAudioDuration,
      effectiveDuration: newEffectiveDuration,
      syncStatus: preview.isSafe ? 'synchronized' : 'manual_review',
    });
  }

  return {
    updatedSubtitles,
    historySnapshot,
  };
}

/**
 * Reverts subtitles to a previous bulk speed history snapshot.
 */
export function undoBulkSpeedChanges(
  currentSubtitles: SubtitleItem[],
  snapshot: BulkSpeedHistorySnapshot
): SubtitleItem[] {
  const snapshotMap = new Map<number, BulkSpeedHistorySnapshot['items'][0]>();
  for (const item of snapshot.items) {
    snapshotMap.set(item.id, item);
  }

  return currentSubtitles.map((sub) => {
    const prev = snapshotMap.get(sub.id);
    if (!prev) return sub;

    return {
      ...sub,
      audioBase64: prev.audioBase64,
      originalAudioBase64: prev.originalAudioBase64,
      processedAudioBase64: prev.processedAudioBase64,
      appliedSpeed: prev.appliedSpeed,
      audioDuration: prev.audioDuration,
      effectiveDuration: prev.effectiveDuration,
      timeStretchRatio: prev.timeStretchRatio,
      playbackRate: prev.playbackRate,
      isMuted: prev.isMuted,
      isIntentionalOverlap: prev.isIntentionalOverlap,
    };
  });
}
