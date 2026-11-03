import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Clock,
  Sliders,
  ShieldCheck,
  Bot,
  Zap,
  ChevronDown,
  ChevronUp,
  MoveHorizontal,
  FileText,
  Volume2,
  Loader2,
  Minimize2,
} from 'lucide-react';
import { SubtitleItem } from '../types/dubbing';

interface AiSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    provider?: string;
    modelUsed?: string;
    summary: {
      totalSegments: number;
      conflictsDetected: number;
      conflictsResolved: number;
      sentencesShortened?: number;
      speedsAdjusted?: number;
      timingShifted?: number;
      overallStatus?: string;
      messageFa: string;
    };
    adjustments: Array<{
      id: number;
      action: string;
      issueType: string;
      recommendedSpeed: number;
      recommendedOffsetSec: number;
      suggestedFarsiText: string;
      isTextModified: boolean;
      explanationFa: string;
    }>;
  } | null;
  onUndo: () => void;
  subtitles: SubtitleItem[];
  onSelectSubtitle?: (subId: number) => void;
  onRegenerateModifiedAudio?: (modifiedIds: number[]) => Promise<void>;
  isRegeneratingAudio?: boolean;
  regenerateProgressMsg?: string;
  onCompactGaps?: () => void;
}

export const AiSyncModal: React.FC<AiSyncModalProps> = ({
  isOpen,
  onClose,
  result,
  onUndo,
  subtitles,
  onSelectSubtitle,
  onRegenerateModifiedAudio,
  isRegeneratingAudio = false,
  regenerateProgressMsg = '',
  onCompactGaps,
}) => {
  const [showAllRows, setShowAllRows] = useState(false);

  if (!isOpen || !result) return null;

  const { summary, adjustments, modelUsed } = result;
  const modifiedAdjustments = adjustments.filter(
    (a) => a.isTextModified || a.recommendedSpeed !== 1.0 || a.recommendedOffsetSec !== 0
  );
  const textModifiedAdjustments = adjustments.filter((a) => a.isTextModified);
  const displayList = showAllRows ? adjustments : modifiedAdjustments;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-300">
              <Bot className="w-6 h-6 text-[#10b981]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>گزارش سینک هوشمند ابری تایم‌لاین (GPT-6 Luna Sync Director)</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#10b981]/15 border border-[#10b981]/30 text-[#34d399]">
                  {modelUsed || 'openai/gpt-6-luna'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {summary.messageFa || 'تمامی خطوط با هوش مصنوعی آنالیز و تداخل‌ها به صفر رسانده شدند.'}
              </p>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">کل دیالوگ‌های تحلیل‌شده:</span>
              <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
                {summary.totalSegments}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/20">
              <span className="text-[11px] text-amber-300/80 block">تداخل‌های شناسایی‌شده:</span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                {summary.conflictsDetected}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-300/80 block">تداخل‌های حل‌شده (۱۰۰٪):</span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>{summary.conflictsResolved}</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20">
              <span className="text-[11px] text-cyan-300/80 block">جملات کوتاه‌شده:</span>
              <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                {textModifiedAdjustments.length}
              </span>
            </div>
          </div>

          {/* Quick Action Banner for Audio Re-synthesis & Gap Compaction */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>عملیات تکمیلی خروجی صدا و مدیریت فاصله‌ها:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {textModifiedAdjustments.length > 0
                  ? `تعداد ${textModifiedAdjustments.length} دیالوگ بازنویسی شده‌اند؛ با زدن دکمه زیر می‌توانید صدای تازه آن‌ها را مستقیماً خروجی بگیرید.`
                  : 'تمامی متن‌ها با صدای فعلی همگام هستند؛ همچنین می‌توانید فواصل خالی را به‌صورت مغناطیسی فشرده کنید.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Audio Re-generation button */}
              {textModifiedAdjustments.length > 0 && onRegenerateModifiedAudio && (
                <button
                  type="button"
                  onClick={() => onRegenerateModifiedAudio(textModifiedAdjustments.map((a) => a.id))}
                  disabled={isRegeneratingAudio}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-[#099767] hover:from-emerald-400 hover:to-[#099767] disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  {isRegeneratingAudio ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>{regenerateProgressMsg || 'در حال تولید صدای جدید...'}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-slate-950" />
                      <span>تولید مجدد صدای جملات بازنویسی‌شده ({textModifiedAdjustments.length})</span>
                    </>
                  )}
                </button>
              )}

              {/* Gap Compaction Button */}
              {onCompactGaps && (
                <button
                  type="button"
                  onClick={onCompactGaps}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition shadow-sm cursor-pointer"
                  title="چسباندن فواصل خالی زائد به یکدیگر برای باز شدن فضا جهت دیالوگ‌های بعدی"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>چسباندن فواصل خالی و باز کردن فضا</span>
                </button>
              )}
            </div>
          </div>

          {/* Adjustments Table / Detail list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>
                  جزئیات اصلاحات و پیشنهادات هوش مصنوعی ({displayList.length}{' '}
                  {showAllRows ? 'خط کلی' : 'خط نیازمند اصلاح'}):
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAllRows(!showAllRows)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
              >
                <span>{showAllRows ? 'نمایش فقط خطوط تغییریافته' : 'نمایش تمام خطوط'}</span>
                {showAllRows ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="space-y-3">
              {displayList.map((adj) => {
                const sub = subtitles.find((s) => s.id === adj.id);
                const hasSpeed = adj.recommendedSpeed && adj.recommendedSpeed !== 1.0;
                const hasShift = adj.recommendedOffsetSec && adj.recommendedOffsetSec !== 0;

                return (
                  <div
                    key={adj.id}
                    onClick={() => onSelectSubtitle?.(adj.id)}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition cursor-pointer space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                          #{adj.id}
                        </span>
                        {sub && (
                          <span className="text-xs text-slate-400 font-mono">
                            {sub.startTimeStr} → {sub.endTimeStr} (
                            {(sub.end - sub.start).toFixed(1)}s)
                          </span>
                        )}
                        {adj.issueType === 'overlap' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                            رفع تداخل زمانی
                          </span>
                        )}
                        {adj.isTextModified && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
                            کوتاه‌سازی و بازنویسی
                          </span>
                        )}
                        {hasSpeed && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold border border-indigo-500/30">
                            سرعت: {adj.recommendedSpeed}x
                          </span>
                        )}
                        {hasShift && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/30">
                            آفست: {adj.recommendedOffsetSec > 0 ? `+${adj.recommendedOffsetSec}` : adj.recommendedOffsetSec}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Text comparison if modified */}
                    {adj.isTextModified && sub && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                          <span className="text-[10px] text-slate-500 block mb-1">متن قبلی:</span>
                          <span className="line-through opacity-80">{sub.farsiText || sub.originalText}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                          <span className="text-[10px] text-emerald-400/80 block mb-1">متن خلاصه شده جدید:</span>
                          <span>{adj.suggestedFarsiText}</span>
                        </div>
                      </div>
                    )}

                    {/* AI Explanation */}
                    <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
                      <strong>تحلیل GPT-6 Luna:</strong> {adj.explanationFa}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            اصلاحات با حفظ ۱۰۰٪ زیروبمی صدا (Pitch-Preserved WSOLA) و رعایت ریتم تصویر روی خط زمان اعمال شده‌اند.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onUndo();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>بازگردانی (Undo)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-[#099767] hover:from-emerald-400 hover:to-[#099767] text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>مشاهده و تأیید تایم‌لاین</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
