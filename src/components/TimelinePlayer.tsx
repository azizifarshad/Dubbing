import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SubtitleItem,
  BulkSpeedHistorySnapshot,
  DetectedOverlap,
  OverlapSummary,
  OverlapSeverity,
  AutoFixResult,
  DEFAULT_TIMELINE_PLACEMENT_CONFIG,
} from '../types/dubbing';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Layers,
  Music,
  Mic2,
  Clock,
  Radio,
  FastForward,
  Rewind,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  MoveHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Settings2,
  Scissors,
  Bot,
  Minimize2,
} from 'lucide-react';
import { formatPlayerTime } from '../utils/srtParser';
import {
  getAudioContext,
  renderDubbedTrack,
  decodeBase64ToAudioBuffer,
  audioBufferToWav,
} from '../utils/audioMixer';
import { deriveProjectOutputName } from '../utils/fileNaming';
import {
  analyzeTimelineCollisions,
  evaluateSynchronization,
  profileAudioSilence,
  stretchAudioViaRubberBandServer,
  timeStretchAudioBufferWSOLA,
  trimZeroSilenceAudioBuffer,
} from '../utils/syncEngine';
import { detectAudioOverlaps, autoResolveAllOverlaps, compactEmptyGapsAndOpenSpace } from '../utils/overlapEngine';
import { undoBulkSpeedChanges } from '../utils/bulkSpeedController';
import { autoFixEntireTimeline } from '../utils/autoFixEngine';
import { BulkSpeedModal } from './BulkSpeedModal';
import { AutoFixDashboardModal } from './AutoFixDashboardModal';
import { AiSyncModal } from './AiSyncModal';

interface TimelinePlayerProps {
  subtitles: SubtitleItem[];
  onUpdateSubtitle?: (id: number, partial: Partial<SubtitleItem>) => void;
  onUpdateAllSubtitles?: (items: SubtitleItem[]) => void;
  originalAudioBuffer: AudioBuffer | null;
  originalAudioName: string;
  subtitleFileName?: string;
  outputBaseName?: string;
  mixMode: 'ducking' | 'isolated' | 'full_mix';
  onChangeMixMode: (mode: 'ducking' | 'isolated' | 'full_mix') => void;
  persianVolume: number;
  onChangePersianVolume: (vol: number) => void;
  backgroundVolume: number;
  onChangeBackgroundVolume: (vol: number) => void;
  duckingAmount: number;
  onChangeDuckingAmount: (val: number) => void;
  onMixRendered?: (res: { wavBlob: Blob; audioBuffer: AudioBuffer; totalDuration: number }) => void;
  sharedWavBlob?: Blob | null;
  sharedAudioBuffer?: AudioBuffer | null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface OverlapDetail {
  prevSubId: number;
  nextSubId: number;
  prevIdx: number;
  nextIdx: number;
  overlapSec: number;
  prevEnd: number;
  nextStart: number;
}

export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  subtitles,
  onUpdateSubtitle,
  onUpdateAllSubtitles,
  originalAudioBuffer,
  originalAudioName,
  subtitleFileName,
  outputBaseName,
  mixMode,
  onChangeMixMode,
  persianVolume,
  onChangePersianVolume,
  backgroundVolume,
  onChangeBackgroundVolume,
  duckingAmount,
  onChangeDuckingAmount,
  onMixRendered,
  sharedWavBlob,
  sharedAudioBuffer,
}) => {
  const effectiveBaseName =
    (outputBaseName || '').trim() ||
    deriveProjectOutputName(originalAudioName, subtitleFileName) ||
    'persian_dub';

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Timeline UI state
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x to 3x
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [draggingSubId, setDraggingSubId] = useState<number | null>(null);
  const [soloPlayingId, setSoloPlayingId] = useState<number | null>(null);
  const [playingConflictPair, setPlayingConflictPair] = useState<string | null>(null);

  // Bulk Speed Control Modal & History Snapshot State
  const [isBulkSpeedModalOpen, setIsBulkSpeedModalOpen] = useState<boolean>(false);
  const [bulkSpeedHistorySnapshot, setBulkSpeedHistorySnapshot] = useState<BulkSpeedHistorySnapshot | null>(null);

  // One-Click Auto Fix Timeline State
  const [autoFixResult, setAutoFixResult] = useState<AutoFixResult | null>(null);
  const [isAutoFixModalOpen, setIsAutoFixModalOpen] = useState<boolean>(false);
  const [isAutoFixing, setIsAutoFixing] = useState<boolean>(false);
  const [autoFixProgress, setAutoFixProgress] = useState<{ pct: number; msg: string }>({ pct: 0, msg: '' });
  const autoFixAbortControllerRef = useRef<AbortController | null>(null);

  // AI Cloud Timeline Synchronization State (GPT-6 Luna / Hormouz)
  const [isAiSyncing, setIsAiSyncing] = useState<boolean>(false);
  const [aiSyncProgressMsg, setAiSyncProgressMsg] = useState<string>('');
  const [aiSyncResult, setAiSyncResult] = useState<any>(null);
  const [isAiSyncModalOpen, setIsAiSyncModalOpen] = useState<boolean>(false);

  // Audio Re-synthesis state for shortened/modified lines
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState<boolean>(false);
  const [regenerateProgressMsg, setRegenerateProgressMsg] = useState<string>('');

  // Flexible Timeline Placement & Zero-Silence Auto-Fix state
  const [isPlacementConfigOpen, setIsPlacementConfigOpen] = useState<boolean>(false);
  const [autoFixPlacementEnabled, setAutoFixPlacementEnabled] = useState<boolean>(true);
  const [maxEarlyShift, setMaxEarlyShift] = useState<number>(2.0);
  const [maxLateShift, setMaxLateShift] = useState<number>(2.0);
  const [autoFixZeroSilence, setAutoFixZeroSilence] = useState<boolean>(true);

  // Rendered Output Audio State
  const [renderedMixBuffer, setRenderedMixBuffer] = useState<AudioBuffer | null>(
    sharedAudioBuffer || null
  );
  const [renderedWavBlob, setRenderedWavBlob] = useState<Blob | null>(
    sharedWavBlob || null
  );
  const [isRenderingMix, setIsRenderingMix] = useState(false);
  const [renderProgressMsg, setRenderProgressMsg] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isSyncingOverlaps, setIsSyncingOverlaps] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);


  // Automatically measure and cache audio duration and silence profile if subtitles have audioBase64 but missing audioDuration
  useEffect(() => {
    if (!onUpdateAllSubtitles || subtitles.length === 0) return;
    const needsMeasure = subtitles.filter((s) => Boolean(s.audioBase64) && (!s.audioDuration || s.audioDuration <= 0));
    if (needsMeasure.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const updated = await Promise.all(
          subtitles.map(async (sub) => {
            if (sub.audioBase64 && (!sub.audioDuration || sub.audioDuration <= 0)) {
              try {
                const buf = await decodeBase64ToAudioBuffer(sub.audioBase64);
                const prof = profileAudioSilence(buf);
                return {
                  ...sub,
                  audioDuration: Number(buf.duration.toFixed(3)),
                  effectiveDuration: Number(prof.effectiveDuration.toFixed(3)),
                  leadingSilenceSec: Number(prof.leadingSilenceSec.toFixed(3)),
                  trailingSilenceSec: Number(prof.trailingSilenceSec.toFixed(3)),
                };
              } catch (_) {
                return sub;
              }
            }
            return sub;
          })
        );
        if (!cancelled) {
          onUpdateAllSubtitles(updated);
        }
      } catch (_) {}
    })();

    return () => {
      cancelled = true;
    };
  }, [subtitles, onUpdateAllSubtitles]);

  // Synchronize state when sharedAudioBuffer or sharedWavBlob from parent changes
  useEffect(() => {
    if (sharedAudioBuffer) {
      setRenderedMixBuffer(sharedAudioBuffer);
    }
  }, [sharedAudioBuffer]);

  useEffect(() => {
    if (sharedWavBlob) {
      setRenderedWavBlob(sharedWavBlob);
    }
  }, [sharedWavBlob]);

  // Audio nodes references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soloSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startEpochRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  // Timeline container element ref for drag calculations
  const timelineCanvasRef = useRef<HTMLDivElement | null>(null);
  const dragStartInfoRef = useRef<{ clientX: number; initialOffset: number } | null>(null);

  // Keep ref synchronized
  currentTimeRef.current = currentTime;
  isPlayingRef.current = isPlaying;

  const readyVoicesCount = subtitles.filter((s) => Boolean(s.audioBase64)).length;

  // Determine total project duration
  let maxDuration = 10;
  if (renderedMixBuffer) {
    maxDuration = Math.max(maxDuration, renderedMixBuffer.duration);
  } else if (originalAudioBuffer) {
    maxDuration = Math.max(maxDuration, originalAudioBuffer.duration);
  }
  for (const s of subtitles) {
    const effectiveVoiceEnd = (s.start + (s.audioOffset || 0)) + (s.audioDuration || (s.end - s.start));
    if (s.end > maxDuration) {
      maxDuration = s.end;
    }
    if (effectiveVoiceEnd > maxDuration) {
      maxDuration = effectiveVoiceEnd;
    }
  }
  maxDuration = Math.ceil(maxDuration + 1.0);

  // Comprehensive Overlap Detection Engine
  const overlapSummary: OverlapSummary = useMemo(() => {
    return detectAudioOverlaps(subtitles);
  }, [subtitles]);

  // Backward-compatible overlaps list and map
  const overlaps: OverlapDetail[] = useMemo(() => {
    return overlapSummary.overlaps.map((ov) => {
      const prevIdx = subtitles.findIndex((s) => s.id === ov.firstSubId);
      const nextIdx = subtitles.findIndex((s) => s.id === ov.secondSubId);
      return {
        prevSubId: ov.firstSubId,
        nextSubId: ov.secondSubId,
        prevIdx,
        nextIdx,
        overlapSec: ov.overlapDurationSec,
        prevEnd: ov.firstEnd,
        nextStart: ov.secondStart,
      };
    });
  }, [overlapSummary, subtitles]);

  // Map of sub IDs involved in collisions for fast badge & highlight lookup
  const collidingSubIdMap = useMemo(() => {
    const map = new Map<
      number,
      {
        isPrev: boolean;
        isNext: boolean;
        overlapSec: number;
        severity: OverlapSeverity;
        isIntentional: boolean;
        isSilence: boolean;
        partnerSubId: number;
      }
    >();
    for (const ov of overlapSummary.overlaps) {
      if (!map.has(ov.firstSubId) || ov.severity === 'severe') {
        map.set(ov.firstSubId, {
          isPrev: true,
          isNext: false,
          overlapSec: ov.overlapDurationSec,
          severity: ov.severity,
          isIntentional: ov.isIntentional,
          isSilence: ov.isSilenceOverlap,
          partnerSubId: ov.secondSubId,
        });
      }
      if (!map.has(ov.secondSubId) || ov.severity === 'severe') {
        map.set(ov.secondSubId, {
          isPrev: false,
          isNext: true,
          overlapSec: ov.overlapDurationSec,
          severity: ov.severity,
          isIntentional: ov.isIntentional,
          isSilence: ov.isSilenceOverlap,
          partnerSubId: ov.firstSubId,
        });
      }
    }
    return map;
  }, [overlapSummary]);

  // Stop playback cleanly
  const stopPlayback = () => {
    if (masterSourceRef.current) {
      try {
        masterSourceRef.current.stop();
        masterSourceRef.current.disconnect();
      } catch (_) {}
      masterSourceRef.current = null;
    }
    if (masterGainRef.current) {
      try {
        masterGainRef.current.disconnect();
      } catch (_) {}
      masterGainRef.current = null;
    }
    if (soloSourceRef.current) {
      try {
        soloSourceRef.current.stop();
        soloSourceRef.current.disconnect();
      } catch (_) {}
      soloSourceRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setSoloPlayingId(null);
  };

  // Start playback of the EXACT rendered output mix buffer
  const startPlayback = (offsetSec: number) => {
    stopPlayback();

    const bufferToPlay = renderedMixBuffer || originalAudioBuffer;
    if (!bufferToPlay) return;

    const ctx = getAudioContext();
    audioCtxRef.current = ctx;

    const dur = bufferToPlay.duration;
    const clampedOffset = Math.max(0, Math.min(dur - 0.05, offsetSec));

    const source = ctx.createBufferSource();
    source.buffer = bufferToPlay;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isMuted ? 0 : 1.0, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);

    masterSourceRef.current = source;
    masterGainRef.current = gain;

    source.start(0, clampedOffset);
    startEpochRef.current = ctx.currentTime - clampedOffset;
    setIsPlaying(true);
    isPlayingRef.current = true;

    source.onended = () => {
      if (audioCtxRef.current && masterSourceRef.current === source) {
        const elapsed = audioCtxRef.current.currentTime - startEpochRef.current;
        if (elapsed >= dur - 0.25) {
          stopPlayback();
          setCurrentTime(0);
        }
      }
    };

    const tick = () => {
      if (!audioCtxRef.current || !masterSourceRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - startEpochRef.current;
      if (elapsed >= dur) {
        stopPlayback();
        setCurrentTime(0);
        return;
      }
      setCurrentTime(elapsed);
      animFrameIdRef.current = requestAnimationFrame(tick);
    };
    animFrameIdRef.current = requestAnimationFrame(tick);
  };

  // Solo preview for a single line's voice
  const handlePlaySoloVoice = async (sub: SubtitleItem) => {
    if (soloPlayingId === sub.id) {
      if (soloSourceRef.current) {
        try {
          soloSourceRef.current.stop();
          soloSourceRef.current.disconnect();
        } catch (_) {}
        soloSourceRef.current = null;
      }
      setSoloPlayingId(null);
      return;
    }

    if (!sub.audioBase64) return;

    stopPlayback();
    try {
      const ctx = getAudioContext();
      const buf = await decodeBase64ToAudioBuffer(sub.audioBase64);
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);

      source.onended = () => {
        setSoloPlayingId(null);
        soloSourceRef.current = null;
      };

      soloSourceRef.current = source;
      setSoloPlayingId(sub.id);
      source.start(0);
    } catch (err) {
      console.error('Failed to play solo voice', err);
      setSoloPlayingId(null);
    }
  };

  // Plays two conflicting dialogue audio clips together with their exact relative timeline timing
  const handlePlayConflictPair = async (firstSubId: number, secondSubId: number) => {
    const pairKey = `${firstSubId}_${secondSubId}`;
    if (playingConflictPair === pairKey) {
      stopPlayback();
      setPlayingConflictPair(null);
      return;
    }
    stopPlayback();

    const firstSub = subtitles.find((s) => s.id === firstSubId);
    const secondSub = subtitles.find((s) => s.id === secondSubId);
    if (!firstSub || !secondSub) return;

    const firstAudio = firstSub.processedAudioBase64 || firstSub.audioBase64 || firstSub.originalAudioBase64;
    const secondAudio = secondSub.processedAudioBase64 || secondSub.audioBase64 || secondSub.originalAudioBase64;
    if (!firstAudio || !secondAudio) return;

    try {
      const ctx = getAudioContext();
      const [buf1, buf2] = await Promise.all([
        decodeBase64ToAudioBuffer(firstAudio),
        decodeBase64ToAudioBuffer(secondAudio),
      ]);

      const source1 = ctx.createBufferSource();
      const source2 = ctx.createBufferSource();
      source1.buffer = buf1;
      source2.buffer = buf2;

      source1.connect(ctx.destination);
      source2.connect(ctx.destination);

      const firstStart = Math.max(0, firstSub.start + (firstSub.audioOffset || 0));
      const secondStart = Math.max(0, secondSub.start + (secondSub.audioOffset || 0));
      const deltaSec = secondStart - firstStart;

      const now = ctx.currentTime;
      if (deltaSec >= 0) {
        source1.start(now);
        source2.start(now + deltaSec);
      } else {
        source1.start(now + Math.abs(deltaSec));
        source2.start(now);
      }

      setPlayingConflictPair(pairKey);
      const totalDur = Math.max(buf1.duration, Math.abs(deltaSec) + buf2.duration);
      setTimeout(() => {
        setPlayingConflictPair((prev) => (prev === pairKey ? null : prev));
      }, Math.ceil((totalDur + 0.3) * 1000));
    } catch (err) {
      console.error('Failed to play conflict pair', err);
      setPlayingConflictPair(null);
    }
  };

  // Toggle temporary mute for a single line in preview and export
  const handleToggleMuteSegment = (subId: number) => {
    const sub = subtitles.find((s) => s.id === subId);
    if (!sub || !onUpdateSubtitle) return;
    onUpdateSubtitle(subId, { isMuted: !sub.isMuted });
  };

  // Toggle intentional overlap preservation for a line
  const handleToggleIntentionalOverlap = (subId: number) => {
    const sub = subtitles.find((s) => s.id === subId);
    if (!sub || !onUpdateSubtitle) return;
    onUpdateSubtitle(subId, { isIntentionalOverlap: !sub.isIntentionalOverlap });
  };

  // Fingerprint of all inputs including audioOffsets that determine the final rendered audio file
  const mixFingerprint = useMemo(() => {
    const subsHash = subtitles
      .map(
        (s) =>
          `${s.id}_${s.start.toFixed(2)}_${s.end.toFixed(2)}_${(s.audioOffset || 0).toFixed(2)}_${(s.timeStretchRatio || 1.0).toFixed(2)}_${(s.playbackRate || 1.0).toFixed(2)}_${(s.appliedSpeed || 1.0).toFixed(2)}_${s.isMuted ? 'muted' : 'active'}_${
            s.processedAudioBase64
              ? `proc_${s.processedAudioBase64.length}_${s.processedAudioBase64.slice(0, 16)}`
              : s.audioBase64
              ? `raw_${s.audioBase64.length}_${s.audioBase64.slice(0, 16)}`
              : 'none'
          }`
      )
      .join('|');
    const bgHash = originalAudioBuffer
      ? `${originalAudioBuffer.duration.toFixed(2)}_${originalAudioBuffer.sampleRate}_${originalAudioBuffer.numberOfChannels}`
      : 'no-bg';
    return `${subsHash}##${bgHash}##${mixMode}##${persianVolume}##${backgroundVolume}##${duckingAmount}`;
  }, [
    subtitles,
    originalAudioBuffer,
    mixMode,
    persianVolume,
    backgroundVolume,
    duckingAmount,
  ]);

  // Master Render Engine: automatically builds the exact output audio file whenever any voice, offset or setting changes!
  useEffect(() => {
    let isCancelled = false;

    const timer = setTimeout(async () => {
      const hasVoices = subtitles.some((s) => Boolean(s.audioBase64));
      if (!hasVoices && !originalAudioBuffer) {
        setRenderedMixBuffer(null);
        setRenderedWavBlob(null);
        setIsRenderingMix(false);
        return;
      }

      setIsRenderingMix(true);
      setRenderError(null);
      setRenderProgressMsg('در حال میکس و تولید فایل خروجی همگام...');

      try {
        const result = await renderDubbedTrack(
          {
            originalBuffer: originalAudioBuffer,
            subtitles,
            mixMode,
            persianVolume,
            backgroundVolume,
            duckingAmount,
          },
          (pct, msg) => {
            if (!isCancelled) {
              setRenderProgressMsg(msg);
            }
          }
        );

        if (!isCancelled) {
          setRenderedMixBuffer(result.audioBuffer);
          setRenderedWavBlob(result.wavBlob);
          setIsRenderingMix(false);
          onMixRendered?.(result);

          if (isPlayingRef.current) {
            startPlayback(currentTimeRef.current);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Master mix auto-render failed:', err);
          setRenderError(err.message || 'خطا در رندر فایل صوتی خروجی');
          setIsRenderingMix(false);
        }
      }
    }, 180);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [mixFingerprint]);

  // Clean cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Global mouse listeners for dragging voice clips left/right on timeline
  useEffect(() => {
    if (draggingSubId === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartInfoRef.current || !timelineCanvasRef.current) return;
      const rect = timelineCanvasRef.current.getBoundingClientRect();
      const totalWidthPx = rect.width;
      if (totalWidthPx <= 0) return;

      const deltaX = e.clientX - dragStartInfoRef.current.clientX;
      const secondsPerPixel = maxDuration / totalWidthPx;
      const deltaSec = deltaX * secondsPerPixel;

      const newOffset = Math.round((dragStartInfoRef.current.initialOffset + deltaSec) * 100) / 100;
      // Clamp between -15s and +15s
      const clampedOffset = Math.max(-15, Math.min(15, newOffset));

      onUpdateSubtitle?.(draggingSubId, { audioOffset: clampedOffset });
    };

    const handleMouseUp = () => {
      setDraggingSubId(null);
      dragStartInfoRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingSubId, maxDuration, onUpdateSubtitle]);

  // Start dragging a voice clip
  const handleStartDragVoice = (e: React.MouseEvent, sub: SubtitleItem) => {
    e.stopPropagation();
    setDraggingSubId(sub.id);
    setSelectedSubId(sub.id);
    dragStartInfoRef.current = {
      clientX: e.clientX,
      initialOffset: sub.audioOffset || 0,
    };
  };

  // Nudge audio offset by fixed step (e.g. +0.1s or -0.1s)
  const handleNudgeOffset = (subId: number, delta: number) => {
    const sub = subtitles.find((s) => s.id === subId);
    if (!sub || !onUpdateSubtitle) return;
    const current = sub.audioOffset || 0;
    const next = Math.round((current + delta) * 100) / 100;
    const clamped = Math.max(-15, Math.min(15, next));
    onUpdateSubtitle(subId, { audioOffset: clamped });
  };

  // Reset offset for a specific line
  const handleResetLineOffset = (subId: number) => {
    onUpdateSubtitle?.(subId, { audioOffset: 0 });
  };

  // One-Click Intelligent Audio Timeline Auto-Fix:
  // Analyzes physical audio durations, dead digital margins (silence), and active speech intervals.
  // Performs weighted interval scheduling to eliminate active speech overlaps, minimizes start-time delay,
  // trims dead silence, applies pitch-preserved WSOLA time-stretch (0.85x to 1.35x), and verifies the final result.
  const handleAutoFixAll = async () => {
    if (!onUpdateAllSubtitles || subtitles.length === 0 || isAutoFixing) return;

    setIsAutoFixing(true);
    setAutoFixProgress({ pct: 0, msg: 'آغاز تحلیل جامع و هوشمند تایم‌لاین صوتی...' });
    setSyncSuccessMsg(null);
    const abortController = new AbortController();
    autoFixAbortControllerRef.current = abortController;

    try {
      const ctx = getAudioContext();
      const result = await autoFixEntireTimeline(
        subtitles,
        {
          zeroSilenceEnabled: autoFixZeroSilence,
          placement: {
            ...DEFAULT_TIMELINE_PLACEMENT_CONFIG,
            enabled: autoFixPlacementEnabled,
            maxEarlyShiftSeconds: maxEarlyShift,
            maxLateShiftSeconds: maxLateShift,
          },
          maxEarlyShiftSeconds: maxEarlyShift,
          maxLateShiftSeconds: maxLateShift,
        },
        ctx,
        (pct: number, msg: string) => {
          setAutoFixProgress({ pct, msg });
        },
        abortController.signal
      );

      setAutoFixResult(result);
      if (result.updatedSubtitles && result.updatedSubtitles.length > 0) {
        onUpdateAllSubtitles(result.updatedSubtitles);
      }
      setIsAutoFixModalOpen(true);
      if (result.success) {
        setSyncSuccessMsg(result.messageFa);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('[AutoFix] Operation cancelled by user.');
        setSyncProgressMsg('عملیات اصلاح هوشمند توسط کاربر متوقف شد.');
      } else {
        console.error('[handleAutoFixAll Error]:', err);
        alert('خطا در اصلاح هوشمند تایم‌لاین: ' + (err.message || 'مشکلی رخ داد'));
      }
    } finally {
      setIsAutoFixing(false);
      autoFixAbortControllerRef.current = null;
    }
  };

  const handleCancelAutoFix = () => {
    if (autoFixAbortControllerRef.current) {
      autoFixAbortControllerRef.current.abort();
    }
    setIsAutoFixing(false);
  };

  const handleUndoAutoFix = () => {
    if (autoFixResult?.originalSubtitlesSnapshot && onUpdateAllSubtitles) {
      onUpdateAllSubtitles(autoFixResult.originalSubtitlesSnapshot);
      setAutoFixResult(null);
      setSyncSuccessMsg('تمام اصلاحات هوشمند به حالت اولیه بازگردانده شدند.');
    }
  };

  // AI Cloud Timeline Synchronization using Claude Sonnet 5 (batch)
  const handleAiTimelineSync = async () => {
    if (!onUpdateAllSubtitles || subtitles.length === 0 || isAiSyncing) return;

    setIsAiSyncing(true);
    setAiSyncProgressMsg('در حال ارسال ساختار زمانی دیالوگ‌ها به GPT-6 Luna...');
    setSyncSuccessMsg(null);

    try {
      const activeModel = localStorage.getItem('persian_dub_translation_model') || 'openai/gpt-6-luna';
      const storedKey = localStorage.getItem('persian_dub_api_key') || localStorage.getItem('persian_dub_gemini_key') || '';
      const storedBaseUrl = localStorage.getItem('persian_dub_base_url') || 'https://api.hormouz.net/v1';

      // 1. Send timeline to server endpoint
      const response = await fetch('/api/ai-sync-timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': storedKey,
          'x-translation-model': activeModel,
        },
        body: JSON.stringify({
          apiKey: storedKey,
          baseUrl: storedBaseUrl,
          model: activeModel,
          maxAllowedSpeed: 1.25,
          minPauseSec: 0.12,
          subtitles: subtitles.map((s) => ({
            id: s.id,
            start: s.start,
            end: s.end,
            originalText: s.originalText || '',
            farsiText: s.farsiText || '',
            audioDuration: s.audioDuration,
            audioOffset: s.audioOffset || 0,
            leadingSilenceSec: s.leadingSilenceSec,
            trailingSilenceSec: s.trailingSilenceSec,
            effectiveDuration: s.effectiveDuration,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'خطا در هماهنگ‌سازی با سرور هوش مصنوعی');
      }

      setAiSyncProgressMsg('پاسخ دریافت شد؛ در حال اعمال کشش صوتی WSOLA و بازنویسی زیرنویس‌ها...');

      // 2. Capture clean Undo history snapshot
      const undoSnapshot: BulkSpeedHistorySnapshot = {
        timestamp: Date.now(),
        descriptionFa: `سینک هوشمند تایم‌لاین با مدل ${data.modelUsed || activeModel}`,
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
      setBulkSpeedHistorySnapshot(undoSnapshot);

      // 3. Apply adjustments to subtitles and audio tracks
      const ctx = getAudioContext();
      const adjMap = new Map<number, any>((data.adjustments || []).map((a: any) => [a.id, a]));

      const updatedSubtitles = await Promise.all(
        subtitles.map(async (sub) => {
          const adj = adjMap.get(sub.id);
          if (!adj) return sub;

          const nextSub: SubtitleItem = { ...sub };

          // A. Update text if shortened/adapted by AI
          if (adj.isTextModified && adj.suggestedFarsiText && adj.suggestedFarsiText.trim()) {
            nextSub.farsiText = adj.suggestedFarsiText.trim();
          }

          // B. Update micro-shift offset
          if (typeof adj.recommendedOffsetSec === 'number') {
            nextSub.audioOffset = Number(adj.recommendedOffsetSec.toFixed(3));
          }

          // C. Pitch-preserved WSOLA stretch if speed recommended > 1.01
          const speed = typeof adj.recommendedSpeed === 'number' ? adj.recommendedSpeed : 1.0;
          if (speed > 1.01 && (sub.audioBase64 || sub.originalAudioBase64) && ctx) {
            try {
              const pristineAudio = sub.originalAudioBase64 || sub.audioBase64;
              const buffer = await decodeBase64ToAudioBuffer(pristineAudio!);
              const stretchedBuffer = await timeStretchAudioBufferWSOLA(buffer, speed, ctx);
              const wavBlob = audioBufferToWav(stretchedBuffer);
              const stretchedBase64 = await blobToBase64(wavBlob);

              nextSub.originalAudioBase64 = sub.originalAudioBase64 || sub.audioBase64;
              nextSub.processedAudioBase64 = stretchedBase64;
              nextSub.audioBase64 = stretchedBase64;
              nextSub.appliedSpeed = speed;
              nextSub.timeStretchRatio = speed;
              nextSub.audioDuration = Number((buffer.duration / speed).toFixed(3));
              nextSub.effectiveDuration = nextSub.audioDuration;
            } catch (stretchErr) {
              console.warn(`[WSOLA Stretch Warning sub #${sub.id}]:`, stretchErr);
            }
          }

          return nextSub;
        })
      );

      onUpdateAllSubtitles(updatedSubtitles);
      setAiSyncResult(data);
      setIsAiSyncModalOpen(true);
      setSyncSuccessMsg(data.summary?.messageFa || `سینک هوشمند توسط ${data.modelUsed} بدون تداخل اعمال شد.`);
    } catch (err: any) {
      console.error('[handleAiTimelineSync Error]:', err);
      alert('خطا در سینک ابری تایم‌لاین: ' + (err.message || 'مشکلی رخ داد'));
    } finally {
      setIsAiSyncing(false);
      setAiSyncProgressMsg('');
    }
  };

  // Re-synthesize audio for lines modified / shortened by AI during sync
  const handleRegenerateModifiedAudios = async (modifiedIds: number[]) => {
    if (!onUpdateAllSubtitles || modifiedIds.length === 0 || isRegeneratingAudio) return;

    setIsRegeneratingAudio(true);
    setRegenerateProgressMsg('در حال آماده‌سازی تولید مجدد صدای دیالوگ‌های بازنویسی‌شده...');

    try {
      const storedKey = localStorage.getItem('persian_dub_api_key') || localStorage.getItem('persian_dub_gemini_key') || '';
      const storedBaseUrl = localStorage.getItem('persian_dub_base_url') || 'https://api.hormouz.net/v1';
      const storedTtsModel = localStorage.getItem('persian_dub_tts_model') || 'google/gemini-3.8-flash-lite-tts';
      const ctx = getAudioContext();

      const idSet = new Set(modifiedIds);
      const updatedList = [...subtitles];
      let successCount = 0;

      for (let idx = 0; idx < updatedList.length; idx++) {
        const sub = updatedList[idx];
        if (!idSet.has(sub.id)) continue;

        setRegenerateProgressMsg(`در حال تولید مجدد صدای دیالوگ #${sub.id} (${successCount + 1}/${modifiedIds.length})...`);

        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(storedKey ? { 'x-api-key': storedKey, 'x-gemini-api-key': storedKey } : {}),
              ...(storedBaseUrl ? { 'x-base-url': storedBaseUrl } : {}),
              ...(storedTtsModel ? { 'x-tts-model': storedTtsModel } : {}),
            },
            body: JSON.stringify({
              text: (sub.farsiText || '').trim(),
              voice: sub.voice || 'Iapetus',
              apiKey: storedKey,
              baseUrl: storedBaseUrl,
              ttsModel: storedTtsModel,
            }),
          });

          const data = await res.json();
          if (res.ok && data.success && data.audioBase64) {
            let finalAudio = data.audioBase64;
            let duration = 0;

            if (ctx) {
              try {
                const rawBuf = await decodeBase64ToAudioBuffer(data.audioBase64);
                const trimRes = trimZeroSilenceAudioBuffer(rawBuf, ctx, { paddingMs: 25 });
                if (trimRes.isTrimmed) {
                  const wavBlob = audioBufferToWav(trimRes.trimmedBuffer);
                  finalAudio = await blobToBase64(wavBlob);
                  duration = trimRes.effectiveDuration;
                } else {
                  duration = rawBuf.duration;
                }
              } catch (_) {}
            }

            updatedList[idx] = {
              ...sub,
              originalAudioBase64: finalAudio,
              processedAudioBase64: finalAudio,
              audioBase64: finalAudio,
              audioDuration: Number(duration.toFixed(3)),
              effectiveDuration: Number(duration.toFixed(3)),
              appliedSpeed: 1.0,
              timeStretchRatio: 1.0,
              status: 'ready',
            };
            successCount++;
          }
        } catch (lineErr) {
          console.warn(`[Regenerate Audio Line #${sub.id} Error]:`, lineErr);
        }
      }

      onUpdateAllSubtitles(updatedList);
      setSyncSuccessMsg(`تعداد ${successCount} فایل صوتی جدید برای دیالوگ‌های بازنویسی‌شده با موفقیت تولید و جایگزین شد.`);
    } catch (err: any) {
      console.error('[handleRegenerateModifiedAudios Error]:', err);
      alert('خطا در تولید مجدد صداها: ' + (err.message || 'مشکلی رخ داد'));
    } finally {
      setIsRegeneratingAudio(false);
      setRegenerateProgressMsg('');
    }
  };

  // Magnetic Gap Compaction: Compact empty silences to free space downstream
  const handleCompactTimelineGaps = () => {
    if (!onUpdateAllSubtitles || subtitles.length === 0) return;
    const res = compactEmptyGapsAndOpenSpace(subtitles, 0.12, 2.0);
    if (res.compactedCount > 0) {
      onUpdateAllSubtitles(res.updatedSubtitles);
      setSyncSuccessMsg(res.messageFa);
    } else {
      setSyncSuccessMsg(res.messageFa);
    }
  };

  // Intelligent Audio Synchronization Resolver: Uses Pitch-Preserving Time-Stretch
  // Resolves ALL dialogue overlaps intelligently with a single click without moving dialogue start timestamps!
  const handleIntelligentOverlapSync = async () => {
    if (!onUpdateAllSubtitles || subtitles.length === 0 || isSyncingOverlaps) return;

    setIsSyncingOverlaps(true);
    setSyncProgressMsg('در حال تحلیل و برطرف‌سازی هوشمند تداخل‌ها...');
    setSyncSuccessMsg(null);

    try {
      const ctx = getAudioContext();
      const result = await autoResolveAllOverlaps(
        subtitles,
        ctx,
        (current, total, msg) => {
          setSyncProgressMsg(`[${current}/${total}] ${msg}`);
        }
      );

      if (result.resolvedCount > 0) {
        setBulkSpeedHistorySnapshot(result.historySnapshot);
        onUpdateAllSubtitles(result.updatedSubtitles);
        setSyncSuccessMsg(result.messageFa);
      } else {
        setSyncSuccessMsg('تمام دیالوگ‌ها در بازه زمانی تعیین‌شده قرار دارند و هیچ تداخلی وجود ندارد.');
      }
    } catch (err: any) {
      console.error('[handleIntelligentOverlapSync Error]:', err);
      alert('خطا در برطرف‌سازی هوشمند تداخل‌ها: ' + (err.message || 'مشکلی رخ داد'));
    } finally {
      setIsSyncingOverlaps(false);
      setSyncProgressMsg('');
    }
  };

  // Reset all offsets back to 0.00s (strictly anchored to subtitle start)
  const handleResetAllOffsets = () => {
    if (!onUpdateAllSubtitles) return;
    const reset = subtitles.map((s) => ({ ...s, audioOffset: 0 }));
    onUpdateAllSubtitles(reset);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (!renderedMixBuffer && isRenderingMix) {
        setRenderProgressMsg('صوت در حال همگام‌سازی نهایی است؛ بلافاصله پس از تکمیل پخش خواهد شد...');
        return;
      }
      startPlayback(currentTime);
    }
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(maxDuration, newTime));
    setCurrentTime(clamped);
    if (isPlaying) {
      startPlayback(clamped);
    }
  };

  const handleReset = () => {
    stopPlayback();
    setCurrentTime(0);
  };

  const handleSkip = (seconds: number) => {
    handleSeek(currentTime + seconds);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(
        nextMuted ? 0 : 1.0,
        audioCtxRef.current.currentTime
      );
    }
  };

  // Direct download of the current rendered mix right from Stage 4
  const handleDownloadCurrentMix = () => {
    if (!renderedWavBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(renderedWavBlob);
    a.download = `${effectiveBaseName}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Find currently active subtitle line for cinema preview
  const currentActiveSub = useMemo(() => {
    if (!subtitles || subtitles.length === 0) return null;
    for (let i = 0; i < subtitles.length; i++) {
      const s = subtitles[i];
      const nextS = subtitles[i + 1];
      const lineEnd = nextS ? Math.min(s.end + 0.3, nextS.start - 0.02) : s.end + 0.5;
      if (currentTime >= s.start && currentTime <= lineEnd) {
        return s;
      }
    }
    return null;
  }, [subtitles, currentTime]);

  const selectedSub = useMemo(() => {
    return subtitles.find((s) => s.id === selectedSubId) || null;
  }, [subtitles, selectedSubId]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      {/* Step Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#099767]/20 text-[#34d399] flex items-center justify-center text-sm font-bold border border-[#099767]/30">
              ۴
            </span>
            <h2 className="text-xl font-bold text-white">
              استودیو میکس، خط زمان (Timeline) و تنظیم دستی/خودکار سینک
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            متن و زمان‌بندی زیرنویس به صورت <strong className="text-slate-200">ثابت و قفل‌شده</strong> روی تایم‌لاین قرار دارند؛ شما می‌توانید صوت استخراج شده هر قسمت را به راحتی با کشیدن (Drag) یا کلیدهای جابجایی <strong className="text-[#34d399]">عقب و جلو</strong> کنید و در صورت تداخل یا افتادن صداها روی یکدیگر، سیستم هشدار داده و با یک کلیک آن را برطرف می‌کند.
          </p>
        </div>

        {/* Mix Output Status Badge & Quick Download */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Primary GPT-6 Luna AI Sync Button */}
          <button
            type="button"
            onClick={handleAiTimelineSync}
            disabled={isAiSyncing || isAutoFixing || isRegeneratingAudio}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-[#10b981] to-[#099767] hover:from-emerald-400 hover:to-[#10b981] disabled:opacity-50 text-slate-950 text-xs font-black transition shadow-md shadow-emerald-950/40 cursor-pointer"
            title="تحلیل جامع کل تایم‌لاین توسط GPT-6 Luna، حل ۱۰۰٪ تداخل‌ها، چسباندن فاصله‌ها و بازنویسی دیالوگ‌ها"
          >
            {isAiSyncing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>{aiSyncProgressMsg || 'در حال سینک با GPT-6 Luna...'}</span>
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5 text-slate-950" />
                <span>سینک هوشمند خط زمان (GPT-6 Luna)</span>
              </>
            )}
          </button>

          {aiSyncResult && (
            <button
              type="button"
              onClick={() => setIsAiSyncModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition shadow-sm cursor-pointer"
              title="مشاهده گزارش سینک هوشمند ابری GPT-6 Luna"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>گزارش GPT-6 Luna</span>
            </button>
          )}

          {/* Magnetic Gap Compaction Button */}
          <button
            type="button"
            onClick={handleCompactTimelineGaps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition shadow-sm cursor-pointer"
            title="چسباندن فواصل خالی زائد و کشیدن صداها به جلو برای باز شدن فضای دیالوگ‌های پر ترافیک"
          >
            <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>چسباندن فواصل خالی</span>
          </button>

          {/* Primary Auto Fix All Audio Button */}
          <button
            type="button"
            onClick={handleAutoFixAll}
            disabled={isAutoFixing || isAiSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-[#10b981] to-[#099767] hover:from-emerald-300 hover:to-[#10b981] disabled:opacity-50 text-slate-950 text-xs font-black transition shadow-md shadow-emerald-950/40 cursor-pointer"
            title="بررسی جامع خط زمان، حذف سکوت‌ها، فشرده‌سازی کنترل‌شده WSOLA و برطرف‌سازی هوشمند تداخل‌ها با ۱ کلیک"
          >
            {isAutoFixing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>در حال اصلاح هوشمند...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>بررسی و اصلاح هوشمند همه صداها</span>
              </>
            )}
          </button>

          {autoFixResult && (
            <button
              type="button"
              onClick={() => setIsAutoFixModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition shadow-sm cursor-pointer"
              title="مشاهده آمار، معیارهای ۸ گانه و جزئیات آخرین اصلاح هوشمند"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>گزارش اصلاحات</span>
            </button>
          )}

          {autoFixResult?.originalSubtitlesSnapshot && (
            <button
              type="button"
              onClick={handleUndoAutoFix}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition shadow-sm cursor-pointer"
              title="بازگرداندن تمام دیالوگ‌ها و صداها به وضعیت پیش از اصلاح هوشمند"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo اصلاح هوشمند</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPlacementConfigOpen(!isPlacementConfigOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isPlacementConfigOpen
                ? 'bg-slate-750 border-cyan-400 text-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="تنظیمات پیشرفته جای‌گذاری منعطف و حذف سکوت"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>تنظیمات اصلاح</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkSpeedModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-[#099767]/20 hover:from-emerald-500/30 hover:to-[#099767]/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition shadow-sm cursor-pointer"
            title="تنظیم سرعت دسته‌جمعی دیالوگ‌ها (Bulk Speed Control)"
          >
            <Sliders className="w-3.5 h-3.5 text-[#34d399]" />
            <span>تنظیم سرعت دسته‌جمعی</span>
          </button>

          {isRenderingMix ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#099767]/10 border border-[#099767]/30 text-[#34d399] text-xs font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{renderProgressMsg || 'در حال رندر فایل خروجی همگام...'}</span>
            </div>
          ) : renderedMixBuffer ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>فایل خروجی میکس آماده است</span>
            </div>
          ) : null}

          {renderedWavBlob && (
            <button
              type="button"
              onClick={handleDownloadCurrentMix}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[#34d399] hover:text-emerald-200 text-xs font-semibold transition shadow-sm font-mono"
              title={`دانلود فایل صوتی میکس نهایی: ${effectiveBaseName}.wav`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود خروجی ({effectiveBaseName}.wav)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onUpdateAllSubtitles) {
                // Trigger a re-render
                onUpdateAllSubtitles([...subtitles]);
              }
            }}
            disabled={isRenderingMix}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#099767]/10 hover:bg-[#099767]/20 border border-[#099767]/30 text-[#34d399] text-xs font-semibold transition disabled:opacity-50"
            title="میکس مجدد صداها با آخرین آفست‌ها"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRenderingMix ? 'animate-spin' : ''}`} />
            <span>میکس مجدد</span>
          </button>
        </div>
      </div>

      {/* Advanced Auto-Fix & Flexible Placement Settings Panel */}
      {isPlacementConfigOpen && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-400" />
              تنظیمات پیشرفته جای‌گذاری منعطف و حذف سکوت (Auto-Fix Settings)
            </span>
            <span className="text-[11px] text-slate-400">
              اعمال روی پردازش با کلید «بررسی و اصلاح هوشمند همه صداها»
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Toggle Zero Silence */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <label className="font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFixZeroSilence}
                    onChange={(e) => setAutoFixZeroSilence(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>حذف سکوت زائد (Zero Silence)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  پیرایش خودکار سکوت مرده در آغاز و پایان با حفظ پدینگ امن ۲۵ میلی‌ثانیه.
                </p>
              </div>
            </div>

            {/* Toggle Flexible Placement */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <label className="font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFixPlacementEnabled}
                    onChange={(e) => setAutoFixPlacementEnabled(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>جای‌گذاری منعطف (Flexible Placement)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  اجازه شیفت زمانی جزیی به جلو یا عقب در صورت وجود فضای امن برای رفع تداخل بدون افزایش سرعت.
                </p>
              </div>
            </div>

            {/* Max Early Shift Slider */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between font-bold text-slate-200 mb-1">
                <span>حداکثر شیفت به جلو:</span>
                <span className="font-mono text-cyan-400">{maxEarlyShift.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.0"
                step="0.1"
                value={maxEarlyShift}
                disabled={!autoFixPlacementEnabled}
                onChange={(e) => setMaxEarlyShift(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 disabled:opacity-40 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>0.0s</span>
                <span>1.5s</span>
                <span>3.0s</span>
              </div>
            </div>

            {/* Max Late Shift Slider */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between font-bold text-slate-200 mb-1">
                <span>حداکثر شیفت به عقب:</span>
                <span className="font-mono text-indigo-400">{maxLateShift.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.0"
                step="0.1"
                value={maxLateShift}
                disabled={!autoFixPlacementEnabled}
                onChange={(e) => setMaxLateShift(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 disabled:opacity-40 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>0.0s</span>
                <span>1.5s</span>
                <span>3.0s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active One-Click Auto Fix Progress Bar */}
      {isAutoFixing && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">
                در حال بررسی و اصلاح هوشمند تایم‌لاین صوتی...
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {Math.round(autoFixProgress.pct)}%
              </span>
              <button
                type="button"
                onClick={handleCancelAutoFix}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs transition cursor-pointer"
              >
                لغو عملیات
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-[#34d399] h-2 rounded-full transition-all duration-200"
              style={{ width: `${Math.max(5, Math.min(100, autoFixProgress.pct))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
            {autoFixProgress.msg}
          </p>
        </div>
      )}

      {/* Overlap & Collision Alert Banner: Detailed Summary of all detected overlaps */}
      {overlapSummary.totalOverlaps > 0 ? (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/50 text-amber-200 text-xs shadow-lg animate-in fade-in duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-300 text-sm flex flex-wrap items-center gap-2">
                  <span>خلاصه وضعیت تداخل‌های زمانی:</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-mono border border-amber-500/30">
                    {overlapSummary.totalOverlaps} مورد تداخل ({overlapSummary.totalOverlapDurationSec} ثانیه کل تداخل)
                  </span>
                  {overlapSummary.severeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[11px] font-mono border border-rose-500/40 font-bold">
                      {overlapSummary.severeCount} مورد شدید
                    </span>
                  )}
                  {overlapSummary.intentionalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-mono border border-purple-500/40">
                      {overlapSummary.intentionalCount} هم‌پوشانی تعمدی (حفظ شده)
                    </span>
                  )}
                </div>
                <div className="text-amber-300/80 mt-1.5 leading-relaxed">
                  تعداد <strong>{overlapSummary.affectedSegmentCount}</strong> دیالوگ دارای هم‌پوشانی زمانی هستند. به جای جابجا کردن زمان دیالوگ‌ها (که سینک تصویر را به هم می‌زند)، می‌توانید با کلید تنظیم سرعت دسته‌جمعی یا فشرده‌سازی هوشمند WSOLA تداخل‌ها را بدون تغییر لحن صدا برطرف کنید.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Primary Claude Sonnet 5 AI Sync Button */}
              <button
                type="button"
                onClick={handleAiTimelineSync}
                disabled={isAiSyncing || isAutoFixing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold transition text-xs shadow-lg shadow-purple-950/50 cursor-pointer animate-pulse hover:animate-none"
                title="ارسال کل تایم‌لاین به مدل GPT-6 Luna برای حل قطعی تداخل‌ها، بازنویسی جملات طولانی و تضمین عدم همپوشانی"
              >
                {isAiSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{aiSyncProgressMsg || 'در حال سینک با GPT-6 Luna...'}</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-slate-950" />
                    <span>سینک هوشمند با GPT-6 Luna</span>
                  </>
                )}
              </button>

              {aiSyncResult && (
                <button
                  type="button"
                  onClick={() => setIsAiSyncModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold transition text-xs shadow-sm cursor-pointer"
                  title="مشاهده گزارش سینک هوشمند ابری GPT-6 Luna"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>گزارش GPT-6 Luna</span>
                </button>
              )}

              {/* Magnetic Gap Compaction Button */}
              <button
                type="button"
                onClick={handleCompactTimelineGaps}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-semibold transition text-xs shadow-sm cursor-pointer"
                title="چسباندن فواصل خالی زائد و کشیدن صداها به جلو برای باز شدن فضای دیالوگ‌های پر ترافیک"
              >
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>چسباندن فواصل خالی</span>
              </button>

              {/* Primary 1-Click Intelligent Timeline Auto Fixer */}
              <button
                type="button"
                onClick={handleAutoFixAll}
                disabled={isAutoFixing || isAiSyncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-[#10b981] to-[#099767] hover:from-emerald-300 hover:to-[#10b981] disabled:opacity-50 text-slate-950 font-extrabold transition text-xs shadow-lg shadow-emerald-950/50 cursor-pointer"
                title="بررسی کامل تایم‌لاین، برش سکوت‌های زائد، تنظیم هوشمند و رفع تمام تداخل‌ها با ۱ کلیک"
              >
                {isAutoFixing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{autoFixProgress.msg || 'در حال اصلاح هوشمند...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>اصلاح هوشمند همه صداها (Auto Fix All)</span>
                  </>
                )}
              </button>

              {autoFixResult && (
                <button
                  type="button"
                  onClick={() => setIsAutoFixModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold transition text-xs shadow-sm cursor-pointer"
                  title="مشاهده آمار و گزارش آخرین اصلاح هوشمند"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>مشاهده گزارش</span>
                </button>
              )}

              {autoFixResult?.originalSubtitlesSnapshot && (
                <button
                  type="button"
                  onClick={handleUndoAutoFix}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs border border-slate-700 cursor-pointer"
                  title="بازگردانی حالت قبل از اصلاح هوشمند"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo اصلاح</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsBulkSpeedModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition text-xs shadow-sm cursor-pointer"
                title="تنظیم دستی و جزئی‌تر سرعت در پنل دسته‌جمعی"
              >
                <Sliders className="w-3.5 h-3.5 text-[#34d399]" />
                <span>تنظیم پیشرفته دسته‌جمعی</span>
              </button>

              {bulkSpeedHistorySnapshot && !autoFixResult?.originalSubtitlesSnapshot && (
                <button
                  type="button"
                  onClick={() => {
                    const restored = undoBulkSpeedChanges(subtitles, bulkSpeedHistorySnapshot);
                    onUpdateAllSubtitles?.(restored);
                    setBulkSpeedHistorySnapshot(null);
                    setSyncSuccessMsg('تغییرات به حالت قبلی بازگردانده شد.');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs border border-slate-700"
                  title="بازگردانی حالت قبل از برطرف‌سازی تداخل‌ها"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetAllOffsets}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs border border-slate-700"
                title="بازنشانی تمام صداها به زمان دقیق شروع زیرنویس ویدیوی اصلی"
              >
                ریست آفست‌ها (Zero Drift)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMsg || 'تمام جملات با تصویر و صدای ویدیوی اصلی ۱۰۰٪ همگام و منطبق هستند.'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFixAll}
              disabled={isAutoFixing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition cursor-pointer"
              title="اجرای تحلیل عمیق و بهینه‌سازی فاصله‌ها، سکوت‌ها و سینک صداها"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>اجرای بهینه‌سازی هوشمند خط زمان</span>
            </button>
            {autoFixResult && (
              <button
                type="button"
                onClick={() => setIsAutoFixModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs transition border border-slate-700 cursor-pointer"
              >
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>گزارش اصلاحات</span>
              </button>
            )}
            <div className="text-[11px] text-emerald-400/80 font-mono">
              {subtitles.length} دیالوگ منطبق با تصویر
            </div>
          </div>
        </div>
      )}

      {/* Mix Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-slate-950/70 border border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-2">
          <Sliders className="w-4 h-4 text-[#34d399]" />
          <span>حالت میکس صدای فیلم و دوبله:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onChangeMixMode('ducking')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              mixMode === 'ducking'
                ? 'bg-[#099767] text-white shadow-md shadow-[#099767]/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>داکینگ هوشمند (کاهش صدای فیلم حین دیالوگ)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMixMode('isolated')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              mixMode === 'isolated'
                ? 'bg-[#099767] text-white shadow-md shadow-[#099767]/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>فقط دوبله فارسی (خالص بدون فیلم)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMixMode('full_mix')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              mixMode === 'full_mix'
                ? 'bg-[#099767] text-white shadow-md shadow-[#099767]/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>میکس همسطح (بدون داکینگ)</span>
          </button>
        </div>
      </div>

      {/* Cinema Screen Subtitle Overlay Box */}
      <div className="mb-6 relative rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[135px] text-center overflow-hidden shadow-inner">
        <div className="absolute top-3 right-4 flex items-center gap-2 text-[11px] text-slate-500">
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span>نمایش زنده دیالوگ همگام با صوت خروجی</span>
        </div>

        {currentActiveSub ? (
          <div className="animate-in fade-in zoom-in-95 duration-150 max-w-2xl">
            <div className="text-xl sm:text-2xl font-bold text-[#34d399] drop-shadow-md leading-relaxed">
              {currentActiveSub.farsiText || currentActiveSub.originalText}
            </div>
            <div dir="ltr" className="text-xs text-slate-400 font-sans mt-2 opacity-80">
              {currentActiveSub.originalText}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-emerald-400/90">
              <span>گوینده: {currentActiveSub.voice}</span>
              {currentActiveSub.audioOffset !== undefined && currentActiveSub.audioOffset !== 0 && (
                <span className="font-mono text-cyan-300">
                  &bull; آفست: {currentActiveSub.audioOffset > 0 ? `+${currentActiveSub.audioOffset}` : currentActiveSub.audioOffset}s
                </span>
              )}
              {currentActiveSub.audioBase64 && (
                <span className="text-emerald-400 font-mono">&bull; صوت استودیویی آماده</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-xs flex flex-col items-center gap-1">
            <span>در این ثانیه دیالوگی وجود ندارد (سکوت یا موسیقی فیلم)</span>
            <span className="text-[11px] text-slate-600">
              برای پخش یا پرش به خطوط دیالوگ از خط زمان زیر استفاده کنید
            </span>
          </div>
        )}
      </div>

      {/* STUDIO DUAL-TRACK TIMELINE */}
      <div className="mb-6 p-4 sm:p-5 bg-slate-950 rounded-3xl border border-slate-800 select-none shadow-xl">
        {/* Timeline Controls & Zoom Bar */}
        <div className="flex items-center justify-between gap-4 mb-3 pb-3 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <MoveHorizontal className="w-4 h-4 text-[#34d399]" />
              <span>خط زمان (Timeline):</span>
            </span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              روی ترک صوت دوبله کلیک کنید یا آن را به چپ/راست بکشید تا سینک شود
            </span>
          </div>

          {/* Zoom Level Selector: Enhanced up to 20x */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>بزرگ‌نمایی:</span>
            </span>

            {/* Quick Presets up to 20x */}
            <div className="flex items-center gap-1">
              {[1, 2, 5, 10, 15, 20].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setZoomLevel(lvl)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                    zoomLevel === lvl
                      ? 'bg-[#099767] text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {lvl}x
                </button>
              ))}
            </div>

            {/* Slider & Step Buttons for Fine Tuning up to 20x */}
            <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2 mr-1">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(1, Number((prev - (prev > 5 ? 2 : 1)).toFixed(1))))}
                className="p-1 hover:text-white text-slate-400 rounded transition cursor-pointer"
                title="کاهش بزرگ‌نمایی"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                title={`بزرگ‌نمایی فعلی: ${zoomLevel}x`}
              />

              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(20, Number((prev + (prev >= 5 ? 2 : 1)).toFixed(1))))}
                className="p-1 hover:text-white text-slate-400 rounded transition cursor-pointer"
                title="افزایش بزرگ‌نمایی تا ۲۰ برابر"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-mono font-bold text-emerald-400 min-w-8 text-center">
                {zoomLevel}x
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Container when Zoom > 1 (supports up to 20x width) */}
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          <div
            style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
            className="transition-all duration-150 relative"
          >
            {/* Dynamic Precision Time Ruler */}
            <div className="relative h-6 text-[10px] font-mono text-slate-500 mb-2 px-1 select-none border-b border-slate-800/80">
              {Array.from({
                length: Math.min(120, Math.max(5, Math.round(5 * zoomLevel))),
              }).map((_, idx, arr) => {
                const fraction = idx / (arr.length - 1);
                const tickSec = fraction * maxDuration;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 flex flex-col items-center -translate-x-1/2 pointer-events-none"
                    style={{ left: `${fraction * 100}%` }}
                  >
                    <span className="text-[9px] text-slate-400/90 leading-none">
                      {formatPlayerTime(tickSec)}
                    </span>
                    <div className="w-[1px] h-2 bg-slate-700/80 mt-1" />
                  </div>
                );
              })}
            </div>

            {/* Interactive Timeline Canvas */}
            <div
              ref={timelineCanvasRef}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = clickX / rect.width;
                handleSeek(ratio * maxDuration);
              }}
              className="relative bg-slate-900/90 rounded-2xl border border-slate-800 p-3 overflow-hidden cursor-pointer"
            >
              {/* Subtle Grid Markings */}
              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-15">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="border-r border-slate-600 w-full h-full" />
                ))}
              </div>

              {/* TRACK 1: FIXED REFERENCE SUBTITLE TRACK (Reference subtitle cues with fixed timing) */}
              <div className="relative h-14 mb-3 rounded-xl bg-slate-950/80 border border-slate-800/80 p-1 flex items-center">
                {/* Track label */}
                <div className="absolute right-2 top-1 text-[9px] font-bold text-slate-500 tracking-wider flex items-center gap-1 z-0 pointer-events-none">
                  <Lock className="w-2.5 h-2.5 text-[#34d399]/70" />
                  <span>ترک ۱: زیرنویس مرجع فیلم (زمان ثابت)</span>
                </div>

                {subtitles.map((sub, idx) => {
                  const leftPct = (sub.start / maxDuration) * 100;
                  const widthPct = Math.max(1.8, ((sub.end - sub.start) / maxDuration) * 100);
                  const isCurrentActive = currentTime >= sub.start && currentTime <= sub.end;
                  const isSelected = selectedSubId === sub.id;

                  return (
                    <div
                      key={`sub_fixed_${sub.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubId(sub.id);
                        handleSeek(sub.start);
                      }}
                      title={`زیرنویس خط #${idx + 1} (${sub.startTimeStr} تا ${sub.endTimeStr})`}
                      className={`absolute top-1 bottom-1 rounded-lg px-2 flex flex-col justify-center border transition-all text-[10px] overflow-hidden ${
                        isSelected
                          ? 'border-[#099767] bg-[#099767]/20 text-emerald-200 z-10 shadow-md ring-1 ring-[#099767]/50'
                          : isCurrentActive
                          ? 'border-[#099767]/80 bg-[#099767]/10 text-[#34d399] z-10'
                          : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:border-slate-600'
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono leading-none opacity-80">
                        <span>#{idx + 1}</span>
                        <span>{(sub.end - sub.start).toFixed(1)}s</span>
                      </div>
                      <div className="truncate font-sans font-medium text-[10px] mt-0.5">
                        {sub.farsiText || sub.originalText}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TRACK 2: INTERACTIVE DUBBED VOICE AUDIO TRACK (Persian dubbed audio segments with offset control) */}
              <div className="relative h-18 rounded-xl bg-slate-950/80 border border-slate-800/80 p-1 flex items-center">
                {/* Track label */}
                <div className="absolute right-2 top-1 text-[9px] font-bold text-slate-500 tracking-wider flex items-center gap-1 z-0 pointer-events-none">
                  <Mic2 className="w-2.5 h-2.5 text-emerald-400/80" />
                  <span>ترک ۲: صوت دوبله فارسی (با کشیدن به چپ/راست سینک کنید)</span>
                </div>

                {subtitles.map((sub, idx) => {
                  const offset = sub.audioOffset || 0;
                  const effectiveStart = Math.max(0, sub.start + offset);
                  const effectiveDuration = sub.audioDuration || Math.max(0.6, sub.end - sub.start);
                  const leftPct = (effectiveStart / maxDuration) * 100;
                  const widthPct = Math.max(1.8, (effectiveDuration / maxDuration) * 100);

                  const isCurrentPlaying = currentTime >= effectiveStart && currentTime <= effectiveStart + effectiveDuration;
                  const isSelected = selectedSubId === sub.id;
                  const isDragging = draggingSubId === sub.id;
                  const hasAudio = Boolean(sub.audioBase64 || sub.originalAudioBase64);

                  // Extract precise overlap metadata for this segment
                  const subOverlaps = overlapSummary.segmentOverlapMap[sub.id] || [];
                  const maxSeverity = subOverlaps.reduce<OverlapSeverity>((acc, ov) => {
                    if (ov.severity === 'severe') return 'severe';
                    if (ov.severity === 'moderate' && acc !== 'severe') return 'moderate';
                    if (ov.severity === 'minor' && acc === 'none') return 'minor';
                    return acc;
                  }, 'none');
                  const isIntentional = Boolean(sub.isIntentionalOverlap || subOverlaps.some((ov) => ov.isIntentional));
                  const isMuted = Boolean(sub.isMuted);

                  // Primary conflicting partner
                  const primaryConflict = subOverlaps[0];
                  const partnerSub = primaryConflict
                    ? subtitles.find((s) => s.id === (primaryConflict.firstSubId === sub.id ? primaryConflict.secondSubId : primaryConflict.firstSubId))
                    : null;

                  return (
                    <div
                      key={`voice_${sub.id}`}
                      onMouseDown={(e) => handleStartDragVoice(e, sub)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubId(sub.id);
                      }}
                      title={`صوت دیالوگ #${idx + 1} | آفست: ${offset > 0 ? `+${offset}` : offset} ثانیه | سرعت: ${(sub.appliedSpeed || sub.timeStretchRatio || 1.0).toFixed(2)}x${isMuted ? ' (بی‌صدا)' : ''}${subOverlaps.length > 0 ? ` | تداخل: ${primaryConflict?.overlapDurationSec}s` : ''}`}
                      className={`absolute top-1 bottom-1 rounded-xl px-2.5 flex flex-col justify-center border transition-all text-[10px] overflow-hidden select-none cursor-ew-resize group ${
                        isDragging
                          ? 'border-cyan-400 bg-cyan-950/90 text-cyan-200 ring-2 ring-cyan-400 z-30 shadow-2xl scale-[1.03]'
                          : isMuted
                          ? 'border-slate-750 bg-slate-900/60 text-slate-500 opacity-60 border-dashed z-0'
                          : isIntentional
                          ? 'border-purple-500 bg-purple-950/80 text-purple-200 ring-1 ring-purple-500/40 z-20'
                          : maxSeverity === 'severe'
                          ? 'border-rose-500 bg-rose-950/85 text-rose-200 ring-2 ring-rose-500/60 z-20 shadow-lg'
                          : maxSeverity === 'moderate'
                          ? 'border-orange-500 bg-orange-950/80 text-orange-200 ring-1 ring-orange-500/40 z-20 shadow-md'
                          : maxSeverity === 'minor'
                          ? 'border-amber-500 bg-amber-950/70 text-amber-200 ring-1 ring-amber-500/30 z-20'
                          : isSelected
                          ? 'border-[#099767] bg-[#099767]/25 text-emerald-200 ring-2 ring-[#099767]/60 z-20 shadow-lg'
                          : isCurrentPlaying
                          ? 'border-emerald-400 bg-emerald-950/80 text-emerald-200 ring-1 ring-emerald-400 z-10'
                          : hasAudio
                          ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300 hover:border-emerald-400'
                          : 'border-slate-700 bg-slate-800/80 text-slate-400'
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      {/* Collision Warning Stripe Overlay */}
                      {maxSeverity === 'severe' && !isMuted && (
                        <div
                          className="absolute inset-0 pointer-events-none opacity-25"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, #f43f5e 0, #f43f5e 8px, transparent 8px, transparent 16px)',
                          }}
                        />
                      )}

                      {/* Header with Line #, Offset Badge & Voice Name */}
                      <div className="flex items-center justify-between text-[9px] font-mono leading-none z-10">
                        <span className="font-bold flex items-center gap-1">
                          {isMuted && <VolumeX className="w-2.5 h-2.5 text-slate-400" />}
                          #{idx + 1} {sub.voice}
                        </span>
                        <div className="flex items-center gap-1">
                          {((sub.leadingSilenceRemovedSec || 0) > 0 || (sub.trailingSilenceRemovedSec || 0) > 0) && (
                            <span
                              className="px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center"
                              title={`سکوت زائد پیرایش شد: -${((sub.leadingSilenceRemovedSec || 0) + (sub.trailingSilenceRemovedSec || 0)).toFixed(2)} ثانیه`}
                            >
                              <Scissors className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {sub.shiftDirection && sub.shiftDirection !== 'none' && offset !== 0 ? (
                            <span
                              className={`px-1 rounded text-[8px] font-bold ${
                                sub.shiftDirection === 'earlier'
                                  ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40'
                                  : 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                              }`}
                              title={`شیفت زمانی (${sub.shiftReason || 'timing_optimization'}): ${offset > 0 ? `+${offset}` : offset}s | شروع اصلی: ${sub.originalStart ?? sub.start}s`}
                            >
                              {sub.shiftDirection === 'earlier' ? '←' : '→'} {offset > 0 ? `+${offset}` : offset}s
                            </span>
                          ) : offset !== 0 ? (
                            <span
                              className={`px-1 rounded text-[8px] font-bold ${
                                offset > 0
                                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                                  : 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                              }`}
                            >
                              {offset > 0 ? `+${offset}` : offset}s
                            </span>
                          ) : (
                            <span className="text-[8px] opacity-70">
                              {effectiveDuration.toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Line dialogue text */}
                      <div className="truncate font-sans font-medium text-[10px] mt-0.5 z-10">
                        {sub.farsiText || sub.originalText}
                      </div>

                      {/* Collision / Status Badge Alert */}
                      {subOverlaps.length > 0 && !isMuted && (
                        <div
                          className={`text-[8px] font-bold flex items-center gap-1 mt-0.5 z-10 truncate ${
                            isIntentional
                              ? 'text-purple-300'
                              : maxSeverity === 'severe'
                              ? 'text-rose-300'
                              : maxSeverity === 'moderate'
                              ? 'text-orange-300'
                              : 'text-amber-300'
                          }`}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                          <span>
                            {isIntentional
                              ? `هم‌پوشانی تعمدی با #${partnerSub?.id || '?'}`
                              : `تداخل ${primaryConflict?.overlapDurationSec}s با #${partnerSub?.id || '?'}`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Master Playhead Line */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-md shadow-red-500 pointer-events-none z-40"
                style={{
                  left: `${(currentTime / maxDuration) * 100}%`,
                }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -translate-x-[5px] -translate-y-1 shadow" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTED LINE SYNC INSPECTOR & FINE-TUNING PANEL */}
      {selectedSub && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-[#099767]/30 shadow-xl animate-in fade-in duration-150">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-[#099767]/20 text-[#34d399] font-bold flex items-center justify-center text-xs border border-[#099767]/30 font-mono">
                #{subtitles.findIndex((s) => s.id === selectedSub.id) + 1}
              </span>
              <div>
                <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>تنظیم و سینک اختصاصی دیالوگ:</span>
                  <span className="text-xs text-[#34d399] font-sans">{selectedSub.farsiText || selectedSub.originalText}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5 font-mono">
                  <span>زمان زیرنویس: {selectedSub.startTimeStr} تا {selectedSub.endTimeStr} ({(selectedSub.end - selectedSub.start).toFixed(2)}s)</span>
                  {selectedSub.audioDuration && (
                    <span className="text-emerald-400">طول صوت: {selectedSub.audioDuration.toFixed(2)}s</span>
                  )}
                </div>
              </div>
            </div>

            {/* Solo Preview, Mute Toggle & Intentional Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedSub.audioBase64 || selectedSub.originalAudioBase64 ? (
                <button
                  type="button"
                  onClick={() => handlePlaySoloVoice(selectedSub)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    soloPlayingId === selectedSub.id
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  {soloPlayingId === selectedSub.id ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>توقف تست صوت</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>تست صدای این جمله</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">صوت این خط هنوز ساخته نشده است</span>
              )}

              {/* Mute Segment Toggle */}
              <button
                type="button"
                onClick={() => handleToggleMuteSegment(selectedSub.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedSub.isMuted
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750'
                }`}
                title={selectedSub.isMuted ? 'فعال کردن پخش این دیالوگ' : 'بی‌صدا کردن موقت این دیالوگ'}
              >
                {selectedSub.isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>بی‌صدا (Muted)</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>بی‌صدا کردن</span>
                  </>
                )}
              </button>

              {/* Intentional Overlap Toggle */}
              <button
                type="button"
                onClick={() => handleToggleIntentionalOverlap(selectedSub.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedSub.isIntentionalOverlap
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750'
                }`}
                title="علامت‌گذاری به عنوان هم‌پوشانی عمدی که نباید فشرده یا تغییر داده شود"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>{selectedSub.isIntentionalOverlap ? 'هم‌پوشانی عمدی' : 'تعریف تداخل عمدی'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
              >
                بستن پنل &times;
              </button>
            </div>
          </div>

          {/* Active Overlap Conflict Card for this selected segment */}
          {(() => {
            const selectedOverlaps = overlapSummary.segmentOverlapMap[selectedSub.id] || [];
            if (selectedOverlaps.length === 0) return null;

            return (
              <div className="mb-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                <div className="font-bold text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>تداخل‌های شناسایی‌شده برای این دیالوگ ({selectedOverlaps.length} مورد):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBulkSpeedModalOpen(true)}
                    className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                  >
                    تنظیم سرعت در پنل دسته‌جمعی
                  </button>
                </div>

                <div className="space-y-1.5">
                  {selectedOverlaps.map((ov) => {
                    const partnerId = ov.firstSubId === selectedSub.id ? ov.secondSubId : ov.firstSubId;
                    const partner = subtitles.find((s) => s.id === partnerId);
                    const pairKey = `${ov.firstSubId}_${ov.secondSubId}`;
                    const isPairPlaying = playingConflictPair === pairKey;

                    return (
                      <div
                        key={ov.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ov.severity === 'severe'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : ov.severity === 'moderate'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {ov.severity === 'severe' ? 'تداخل شدید' : ov.severity === 'moderate' ? 'تداخل متوسط' : 'تداخل جزیی'} ({ov.overlapDurationSec}s)
                          </span>
                          <span className="text-slate-300">
                            تداخل با دیالوگ <strong>#{partnerId}</strong>: <span className="text-slate-400 truncate max-w-xs">{partner?.farsiText || partner?.originalText}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePlayConflictPair(ov.firstSubId, ov.secondSubId)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                              isPairPlaying
                                ? 'bg-rose-500 text-white'
                                : 'bg-[#099767]/20 text-[#34d399] border border-[#099767]/40 hover:bg-[#099767]/30'
                            }`}
                            title="پخش هم‌زمان دو دیالوگ با هم برای شنیدن دقیق تداخل"
                          >
                            {isPairPlaying ? (
                              <>
                                <Pause className="w-3 h-3 fill-current" />
                                <span>توقف پخش جفت</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>پخش هم‌زمان دو دیالوگ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Precision Offset Slider & Time-Stretch Sync Controls */}
          <div className="space-y-3">
            {/* Row 1: Time-Stretch (Speed) Control without Pitch Alteration */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2">
                <FastForward className="w-4 h-4 text-[#34d399]" />
                <span className="text-xs text-slate-200 font-semibold">سرعت زمانی دیالوگ (Time-Stretch با حفظ گام صدا):</span>
                <span className="text-xs font-mono text-[#34d399] font-bold">
                  {(selectedSub.timeStretchRatio || selectedSub.playbackRate || 1.0).toFixed(2)}x
                </span>
                {selectedSub.effectiveDuration && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    (طول نهایی: {(selectedSub.effectiveDuration / (selectedSub.timeStretchRatio || 1.0)).toFixed(2)}s از {(selectedSub.end - selectedSub.start).toFixed(2)}s)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {[1.0, 1.08, 1.15, 1.22].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      onUpdateSubtitle?.(selectedSub.id, {
                        timeStretchRatio: sp,
                        playbackRate: sp,
                        syncStatus: sp === 1.0 ? 'ready' : 'synchronized',
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg border transition font-mono ${
                      Math.abs((selectedSub.timeStretchRatio || 1.0) - sp) < 0.02
                        ? 'bg-[#099767] text-white border-[#099767]'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {sp.toFixed(2)}x
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Manual Timeline Offset Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 whitespace-nowrap">جابجایی زمانی دستی:</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.05"
                  value={selectedSub.audioOffset || 0}
                  onChange={(e) =>
                    onUpdateSubtitle?.(selectedSub.id, {
                      audioOffset: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#099767] cursor-pointer"
                />
                <span className="font-mono text-xs w-16 text-center py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[#34d399] font-bold">
                  {(selectedSub.audioOffset || 0) > 0 ? `+${(selectedSub.audioOffset || 0).toFixed(2)}` : (selectedSub.audioOffset || 0).toFixed(2)}s
                </span>
              </div>

              {/* Quick Nudge Buttons */}
              <div className="flex flex-wrap items-center justify-start md:justify-end gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleNudgeOffset(selectedSub.id, -0.1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition font-mono"
                >
                  -۰.۱ ثانیه
                </button>
                <button
                  type="button"
                  onClick={() => handleResetLineOffset(selectedSub.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[#34d399] transition font-bold"
                >
                  سینک صفر (0.00s)
                </button>
                <button
                  type="button"
                  onClick={() => handleNudgeOffset(selectedSub.id, 0.1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition font-mono"
                >
                  +۰.۱ ثانیه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playback Controls & Sliders */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
        {/* Play/Pause/Seek Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            title="بازگشت به ابتدا"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleSkip(-5)}
            title="۵ ثانیه عقب"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!renderedMixBuffer && !originalAudioBuffer}
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#099767] to-[#077d54] hover:from-[#0ba873] hover:to-[#099767] text-white font-bold flex items-center justify-center transition shadow-lg shadow-[#099767]/25 disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(5)}
            title="۵ ثانیه جلو"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? 'صدادار' : 'بی‌صدا'}
            className={`p-2.5 rounded-xl border transition ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Time Display */}
          <div className="font-mono text-sm px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
            <span className="text-[#34d399] font-semibold">{formatPlayerTime(currentTime)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-slate-400">{formatPlayerTime(maxDuration)}</span>
          </div>
        </div>

        {/* Volume & Ducking Sliders */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300 w-full md:w-auto">
          {/* Persian Voice Volume */}
          <div className="flex items-center gap-2">
            <Mic2 className="w-3.5 h-3.5 text-[#34d399]" />
            <span className="whitespace-nowrap">صدای دوبله:</span>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={persianVolume}
              onChange={(e) => onChangePersianVolume(parseFloat(e.target.value))}
              className="w-20 accent-[#099767] cursor-pointer"
            />
            <span className="w-8 font-mono text-[11px] text-slate-400">
              {Math.round(persianVolume * 100)}%
            </span>
          </div>

          {/* Background Video Audio Volume */}
          {originalAudioBuffer && mixMode !== 'isolated' && (
            <div className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-purple-400" />
              <span className="whitespace-nowrap">صدای فیلم:</span>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={backgroundVolume}
                onChange={(e) => onChangeBackgroundVolume(parseFloat(e.target.value))}
                className="w-20 accent-purple-500 cursor-pointer"
              />
              <span className="w-8 font-mono text-[11px] text-slate-400">
                {Math.round(backgroundVolume * 100)}%
              </span>
            </div>
          )}

          {/* Ducking Amount */}
          {originalAudioBuffer && mixMode === 'ducking' && (
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span className="whitespace-nowrap">شدت داکینگ:</span>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={duckingAmount}
                onChange={(e) => onChangeDuckingAmount(parseFloat(e.target.value))}
                className="w-20 accent-emerald-500 cursor-pointer"
              />
              <span className="w-8 font-mono text-[11px] text-slate-400">
                {Math.round(duckingAmount * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Speech Speed Control Modal */}
      <BulkSpeedModal
        isOpen={isBulkSpeedModalOpen}
        onClose={() => setIsBulkSpeedModalOpen(false)}
        subtitles={subtitles}
        selectedSubtitleIds={selectedSubId ? [selectedSubId] : []}
        overlapSummary={overlapSummary}
        onUpdateAllSubtitles={(updated) => onUpdateAllSubtitles?.(updated)}
        historySnapshot={bulkSpeedHistorySnapshot}
        onSaveHistorySnapshot={(snap) => setBulkSpeedHistorySnapshot(snap)}
      />

      {/* One-Click Intelligent Audio Timeline Auto-Fix Dashboard Modal */}
      <AutoFixDashboardModal
        isOpen={isAutoFixModalOpen}
        onClose={() => setIsAutoFixModalOpen(false)}
        result={autoFixResult}
        onUndo={handleUndoAutoFix}
        onSelectSubtitle={(subId) => {
          setSelectedSubId(subId);
          const target = subtitles.find((s) => s.id === subId);
          if (target) {
            handleSeek(target.start);
          }
        }}
      />

      {/* GPT-6 Luna AI Cloud Timeline Synchronization Modal */}
      <AiSyncModal
        isOpen={isAiSyncModalOpen}
        onClose={() => setIsAiSyncModalOpen(false)}
        result={aiSyncResult}
        subtitles={subtitles}
        onRegenerateModifiedAudio={handleRegenerateModifiedAudios}
        isRegeneratingAudio={isRegeneratingAudio}
        regenerateProgressMsg={regenerateProgressMsg}
        onCompactGaps={handleCompactTimelineGaps}
        onUndo={() => {
          if (bulkSpeedHistorySnapshot) {
            const restored = undoBulkSpeedChanges(subtitles, bulkSpeedHistorySnapshot);
            onUpdateAllSubtitles?.(restored);
            setBulkSpeedHistorySnapshot(null);
            setSyncSuccessMsg('تغییرات سینک هوشمند به حالت اولیه بازگردانده شدند.');
          }
        }}
        onSelectSubtitle={(subId) => {
          setSelectedSubId(subId);
          const target = subtitles.find((s) => s.id === subId);
          if (target) {
            handleSeek(target.start);
          }
        }}
      />
    </div>
  );
};
