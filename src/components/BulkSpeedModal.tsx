import React, { useState, useMemo } from 'react';
import {
  SubtitleItem,
  BulkSpeedConfig,
  BulkSpeedSelectionMode,
  BulkSpeedCalculationMode,
  BulkSpeedHistorySnapshot,
  OverlapSummary,
  BulkSpeedPreviewItem,
} from '../types/dubbing';
import {
  computeBulkSpeedPreview,
  applyBulkSpeedChanges,
  undoBulkSpeedChanges,
} from '../utils/bulkSpeedController';
import {
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Loader2,
  Info,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { getAudioContext, decodeBase64ToAudioBuffer } from '../utils/audioMixer';

interface BulkSpeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  selectedSubtitleIds: number[];
  overlapSummary: OverlapSummary;
  onUpdateAllSubtitles: (items: SubtitleItem[]) => void;
  onUndoApplied?: () => void;
  historySnapshot: BulkSpeedHistorySnapshot | null;
  onSaveHistorySnapshot: (snap: BulkSpeedHistorySnapshot) => void;
}

export const BulkSpeedModal: React.FC<BulkSpeedModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  selectedSubtitleIds,
  overlapSummary,
  onUpdateAllSubtitles,
  historySnapshot,
  onSaveHistorySnapshot,
}) => {
  // Config state
  const [selectionMode, setSelectionMode] = useState<BulkSpeedSelectionMode>(
    overlapSummary.totalOverlaps > 0 ? 'overlapping' : 'all'
  );
  const [calculationMode, setCalculationMode] = useState<BulkSpeedCalculationMode>('fit_target');
  const [targetSpeed, setTargetSpeed] = useState<number>(1.10);
  const [percentageChange, setPercentageChange] = useState<number>(10);
  const [durationThresholdSec, setDurationThresholdSec] = useState<number>(4.0);

  // Audio preview state
  const [previewPlayingId, setPreviewPlayingId] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [applyProgressMsg, setApplyProgressMsg] = useState<string>('');

  // Audio context and node references for solo testing
  const soloSourceRef = React.useRef<AudioBufferSourceNode | null>(null);

  const stopPreviewAudio = () => {
    if (soloSourceRef.current) {
      try {
        soloSourceRef.current.stop();
        soloSourceRef.current.disconnect();
      } catch (_) {}
      soloSourceRef.current = null;
    }
    setPreviewPlayingId(null);
  };

  const handlePlayPreviewAudio = async (subId: number) => {
    if (previewPlayingId === subId) {
      stopPreviewAudio();
      return;
    }
    stopPreviewAudio();

    const sub = subtitles.find((s) => s.id === subId);
    if (!sub || (!sub.audioBase64 && !sub.originalAudioBase64)) return;

    try {
      const ctx = getAudioContext();
      const rawAudio = sub.processedAudioBase64 || sub.audioBase64 || sub.originalAudioBase64!;
      const buf = await decodeBase64ToAudioBuffer(rawAudio);

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);

      source.onended = () => {
        setPreviewPlayingId(null);
        soloSourceRef.current = null;
      };

      soloSourceRef.current = source;
      setPreviewPlayingId(subId);
      source.start(0);
    } catch (err) {
      console.error('Failed to preview line audio:', err);
      setPreviewPlayingId(null);
    }
  };

  // Build config
  const currentConfig: BulkSpeedConfig = useMemo(() => {
    return {
      selectionMode,
      calculationMode,
      targetSpeed,
      percentageChange,
      minSafeSpeed: 0.75,
      maxSafeSpeed: 1.35,
      selectedSubtitleIds,
      durationThresholdSec,
    };
  }, [
    selectionMode,
    calculationMode,
    targetSpeed,
    percentageChange,
    selectedSubtitleIds,
    durationThresholdSec,
  ]);

  // Compute live preview items
  const previewItems: BulkSpeedPreviewItem[] = useMemo(() => {
    return computeBulkSpeedPreview(subtitles, currentConfig, overlapSummary);
  }, [subtitles, currentConfig, overlapSummary]);

  const unsafeCount = useMemo(() => {
    return previewItems.filter((item) => !item.isSafe).length;
  }, [previewItems]);

  // Apply Changes Handler
  const handleApply = async () => {
    if (isApplying || previewItems.length === 0) return;

    setIsApplying(true);
    setApplyProgressMsg('در حال آماده‌سازی و اعمال فشرده‌سازی زمانی بدون تغییر گام...');

    try {
      const { updatedSubtitles, historySnapshot: newSnapshot } = await applyBulkSpeedChanges(
        subtitles,
        previewItems,
        (curr, total, msg) => {
          setApplyProgressMsg(`[${curr}/${total}] ${msg}`);
        }
      );

      onSaveHistorySnapshot(newSnapshot);
      onUpdateAllSubtitles(updatedSubtitles);
      stopPreviewAudio();
      onClose();
    } catch (err: any) {
      console.error('Failed to apply bulk speed changes:', err);
      alert('خطا در اعمال تغییرات سرعت: ' + (err.message || 'مشکلی رخ داد'));
    } finally {
      setIsApplying(false);
      setApplyProgressMsg('');
    }
  };

  // Undo Handler
  const handleUndo = () => {
    if (!historySnapshot) return;
    const restored = undoBulkSpeedChanges(subtitles, historySnapshot);
    onUpdateAllSubtitles(restored);
    stopPreviewAudio();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#099767]/20 border border-[#099767]/30 flex items-center justify-center text-[#34d399]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>تنظیم سرعت دسته‌جمعی دیالوگ‌ها (Bulk Speed Control)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
                  Pitch-Preserved
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تغییر سرعت طبیعی گفتار با الگوریتم WSOLA و بدون افت کیفیت یا تغییر لحن صدا
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopPreviewAudio();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Selection Mode Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#34d399]" />
              <span>محدوده انتخاب دیالوگ‌ها برای تنظیم سرعت:</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setSelectionMode('overlapping')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  selectionMode === 'overlapping'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>فقط دیالوگ‌های متداخل</span>
                <span className="text-[10px] opacity-75 font-mono">({overlapSummary.totalOverlaps} مورد)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('overflowing')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  selectionMode === 'overflowing'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-orange-400" />
                <span>طولانی‌تر از زیرنویس</span>
                <span className="text-[10px] opacity-75 font-mono">
                  ({subtitles.filter((s) => (s.audioDuration || 0) > (s.end - s.start) * 1.04).length} مورد)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('all')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  selectionMode === 'all'
                    ? 'border-[#099767] bg-[#099767]/15 text-emerald-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>تمام دیالوگ‌های پروژه</span>
                <span className="text-[10px] opacity-75 font-mono">({subtitles.length} مورد)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('selected')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  selectionMode === 'selected'
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>انتخاب‌شده‌های جاری</span>
                <span className="text-[10px] opacity-75 font-mono">({selectedSubtitleIds.length} مورد)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('threshold')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  selectionMode === 'threshold'
                    ? 'border-purple-500 bg-purple-500/15 text-purple-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-purple-400" />
                <span>بیشتر از حد نصاب</span>
                <span className="text-[10px] opacity-75 font-mono">({durationThresholdSec}s+)</span>
              </button>
            </div>

            {selectionMode === 'threshold' && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-xs">
                <span className="text-slate-400">حداقل طول صوت برای تنظیم (ثانیه):</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="30"
                  value={durationThresholdSec}
                  onChange={(e) => setDurationThresholdSec(Math.max(0.5, parseFloat(e.target.value) || 1.0))}
                  className="w-20 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-center"
                />
              </div>
            )}
          </div>

          {/* Section 2: Calculation Mode & Speed Settings */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#34d399]" />
                <span>روش محاسبه و تنظیم سرعت:</span>
              </span>

              {/* Safe Range Badge */}
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>محدوده امن استاندارد: 0.75x الی 1.35x</span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCalculationMode('fit_target')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition ${
                  calculationMode === 'fit_target'
                    ? 'border-[#099767] bg-[#099767]/20 text-emerald-200 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Sparkles className="w-3.5 h-3.5 text-[#34d399]" />
                  <span>انطباق هوشمند با طول ویدیوی اصلی</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  محاسبه دقیق نسبت طول صوت به زمان زیرنویس برای رفع تداخل بدون جابجایی
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode('percentage')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition ${
                  calculationMode === 'percentage'
                    ? 'border-[#099767] bg-[#099767]/20 text-emerald-200 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Sliders className="w-3.5 h-3.5 text-[#34d399]" />
                  <span>تغییر درصدی سرعت (افزایش/کاهش)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  اعمال یک ضریب درصدی مشخص (مثلاً +10% یا -5%) بر سرعت فعلی
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode('exact')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition ${
                  calculationMode === 'exact'
                    ? 'border-[#099767] bg-[#099767]/20 text-emerald-200 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Clock className="w-3.5 h-3.5 text-[#34d399]" />
                  <span>تعیین سرعت دقیق عددی</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  تنظیم تمام دیالوگ‌های انتخابی روی سرعت یکنواخت (مثلاً 1.10x)
                </span>
              </button>
            </div>

            {/* Sub-controls based on calculation mode */}
            {calculationMode === 'percentage' && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">درصد تغییر سرعت:</span>
                  <span className="font-mono font-bold text-[#34d399]">
                    {percentageChange > 0 ? `+${percentageChange}%` : `${percentageChange}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="35"
                  step="1"
                  value={percentageChange}
                  onChange={(e) => setPercentageChange(parseInt(e.target.value, 10))}
                  className="w-full accent-[#099767] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-25% (کندتر)</span>
                  <span>0% (بدون تغییر)</span>
                  <span>+35% (سریع‌تر)</span>
                </div>
              </div>
            )}

            {calculationMode === 'exact' && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">سرعت انتخابی:</span>
                  <span className="font-mono font-bold text-[#34d399]">{targetSpeed.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  {[0.90, 1.0, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setTargetSpeed(sp)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                        Math.abs(targetSpeed - sp) < 0.01
                          ? 'bg-[#099767] text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {sp.toFixed(2)}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Unsafe Warning Banner */}
          {unsafeCount > 0 && (
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong>هشدار کیفیت صدا:</strong> برای {unsafeCount} دیالوگ، سرعت مورد نیاز خارج از محدوده طبیعی (0.75x الی 1.35x) بوده و به صورت خودکار به محدوده مجاز کلمپ شد تا برای خلاصه‌سازی متن یا بررسی دستی مشخص گردد.
                </span>
              </div>
            </div>
          )}

          {/* Section 3: Live Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                <span>پیش‌نمایش تغییرات دیالوگ‌ها ({previewItems.length} دیالوگ انتخاب شده):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                صوت اصلی دست‌نخورده در حافظه پروژه محفوظ خواهد ماند
              </span>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold z-10">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">متن دیالوگ</th>
                      <th className="p-3 text-center">زمان ویدیو</th>
                      <th className="p-3 text-center">طول فعلی</th>
                      <th className="p-3 text-center">سرعت فعلی</th>
                      <th className="p-3 text-center">سرعت پیشنهادی</th>
                      <th className="p-3 text-center">طول تخمینی</th>
                      <th className="p-3 text-center">وضعیت</th>
                      <th className="p-3 text-center w-16">تست</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-sans">
                    {previewItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          هیچ دیالوگی با شرایط فیلتر انتخاب‌شده مطابقت ندارد.
                        </td>
                      </tr>
                    ) : (
                      previewItems.map((item) => (
                        <tr
                          key={item.subId}
                          className={`hover:bg-slate-850/60 transition ${
                            !item.isSafe ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center font-mono font-bold text-slate-400">
                            #{item.subId}
                          </td>
                          <td className="p-3 font-medium text-slate-200 max-w-[200px] truncate" title={item.farsiText}>
                            {item.farsiText}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">
                            {item.targetDuration.toFixed(2)}s
                          </td>
                          <td className="p-3 text-center font-mono text-slate-300">
                            {item.originalDuration.toFixed(2)}s
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">
                            {item.currentSpeed.toFixed(2)}x
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-[#34d399]">
                            {item.proposedSpeed.toFixed(2)}x
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-100">
                            {item.expectedDuration.toFixed(2)}s
                          </td>
                          <td className="p-3 text-center">
                            {item.severity === 'severe' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                تداخل شدید
                              </span>
                            ) : item.severity === 'moderate' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                تداخل متوسط
                              </span>
                            ) : item.severity === 'minor' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                تداخل جزیی
                              </span>
                            ) : !item.isSafe ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                بررسی دستی
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                منطبق
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.hasAudio ? (
                              <button
                                type="button"
                                onClick={() => handlePlayPreviewAudio(item.subId)}
                                className={`p-1.5 rounded-lg transition ${
                                  previewPlayingId === item.subId
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                                title="تست صوت این خط"
                              >
                                {previewPlayingId === item.subId ? (
                                  <Pause className="w-3 h-3 fill-current" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current" />
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-5 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            {historySnapshot && (
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700"
                title="بازگردانی تمام صوت‌ها و سرعت‌ها به حالت قبل از آخرین تغییر دسته‌جمعی"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازگردانی آخرین تغییرات (Undo)</span>
              </button>
            )}

            <span className="text-xs text-slate-400">
              {previewItems.length} دیالوگ آماده فشرده‌سازی زمانی
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                stopPreviewAudio();
                onClose();
              }}
              disabled={isApplying}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
            >
              انصراف
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || previewItems.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-[#099767] hover:from-emerald-400 hover:to-[#10b981] disabled:opacity-50 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{applyProgressMsg || 'در حال اعمال تغییرات...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>اعمال تنظیمات سرعت ({previewItems.length} دیالوگ)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
