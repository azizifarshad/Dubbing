import {
  BalancedTimingPolicy,
  DEFAULT_BALANCED_TIMING_POLICY,
  TranslationCandidate,
} from '../types/dubbing';
import { predictPersianSpeechDuration } from './durationPredictor';
import { validateCandidateSemantics } from './semanticValidator';

export interface ScoredCandidateSelectionResult {
  selectedCandidate: TranslationCandidate;
  rankedCandidates: TranslationCandidate[];
  meetsBalancedPolicy: boolean;
  selectionReasonFa: string;
}

/**
 * Evaluates candidate duration fit score on a 0-100 scale:
 * DurationScore = 100 * max(0, 1 - abs(predictedDuration - targetDuration) / max(targetDuration, 1.0))
 */
export function calculateDurationScore(predictedDuration: number, targetDuration: number): number {
  const target = Math.max(0.2, targetDuration);
  const diff = Math.abs(predictedDuration - target);
  const normalizedDiff = diff / Math.max(target, 1.0);
  const score = Math.max(0, 1.0 - normalizedDiff) * 100;
  return Math.round(score * 10) / 10;
}

/**
 * Checks whether a candidate's predicted duration meets the Balanced Timing Policy:
 * - Preferred absolute tolerance: <= 0.25s
 * - Max absolute tolerance: <= 0.40s
 * - Initial relative tolerance: <= 8% (0.08)
 */
export function isWithinBalancedTimingPolicy(
  predictedDuration: number,
  targetDuration: number,
  policy: BalancedTimingPolicy = DEFAULT_BALANCED_TIMING_POLICY
): boolean {
  const target = Math.max(0.2, targetDuration);
  const durationError = Math.round((predictedDuration - target) * 1000) / 1000;
  const absError = Math.abs(durationError);
  const relativeError = absError / target;

  // Candidate is accepted if it meets preferred absolute error or relative error,
  // strictly bounded by maximum absolute error (0.40s)
  const meetsCriteria =
    (absError <= policy.preferredAbsoluteToleranceSec || relativeError <= policy.initialRelativeTolerance) &&
    absError <= policy.maxAbsoluteToleranceSec;

  return meetsCriteria;
}

/**
 * Evaluates, scores, and selects the optimal Persian translation candidate.
 * Formula:
 * FinalScore = 0.50 * SemanticScore + 0.30 * NaturalnessScore + 0.20 * DurationScore
 *
 * Hard Constraint: Candidates failing critical semantic checks (negation flip, missing numbers)
 * are NEVER selected simply because their duration score is high.
 */
export function scoreAndSelectTranslationCandidates(
  sourceEnglish: string,
  rawCandidates: Array<{ id: string; text: string; category?: string }>,
  targetDuration: number,
  voiceId?: string,
  policy: BalancedTimingPolicy = DEFAULT_BALANCED_TIMING_POLICY
): ScoredCandidateSelectionResult {
  const targetDur = Math.max(0.2, targetDuration);

  // 1. Evaluate each candidate locally
  const evaluatedCandidates: TranslationCandidate[] = rawCandidates.map((raw, idx) => {
    const text = (raw.text || '').trim();
    const id = raw.id || `candidate_${idx + 1}`;
    const category = (raw.category as any) || (idx === 0 ? 'faithful' : idx === 1 ? 'concise' : 'conversational');

    // Predict acoustic duration
    const prediction = predictPersianSpeechDuration(text, voiceId);
    const durationError = Math.round((prediction.predictedDuration - targetDur) * 1000) / 1000;
    const relativeDurationError = Math.round((Math.abs(durationError) / targetDur) * 1000) / 1000;

    // Validate semantics, numbers, and negations
    const semanticValidation = validateCandidateSemantics(sourceEnglish, text, targetDur);

    // Calculate duration fit score
    const durationScore = calculateDurationScore(prediction.predictedDuration, targetDur);

    // Final weighted score: 50% semantic + 30% naturalness + 20% duration
    const finalScore = Math.round(
      (0.50 * semanticValidation.semanticScore +
        0.30 * semanticValidation.naturalnessScore +
        0.20 * durationScore) *
        10
    ) / 10;

    return {
      id,
      text,
      category,
      semanticScore: semanticValidation.semanticScore,
      naturalnessScore: semanticValidation.naturalnessScore,
      durationScore,
      finalScore,
      predictedDuration: prediction.predictedDuration,
      durationError,
      relativeDurationError,
      validationStatus: semanticValidation.validationStatus,
      validationReasonFa: semanticValidation.validationReasonFa,
      numberCheckPassed: semanticValidation.numberCheckPassed,
      negationCheckPassed: semanticValidation.negationCheckPassed,
      entityCheckPassed: semanticValidation.entityCheckPassed,
      missingEntities: semanticValidation.missingEntities,
    };
  });

  if (evaluatedCandidates.length === 0) {
    const emptyCand: TranslationCandidate = {
      id: 'candidate_1',
      text: '',
      category: 'faithful',
      semanticScore: 0,
      naturalnessScore: 0,
      durationScore: 0,
      finalScore: 0,
      predictedDuration: 0,
      validationStatus: 'invalid',
      numberCheckPassed: false,
      negationCheckPassed: false,
      entityCheckPassed: false,
    };
    return {
      selectedCandidate: emptyCand,
      rankedCandidates: [emptyCand],
      meetsBalancedPolicy: false,
      selectionReasonFa: 'هیچ کاندیدای ترجمه‌ای دریافت نشد.',
    };
  }

  // 2. Separate valid candidates from invalid ones (hard semantic constraints)
  const validCandidates = evaluatedCandidates.filter((c) => c.validationStatus !== 'invalid');

  // 3. Find candidates that also satisfy the Balanced Timing Policy
  const balancedCandidates = validCandidates.filter((c) =>
    isWithinBalancedTimingPolicy(c.predictedDuration, targetDur, policy)
  );

  let selected: TranslationCandidate;
  let meetsBalancedPolicy = false;
  let selectionReasonFa = '';

  if (balancedCandidates.length > 0) {
    // Rank balanced candidates by final score
    balancedCandidates.sort((a, b) => b.finalScore - a.finalScore);
    selected = balancedCandidates[0];
    meetsBalancedPolicy = true;
    selectionReasonFa = `کاندیدای «${selected.id}» به دلیل تطابق معنایی کامل (${selected.semanticScore}/100) و انطباق با بازه زمانی Balanced (انحراف پیش‌بینی: ${selected.durationError! > 0 ? '+' : ''}${selected.durationError}s) انتخاب شد.`;
  } else if (validCandidates.length > 0) {
    // No candidate fits within strict timing tolerance without sacrificing meaning!
    // Principle: Meaning first! Select the highest semantic fidelity candidate and flag for review.
    validCandidates.sort((a, b) => b.semanticScore - a.semanticScore || b.finalScore - a.finalScore);
    selected = validCandidates[0];
    meetsBalancedPolicy = false;
    selectionReasonFa = `کاندیدای «${selected.id}» با بالاترین دقت معنایی انتخاب شد اما انحراف زمانی (${selected.durationError! > 0 ? '+' : ''}${selected.durationError}s) بیش از حد مجاز سیاست Balanced است و نیاز به بازبینی دارد.`;
  } else {
    // All candidates failed hard checks (e.g. dropped numbers or flipped negation)
    evaluatedCandidates.sort((a, b) => b.semanticScore - a.semanticScore);
    selected = evaluatedCandidates[0];
    meetsBalancedPolicy = false;
    selectionReasonFa = `هشدار: تمام کاندیداها دارای نقص اعتبارسنجی هستند (${selected.validationReasonFa}). جهت بررسی دستی علامت‌گذاری شد.`;
  }

  // Rank all candidates for UI display
  const rankedCandidates = [...evaluatedCandidates].sort((a, b) => {
    // Valid before invalid
    if (a.validationStatus === 'invalid' && b.validationStatus !== 'invalid') return 1;
    if (a.validationStatus !== 'invalid' && b.validationStatus === 'invalid') return -1;
    return b.finalScore - a.finalScore;
  });

  return {
    selectedCandidate: selected,
    rankedCandidates,
    meetsBalancedPolicy,
    selectionReasonFa,
  };
}
