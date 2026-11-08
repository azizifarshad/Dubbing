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
  HelpCircle,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<'status' | 'request' | 'import' | 'guide'>('status');

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
        if (!data.isValid) {
          setActiveTab('request');
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
        const filename = data.filename || `DubbingVidans_ActivationRequest_${data.request.computerName}.vidansreq`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatusMessage({
          type: 'success',
          text: `فایل درخواست فعال‌سازی (${filename}) با موفقیت ایجاد و دانلود شد. لطفاً این فایل را از طریق تلگرام، ایمیل یا فلش برای صاحب نرم‌افزار ارسال فرمایید.`,
        });
        setActiveTab('import');
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
      setStatusMessage({ type: 'error', text: 'لطفاً ابتدا فایل لایسنس (.vidanslic) را انتخاب یا محتوای آن را وارد نمایید.' });
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
          text: data.messageFa || 'لایسنس با موفقیت فعال شد! تمامی امکانات نرم‌افزار Dubbing Vidans به‌صورت دائمی فعال گردیدند.',
        });
        setLicenseInputText('');
        fetchStatus();
        onLicenseChanged?.();
        setActiveTab('status');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-['Vazirmatn',sans-serif]">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-y-auto p-6 sm:p-8 select-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#099767]/20 border border-[#099767]/40 flex items-center justify-center text-[#34d399] shadow-lg shadow-[#099767]/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>فعال‌سازی لایسنس دائمی Dubbing Vidans</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Offline Hardware-Bound
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                سیستم لایسنسینگ دائمی و رمزنگاری‌شده (Ed25519) ویژه این رایانه فیزیکی
              </p>
            </div>
          </div>
          {!isMandatoryActivation && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              activeTab === 'status'
                ? 'bg-[#099767] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            وضعیت لایسنس
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              activeTab === 'request'
                ? 'bg-[#099767] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            ۱. تولید فایل درخواست (.vidansreq)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              activeTab === 'import'
                ? 'bg-[#099767] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            ۲. ورود فایل لایسنس (.vidanslic)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-[#099767] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            راهنمای فعال‌سازی
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs flex items-start gap-3 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : statusMessage.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
          </div>
        )}

        {/* Tab 1: Status */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            {/* Status Card */}
            <div
              className={`p-6 rounded-2xl border ${
                licenseInfo?.isValid
                  ? 'bg-gradient-to-l from-emerald-950/30 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                  : 'bg-gradient-to-l from-rose-950/30 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      licenseInfo?.isValid
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {licenseInfo?.isValid ? (
                      <ShieldCheck className="w-7 h-7" />
                    ) : (
                      <ShieldAlert className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {licenseInfo?.isValid ? 'لایسنس دائمی فعال است' : 'نرم‌افزار فعال‌سازی نشده است'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {licenseInfo?.messageFa}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-mono font-bold ${
                    licenseInfo?.isValid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {licenseInfo?.isValid ? 'PERMANENT' : 'UNLICENSED'}
                </span>
              </div>

              {licenseInfo?.isValid && (
                <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">مالک لایسنس:</span>
                    <span className="font-semibold text-white">{licenseInfo.customerName || 'کاربر گرامی'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">شناسه لایسنس:</span>
                    <span className="font-mono text-emerald-400 text-[11px] truncate block">
                      {licenseInfo.licenseId || 'PERM-001'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Hardware Information Card */}
            {hardwareInfo && (
              <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-blue-400" />
                    <span>مشخصات سخت‌افزاری دستگاه شما:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Hardware-Bound Identity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">نام رایانه:</span>
                    <span className="font-mono text-slate-300">{hardwareInfo.computerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">سیستم‌عامل:</span>
                    <span className="font-mono text-slate-300 truncate block">{hardwareInfo.osName}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 text-[11px] block">پردازنده (CPU):</span>
                    <span className="font-mono text-slate-300">{hardwareInfo.cpuModel}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 text-[11px]">اثر انگشت رمزنگاری سخت‌افزار (SHA-256):</span>
                      <button
                        type="button"
                        onClick={handleCopyFingerprint}
                        className="text-[10px] text-[#34d399] hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedFingerprint ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedFingerprint ? 'کپی شد' : 'کپی اثر انگشت'}</span>
                      </button>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all">
                      {hardwareInfo.hardwareFingerprint}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Request */}
        {activeTab === 'request' && (
          <div className="space-y-5">
            <div className="p-5 bg-blue-950/20 border border-blue-500/30 rounded-2xl text-xs text-blue-200 leading-relaxed">
              <h4 className="font-bold text-blue-300 mb-1 flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span>مرحله ۱: تولید و دانلود فایل درخواست فعال‌سازی</span>
              </h4>
              <p>
                با کلیک روی دکمه زیر، فایل درخواست فعال‌سازی اختصاصی این رایانه تولید و در پوشه دانلودهای شما ذخیره می‌شود. این فایل شامل مشخصات سخت‌افزاری و کلید عمومی دستگاه شما است و هیچ اطلاعات شخصی در آن وجود ندارد.
              </p>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#099767]/15 border border-[#099767]/30 text-[#34d399] flex items-center justify-center mx-auto shadow-xl shadow-[#099767]/10">
                <FileCheck2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  تولید فایل درخواست اختصاصی (.vidansreq)
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  فایل ایجاد شده را ذخیره نموده و برای دریافت لایسنس دائمی به مدیر نرم‌افزار تحویل دهید.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadRequest}
                disabled={isGeneratingReq}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#099767] hover:bg-[#0ba873] text-white font-bold text-xs transition duration-200 shadow-xl shadow-[#099767]/25 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingReq ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال تولید فایل درخواست...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل درخواست (.vidansreq)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Import */}
        {activeTab === 'import' && (
          <div className="space-y-5">
            <div className="p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 leading-relaxed">
              <h4 className="font-bold text-emerald-300 mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>مرحله ۲: ورود فایل لایسنس دریافت شده (.vidanslic)</span>
              </h4>
              <p>
                فایل لایسنسی که از طرف مدیر نرم‌افزار دریافت نموده‌اید را از طریق دکمه زیر انتخاب کرده یا محتوای متنی آن را در کادر زیر جایگذاری کنید.
              </p>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-4">
              <label className="block p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-[#099767] bg-slate-950/60 hover:bg-slate-950 transition cursor-pointer group">
                <Upload className="w-10 h-10 text-slate-500 group-hover:text-[#34d399] mx-auto mb-2 transition" />
                <span className="text-xs font-semibold text-white block mb-1">
                  کلیک برای انتخاب فایل لایسنس (.vidanslic یا .dblic)
                </span>
                <span className="text-[11px] text-slate-500">
                  فایل لایسنس امضاشده توسط مدیر را انتخاب کنید
                </span>
                <input
                  type="file"
                  accept=".vidanslic,.dblic,.json,.lic"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[11px] text-slate-500">یا متن فایل لایسنس را در اینجا بچسبانید:</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <textarea
                value={licenseInputText}
                onChange={(e) => setLicenseInputText(e.target.value)}
                rows={4}
                placeholder='{"payload": {"product": "Dubbing Vidans", ...}, "authoritySignature": "..."}'
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-[#099767] ltr text-left"
              />

              <button
                type="button"
                onClick={() => handleActivateWithContent()}
                disabled={isActivating || !licenseInputText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#099767] hover:bg-[#0ba873] text-white font-bold text-xs transition duration-200 shadow-xl shadow-[#099767]/25 disabled:opacity-40 cursor-pointer"
              >
                {isActivating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال اعتبارسنجی امضای دیجیتال و فعال‌سازی...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>فعال‌سازی نهایی لایسنس دائمی</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed p-2">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#34d399]" />
              <span>مراحل فعال‌سازی دائمی و کاملاً آفلاین نرم‌افزار:</span>
            </h4>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#099767]/20 text-[#34d399] flex items-center justify-center font-bold shrink-0">
                  ۱
                </span>
                <div>
                  <strong className="text-white block mb-0.5">تولید درخواست فعال‌سازی:</strong>
                  از تب «تولید فایل درخواست»، روی دکمه دانلود کلیک کرده و فایل <code className="text-[#34d399]">.vidansreq</code> را ذخیره کنید.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#099767]/20 text-[#34d399] flex items-center justify-center font-bold shrink-0">
                  ۲
                </span>
                <div>
                  <strong className="text-white block mb-0.5">ارسال به مدیر نرم‌افزار:</strong>
                  فایل دانلودشده را از هر روشی (تلگرام، ایتا، ایمیل، واتساپ یا فلش) برای مدیر یا پشتیبانی ارسال نمایید.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#099767]/20 text-[#34d399] flex items-center justify-center font-bold shrink-0">
                  ۳
                </span>
                <div>
                  <strong className="text-white block mb-0.5">دریافت و بارگذاری فایل لایسنس:</strong>
                  مدیر نرم‌افزار با کلید اختصاصی خود، لایسنس دائمی را صادر کرده و فایل <code className="text-[#34d399]">.vidanslic</code> را برای شما ارسال می‌کند. آن را در تب «ورود فایل لایسنس» انتخاب کنید.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
                <strong className="block text-emerald-300 font-bold mb-1">ویژگی‌های لایسنس دائمی Dubbing Vidans:</strong>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>بدون تاریخ انقضا و بدون نیاز به تمدید سالیانه یا ماهیانه.</li>
                  <li>۱۰۰٪ آفلاین و بدون نیاز به هیچ‌گونه سرور، اینترنت یا پایگاه داده.</li>
                  <li>فعال برای تمام حساب‌های کاربری ویندوز موجود روی همین رایانه.</li>
                  <li>امنیت بالا بر پایه الگوریتم‌های رمزنگاری پیشرفته Ed25519 و قفل سخت‌افزاری.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
