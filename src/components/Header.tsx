import React from 'react';
import { Key, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
  activeLinesCount: number;
  readyVoicesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenApiKeyModal,
  hasApiKey,
  activeLinesCount,
  readyVoicesCount,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#090d11]/85 backdrop-blur-md sticky top-0 z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-22 sm:h-24 md:h-26 flex items-center justify-between">
        {/* Brand identity & prominent logo */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative group cursor-pointer">
            <img
              src="/logo.png"
              alt="Vidans Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full object-cover shadow-2xl shadow-[#099767]/30 ring-2 sm:ring-3 ring-[#099767]/60 transition-all duration-300 group-hover:scale-105 group-hover:ring-[#099767]/90 animate-logo-glow"
            />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
              Vidans
            </h1>
          </div>
        </div>

        {/* Action Controls & API Key Status */}
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
