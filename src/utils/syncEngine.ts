import {
  SubtitleItem,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
  SyncStatus,
  QualityWarning,
} from '../types/dubbing';
import { audioBufferToWav, getAudioContext } from './audioMixer';

export interface AudioSilenceProfile {
  leadingSilenceSec: number;
  trailingSilenceSec: number;
  effectiveDuration: number;
  rawDuration: number;
  peakAmplitude: number;
  hasClipping: boolean;
}

export interface SyncEvaluationResult {
  targetDuration: number;
  actualDuration: number;
  effectiveDuration: number;
  durationRatio: number;
  mismatchPercent: number; // e.g. +12.5%
  recommendedAction:
    | 'accept_natural'
    | 'moderate_stretch'
    | 'text_adaptation_and_stretch'
    | 'manual_review';
  syncStatus: SyncStatus;
  timeStretchRatio: number;
  playbackRate: number;
  syncConfidence: number;
  qualityWarnings: QualityWarning[];
}

export interface OverlapCollisionAnalysis {
  prevSubId: number;
  curSubId: number;
  isIntentionalOverlap: boolean;
  overlapDurationSec: number;
  prevEndOriginal: number;
  curStartOriginal: number;
  prevSpeechEndEffective: number;
  curSpeechStartEffective: number;
  recommendationFa: string;
}

/**
 * Analyzes multi-channel PCM audio to detect dead digital silence at start and end,
 * measuring true vocal attack onset, offset, effective speech duration, and clipping.
 */
export function profileAudioSilence(
  audioBuffer: AudioBuffer,
  thresholdDb: number = -40
): AudioSilenceProfile {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const thresholdLinear = Math.pow(10, thresholdDb / 20); // ~0.01 for -40dB

  let peakAmplitude = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i += 8) {
      const absVal = Math.abs(data[i]);
      if (absVal > peakAmplitude) peakAmplitude = absVal;
    }
  }
  const hasClipping = peakAmplitude >= 0.995;

  // 1. Detect leading silence (search up to first 1.2s or entire length)
  let startSample = 0;
  const maxSearchStart = Math.min(length, Math.floor(sampleRate * 1.2));
  for (let i = 0; i < maxSearchStart; i++) {
    let framePeak = 0;
    for (let c = 0; c < numChannels; c++) {
      const val = Math.abs(audioBuffer.getChannelData(c)[i]);
      if (val > framePeak) framePeak = val;
    }
    if (framePeak > thresholdLinear) {
      // 15ms cushion to preserve soft consonant plosives/fricatives (p, t, s)
      const cushion = Math.floor(sampleRate * 0.015);
      startSample = Math.max(0, i - cushion);
      break;
    }
  }

  // 2. Detect trailing silence (search backwards from end)
  let endSample = length;
  const minSearchEnd = Math.max(startSample + Math.floor(sampleRate * 0.15), length - Math.floor(sampleRate * 1.5));
  for (let i = length - 1; i >= minSearchEnd; i--) {
    let framePeak = 0;
    for (let c = 0; c < numChannels; c++) {
      const val = Math.abs(audioBuffer.getChannelData(c)[i]);
      if (val > framePeak) framePeak = val;
    }
    if (framePeak > thresholdLinear) {
      // 30ms release cushion to prevent unnatural vocal cutoffs
      const cushion = Math.floor(sampleRate * 0.03);
      endSample = Math.min(length, i + cushion);
      break;
    }
  }

  const leadingSilenceSec = Math.round((startSample / sampleRate) * 1000) / 1000;
  const trailingSilenceSec = Math.round(((length - endSample) / sampleRate) * 1000) / 1000;
  const effectiveDuration = Math.max(0.1, Math.round(((endSample - startSample) / sampleRate) * 1000) / 1000);

  return {
    leadingSilenceSec,
    trailingSilenceSec,
    effectiveDuration,
    rawDuration: Math.round(audioBuffer.duration * 1000) / 1000,
    peakAmplitude: Math.round(peakAmplitude * 100) / 100,
    hasClipping,
  };
}

/**
 * Trims dead leading and trailing silence from an AudioBuffer, returning a sample-aligned AudioBuffer.
 */
export function extractEffectiveSpeechBuffer(
  audioBuffer: AudioBuffer,
  ctx: BaseAudioContext,
  profile?: AudioSilenceProfile
): AudioBuffer {
  const prof = profile || profileAudioSilence(audioBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const startSample = Math.floor(prof.leadingSilenceSec * sampleRate);
  const endSample = Math.min(audioBuffer.length, Math.floor((audioBuffer.duration - prof.trailingSilenceSec) * sampleRate));

  const trimmedLength = Math.max(Math.floor(sampleRate * 0.1), endSample - startSample);
  if (trimmedLength >= audioBuffer.length || (startSample === 0 && endSample >= audioBuffer.length)) {
    return audioBuffer;
  }

  const trimmed = ctx.createBuffer(numChannels, trimmedLength, sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const src = audioBuffer.getChannelData(c);
    const dest = trimmed.getChannelData(c);
    dest.set(src.subarray(startSample, startSample + trimmedLength));
  }
  return trimmed;
}

export interface ZeroSilenceTrimResult {
  trimmedBuffer: AudioBuffer;
  leadingSilenceTrimmedSec: number;
  trailingSilenceTrimmedSec: number;
  totalSilenceTrimmedSec: number;
  originalDuration: number;
  effectiveDuration: number;
  isTrimmed: boolean;
}

/**
 * Feature 1: Zero-Unnecessary-Silence Audio Generation
 * Removes unnecessary dead leading and trailing silence automatically while
 * strictly preserving speech sounds, consonants, phonemes, and low-volume breaths.
 */
export function trimZeroSilenceAudioBuffer(
  audioBuffer: AudioBuffer,
  ctx: BaseAudioContext,
  options?: {
    thresholdDb?: number;
    paddingMs?: number;
    minSilenceToTrimSec?: number;
  }
): ZeroSilenceTrimResult {
  const thresholdDb = options?.thresholdDb ?? -40;
  const paddingMs = options?.paddingMs ?? 25;
  const minToTrim = options?.minSilenceToTrimSec ?? 0.04;

  const prof = profileAudioSilence(audioBuffer, thresholdDb);
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const originalDuration = Math.round(audioBuffer.duration * 1000) / 1000;

  const leadingToTrim = prof.leadingSilenceSec > minToTrim ? prof.leadingSilenceSec : 0;
  const trailingToTrim = prof.trailingSilenceSec > minToTrim ? prof.trailingSilenceSec : 0;

  if (leadingToTrim <= 0 && trailingToTrim <= 0) {
    return {
      trimmedBuffer: audioBuffer,
      leadingSilenceTrimmedSec: 0,
      trailingSilenceTrimmedSec: 0,
      totalSilenceTrimmedSec: 0,
      originalDuration,
      effectiveDuration: originalDuration,
      isTrimmed: false,
    };
  }

  // Preserve safe boundary padding (e.g. 25ms)
  const padSec = paddingMs / 1000;
  const safeStartSec = Math.max(0, leadingToTrim - padSec);
  const safeEndSec = Math.min(originalDuration, originalDuration - trailingToTrim + padSec);

  const startSample = Math.floor(safeStartSec * sampleRate);
  const endSample = Math.min(audioBuffer.length, Math.floor(safeEndSec * sampleRate));
  const trimmedLength = Math.max(Math.floor(sampleRate * 0.1), endSample - startSample);

  if (trimmedLength >= audioBuffer.length) {
    return {
      trimmedBuffer: audioBuffer,
      leadingSilenceTrimmedSec: 0,
      trailingSilenceTrimmedSec: 0,
      totalSilenceTrimmedSec: 0,
      originalDuration,
      effectiveDuration: originalDuration,
      isTrimmed: false,
    };
  }

  const trimmed = ctx.createBuffer(numChannels, trimmedLength, sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const src = audioBuffer.getChannelData(c);
    const dest = trimmed.getChannelData(c);
    dest.set(src.subarray(startSample, startSample + trimmedLength));
  }

  const effectiveDuration = Math.round(trimmed.duration * 1000) / 1000;
  const leadingTrimmed = Math.round(safeStartSec * 1000) / 1000;
  const trailingTrimmed = Math.round((originalDuration - safeEndSec) * 1000) / 1000;
  const totalSilenceTrimmedSec = Math.round((leadingTrimmed + trailingTrimmed) * 1000) / 1000;

  return {
    trimmedBuffer: trimmed,
    leadingSilenceTrimmedSec: leadingTrimmed,
    trailingSilenceTrimmedSec: trailingTrimmed,
    totalSilenceTrimmedSec,
    originalDuration,
    effectiveDuration,
    isTrimmed: true,
  };
}

/**
 * Evaluates duration mismatch and selects the optimal synchronization strategy
 * adhering strictly to the configurable threshold policy.
 */
export function evaluateSynchronization(
  itemOrTargetDuration: SubtitleItem | number,
  silenceProfileOrActualDuration?: AudioSilenceProfile | number,
  config: SyncConfig = DEFAULT_SYNC_CONFIG
): SyncEvaluationResult {
  let targetDuration: number;
  let effectiveDuration: number;
  let actualDuration: number;
  let silenceProfile: AudioSilenceProfile | undefined;

  if (typeof itemOrTargetDuration === 'number') {
    targetDuration = Math.max(0.1, itemOrTargetDuration);
    const actual = typeof silenceProfileOrActualDuration === 'number'
      ? silenceProfileOrActualDuration
      : targetDuration;
    effectiveDuration = actual;
    actualDuration = actual;
    silenceProfile = typeof silenceProfileOrActualDuration === 'object' ? silenceProfileOrActualDuration : undefined;
  } else {
    const item = itemOrTargetDuration;
    silenceProfile = typeof silenceProfileOrActualDuration === 'object' ? silenceProfileOrActualDuration : undefined;
    targetDuration = Math.max(0.1, Math.round((item.end - item.start) * 1000) / 1000);
    effectiveDuration = item.effectiveDuration || (silenceProfile ? silenceProfile.effectiveDuration : (item.audioDuration || targetDuration));
    actualDuration = item.audioDuration || effectiveDuration;
  }
  const durationRatio = Math.round((effectiveDuration / targetDuration) * 1000) / 1000;
  const mismatchPercent = Math.round((durationRatio - 1.0) * 1000) / 10;

  const qualityWarnings: QualityWarning[] = [];
  if (silenceProfile?.hasClipping) {
    qualityWarnings.push({
      code: 'AUDIO_CLIPPING',
      messageFa: 'دامنه صدا در برخی فریم‌ها به سقف ۱.۰ برخورد کرده و ممکن است دیستورشن ایجاد کند.',
      severity: 'warning',
    });
  }

  if (silenceProfile && silenceProfile.leadingSilenceSec > 0.25) {
    qualityWarnings.push({
      code: 'EXCESSIVE_LEADING_SILENCE',
      messageFa: `سکوت اولیه طولانی (${Math.round(silenceProfile.leadingSilenceSec * 1000)}ms) که برای حفظ همگامی باید بریده شود.`,
      severity: 'info',
    });
  }

  // 1. Ideal Window: |durationRatio - 1.0| <= idealThreshold (0% to 5% mismatch)
  if (Math.abs(durationRatio - 1.0) <= config.idealThreshold) {
    return {
      targetDuration,
      actualDuration,
      effectiveDuration,
      durationRatio,
      mismatchPercent,
      recommendedAction: 'accept_natural',
      syncStatus: 'synchronized',
      timeStretchRatio: 1.0,
      playbackRate: 1.0,
      syncConfidence: 0.98,
      qualityWarnings,
    };
  }

  // 2. Mild Overflow: durationRatio between (1 + idealThreshold) and (1 + mildStretchMax) (5% to 15% longer)
  if (durationRatio > 1.0 + config.idealThreshold && durationRatio <= 1.0 + config.mildStretchMax) {
    const timeStretchRatio = Math.min(config.maxTimeStretchFactor, durationRatio);
    return {
      targetDuration,
      actualDuration,
      effectiveDuration,
      durationRatio,
      mismatchPercent,
      recommendedAction: 'moderate_stretch',
      syncStatus: 'synchronized',
      timeStretchRatio,
      playbackRate: timeStretchRatio,
      syncConfidence: 0.92,
      qualityWarnings,
    };
  }

  // 3. Mild Underflow: generated audio is shorter (between 5% and 15% shorter)
  if (durationRatio < 1.0 - config.idealThreshold && durationRatio >= 1.0 - config.mildStretchMax) {
    // Natural pause is preferred over slowing speech down unnaturally
    return {
      targetDuration,
      actualDuration,
      effectiveDuration,
      durationRatio,
      mismatchPercent,
      recommendedAction: 'accept_natural',
      syncStatus: 'synchronized',
      timeStretchRatio: 1.0,
      playbackRate: 1.0,
      syncConfidence: 0.95,
      qualityWarnings,
    };
  }

  // 4. Significant Overflow: durationRatio between 15% and 25% longer
  if (durationRatio > 1.0 + config.mildStretchMax && durationRatio <= 1.0 + config.adaptationMax) {
    const timeStretchRatio = Math.min(config.maxTimeStretchFactor, durationRatio);
    qualityWarnings.push({
      code: 'NEEDS_TEXT_ADAPTATION',
      messageFa: `صوت تولید شده ${mismatchPercent}% طولانی‌تر از ویدیوی اصلی است. پیشنهاد می‌شود جمله خلاصه‌تر شود یا سرعت صدا تا ${Math.round((timeStretchRatio - 1) * 100)}% افزایش یابد.`,
      severity: 'warning',
    });

    return {
      targetDuration,
      actualDuration,
      effectiveDuration,
      durationRatio,
      mismatchPercent,
      recommendedAction: 'text_adaptation_and_stretch',
      syncStatus: 'needs_adjustment',
      timeStretchRatio,
      playbackRate: timeStretchRatio,
      syncConfidence: 0.75,
      qualityWarnings,
    };
  }

  // 5. Severe Overflow: durationRatio > 25% longer
  qualityWarnings.push({
    code: 'SEVERE_DURATION_OVERFLOW',
    messageFa: `صوت تولید شده بیش از حد مجاز (${mismatchPercent}%) طولانی است و بدون بازنویسی فشرده‌تر متن، همگام‌سازی ویدیو به هم می‌خورد.`,
    severity: 'error',
  });

  return {
    targetDuration,
    actualDuration,
    effectiveDuration,
    durationRatio,
    mismatchPercent,
    recommendedAction: 'manual_review',
    syncStatus: 'manual_review',
    timeStretchRatio: config.maxTimeStretchFactor,
    playbackRate: config.maxTimeStretchFactor,
    syncConfidence: 0.40,
    qualityWarnings,
  };
}

/**
 * Intelligent Overlap & Collision Analyzer.
 * Discerningly differentiates between intentional simultaneous dialogue
 * (two actors talking at the same time in original video) versus accidental
 * speech duration overflow.
 */
export function analyzeTimelineCollisions(
  subtitles: SubtitleItem[],
  config: SyncConfig = DEFAULT_SYNC_CONFIG
): OverlapCollisionAnalysis[] {
  const collisions: OverlapCollisionAnalysis[] = [];
  const sorted = [...subtitles].sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const cur = sorted[i + 1];

    // Check if original English dialogue overlapped in source video
    const origOverlap = prev.end - cur.start;
    const isIntentional = origOverlap > 0.05;

    // Check effective Persian speech playback end time
    const prevOffset = prev.audioOffset || 0;
    const curOffset = cur.audioOffset || 0;

    const prevTempo = prev.timeStretchRatio || prev.playbackRate || 1.0;
    const prevEffectiveDur = (prev.effectiveDuration || prev.audioDuration || (prev.end - prev.start)) / prevTempo;

    const prevSpeechEnd = prev.start + prevOffset + prevEffectiveDur;
    const curSpeechStart = cur.start + curOffset;

    const speechOverlapSec = Math.round((prevSpeechEnd - curSpeechStart) * 100) / 100;

    if (speechOverlapSec > 0.05) {
      let recommendationFa = '';
      if (isIntentional && config.preserveIntentionalOverlap) {
        recommendationFa = 'هم‌پوشانی گفتار هم‌زمان در ویدئوی اصلی وجود دارد و حفظ می‌شود.';
      } else {
        recommendationFa = `دیالوگ قبلی ${speechOverlapSec} ثانیه بیش از بازه خود ادامه دارد. با افزایش سرعت دیالوگ قبلی یا خلاصه‌سازی متن برطرف می‌شود.`;
      }

      collisions.push({
        prevSubId: prev.id,
        curSubId: cur.id,
        isIntentionalOverlap: isIntentional,
        overlapDurationSec: speechOverlapSec,
        prevEndOriginal: prev.end,
        curStartOriginal: cur.start,
        prevSpeechEndEffective: Math.round(prevSpeechEnd * 100) / 100,
        curSpeechStartEffective: Math.round(curSpeechStart * 100) / 100,
        recommendationFa,
      });
    }
  }

  return collisions;
}

/**
 * High-fidelity client-side WSOLA (Waveform Similarity Overlap-Add) Pitch-Preserving Time-Stretch.
 * Compresses or expands audio duration in the browser without changing pitch, vocal character, or timbre.
 */
export function timeStretchAudioBufferWSOLA(
  inputBuffer: AudioBuffer,
  tempo: number,
  ctx: BaseAudioContext
): AudioBuffer {
  // If tempo is within 1% of 1.0, return untouched buffer
  if (Math.abs(tempo - 1.0) < 0.015) {
    return inputBuffer;
  }

  // Safe clamping of tempo between 0.7x (slowdown) and 1.35x (speedup)
  const safeTempo = Math.max(0.70, Math.min(1.35, tempo));
  const numChannels = inputBuffer.numberOfChannels;
  const sampleRate = inputBuffer.sampleRate;
  const inLength = inputBuffer.length;

  const outLength = Math.max(1024, Math.floor(inLength / safeTempo));
  const outputBuffer = ctx.createBuffer(numChannels, outLength, sampleRate);

  // Window size: 40ms frame (1764 samples at 44.1kHz)
  const windowSize = Math.floor(sampleRate * 0.04);
  const hopOut = Math.floor(windowSize / 2);
  const hopIn = Math.floor(hopOut * safeTempo);
  const maxSearch = Math.floor(windowSize / 3);

  // Pre-generate Hanning window
  const hanning = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hanning[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = inputBuffer.getChannelData(ch);
    const outputData = outputBuffer.getChannelData(ch);
    const normBuffer = new Float32Array(outLength);

    let inPos = 0;
    let outPos = 0;

    while (outPos + windowSize < outLength && inPos + windowSize + maxSearch < inLength) {
      // Find optimal shift by cross-correlation
      let bestShift = 0;
      let maxCorr = -1e9;

      if (outPos > 0) {
        for (let s = -maxSearch; s <= maxSearch; s++) {
          const testPos = inPos + s;
          if (testPos < 0 || testPos + windowSize >= inLength) continue;

          let corr = 0;
          for (let k = 0; k < hopOut; k += 4) {
            corr += inputData[testPos + k] * outputData[outPos + k];
          }
          if (corr > maxCorr) {
            maxCorr = corr;
            bestShift = s;
          }
        }
      }

      const optimalInPos = inPos + bestShift;

      // Overlap-add windowed segment
      for (let i = 0; i < windowSize; i++) {
        const sampleIdx = outPos + i;
        if (sampleIdx < outLength) {
          const w = hanning[i];
          outputData[sampleIdx] += inputData[optimalInPos + i] * w;
          normBuffer[sampleIdx] += w;
        }
      }

      inPos += hopIn;
      outPos += hopOut;
    }

    // Normalize overlap energy
    for (let i = 0; i < outLength; i++) {
      if (normBuffer[i] > 1e-4) {
        outputData[i] /= normBuffer[i];
      }
      // Soft saturation limiter to prevent digital clipping
      outputData[i] = Math.tanh(outputData[i]);
    }
  }

  return outputBuffer;
}

/**
 * Server-side studio grade Rubber Band pitch-preserving time-stretching via FFmpeg.
 * Takes base64 audio and tempo ratio, returns pristine time-stretched WAV base64.
 */
export async function stretchAudioViaRubberBandServer(
  base64Wav: string,
  tempo: number
): Promise<{ success: boolean; audioBase64: string; duration: number }> {
  try {
    const res = await fetch('/api/time-stretch-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Wav,
        tempo,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.audioBase64) {
        return {
          success: true,
          audioBase64: data.audioBase64,
          duration: data.duration,
        };
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Server Rubber Band stretch request deferred to local WSOLA:', err);
  }

  return { success: false, audioBase64: base64Wav, duration: 0 };
}
