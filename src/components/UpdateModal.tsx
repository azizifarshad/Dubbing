import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  HardDrive,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  UpdateInfo,
  UpdateProgress,
  CURRENT_APP_VERSION,
  fetchUpdateStatus,
  checkForUpdates,
  startDownload,
  triggerInstall,
  setAutoUpdatePreference,
} from '../utils/updateManager';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateAvailableBadge?: (hasUpdate: boolean) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  onUpdateAvailableBadge,
}) => {
  const [currentVersion] = useState<string>(CURRENT_APP_VERSION);
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(true);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress>({
    status: 'idle',
    progressPercent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'fa' | 'en'>('fa');
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Poll status periodically while downloading
  useEffect(() => {
    let interval: any = null;
    if (isOpen) {
      loadInitialStatus();
    }
    if (progress.status === 'downloading' || progress.status === 'verifying') {
      interval = setInterval(pollProgress, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, progress.status]);

  const loadInitialStatus = async () => {
    try {
      const data = await fetchUpdateStatus();
      if (data) {
        setProgress(data.progress);
        setUpdateInfo(data.updateInfo);
        setAutoUpdateEnabled(data.autoUpdateEnabled);
        setChannel(data.channel || 'stable');
        if (data.updateInfo?.updateAvailable && onUpdateAvailableBadge) {
          onUpdateAvailableBadge(true);
        }
      }
    } catch {
      // Ignore initial load error if offline
    }
  };

  const pollProgress = async () => {
    try {
      const data = await fetchUpdateStatus();
      if (data) {
        setProgress(data.progress);
        if (data.updateInfo) setUpdateInfo(data.updateInfo);
      }
    } catch {
      // Keep polling
    }
  };

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setShowDetails(false);
    try {
      const info = await checkForUpdates(channel);
      setUpdateInfo(info);
      if (
        info.status === 'unreachable' ||
        info.status === 'offline' ||
        info.status === 'timeout' ||
        info.status === 'error'
      ) {
        setProgress((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: info.errorMessageFa || 'خطا در برقراری ارتباط با سرور به‌روزرسانی',
          errorMessageFa: info.errorMessageFa,
          technicalDetails: info.technicalDetails,
        }));
        if (onUpdateAvailableBadge) onUpdateAvailableBadge(false);
      } else if (info.updateAvailable) {
        setProgress((prev) => ({
          ...prev,
          status: 'available',
          errorMessage: undefined,
          errorMessageFa: undefined,
          technicalDetails: undefined,
        }));
        if (onUpdateAvailableBadge) onUpdateAvailableBadge(true);
      } else {
        setProgress((prev) => ({
          ...prev,
          status: 'up_to_date',
          errorMessage: undefined,
          errorMessageFa: undefined,
          technicalDetails: undefined,
        }));
        if (onUpdateAvailableBadge) onUpdateAvailableBadge(false);
      }
    } catch (err: any) {
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'خطا در برقراری ارتباط با سرور به‌روزرسانی',
        errorMessageFa: err.message || 'خطا در برقراری ارتباط با سرور به‌روزرسانی',
        technicalDetails: err.stack || String(err),
      }));
      if (onUpdateAvailableBadge) onUpdateAvailableBadge(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartDownload = async () => {
    try {
      setProgress((prev) => ({ ...prev, status: 'downloading', progressPercent: 0 }));
      await startDownload();
    } catch (err: any) {
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'خطا در شروع دریافت فایل به‌روزرسانی',
      }));
    }
  };

  const handleInstall = async () => {
    try {
      setProgress((prev) => ({ ...prev, status: 'installing' }));
      await triggerInstall();
    } catch (err: any) {
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'خطا در اجرای فرآیند نصب به‌روزرسانی',
      }));
    }
  };

  const handleToggleAutoUpdate = () => {
    const nextVal = !autoUpdateEnabled;
    setAutoUpdateEnabled(nextVal);
    setAutoUpdatePreference(nextVal, channel);
  };

  const handleChangeChannel = (newChannel: 'stable' | 'beta') => {
    setChannel(newChannel);
    setAutoUpdatePreference(autoUpdateEnabled, newChannel);
  };

  if (!isOpen) return null;

  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        dir="rtl"
        className="relative w-full max-w-2xl bg-[#0f151d] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-[#121a24]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                مدیریت به‌روزرسانی هوشمند نرم‌افزار
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  v{currentVersion}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                دریافت خودکار و امن آخرین نسخه‌ها با اعتبارسنجی امضای دیجیتال
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Version Status Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#151c27] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs text-slate-400">نسخه نصب‌شده کنونی:</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 font-mono">v{currentVersion}</span>
            </div>
            <div className="bg-[#151c27] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs text-slate-400">آخرین نسخه موجود:</span>
              <span className="text-sm font-semibold text-emerald-400 mt-1 font-mono">
                {updateInfo?.latestVersion ? `v${updateInfo.latestVersion}` : 'نامشخص'}
              </span>
            </div>
            <div className="bg-[#151c27] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs text-slate-400">کانال انتشار:</span>
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => handleChangeChannel('stable')}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                    channel === 'stable'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  پایدار (Stable)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeChannel('beta')}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                    channel === 'beta'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  پیش‌نمایش (Beta)
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Status Card */}
          {progress.status === 'up_to_date' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold">نرم‌افزار شما کاملاً به‌روز است!</span> شما از آخرین نسخه رسمی و
                پایدار استودیو دوبله استفاده می‌کنید.
              </div>
            </div>
          )}

          {progress.status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3 text-red-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div className="text-xs leading-relaxed flex-1">
                  <div className="font-bold text-red-200 mb-1">عدم موفقیت در فرآیند به‌روزرسانی</div>
                  <div className="text-slate-300 leading-relaxed">
                    {progress.errorMessageFa || progress.errorMessage || 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.'}
                  </div>
                </div>
              </div>

              {(progress.technicalDetails || updateInfo?.technicalDetails) && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showDetails ? 'مخفی‌سازی جزئیات فنی' : 'مشاهده جزئیات فنی خطا'}</span>
                  </button>
                  {showDetails && (
                    <div
                      dir="ltr"
                      className="mt-2 p-2.5 bg-black/50 border border-red-500/20 rounded-lg text-[11px] font-mono text-slate-300 select-all overflow-x-auto"
                    >
                      {progress.technicalDetails || updateInfo?.technicalDetails}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-red-500/20">
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={isChecking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>تلاش مجدد</span>
                </button>
              </div>
            </div>
          )}

          {/* Update Available Card */}
          {updateInfo?.updateAvailable && progress.status !== 'up_to_date' && (
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#13241b] to-[#0f1c16] border border-emerald-500/40 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>نسخه جدید v{updateInfo.latestVersion} آماده دریافت است!</span>
                </div>
                {updateInfo.sizeBytes && updateInfo.sizeBytes > 0 && (
                  <span className="text-xs text-slate-400 font-mono">
                    حجم: {formatMb(updateInfo.sizeBytes)} MB
                  </span>
                )}
              </div>

              {/* Cryptographic Security Badge */}
              <div className="flex items-center gap-2 text-xs text-emerald-400/90 bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>امضای دیجیتال رسمی (Ed25519) و هش امنیتی SHA-256 تایید شده است.</span>
              </div>

              {/* Download Progress */}
              {progress.status === 'downloading' && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>در حال دریافت فایل نصبی به‌روزرسانی...</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {progress.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>
                      {formatMb(progress.downloadedBytes)} MB از {formatMb(progress.totalBytes)} MB
                    </span>
                    <span>سرور امن اختصاصی</span>
                  </div>
                </div>
              )}

              {/* Ready to install */}
              {progress.status === 'ready_to_install' && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>فایل نصب با موفقیت دریافت و یکپارچگی فایل تایید شد.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Release Notes */}
          {updateInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-300">یادداشت‌های انتشار (Release Notes):</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('fa')}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      activeTab === 'fa'
                        ? 'bg-slate-800 text-emerald-400 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    فارسی
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('en')}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      activeTab === 'en'
                        ? 'bg-slate-800 text-emerald-400 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
              <div
                dir={activeTab === 'fa' ? 'rtl' : 'ltr'}
                className="bg-[#121822] border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap font-sans"
              >
                {activeTab === 'fa'
                  ? updateInfo.releaseNotesFa || updateInfo.releaseNotes || 'توضیحاتی برای این نسخه ثبت نشده است.'
                  : updateInfo.releaseNotes || updateInfo.releaseNotesFa || 'No release notes provided.'}
              </div>
            </div>
          )}

          {/* Preferences */}
          <div
            onClick={handleToggleAutoUpdate}
            className="bg-[#121822] hover:bg-[#161f2c] border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-colors select-none"
          >
            <div className="space-y-0.5 pr-1">
              <span className="text-xs font-semibold text-slate-200 block">بررسی خودکار در شروع برنامه</span>
              <span className="text-[11px] text-slate-400 block">
                در هنگام اجرای برنامه، وجود نسخه‌های جدیدتر در پس‌زمینه بررسی شود.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoUpdateEnabled}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAutoUpdate();
              }}
              dir="ltr"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-[#121822] ${
                autoUpdateEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span className="sr-only">بررسی خودکار در شروع برنامه</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                  autoUpdateEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0d1218] flex items-center justify-between">
          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isChecking || progress.status === 'downloading'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'در حال استعلام...' : 'بررسی مجدد آپدیت'}</span>
          </button>

          <div className="flex items-center gap-3">
            {updateInfo?.updateAvailable && progress.status === 'ready_to_install' && (
              <button
                type="button"
                onClick={handleInstall}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>نصب و راه‌اندازی مجدد نرم‌افزار (Install & Restart)</span>
              </button>
            )}

            {updateInfo?.updateAvailable &&
              progress.status !== 'downloading' &&
              progress.status !== 'ready_to_install' && (
                <button
                  type="button"
                  onClick={handleStartDownload}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>به‌روزرسانی اکنون (Update Now)</span>
                </button>
              )}

            {progress.status === 'downloading' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>در حال دریافت... ({progress.progressPercent}%)</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (updateInfo?.updateAvailable && updateInfo.latestVersion) {
                  try {
                    sessionStorage.setItem(`vidans_dismissed_update_${updateInfo.latestVersion}`, 'true');
                  } catch {}
                }
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {updateInfo?.updateAvailable && progress.status !== 'ready_to_install' ? 'بعداً (Later)' : 'بستن'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
