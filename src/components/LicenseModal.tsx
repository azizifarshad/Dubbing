import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
  Copy,
  Check,
  AlertCircle,
  Cpu,
  Monitor,
  RefreshCw,
  X,
  FileCheck2,
  KeyRound,
  Laptop,
} from 'lucide-react';
import { LicenseValidationResult } from '../utils/licenseConfig';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseChanged?: () => void;
  isMandatoryActivation?: boolean;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  onLicenseChanged,
  isMandatoryActivation = false,
}) => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseValidationResult | null>(null);
  const [hardwareInfo, setHardwareInfo] = useState<{
    computerName: string;
    osName: string;
    cpuModel: string;
    hardwareFingerprint: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingReq, setIsGeneratingReq] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [licenseInputText, setLicenseInputText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedFingerprint, setCopiedFingerprint] = useState<boolean>(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/license/status');
      const data = await res.json();
      if (data.success) {
        setLicenseInfo(data);
        if (data.hardwareInfo) {
          setHardwareInfo(data.hardwareInfo);
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'خطا در بررسی لایسنس' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'خطا در ارتباط با سرویس اعتبارسنجی لایسنس.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleDownloadRequest = async () => {
    setIsGeneratingReq(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/license/request', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.request) {
        const jsonStr = JSON.stringify(data.request, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `DubbingGholam_ActivationRequest.dbreq`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatusMessage({
          type: 'success',
          text: `فایل درخواست (${data.filename}) با موفقیت ایجاد و دانلود شد. لطفاً این فایل را برای صاحب نرم‌افزار ارسال فرمایید.`,
        });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'خطا در تولید فایل درخواست' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'عدم امکان ارتباط برای تولید فایل درخواست.' });
    } finally {
      setIsGeneratingReq(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setLicenseInputText(content);
        handleActivateWithContent(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleActivateWithContent = async (contentToSubmit?: string) => {
    const rawContent = (contentToSubmit || licenseInputText).trim();
    if (!rawContent) {
      setStatusMessage({ type: 'error', text: 'لطفاً ابتدا فایل لایسنس (.dblic) را انتخاب یا متن آن را وارد نمایید.' });
      return;
    }

    setIsActivating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseContent: rawContent }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: data.messageFa || 'لایسنس با موفقیت فعال شد! تمامی امکانات نرم‌افزار دائمی فعال گردیدند.',
        });
        setLicenseInputText('');
        fetchStatus();
        onLicenseChanged?.();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.messageFa || data.error || 'لایسنس وارد شده معتبر نیست.',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'خطا در ارسال اطلاعات لایسنس.' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleCopyFingerprint = () => {
    if (hardwareInfo?.hardwareFingerprint) {
      navigator.clipboard.writeText(hardwareInfo.hardwareFingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-y-auto p-6 sm:p-8 select-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#099767]/20 border border-[#099767]/30 flex items-center justify-center text-[#34d399]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>فعال‌سازی و مدیریت لایسنس دائمی</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Offline Windows
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                سیستم لایسنس رمزنگاری‌شده و متصل به سخت‌افزار (Ed25519 Hardware-Bound)
              </p>
            </div>
          </div>
          {!isMandatoryActivation && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Current License Status Card */}
        <div className="mb-6">
          {isLoading ? (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#34d399]" />
              <span>در حال بررسی لایسنس و سخت‌افزار سیستم...</span>
            </div>
          ) : licenseInfo?.isValid ? (
            <div className="p-5 rounded-2xl bg-[#064e3b]/30 border border-[#099767]/50 text-emerald-200 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-[#34d399]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>لایسنس دائمی فعال است</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                      Permanent License
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-300 mt-0.5">
                    صادر شده برای: <strong>{licenseInfo.customerName || 'مشتری گرامی'}</strong>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-2 border-t border-emerald-500/20 pt-2">
                ✓ تمامی امکانات دوبله، تبدیل صوت، ترجمه هوشمند، همگام‌سازی و خروجی ویدیو به صورت ۱۰۰٪ آفلاین و بدون محدودیت زمانی فعال هستند.
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-200 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">نرم‌افزار فعال‌سازی نشده است</h3>
                  <p className="text-xs text-rose-300 mt-0.5">
                    {licenseInfo?.messageFa || 'برای فعال‌سازی و دسترسی به امکانات نرم‌افزار، مراحل زیر را طی نمایید.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Notification Message */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
          </div>
        )}

        {/* Step 1: Export Activation Request (.dbreq) */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 mb-5">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-md bg-[#099767]/20 text-[#34d399] flex items-center justify-center text-[11px] font-bold">
              ۱
            </span>
            <span>مرحله اول: تولید فایل درخواست فعال‌سازی (.dbreq)</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            ابتدا روی دکمه زیر کلیک کنید تا فایل درخواست سخت‌افزاری اختصاصی این سیستم تولید و ذخیره شود. سپس این فایل را از طریق تلگرام، ایتا یا ایمیل برای پشتیبانی ارسال فرمایید.
          </p>

          <button
            type="button"
            onClick={handleDownloadRequest}
            disabled={isGeneratingReq}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs transition border border-slate-700 w-full sm:w-auto shadow"
          >
            <Download className={`w-4 h-4 text-[#34d399] ${isGeneratingReq ? 'animate-bounce' : ''}`} />
            <span>{isGeneratingReq ? 'در حال ایجاد فایل...' : 'دانلود فایل درخواست فعال‌سازی (.dbreq)'}</span>
          </button>
        </div>

        {/* Step 2: Import License File (.dblic) */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 mb-5">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-md bg-[#099767]/20 text-[#34d399] flex items-center justify-center text-[11px] font-bold">
              ۲
            </span>
            <span>مرحله دوم: وارد کردن فایل لایسنس امضاشده (.dblic)</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            پس از دریافت فایل لایسنس (<code className="text-emerald-400 font-mono">*.dblic</code>) از پشتیبانی، آن را با دکمه زیر انتخاب کنید تا برنامه برای همیشه روی این کامپیوتر فعال شود:
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#099767] hover:bg-[#0ba873] text-white font-bold text-xs transition shadow">
              <Upload className="w-4 h-4" />
              <span>انتخاب فایل لایسنس (.dblic)...</span>
              <input
                type="file"
                accept=".dblic,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Device Information Card */}
        {hardwareInfo && (
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 mb-5 text-[11px] space-y-1.5">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span>مشخصات سخت‌افزاری این دستگاه:</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>نام کامپیوتر:</span>
              <span className="font-mono text-slate-200">{hardwareInfo.computerName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>پردازنده (CPU):</span>
              <span className="text-slate-200">{hardwareInfo.cpuModel}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>سیستم‌عامل:</span>
              <span className="text-slate-200">{hardwareInfo.osName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
              <span>اثر انگشت سخت‌افزار (Fingerprint):</span>
              <button
                type="button"
                onClick={handleCopyFingerprint}
                className="flex items-center gap-1 text-[10px] font-mono text-[#34d399] hover:underline"
                title="کلیک برای کپی"
              >
                <span>{hardwareInfo.hardwareFingerprint.slice(0, 16)}...</span>
                {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Information & Policy Note */}
        <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-800 pt-4 space-y-1">
          <p>• هر لایسنس به صورت دائمی، بدون نیاز به اینترنت و بدون تاریخ انقضا صادر می‌شود.</p>
          <p>• لایسنس به صورت سخت‌افزاری به این کامپیوتر متصل است و برای تمامی حساب‌های کاربری ویندوز روی این سیستم کار می‌کند.</p>
          <p>• در صورت تعویض سیستم، با ارسال فایل درخواست سیستم جدید، لایسنس جدید برای دستگاه جدید صادر خواهد شد.</p>
        </div>

        {/* Footer Close Button */}
        {!isMandatoryActivation && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              بستن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
