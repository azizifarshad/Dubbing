import React from 'react';
import { Key, CheckCircle2, AlertCircle, ShieldCheck, ShieldAlert, Download, RefreshCw, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
  activeLinesCount: number;
  readyVoicesCount: number;
  onOpenLicenseModal?: () => void;
  isLicensed?: boolean;
  customerName?: string;
  onOpenUpdateModal?: () => void;
  hasUpdateAvailable?: boolean;
  onStartNewProject?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenApiKeyModal,
  hasApiKey,
  activeLinesCount,
  readyVoicesCount,
  onOpenLicenseModal,
  isLicensed = false,
  customerName = '',
  onOpenUpdateModal,
  hasUpdateAvailable = false,
  onStartNewProject,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#090d11]/85 backdrop-blur-md sticky top-0 z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-22 sm:h-24 md:h-26 flex items-center justify-between">
        {/* Brand identity & prominent header logo */}
        <div className="flex items-center">
          <img
            src="/header-logo.png"
            alt="ویدانس - Vidans"
            className="h-14 sm:h-16 md:h-18 w-auto object-contain cursor-pointer transition-transform duration-300 hover:scale-105 drop-shadow-[0_4px_20px_rgba(9,151,103,0.35)]"
          />
        </div>

        {/* Action Controls & API Key / License Status */}
        <div className="flex items-center gap-3">
          {/* Start New Dubbing Project Button */}
          {onStartNewProject && (
            <button
              type="button"
              onClick={onStartNewProject}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border-rose-500/30 hover:border-rose-500/50 shadow-sm active:scale-95 group"
              title="شروع دوبله جدید و بازنشانی پروژه فعلی"
            >
              <RotateCcw className="w-4 h-4 text-rose-400 group-hover:-rotate-90 transition-transform duration-300" />
              <span>شروع دوبله جدید</span>
            </button>
          )}

          {activeLinesCount > 0 && (
            <div className="hidden md:flex items-center gap-3 text-xs bg-[#0f151d] border border-slate-800 px-3.5 py-2 rounded-xl text-slate-300 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">دیالوگ‌ها:</span>
                <span className="font-semibold text-[#34d399]">{activeLinesCount}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">صداهای آماده:</span>
                <span className="font-semibold text-emerald-400">{readyVoicesCount}</span>
              </div>
            </div>
          )}

          {/* Automatic Update Button */}
          {onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer relative ${
                hasUpdateAvailable
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
                  : 'bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 border-slate-700/60'
              }`}
              title="بررسی و مدیریت به‌روزرسانی‌های نرم‌افزار"
            >
              {hasUpdateAvailable ? (
                <>
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>آپدیت جدید!</span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#090d11]"></span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">نسخه و آپدیت</span>
                </>
              )}
            </button>
          )}

          {/* Offline Hardware-Bound License Button */}
          {onOpenLicenseModal && (
            <button
              type="button"
              onClick={onOpenLicenseModal}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                isLicensed
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse'
              }`}
              title={
                isLicensed
                  ? `لایسنس دائمی فعال است (${customerName || 'کاربر گرامی'})`
                  : 'فعال‌سازی آفلاین لایسنس دائمی نرم‌افزار'
              }
            >
              {isLicensed ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">
                    {customerName ? `لایسنس: ${customerName}` : 'لایسنس دائمی فعال'}
                  </span>
                  <span className="sm:hidden">لایسنس فعال</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>فعال‌سازی لایسنس</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
              hasApiKey
                ? 'bg-[#099767]/15 hover:bg-[#099767]/25 text-[#34d399] border-[#099767]/40 shadow-sm'
                : 'bg-[#099767]/10 hover:bg-[#099767]/20 text-[#34d399] border-[#099767]/40 animate-pulse'
            }`}
          >
            <Key className="w-4 h-4 text-[#099767]" />
            <span>{hasApiKey ? 'کلید API متصل است' : 'تنظیم کلید API'}</span>
            {hasApiKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#34d399]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
