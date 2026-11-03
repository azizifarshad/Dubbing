export type GeminiVoiceId = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Iapetus';

export type SyncStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'synchronized'
  | 'needs_adjustment'
  | 'manual_review'
  | 'failed';

export interface QualityWarning {
  code: string;
  messageFa: string;
  severity: 'info' | 'warning' | 'error';
}


export type CandidateCategory = 'faithful' | 'concise' | 'conversational';
export type ValidationStatus = 'valid' | 'invalid' | 'needs_review';
export type BalancedSyncStatus = 'accepted' | 'within_tolerance' | 'needs_review' | 'failed';

export interface TranslationCandidate {
  id: string; // 'candidate_1' | 'candidate_2' | 'candidate_3'
  text: string;
  category: CandidateCategory;

  semanticScore: number;     // 0 - 100
  naturalnessScore: number;  // 0 - 100
  durationScore: number;     // 0 - 100
  finalScore: number;        // Weighted: 0.50*Sem + 0.30*Nat + 0.20*Dur

  predictedDuration: number; // In seconds from Persian Speech Duration Predictor
  durationError?: number;    // predictedDuration - targetDuration
  relativeDurationError?: number; // abs(durationError) / max(targetDuration, 0.1)

  validationStatus: ValidationStatus;
  validationReasonFa?: string;

  numberCheckPassed: boolean;
  negationCheckPassed: boolean;
  entityCheckPassed: boolean;
  missingEntities?: string[];
}

export interface BalancedTimingPolicy {
  preferredAbsoluteToleranceSec: number; // 0.25s
  maxAbsoluteToleranceSec: number;       // 0.40s
  initialRelativeTolerance: number;      // 0.08 (8%)
  maxCandidates: number;                 // 3
  normalTtsAttempts: number;             // 1
  maxRetries: number;                    // 1
  allowPlaybackRateModification: boolean;// false (disabled by default)
}

export const DEFAULT_BALANCED_TIMING_POLICY: BalancedTimingPolicy = {
  preferredAbsoluteToleranceSec: 0.25,
  maxAbsoluteToleranceSec: 0.40,
  initialRelativeTolerance: 0.08,
  maxCandidates: 3,
  normalTtsAttempts: 1,
  maxRetries: 1,
  allowPlaybackRateModification: false,
};

export interface VoiceProfile {
  id: string;
  voiceId: GeminiVoiceId;
  nameFa: string;
  gender: 'male' | 'female';
  provider: string;
  model: string;
  baseSyllableRate: number; // Syllables per second
  baseWordRate: number;     // Words per second
  pauseCommaSec: number;    // Pause duration for commas
  pausePeriodSec: number;   // Pause duration for periods/question marks
  calibrationVersion: string;
  calibrationMultiplier: number;
}

export type ShiftAdjustmentReason =
  | 'speech_overlap'
  | 'excessive_silence'
  | 'timing_optimization'
  | 'duration_correction'
  | 'none';

export interface TimelinePlacementConfig {
  enabled: boolean;
  maxEarlyShiftSeconds: number; // default 2.0
  maxLateShiftSeconds: number;  // default 2.0
  configurableMaximumShiftSeconds: number; // default 3.0
  preserveDialogueOrder: boolean;
  preserveVideoSynchronization: boolean;
  preventUnintendedSpeechOverlap: boolean;
  minimizeStartTimeDeviation: boolean;
}

export const DEFAULT_TIMELINE_PLACEMENT_CONFIG: TimelinePlacementConfig = {
  enabled: true,
  maxEarlyShiftSeconds: 2.0,
  maxLateShiftSeconds: 2.0,
  configurableMaximumShiftSeconds: 3.0,
  preserveDialogueOrder: true,
  preserveVideoSynchronization: true,
  preventUnintendedSpeechOverlap: true,
  minimizeStartTimeDeviation: true,
};

export interface SubtitleItem {
  id: number;
  speakerId?: string;
  start: number; // in seconds (strictly anchor reference)
  end: number;   // in seconds
  originalStart?: number; // Original intended subtitle start time
  adjustedStart?: number; // Resulting start time on timeline (start + audioOffset)
  startTimeStr: string; // e.g. "00:00:01,200"
  endTimeStr: string;   // e.g. "00:00:04,500"
  originalText: string;
  farsiText: string;
  voice: GeminiVoiceId;
  emotion?: string;
  audioBase64?: string;
  originalAudioBase64?: string; // Pristine untouched original TTS audio
  processedAudioBase64?: string; // Speed/tempo processed or silence-trimmed audio
  appliedSpeed?: number;        // Explicit speed multiplier applied to this segment (e.g. 1.10 = +10%)
  isMuted?: boolean;            // Whether temporarily muted in preview and export
  isIntentionalOverlap?: boolean; // Whether marked as intentional simultaneous dialogue
  audioBlobUrl?: string;
  audioDuration?: number;       // Decoded file duration in seconds
  effectiveDuration?: number;   // True vocal duration without leading/trailing silence
  targetDuration?: number;      // Original dialogue duration (end - start)
  leadingSilenceSec?: number;   // Measured dead digital silence at start
  trailingSilenceSec?: number;  // Measured dead digital silence at end
  leadingSilenceRemovedSec?: number;  // Amount of leading silence trimmed
  trailingSilenceRemovedSec?: number; // Amount of trailing silence trimmed
  shiftDirection?: 'earlier' | 'later' | 'none'; // Flexible timeline placement direction
  shiftAmountSec?: number;      // Amount shifted in seconds
  shiftReason?: ShiftAdjustmentReason; // Reason for placement shift
  correctionReasonFa?: string;  // Detailed Persian explanation for why this segment was adjusted
  durationRatio?: number;       // effectiveDuration / targetDuration
  timeStretchRatio?: number;    // Applied or recommended tempo factor (e.g. 1.10 = +10% speedup)
  playbackRate?: number;        // Active playback speed
  syncStatus?: SyncStatus;      // Granular synchronization state
  syncConfidence?: number;      // 0.0 to 1.0 confidence score
  qualityWarnings?: QualityWarning[]; // Audio quality and timing warnings
  audioOffset?: number;         // Offset shift in seconds relative to subtitle start
  candidates?: TranslationCandidate[];
  selectedCandidateId?: string;
  predictedDuration?: number;       // Estimated by Persian Speech Duration Predictor
  speechActiveDuration?: number;    // Measured physical voice duration without leading/trailing dead silence
  durationError?: number;           // actual/effective - target
  relativeDurationError?: number;   // abs(durationError) / targetDuration
  validationStatus?: ValidationStatus;
  balancedSyncStatus?: BalancedSyncStatus;
  selectionReasonFa?: string;
  voiceProfileId?: string;
  retryCount?: number;
  status: 'idle' | 'translating' | 'translated' | 'generating' | 'ready' | 'error';
  error?: string;
}

export interface SyncConfig {
  idealThreshold: number;       // default 0.05 (±5% requires no stretching)
  mildStretchMax: number;       // default 0.15 (5-15% duration mismatch: time stretching)
  adaptationMax: number;        // default 0.25 (15-25%: text shortening + time stretch)
  maxTimeStretchFactor: number; // default 1.25 (max safe speedup factor)
  minTimeStretchFactor: number; // default 0.80 (max safe slowdown factor)
  silenceThresholdDb: number;   // default -40 dB
  preserveIntentionalOverlap: boolean; // default true
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  idealThreshold: 0.05,
  mildStretchMax: 0.15,
  adaptationMax: 0.25,
  maxTimeStretchFactor: 1.25,
  minTimeStretchFactor: 0.80,
  silenceThresholdDb: -40,
  preserveIntentionalOverlap: true,
};

export interface VoiceOption {
  id: GeminiVoiceId;
  nameFa: string;
  genderFa: string;
  descriptionFa: string;
  color: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'Iapetus',
    nameFa: 'ایپتوس (Iapetus)',
    genderFa: 'مرد',
    descriptionFa: 'صدای مردانه عمیق، مقتدر، رسا و مطمئن؛ ادای دقیق مفاهیم تخصصی و آموزشی',
    color: 'blue',
  },
  {
    id: 'Fenrir',
    nameFa: 'فنریر (Fenrir)',
    genderFa: 'مرد',
    descriptionFa: 'صدای مردانه گرم، باوقار، شمرده و مسلط؛ تدریس قدم‌به‌قدم با لحن استادانه',
    color: 'amber',
  },
  {
    id: 'Charon',
    nameFa: 'کارون (Charon)',
    genderFa: 'مرد',
    descriptionFa: 'صدای مردانه آکادمیک، پخته، جدی و تحلیلی؛ انتقال عمیق مباحث پیچیده',
    color: 'purple',
  },
  {
    id: 'Puck',
    nameFa: 'پوک (Puck)',
    genderFa: 'مرد',
    descriptionFa: 'صدای مردانه پویا، تعاملی و پرانرژی؛ آموزش جذاب و همراه با انگیزه',
    color: 'emerald',
  },
  {
    id: 'Kore',
    nameFa: 'کوره (Kore)',
    genderFa: 'زن',
    descriptionFa: 'صدای زنانه شیوا، صبور، شفاف و ترغیب‌کننده؛ ایده‌آل برای تدریس صمیمی و مفهومی',
    color: 'rose',
  },
  {
    id: 'Zephyr',
    nameFa: 'زفیر (Zephyr)',
    genderFa: 'زن',
    descriptionFa: 'صدای زنانه متین، روشن، با آهنگ کلام منظم و استاندارد دوره‌های بین‌المللی',
    color: 'cyan',
  },
];

export type TranslationStyle = 'colloquial' | 'educational' | 'formal';

export interface SpeechPersona {
  id: string;
  nameEn: string;
  nameFa: string;
  genderFa: 'مرد' | 'زن';
  defaultVoice: GeminiVoiceId;
  stylePrompt: string;
  descriptionFa: string;
}

export const SPEECH_PERSONAS: SpeechPersona[] = [
  {
    id: 'iapetus_online_instructor',
    nameEn: 'Iapetus (Tech Course Lead)',
    nameFa: 'ایپتوس (مدرس ارشد و فنی)',
    genderFa: 'مرد',
    defaultVoice: 'Iapetus',
    stylePrompt: 'Top-tier tech course instructor, masculine, authoritative yet conversational, precise enunciation of code and technical terms, measured pacing, confident pedagogical delivery, engaging and never theatrical',
    descriptionFa: 'مدرس مسلط بر مباحث فنی؛ تلفظ بی‌نقص لغات تخصصی با بیان مقتدر و روان دوره‌های روز دنیا',
  },
  {
    id: 'fenrir_senior_mentor',
    nameEn: 'Fenrir (Senior Mentor)',
    nameFa: 'فنریر (منتور باتجربه)',
    genderFa: 'مرد',
    defaultVoice: 'Fenrir',
    stylePrompt: 'Senior online mentor, warm masculine tone, patient and thorough explanation, steady teaching cadence, friendly guidance, crystal-clear pronunciation',
    descriptionFa: 'لحن گرم و راهنمای منتور آموزشی؛ شمرده، قابل فهم، باوقار و اطمینان‌بخش برای یادگیری گام‌به‌گام',
  },
  {
    id: 'charon_academic_lecturer',
    nameEn: 'Charon (Academic Lecturer)',
    nameFa: 'کارون (استاد مفاهیم پایه و معماری)',
    genderFa: 'مرد',
    defaultVoice: 'Charon',
    stylePrompt: 'Deep analytical professor, clear articulation, intellectual depth, structured lecture rhythm, calm enunciation, focused purely on educational clarity',
    descriptionFa: 'بیان سنجیده و آکادمیک برای انتقال سرفصل‌های پایه‌ای، الگوهای طراحی و مفاهیم سنگین',
  },
  {
    id: 'puck_interactive_coach',
    nameEn: 'Puck (Interactive Coach)',
    nameFa: 'پوک (مربی پویا و ورکشاپ)',
    genderFa: 'مرد',
    defaultVoice: 'Puck',
    stylePrompt: 'Dynamic interactive boot-camp instructor, clear enthusiastic delivery, conversational teaching style, crisp pronunciation, engaging without being radio or broadcasty',
    descriptionFa: 'آموزش پرانرژی و تعاملی؛ حفظ تمرکز دانشجو در بوت‌کمپ‌ها و پروژه‌های عملی با لحن زنده و صمیمی',
  },
  {
    id: 'kore_master_educator',
    nameEn: 'Kore (Master Educator)',
    nameFa: 'کوره (مدرس صبور و مفهومی)',
    genderFa: 'زن',
    defaultVoice: 'Kore',
    stylePrompt: 'Master educator, warm feminine voice, patient, clear enunciation, gentle encouragement, natural pedagogical rhythm, articulate explanation of complex topics',
    descriptionFa: 'سبک مشهور آموزش استاندارد؛ بیانی صبورانه، شمرده، عاری از هرگونه اغراق و کاملاً قابل درک',
  },
  {
    id: 'zephyr_methodology_trainer',
    nameEn: 'Zephyr (Structured Trainer)',
    nameFa: 'زفیر (مدرس ساختاریافته و استاندارد)',
    genderFa: 'زن',
    defaultVoice: 'Zephyr',
    stylePrompt: 'Modern online course trainer, smooth feminine voice, articulate cadence, clear vocal inflection, clean pronunciation of terminology, balanced tempo',
    descriptionFa: 'تدریس استاندارد و مدرن دوره‌های آنلاین؛ ادای شفاف سیلاب‌ها، وزن کلام یکدست و تمرکز بر یادگیری سریع',
  },
];

export interface StyleOption {
  id: TranslationStyle;
  titleFa: string;
  descFa: string;
}

export const TRANSLATION_STYLES: StyleOption[] = [
  {
    id: 'colloquial',
    titleFa: 'محاوره‌ای آموزشی (مانند بهترین دوره‌های آنلاین)',
    descFa: 'روان، صمیمی، استادانه، حفظ تلفظ اصلی واژگان تخصصی و بدون اغراق سینمایی',
  },
  {
    id: 'educational',
    titleFa: 'تخصصی و گام‌به‌گام (تدریس فنی و کدنویسی)',
    descFa: 'دقیق، شفاف و رسا؛ بیان استاندارد مفاهیم برنامه‌نویسی و اصطلاحات مهندسی',
  },
  {
    id: 'formal',
    titleFa: 'رسمی و دانشگاهی',
    descFa: 'ساختاریافته و متین برای دوره‌ها و ارائه‌های سازمانی و آکادمیک',
  },
];

// ==========================================
// AUDIO OVERLAP & BULK SPEED CONTROL TYPES
// ==========================================

export type OverlapSeverity = 'none' | 'minor' | 'moderate' | 'severe';

export interface OverlapThresholds {
  noneMaxSec: number;           // Overlaps <= this (e.g. 0.04s) are treated as none/negligible
  minorMaxSec: number;          // Overlaps <= this (e.g. 0.25s) or <= minorMaxPercent are minor
  moderateMaxSec: number;       // Overlaps <= this (e.g. 0.60s) or <= moderateMaxPercent are moderate
  minorMaxPercent: number;      // e.g. 10 (%)
  moderateMaxPercent: number;   // e.g. 25 (%)
  minOverlapDurationSec: number;// Minimum threshold to count as overlap (0.04s)
}

export const DEFAULT_OVERLAP_THRESHOLDS: OverlapThresholds = {
  noneMaxSec: 0.04,
  minorMaxSec: 0.25,
  moderateMaxSec: 0.60,
  minorMaxPercent: 10,
  moderateMaxPercent: 25,
  minOverlapDurationSec: 0.04,
};

export interface DetectedOverlap {
  id: string;                   // Unique conflict identifier, e.g. "overlap_1_2"
  firstSubId: number;
  secondSubId: number;
  firstSubText: string;
  secondSubText: string;
  firstStart: number;
  firstEnd: number;
  secondStart: number;
  secondEnd: number;
  overlapDurationSec: number;
  overlapPercentage: number;    // Relative to shorter segment duration
  severity: OverlapSeverity;
  isSilenceOverlap: boolean;    // Overlap occurs only during dead silence padding
  isIntentional: boolean;       // Present in original source or flagged intentional
  descriptionFa: string;
}

export interface OverlapSummary {
  totalOverlaps: number;
  affectedSegmentCount: number;
  severeCount: number;
  moderateCount: number;
  minorCount: number;
  silenceCount: number;
  intentionalCount: number;
  totalOverlapDurationSec: number;
  overlaps: DetectedOverlap[];
  segmentOverlapMap: Record<number, DetectedOverlap[]>;
}

export type BulkSpeedSelectionMode = 'all' | 'selected' | 'overlapping' | 'overflowing' | 'threshold';
export type BulkSpeedCalculationMode = 'exact' | 'percentage' | 'fit_target';

export interface BulkSpeedConfig {
  selectionMode: BulkSpeedSelectionMode;
  calculationMode: BulkSpeedCalculationMode;
  targetSpeed: number;           // For exact mode, e.g. 1.05
  percentageChange: number;      // For percentage mode, e.g. +10 (%)
  minSafeSpeed: number;          // Clamped lower bound, default 0.75
  maxSafeSpeed: number;          // Clamped upper bound, default 1.35
  selectedSubtitleIds: number[]; // Subtitles selected if selectionMode === 'selected'
  durationThresholdSec?: number; // For threshold mode
  respectIntentionalOverlap?: boolean;
}

export interface BulkSpeedPreviewItem {
  subId: number;
  originalText: string;
  farsiText: string;
  originalDuration: number;
  targetDuration: number;
  currentSpeed: number;
  proposedSpeed: number;
  expectedDuration: number;
  severity: OverlapSeverity;
  isSafe: boolean;
  safetyWarningFa?: string;
  hasAudio: boolean;
  isMuted?: boolean;
  isIntentional?: boolean;
}

export interface BulkSpeedHistorySnapshot {
  timestamp: number;
  descriptionFa: string;
  items: {
    id: number;
    audioBase64?: string;
    originalAudioBase64?: string;
    processedAudioBase64?: string;
    appliedSpeed?: number;
    audioDuration?: number;
    effectiveDuration?: number;
    timeStretchRatio?: number;
    playbackRate?: number;
    isMuted?: boolean;
    isIntentionalOverlap?: boolean;
  }[];
}

// ==========================================
// AUTO-FIX TIMELINE & INTELLIGENT SCHEDULING TYPES
// ==========================================

export type TimelineIssueType =
  | 'speech_overlap'      // Active phonated vocal overlap between distinct speakers
  | 'silence_overlap'     // Audio file bounding boxes overlap but vocal speech is clear
  | 'intentional_overlap' // Intentional simultaneous speech in original video
  | 'excessive_silence'   // Gap between consecutive dialogues is unnecessarily long
  | 'late_start'          // Dialogue starts significantly later than intended anchor
  | 'window_overflow'     // Dialogue duration extends outside its permitted window
  | 'unfit_duration';     // Dialogue cannot fit target duration even with maximum safe time-stretching

export interface TimelineIssue {
  id: string;
  type: TimelineIssueType;
  subId: number;
  conflictingSubId?: number;
  severity: 'minor' | 'moderate' | 'severe';
  timeSec: number;
  durationSec: number;
  descriptionFa: string;
  isResolvable: boolean;
  unresolvedReasonFa?: string;
  isIntentional?: boolean;
}

export type AutoFixCategory =
  | 'AUTO_FIXED'                        // Fixed without speed adjustment (e.g. silence trim)
  | 'FIXED_WITH_MILD_ACCELERATION'      // Fixed at 1.10x
  | 'FIXED_WITH_MODERATE_ACCELERATION'  // Fixed at 1.20x
  | 'FIXED_WITH_MAX_ACCELERATION'       // Fixed at 1.30x
  | 'FIXED_WITH_SHORTER_TRANSLATION'    // Fixed using a shorter valid translation
  | 'FIXED_WITH_TIMING_ADJUSTMENT'      // Fixed within its allowed timing window
  | 'INTENTIONAL_OVERLAP'               // Preserved because it is intentional
  | 'MANUAL_REVIEW_REQUIRED';           // No safe automatic solution exists

export interface AutoFixSegmentResolution {
  subId: number;
  category: AutoFixCategory;
  appliedSpeed: number;
  appliedOffset: number;
  originalStart?: number;
  adjustedStart?: number;
  shiftAmountSec?: number;
  shiftDirection?: 'earlier' | 'later' | 'none';
  shiftReason?: ShiftAdjustmentReason;
  leadingSilenceTrimmedSec?: number;
  trailingSilenceTrimmedSec?: number;
  farsiText: string;
  originalText: string;
  isResolved: boolean;
  reasonFa: string;
}

export interface TimelineAutoFixConfig {
  mode: 'balanced' | 'conservative' | 'aggressive';
  maxSpeed: number;                            // MUST NEVER EXCEED 1.30
  adaptiveSpeedLevels: number[];               // [1.00, 1.10, 1.20, 1.30]
  translationShortening: boolean;              // default true
  maxTranslationCandidates: number;            // default 3
  preservePitch: boolean;                      // default true
  preserveOriginalAudio: boolean;              // default true
  preserveOriginalTiming: boolean;             // default true
  automaticTimelineOptimization: boolean;      // default true
  preserveIntentionalOverlaps: boolean;        // default true
  requireFinalValidation: boolean;             // default true
  requireUserConfirmationForBulkProcessing: boolean; // default false

  // Zero-Silence Configuration
  zeroSilenceEnabled?: boolean;                // default true
  silencePaddingMs?: number;                   // default 25ms
  silenceThresholdDb: number;                  // default -40 dB

  // Flexible Timeline Placement Configuration
  placement?: TimelinePlacementConfig;
  maxEarlyShiftSeconds?: number;               // default 2.0 (configurable up to 3.0)
  maxLateShiftSeconds?: number;                // default 2.0 (configurable up to 3.0)
  configurableMaximumShiftSeconds?: number;    // default 3.0

  // Fine-tuning constraints
  minSafeTempo: number;                        // default 0.85
  maxSafeTempo: number;                        // default 1.30 (clamped to maxSpeed)
  maxStartDeviationSec: number;                // default 2.0s
  targetNaturalPauseSec: number;               // default 0.12s
  minNaturalGapSec?: number;                   // default 0.08s
  maxAllowedSilenceGapSec: number;             // default 2.50s
}

export const DEFAULT_AUTO_FIX_CONFIG: TimelineAutoFixConfig = {
  mode: 'balanced',
  maxSpeed: 1.30,
  adaptiveSpeedLevels: [1.00, 1.10, 1.20, 1.30],
  translationShortening: true,
  maxTranslationCandidates: 3,
  preservePitch: true,
  preserveOriginalAudio: true,
  preserveOriginalTiming: true,
  automaticTimelineOptimization: true,
  preserveIntentionalOverlaps: true,
  requireFinalValidation: true,
  requireUserConfirmationForBulkProcessing: false,
  zeroSilenceEnabled: true,
  silencePaddingMs: 25,
  silenceThresholdDb: -40,
  placement: DEFAULT_TIMELINE_PLACEMENT_CONFIG,
  maxEarlyShiftSeconds: 2.0,
  maxLateShiftSeconds: 2.0,
  configurableMaximumShiftSeconds: 3.0,
  minSafeTempo: 0.85,
  maxSafeTempo: 1.30,
  maxStartDeviationSec: 2.0,
  targetNaturalPauseSec: 0.12,
  minNaturalGapSec: 0.08,
  maxAllowedSilenceGapSec: 2.50,
};

export interface AutoFixStatistics {
  totalAnalyzed: number;
  initialFileOverlaps: number;
  initialActiveSpeechOverlaps: number;
  intentionalOverlaps: number;
  automaticallyResolvedOverlaps: number;
  fixedBySilence: number;
  fixedByShorterTranslation: number;
  fixedAt110: number;
  fixedAt120: number;
  fixedAt130: number;
  fixedByTimingAdjustment: number;
  remainingUnintendedOverlaps: number;
  manualReviewCount: number;
  averageStartDeviationSec: number;
  totalProcessingDurationMs: number;

  // Feature 1: Zero-Silence Metrics
  filesWithLeadingSilenceRemoved: number;
  filesWithTrailingSilenceRemoved: number;
  totalSilenceRemovedSec: number;

  // Feature 2: Flexible Timeline Placement Metrics
  segmentsShiftedEarlier: number;
  segmentsShiftedLater: number;
  averageAbsoluteTimingShiftSec: number;
  maxTimingShiftSec: number;
  conflictsResolvedByPlacement: number;
  conflictsResolvedByTranslation: number;
  conflictsResolvedByStretching: number;
  remainingManualReviewCases: number;

  // Backwards compatibility aliases
  overlapsDetected: number;
  overlapsFixed: number;
  timingProblemsFixed: number;
  segmentsAdjusted: number;
  segmentsTimeStretched: number;
  unresolvedConflictsCount: number;

  unresolvedIssues: TimelineIssue[];
  issuesFound: TimelineIssue[];
  segmentResolutions: AutoFixSegmentResolution[];
}

export interface AutoFixResult {
  success: boolean;
  updatedSubtitles: SubtitleItem[];
  originalSubtitlesSnapshot: SubtitleItem[];
  stats: AutoFixStatistics;
  historySnapshot: BulkSpeedHistorySnapshot;
  messageFa: string;
}
