import { GeminiVoiceId, VoiceProfile } from '../types/dubbing';

/**
 * Standard Voice Profiles for Persian Audiovisual Dubbing.
 * The default project configuration is anchored to a consistent male Persian voice ('Puck' / 'Charon')
 * with voice-specific syllable rates, word rates, and natural pause acoustics.
 */
export const VOICE_PROFILES: Record<GeminiVoiceId, VoiceProfile> = {
  Puck: {
    id: 'male_puck_interactive',
    voiceId: 'Puck',
    nameFa: 'پوک (مربی پویا و تدریس تعاملی)',
    gender: 'male',
    provider: 'google/hormouz',
    model: 'google/gemini-3.8-flash-lite-tts',
    baseSyllableRate: 4.10, // ~4.1 syllables per second in conversational Persian
    baseWordRate: 2.45,     // ~2.45 words per second
    pauseCommaSec: 0.18,    // Natural comma breathing pause
    pausePeriodSec: 0.32,   // Sentence boundary pause
    calibrationVersion: '1.2.0',
    calibrationMultiplier: 1.0,
  },
  Charon: {
    id: 'male_charon_academic',
    voiceId: 'Charon',
    nameFa: 'کارون (استاد مفاهیم پایه و آکادمیک)',
    gender: 'male',
    provider: 'google/hormouz',
    model: 'google/gemini-3.8-flash-lite-tts',
    baseSyllableRate: 3.60, // Slower, deeper analytical enunciation
    baseWordRate: 2.10,
    pauseCommaSec: 0.22,
    pausePeriodSec: 0.38,
    calibrationVersion: '1.2.0',
    calibrationMultiplier: 1.0,
  },
  Fenrir: {
    id: 'male_fenrir_storyteller',
    voiceId: 'Fenrir',
    nameFa: 'فنریر (گوینده گرم و مسلط)',
    gender: 'male',
    provider: 'google/hormouz',
    model: 'google/gemini-3.8-flash-lite-tts',
    baseSyllableRate: 3.80,
    baseWordRate: 2.25,
    pauseCommaSec: 0.20,
    pausePeriodSec: 0.35,
    calibrationVersion: '1.2.0',
    calibrationMultiplier: 1.0,
  },
  Kore: {
    id: 'female_kore_educator',
    voiceId: 'Kore',
    nameFa: 'کوره (مدرس صبور و مفهومی)',
    gender: 'female',
    provider: 'google/hormouz',
    model: 'google/gemini-3.8-flash-lite-tts',
    baseSyllableRate: 3.90,
    baseWordRate: 2.35,
    pauseCommaSec: 0.18,
    pausePeriodSec: 0.32,
    calibrationVersion: '1.2.0',
    calibrationMultiplier: 1.0,
  },
  Zephyr: {
    id: 'female_zephyr_trainer',
    voiceId: 'Zephyr',
    nameFa: 'زفیر (مربی ساختاریافته)',
    gender: 'female',
    provider: 'google/hormouz',
    model: 'google/gemini-3.8-flash-lite-tts',
    baseSyllableRate: 4.00,
    baseWordRate: 2.40,
    pauseCommaSec: 0.18,
    pausePeriodSec: 0.30,
    calibrationVersion: '1.2.0',
    calibrationMultiplier: 1.0,
  },
  Iapetus: {
    id: 'male_iapetus_authority',
    voiceId: 'Iapetus',
    nameFa: 'ایپتوس (صدای مردانه عمیق و مقتدر)',
    gender: 'male',
    provider: 'google/hormouz',
    model: 'google/gemini-3.8-flash-lite-tts',
    baseSyllableRate: 3.50,
    baseWordRate: 2.00,
    pauseCommaSec: 0.24,
    pausePeriodSec: 0.40,
    calibrationVersion: '1.2.0',
    calibrationMultiplier: 1.0,
  },
};

export const DEFAULT_VOICE_ID: GeminiVoiceId = 'Puck';

export interface CalibrationRecord {
  voiceId: GeminiVoiceId;
  predictedDuration: number;
  actualDuration: number;
  speechActiveDuration: number;
  errorSec: number;
  timestamp: number;
}

// In-memory / persistent calibration registry
const calibrationHistory: CalibrationRecord[] = [];
const localMultipliers: Partial<Record<GeminiVoiceId, number>> = {};

/**
 * Retrieves the calibrated voice profile.
 */
export function getVoiceProfile(voiceId?: string): VoiceProfile {
  const vId = (voiceId && VOICE_PROFILES[voiceId as GeminiVoiceId]) ? (voiceId as GeminiVoiceId) : DEFAULT_VOICE_ID;
  const base = { ...VOICE_PROFILES[vId] };
  if (localMultipliers[vId]) {
    base.calibrationMultiplier = localMultipliers[vId]!;
  }
  return base;
}

/**
 * Records real-world TTS measurement to adaptively calibrate the Duration Predictor.
 * Continuously minimizes prediction error without modifying TTS speed.
 */
export function recordTtsCalibration(
  voiceId: GeminiVoiceId,
  predictedDuration: number,
  actualDuration: number,
  speechActiveDuration?: number
): void {
  const activeDur = speechActiveDuration && speechActiveDuration > 0 ? speechActiveDuration : actualDuration;
  if (activeDur <= 0 || predictedDuration <= 0) return;

  const errorSec = Math.round((activeDur - predictedDuration) * 1000) / 1000;
  calibrationHistory.push({
    voiceId,
    predictedDuration,
    actualDuration,
    speechActiveDuration: activeDur,
    errorSec,
    timestamp: Date.now(),
  });

  // Calculate moving average ratio over recent measurements (last 20 samples)
  const voiceRecords = calibrationHistory.filter((r) => r.voiceId === voiceId).slice(-20);
  if (voiceRecords.length >= 3) {
    const avgRatio =
      voiceRecords.reduce((sum, r) => sum + r.speechActiveDuration / r.predictedDuration, 0) /
      voiceRecords.length;
    // Dampened learning rate (0.25) to prevent oscillation
    const currentMult = localMultipliers[voiceId] || 1.0;
    const updatedMult = currentMult * (1.0 + (avgRatio - 1.0) * 0.25);
    localMultipliers[voiceId] = Math.max(0.80, Math.min(1.25, Math.round(updatedMult * 1000) / 1000));
  }
}

/**
 * Returns calibration statistics across all recorded TTS operations.
 */
export function getCalibrationStats(voiceId?: GeminiVoiceId) {
  const list = voiceId ? calibrationHistory.filter((r) => r.voiceId === voiceId) : calibrationHistory;
  if (list.length === 0) {
    return {
      sampleCount: 0,
      meanAbsoluteErrorSec: 0,
      rootMeanSquaredErrorSec: 0,
      biasSec: 0,
    };
  }

  const errors = list.map((r) => r.errorSec);
  const mae = errors.reduce((acc, e) => acc + Math.abs(e), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((acc, e) => acc + e * e, 0) / errors.length);
  const bias = errors.reduce((acc, e) => acc + e, 0) / errors.length;

  return {
    sampleCount: list.length,
    meanAbsoluteErrorSec: Math.round(mae * 1000) / 1000,
    rootMeanSquaredErrorSec: Math.round(rmse * 1000) / 1000,
    biasSec: Math.round(bias * 1000) / 1000,
  };
}
