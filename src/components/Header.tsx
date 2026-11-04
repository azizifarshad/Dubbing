import React from 'react';
import { KeyRound, ShieldCheck, ShieldAlert, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenLicenseModal: () => void;
  isLicensed: boolean;
  customerName?: string;
  onOpenApiKeyModal?: () => void;
  hasApiKey?: boolean;
  activeLinesCount: number;
  readyVoicesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLicenseModal,
  isLicensed,
  customerName,
  onOpenApiKeyModal,
  hasApiKey,
  activeLinesCount,
  readyVoicesCount,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#090d11]/85 backdrop-blur-md sticky top-0 z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-22 sm:h-24 md:h-26 flex items-center justify-between">
        {/* Brand identity & prominent header logo */}
        <div className="flex items-center gap-3">
          <img
            src="/header-logo.png"
            alt="ویدانس - Vidans"
            className="h-14 sm:h-16 md:h-18 w-auto object-contain cursor-pointer transition-transform duration-300 hover:scale-105 drop-shadow-[0_4px_20px_rgba(9,151,103,0.35)]"
          />
          <div className="hidden lg:flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400">سیستم دوبله آفلاین ویندوز</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">100% Offline Dubbing Workstation</span>
          </div>
        </div>

        {/* Action Controls & Licensing Status */}
        <div className="flex items-center gap-3">
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

          {/* License Status Button */}
          <button
            type="button"
            onClick={onOpenLicenseModal}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
              isLicensed
                ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-[#34d399] border-emerald-500/40 shadow-sm'
                : 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border-rose-500/50 animate-pulse'
            }`}
          >
            {isLicensed ? (
              <>
                <ShieldCheck className="w-4 h-4 text-[#34d399]" />
                <span className="truncate max-w-[150px]">
                  {customerName ? `لایسنس: ${customerName}` : 'لایسنس دائمی فعال'}
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>فعال‌سازی لایسنس دائمی</span>
              </>
            )}
          </button>

          {/* Optional Cloud Settings */}
          {onOpenApiKeyModal && (
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
              title="تنظیمات ابری اختیاری"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
