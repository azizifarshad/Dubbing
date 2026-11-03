import { SubtitleItem } from '../types/dubbing';

export interface DurationErrorDistribution {
  withinPreferredTolerance: number; // <= 0.25s
  withinMaxTolerance: number;       // 0.25s to 0.40s
  exceedingTolerance: number;       // > 0.40s
}

export interface ProjectEvaluationReport {
  totalSegments: number;
  translatedSegments: number;
  synthesizedSegments: number;

  // Synchronization and Tolerance
  acceptedWithinToleranceCount: number;
  acceptedWithinTolerancePercent: number;
  manualReviewRequiredCount: number;
  manualReviewRequiredPercent: number;

  // Duration Prediction Accuracy (MAE & RMSE)
  predictionMaeSec: number;
  predictionRmseSec: number;
  predictionErrorDistribution: DurationErrorDistribution;

  // Actual Audio vs Target Duration Metrics
  actualSyncMaeSec: number;
  actualSyncRmseSec: number;
  firstTimeTtsPassPercent: number;

  // Semantic & Integrity Metrics
  semanticValidationPassCount: number;
  semanticValidationPassPercent: number;
  negationIssuesCount: number;
  numberIssuesCount: number;
  clippingWarningCount: number;

  // API Efficiency
  averageApiRequestsPerSegment: number; // Goal: ~1 translation + ~1 TTS
}

/**
 * Computes comprehensive measurable evaluation metrics across all project subtitle segments.
 */
export function evaluateProjectMetrics(subtitles: SubtitleItem[]): ProjectEvaluationReport {
  const total = subtitles.length;
  if (total === 0) {
    return {
      totalSegments: 0,
      translatedSegments: 0,
      synthesizedSegments: 0,
      acceptedWithinToleranceCount: 0,
      acceptedWithinTolerancePercent: 0,
      manualReviewRequiredCount: 0,
      manualReviewRequiredPercent: 0,
      predictionMaeSec: 0,
      predictionRmseSec: 0,
      predictionErrorDistribution: { withinPreferredTolerance: 0, withinMaxTolerance: 0, exceedingTolerance: 0 },
      actualSyncMaeSec: 0,
      actualSyncRmseSec: 0,
      firstTimeTtsPassPercent: 0,
      semanticValidationPassCount: 0,
      semanticValidationPassPercent: 0,
      negationIssuesCount: 0,
      numberIssuesCount: 0,
      clippingWarningCount: 0,
      averageApiRequestsPerSegment: 0,
    };
  }

  const translated = subtitles.filter((s) => s.farsiText && s.farsiText.trim().length > 0);
  const synthesized = subtitles.filter((s) => Boolean(s.audioBase64));

  // 1. Duration Prediction Errors (predicted vs actual)
  const predictionErrors: number[] = [];
  const dist: DurationErrorDistribution = {
    withinPreferredTolerance: 0,
    withinMaxTolerance: 0,
    exceedingTolerance: 0,
  };

  for (const sub of synthesized) {
    const targetDur = sub.targetDuration || Math.max(0.2, sub.end - sub.start);
    const actualDur = sub.effectiveDuration || sub.audioDuration || targetDur;
    const predDur = sub.predictedDuration || targetDur;

    const predErr = Math.abs(predDur - actualDur);
    predictionErrors.push(predErr);

    if (predErr <= 0.25) {
      dist.withinPreferredTolerance++;
    } else if (predErr <= 0.40) {
      dist.withinMaxTolerance++;
    } else {
      dist.exceedingTolerance++;
    }
  }

  const predMae =
    predictionErrors.length > 0
      ? predictionErrors.reduce((a, b) => a + b, 0) / predictionErrors.length
      : 0;
  const predRmse =
    predictionErrors.length > 0
      ? Math.sqrt(predictionErrors.reduce((a, b) => a + b * b, 0) / predictionErrors.length)
      : 0;

  // 2. Actual Sync Errors (actual vs target)
  const actualSyncErrors: number[] = [];
  let acceptedCount = 0;
  let manualReviewCount = 0;
  let clippingCount = 0;

  for (const sub of synthesized) {
    const targetDur = sub.targetDuration || Math.max(0.2, sub.end - sub.start);
    const actualDur = sub.effectiveDuration || sub.audioDuration || targetDur;
    const syncErr = Math.abs(actualDur - targetDur);
    actualSyncErrors.push(syncErr);

    // Balanced acceptance: <= 0.40s or <= 8%
    const relativeErr = syncErr / targetDur;
    const isAccepted = (syncErr <= 0.25 || relativeErr <= 0.08) && syncErr <= 0.40;

    if (isAccepted && sub.syncStatus !== 'manual_review') {
      acceptedCount++;
    } else {
      manualReviewCount++;
    }

    if (sub.qualityWarnings?.some((w) => w.code === 'AUDIO_CLIPPING')) {
      clippingCount++;
    }
  }

  const actualMae =
    actualSyncErrors.length > 0
      ? actualSyncErrors.reduce((a, b) => a + b, 0) / actualSyncErrors.length
      : 0;
  const actualRmse =
    actualSyncErrors.length > 0
      ? Math.sqrt(actualSyncErrors.reduce((a, b) => a + b * b, 0) / actualSyncErrors.length)
      : 0;

  // 3. Semantic Validation Stats
  let semPassCount = 0;
  let negIssues = 0;
  let numIssues = 0;

  for (const sub of translated) {
    const selectedCand = sub.candidates?.find((c) => c.id === sub.selectedCandidateId) || sub.candidates?.[0];
    if (selectedCand) {
      if (selectedCand.validationStatus === 'valid') semPassCount++;
      if (!selectedCand.negationCheckPassed) negIssues++;
      if (!selectedCand.numberCheckPassed) numIssues++;
    } else {
      // Default to pass if no candidates metadata
      semPassCount++;
    }
  }

  // 4. API Requests Efficiency (1 translation + 1 TTS normally)
  // Count retries
  let totalApiCalls = translated.length; // 1 translation call per batch item
  for (const sub of synthesized) {
    totalApiCalls += 1 + (sub.retryCount || 0);
  }
  const avgRequests = total > 0 ? Math.round((totalApiCalls / total) * 10) / 10 : 0;

  const firstTimePass = synthesized.length > 0
    ? Math.round(((synthesized.filter((s) => (s.retryCount || 0) === 0 && s.syncStatus !== 'manual_review').length) / synthesized.length) * 100)
    : 0;

  return {
    totalSegments: total,
    translatedSegments: translated.length,
    synthesizedSegments: synthesized.length,
    acceptedWithinToleranceCount: acceptedCount,
    acceptedWithinTolerancePercent: synthesized.length > 0 ? Math.round((acceptedCount / synthesized.length) * 100) : 0,
    manualReviewRequiredCount: manualReviewCount,
    manualReviewRequiredPercent: synthesized.length > 0 ? Math.round((manualReviewCount / synthesized.length) * 100) : 0,
    predictionMaeSec: Math.round(predMae * 1000) / 1000,
    predictionRmseSec: Math.round(predRmse * 1000) / 1000,
    predictionErrorDistribution: dist,
    actualSyncMaeSec: Math.round(actualMae * 1000) / 1000,
    actualSyncRmseSec: Math.round(actualRmse * 1000) / 1000,
    firstTimeTtsPassPercent: firstTimePass,
    semanticValidationPassCount: semPassCount,
    semanticValidationPassPercent: translated.length > 0 ? Math.round((semPassCount / translated.length) * 100) : 0,
    negationIssuesCount: negIssues,
    numberIssuesCount: numIssues,
    clippingWarningCount: clippingCount,
    averageApiRequestsPerSegment: avgRequests,
  };
}
