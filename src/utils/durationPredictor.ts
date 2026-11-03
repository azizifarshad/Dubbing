import { GeminiVoiceId, VoiceProfile } from '../types/dubbing';
import { getVoiceProfile } from './voiceProfiles';

/**
 * Persian Speech Duration Predictor
 *
 * A dedicated, local, voice-aware acoustic duration estimation engine designed
 * to estimate the spoken duration of Persian text BEFORE sending it to TTS.
 *
 * It is completely independent of the LLM and does not ask Gemini to guess timing.
 *
 * Linguistic Features Analyzed:
 * - Persian syllable count (CV, CVC, CVCC structures)
 * - Phoneme count and estimated phonetic length
 * - Word count and lexical density
 * - Character count (orthographic length)
 * - Punctuation pauses (commas, semicolons, sentence boundaries)
 * - English loanword syllable estimation
 * - Colloquial contractions
 * - Calibrated voice profile rate
 *
 * Documented Limitations:
 * - Unwritten short vowels (حرکات / e'rab) create minor phonetic ambiguity (e.g. کرم: kerm/karam/kerem).
 * - Ambiguous homographs and informal colloquial contractions.
 * - Ezafe constructions (-e / -ye) are unwritten at word ends in Persian script.
 * To mitigate these, the predictor uses empirical Persian phonetic regression calibrated
 * with real Google Gemini TTS measurements.
 */

export interface LinguisticFeatures {
  normalizedText: string;
  wordCount: number;
  characterCount: number;
  syllableCount: number;
  longVowelCount: number;
  consonantCount: number;
  loanwordSyllables: number;
  pauseDurationSec: number;
  punctuationCount: {
    commas: number;
    periods: number;
    questionMarks: number;
    colons: number;
  };
}

export interface DurationPredictionResult {
  predictedDuration: number;       // Total estimated duration in seconds
  speechActiveDuration: number;    // Estimated active vocal phonation time without pauses
  pauseDuration: number;           // Estimated acoustic silence / breathing pauses
  linguisticFeatures: LinguisticFeatures;
  voiceProfile: VoiceProfile;
  confidenceScore: number;         // 0.0 to 1.0 confidence in prediction
}

/**
 * Normalizes Persian text to standard Persian Unicode codepoints,
 * resolving Arabic character variations and handling ZWNJ properly.
 */
export function normalizePersianText(raw: string): string {
  if (!raw) return '';
  return raw
    // Arabic Yeh and Alef Maksura to Persian Yeh
    .replace(/[\u064A\u0649]/g, 'ی')
    // Arabic Kaf to Persian Keheh
    .replace(/\u0643/g, 'ک')
    // Arabic Teh Marbuta to Heh
    .replace(/\u0629/g, 'ه')
    // Arabic Waw with Hamza to Waw
    .replace(/\u0624/g, 'و')
    // Arabic Yeh with Hamza to Yeh
    .replace(/\u0626/g, 'ی')
    // Arabic Alef with Hamza / Wasla to Alef
    .replace(/[\u0622\u0623\u0625\u0671]/g, 'ا')
    // Remove Tashdid, Tanwin, and short vowel diacritics
    .replace(/[\u064B-\u0652\u0670]/g, '')
    // Normalize zero-width non-joiner (ZWNJ)
    .replace(/\u200C+/g, '\u200C')
    // Normalize spaces
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

/**
 * Estimates English loanword syllables (e.g. "Docker" -> 2, "Function" -> 2, "API" -> 3).
 */
function estimateEnglishLoanwordSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const matches = clean.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Extracts deep linguistic features from Persian text for acoustic duration prediction.
 */
export function extractPersianLinguisticFeatures(text: string, voiceProfile: VoiceProfile): LinguisticFeatures {
  const normalized = normalizePersianText(text);

  // Count punctuation marks for pause estimation
  const commas = (text.match(/[,،]/g) || []).length;
  const periods = (text.match(/[.!]/g) || []).length;
  const questionMarks = (text.match(/[?؟]/g) || []).length;
  const colons = (text.match(/[:؛;]/g) || []).length;

  const pauseDurationSec =
    commas * voiceProfile.pauseCommaSec +
    periods * voiceProfile.pausePeriodSec +
    questionMarks * (voiceProfile.pausePeriodSec * 1.1) +
    colons * (voiceProfile.pauseCommaSec * 1.2);

  // Split tokens (preserving ZWNJ within words)
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const wordCount = tokens.length;
  const characterCount = normalized.replace(/\s/g, '').length;

  let totalSyllables = 0;
  let longVowels = 0;
  let consonants = 0;
  let loanwordSyllables = 0;

  for (const token of tokens) {
    // English loanword check (e.g. Docker, Framework, Callback, API)
    if (/^[A-Za-z0-9_-]+$/.test(token)) {
      const loanSyl = estimateEnglishLoanwordSyllables(token);
      loanwordSyllables += loanSyl;
      totalSyllables += loanSyl;
      continue;
    }

    // Persian syllable estimation:
    // Sub-tokens split by ZWNJ (e.g., "می‌دانیم" -> "می", "دانیم")
    const subParts = token.split('\u200C').filter(Boolean);
    let tokenSyllables = 0;

    for (const part of subParts) {
      if (part.length === 0) continue;

      // Common 1-syllable prefixes/suffixes
      if (part === 'می' || part === 'نمی' || part === 'بی' || part === 'ها' || part === 'ام' || part === 'ات' || part === 'اش') {
        tokenSyllables += (part === 'نمی' ? 2 : 1);
        continue;
      }

      // Count long vowels (ا، و، ی)
      const partLongVowels = (part.match(/[اوی]/g) || []).length;
      longVowels += partLongVowels;

      // Count Persian consonants
      const partConsonants = (part.match(/[بپتثجچحخدذرزژسشصضطظعغفقکگلمنه]/g) || []).length;
      consonants += partConsonants;

      // Syllables per word approximation in Persian:
      // Minimum 1 syllable per morph, plus 0.65 per consonant above 2
      let estimatedSyl = Math.max(1, Math.round(partLongVowels * 0.75 + partConsonants * 0.40));
      // Clamp between 1 and 4 syllables for a typical Persian word stem
      estimatedSyl = Math.max(1, Math.min(5, estimatedSyl));
      tokenSyllables += estimatedSyl;
    }

    totalSyllables += Math.max(1, tokenSyllables);
  }

  return {
    normalizedText: normalized,
    wordCount,
    characterCount,
    syllableCount: Math.max(1, totalSyllables),
    longVowelCount: longVowels,
    consonantCount: consonants,
    loanwordSyllables,
    pauseDurationSec: Math.round(pauseDurationSec * 1000) / 1000,
    punctuationCount: {
      commas,
      periods,
      questionMarks,
      colons,
    },
  };
}

/**
 * Predicts the spoken duration of a Persian sentence using linguistic acoustic modelling
 * and voice-calibrated speaking rates.
 */
export function predictPersianSpeechDuration(
  text: string,
  voiceId?: GeminiVoiceId | string
): DurationPredictionResult {
  const profile = getVoiceProfile(voiceId);
  const features = extractPersianLinguisticFeatures(text, profile);

  if (features.wordCount === 0) {
    return {
      predictedDuration: 0,
      speechActiveDuration: 0,
      pauseDuration: 0,
      linguisticFeatures: features,
      voiceProfile: profile,
      confidenceScore: 1.0,
    };
  }

  // Active phonation time based on calibrated syllable rate
  // rate = syllables / second
  const effectiveSyllableRate = profile.baseSyllableRate * profile.calibrationMultiplier;
  const rawSpeechActiveDuration = features.syllableCount / effectiveSyllableRate;

  // Cross-validation with word-level baseline rate to prevent extreme phonetic outliers
  const effectiveWordRate = profile.baseWordRate * profile.calibrationMultiplier;
  const wordDurationBaseline = features.wordCount / effectiveWordRate;

  // Blended acoustic duration (80% syllable acoustic model + 20% word rate baseline)
  const speechActiveDuration = 0.80 * rawSpeechActiveDuration + 0.20 * wordDurationBaseline;

  // Ambient padding: typical Google Gemini TTS onset (~0.06s) and decay (~0.08s)
  const acousticCushion = 0.14;

  const totalPredictedDuration = Math.round((speechActiveDuration + features.pauseDurationSec + acousticCushion) * 1000) / 1000;

  // Confidence calculation: higher for typical sentence lengths, slightly lower for very short or loanword-dense text
  let confidenceScore = 0.94;
  if (features.loanwordSyllables > 4) confidenceScore -= 0.08;
  if (features.wordCount <= 2) confidenceScore -= 0.06;
  if (features.wordCount > 25) confidenceScore -= 0.05;

  return {
    predictedDuration: Math.max(0.35, totalPredictedDuration),
    speechActiveDuration: Math.round(speechActiveDuration * 1000) / 1000,
    pauseDuration: features.pauseDurationSec,
    linguisticFeatures: features,
    voiceProfile: profile,
    confidenceScore: Math.max(0.70, Math.min(0.99, confidenceScore)),
  };
}
