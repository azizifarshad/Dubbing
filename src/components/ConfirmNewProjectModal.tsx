import React from 'react';
import {
  AlertTriangle,
  RotateCcw,
  X,
  Film,
  Languages,
  Mic2,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

interface ConfirmNewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isResetting?: boolean;
}

export const ConfirmNewProjectModal: React.FC<ConfirmNewProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isResetting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResetting) {
          onClose();
        }
      }}
    >
      <div
        dir="rtl"
        className="relative w-full max-w-lg bg-[#0f151d] border border-amber-500/40 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col text-right font-['Vazirmatn',sans-serif] animate-in zoom-in-95 duration-200"
      >
        {/* Top Warning Banner / Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isResetting}
          className="absolute left-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          title="انصراف"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-7 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 flex-1 pt-1">
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                مطمئنی می‌خوای دوبله جدید شروع کنی؟
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                تمام کارهایی که تا الان انجام دادی پاک می‌شه و پروژه از اول شروع خواهد شد!
              </p>
            </div>
          </div>
        </div>

        {/* What Will Be Reset Card */}
        <div className="px-6 sm:px-7 space-y-3">
          <div className="bg-[#141b26] border border-slate-800/90 rounded-2xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-300 block mb-1">
              موارد زیر در این پروژه بازنشانی خواهند شد:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>ویدیو و صوت اصلی پروژه</span>
              </div>
              <div className="flex items-center gap-2">
                <Languages className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>متن‌ها و ترجمه‌های فارسی</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>صداهای تولیدشده هوش مصنوعی</span>
              </div>
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>سینک زمانی و میکس تایم‌لاین</span>
              </div>
            </div>
          </div>

          {/* Safety Reassurance Notice */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2.5 text-[11px] text-emerald-300/90">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              فایل‌های اصلی روی کامپیوتر شما، تنظیمات کلید API و لایسنس نرم‌افزار کاملاً محفوظ می‌مانند.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 sm:p-7 pt-5 flex flex-col-reverse sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all duration-200 cursor-pointer disabled:opacity-50 text-center"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isResetting}
            className="w-full sm:flex-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl text-xs font-bold bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-xl shadow-rose-950/50 hover:shadow-rose-900/60 transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'در حال بازنشانی پروژه...' : 'بله، شروع دوبله جدید'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
