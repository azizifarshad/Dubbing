import React, { useState } from 'react';
import {
  AutoFixResult,
  SubtitleItem,
  AutoFixCategory,
} from '../types/dubbing';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Clock,
  Layers,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Volume2,
  FileText,
  ChevronDown,
  ChevronUp,
  Scissors,
  MoveHorizontal,
  ArrowLeftRight,
} from 'lucide-react';

interface AutoFixDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AutoFixResult | null;
  onUndo: () => void;
  onSelectSubtitle?: (subId: number) => void;
}

export const AutoFixDashboardModal: React.FC<AutoFixDashboardModalProps> = ({
  isOpen,
  onClose,
  result,
  onUndo,
  onSelectSubtitle,
}) => {
  const [showSegmentLog, setShowSegmentLog] = useState<boolean>(false);

  if (!isOpen || !result) return null;

  const { stats, success, messageFa } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                success
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
              }`}
            >
              {success ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>گزارش جامع بهینه‌سازی و اصلاح خودکار خط زمان (Balanced Auto-Fix)</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    success
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {success ? 'موفق و ۱۰۰٪ همگام' : 'نیازمند بازبینی'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">{messageFa}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Initial Conflict State */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>وضعیت اولیه خط زمان (پیش از اصلاح):</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">کل دیالوگ‌های تحلیل‌شده:</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {stats.totalAnalyzed}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">تداخل ابعاد فایل (File Overlap):</span>
                <span className="text-xl font-bold font-mono text-slate-300 mt-1 block">
                  {stats.initialFileOverlaps}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/20">
                <span className="text-[11px] text-amber-400 block">تداخل فعال گفتار (Active Speech):</span>
                <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                  {stats.initialActiveSpeechOverlaps}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-purple-500/20">
                <span className="text-[11px] text-purple-400 block">هم‌پوشانی‌های تعمدی (حفظ‌شده):</span>
                <span className="text-xl font-bold font-mono text-purple-300 mt-1 block">
                  {stats.intentionalOverlaps}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Resolution Breakdown */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#34d399]" />
              <span>جزئیات راهکارهای اصلاحی اعمال‌شده (Resolution Breakdown):</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">حذف سکوت زائد (1.00x):</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                  {stats.fixedBySilence}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">جابجایی تایم‌لاین (1.00x):</span>
                <span className="text-lg font-bold font-mono text-cyan-300 mt-0.5 block">
                  {stats.conflictsResolvedByPlacement || stats.fixedByTimingAdjustment}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">ترجمه خلاصه‌تر (1.00x):</span>
                <span className="text-lg font-bold font-mono text-indigo-300 mt-0.5 block">
                  {stats.conflictsResolvedByTranslation || stats.fixedByShorterTranslation}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">فشرده‌سازی ملایم (1.10x):</span>
                <span className="text-lg font-bold font-mono text-yellow-300 mt-0.5 block">
                  {stats.fixedAt110}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">فشرده‌سازی متوسط (1.20x):</span>
                <span className="text-lg font-bold font-mono text-amber-400 mt-0.5 block">
                  {stats.fixedAt120}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">حداکثر سقف (1.30x):</span>
                <span className="text-lg font-bold font-mono text-orange-400 mt-0.5 block">
                  {stats.fixedAt130}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2b: Zero-Silence Audio Generation Metrics */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>شاخص‌های بهینه‌سازی سکوت فشرده (Zero-Silence Audio):</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">فایل‌های پیرایش سکوت آغازین:</span>
                <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                  {stats.filesWithLeadingSilenceRemoved || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">فایل‌های پیرایش سکوت پایانی:</span>
                <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                  {stats.filesWithTrailingSilenceRemoved || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-400 block">مجموع سکوت زائد آزادشده:</span>
                <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                  {(stats.totalSilenceRemovedSec || 0).toFixed(2)}s
                </span>
              </div>
            </div>
          </div>

          {/* Section 2c: Flexible Timeline Placement Metrics */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <MoveHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>شاخص‌های جای‌گذاری منعطف تایم‌لاین (Flexible Timeline Placement):</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">شیفت به جلو (پیشین):</span>
                <span className="text-xl font-bold font-mono text-indigo-300 mt-1 block">
                  {stats.segmentsShiftedEarlier || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">شیفت به عقب (پسین):</span>
                <span className="text-xl font-bold font-mono text-indigo-300 mt-1 block">
                  {stats.segmentsShiftedLater || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">میانگین جابجایی زمانی:</span>
                <span className="text-xl font-bold font-mono text-slate-200 mt-1 block">
                  {(stats.averageAbsoluteTimingShiftSec || 0).toFixed(2)}s
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">حداکثر جابجایی ثبت‌شده:</span>
                <span className="text-xl font-bold font-mono text-slate-200 mt-1 block">
                  {(stats.maxTimingShiftSec || 0).toFixed(2)}s
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Final Validation & Metrics */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>اعتبارسنجی نهایی و کیفیت همگام‌سازی (Final Validation):</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 block">تداخل‌های برطرف‌شده:</span>
                <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                  {stats.automaticallyResolvedOverlaps}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">تداخل حل‌نشده باقی‌مانده:</span>
                <span
                  className={`text-xl font-bold font-mono mt-1 block ${
                    stats.remainingUnintendedOverlaps > 0 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {stats.remainingUnintendedOverlaps}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">میانگین انحراف آغاز:</span>
                <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
                  {Math.round(stats.averageStartDeviationSec * 1000)}ms
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">زمان کل پردازش:</span>
                <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                  {stats.totalProcessingDurationMs}ms
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Unresolved Conflicts Inspection (if any) */}
          {stats.unresolvedConflictsCount > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>
                  موارد باقیمانده نیازمند بازبینی متن ({stats.unresolvedConflictsCount} مورد):
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                طبق سیاست کیفی، سرعت صوت هرگز بیش از <strong>1.30x</strong> افزایش داده نمی‌شود تا لحن صدا روباتیک نشود و مفهوم کلمات آسیب نبیند. موارد زیر به دلیل طولانی بودن متن نیازمند خلاصه‌سازی دستی هستند:
              </p>

              <div className="space-y-2">
                {stats.unresolvedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        دیالوگ #{issue.subId}
                      </span>
                      <span className="text-slate-300 leading-normal">
                        {issue.unresolvedReasonFa || issue.descriptionFa}
                      </span>
                    </div>

                    {onSelectSubtitle && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSubtitle(issue.subId);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#34d399] font-medium transition shrink-0 ml-2 cursor-pointer"
                      >
                        انتقال به تایم‌لاین
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong>تایم‌لاین کاملاً تمیز و همگام است!</strong> تمام تداخل‌های فعال برطرف شدند، سرعت صداها از 1.30x تجاوز نکرده، زیروبمی صوت حفظ شده و دیالوگ‌ها دقیقاً منطبق با تصویر هستند.
              </div>
            </div>
          )}

          {/* Section 5: Per-Segment Resolution Log Toggle */}
          {stats.segmentResolutions && stats.segmentResolutions.length > 0 && (
            <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowSegmentLog(!showSegmentLog)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>مشاهده ریز تصمیم‌گیری برای تک‌تک دیالوگ‌ها ({stats.segmentResolutions.length} سگمنت)</span>
                </span>
                {showSegmentLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSegmentLog && (
                <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
                  {stats.segmentResolutions.map((res) => (
                    <div
                      key={res.subId}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate max-w-sm">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                          #{res.subId}
                        </span>
                        <span className="text-slate-200 truncate">{res.farsiText}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {res.shiftDirection && res.shiftDirection !== 'none' && res.appliedOffset !== 0 && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              res.shiftDirection === 'earlier'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                            title={`شیفت: ${res.appliedOffset > 0 ? `+${res.appliedOffset}` : res.appliedOffset}s`}
                          >
                            {res.shiftDirection === 'earlier' ? '← ' : '→ '}
                            {res.appliedOffset > 0 ? `+${res.appliedOffset.toFixed(2)}s` : `${res.appliedOffset.toFixed(2)}s`}
                          </span>
                        )}

                        {((res.leadingSilenceTrimmedSec || 0) > 0 || (res.trailingSilenceTrimmedSec || 0) > 0) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20"
                            title="سکوت زائد حذف شده"
                          >
                            <Scissors className="w-2.5 h-2.5" />
                            <span>-{((res.leadingSilenceTrimmedSec || 0) + (res.trailingSilenceTrimmedSec || 0)).toFixed(2)}s</span>
                          </span>
                        )}

                        <span className="font-mono text-cyan-300 font-bold">
                          {res.appliedSpeed.toFixed(2)}x
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            res.category === 'MANUAL_REVIEW_REQUIRED'
                              ? 'bg-rose-500/20 text-rose-300'
                              : res.category === 'INTENTIONAL_OVERLAP'
                              ? 'bg-purple-500/20 text-purple-300'
                              : res.category === 'FIXED_WITH_TIMING_ADJUSTMENT'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {res.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={() => {
              onUndo();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگردانی تایم‌لاین به قبل (Undo)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-[#099767] hover:from-emerald-400 hover:to-[#10b981] text-slate-950 text-xs font-bold transition shadow-md cursor-pointer"
          >
            تأیید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
