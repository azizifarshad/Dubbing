import React from 'react';
import { Mic2, Key, Sliders, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="/logo.png"
              alt="Vidans Logo"
              className="w-11 h-11 rounded-full object-cover shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30 transition-transform hover:scale-105"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Vidans
          </h1>
        </div>

        {/* Action Controls & API Key */}
        <div className="flex items-center gap-3">
          {activeLinesCount > 0 && (
            <div className="hidden md:flex items-center gap-3 text-xs bg-slate-800/80 border border-slate-700/60 px-3.5 py-1.5 rounded-lg text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">دیالوگ‌ها:</span>
                <span className="font-semibold text-[#34d399]">{activeLinesCount}</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">صداهای آماده:</span>
                <span className="font-semibold text-emerald-400">{readyVoicesCount}</span>
              </div>
            </div>
          )}

          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
              hasApiKey
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-[#099767]/10 hover:bg-[#099767]/20 text-[#34d399] border-[#099767]/40 animate-pulse'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{hasApiKey ? 'کلید API متصل است' : 'تنظیم کلید API'}</span>
            {hasApiKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#34d399]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
