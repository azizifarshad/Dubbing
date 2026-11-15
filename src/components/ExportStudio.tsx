import React, { useState } from 'react';
import { SubtitleItem } from '../types/dubbing';
import {
  Download,
  FileAudio,
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  HardDrive,
  Info,
  Radio,
  Layers,
  Mic2,
  Tag,
  Video,
  Film,
  Play,
  Image as ImageIcon,
  Check,
  Tv,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { exportToSrt, formatPlayerTime } from '../utils/srtParser';
import { renderDubbedTrack } from '../utils/audioMixer';
import { deriveProjectOutputName } from '../utils/fileNaming';

interface ExportStudioProps {
  subtitles: SubtitleItem[];
  originalAudioBuffer: AudioBuffer | null;
  originalAudioName: string;
  subtitleFileName?: string;
  outputBaseName?: string;
  onChangeOutputBaseName?: (name: string) => void;
  mixMode: 'ducking' | 'isolated' | 'full_mix';
  persianVolume: number;
  backgroundVolume: number;
  duckingAmount: number;
  sharedWavBlob?: Blob | null;
  sharedDuration?: number;
  originalVideoFile?: File | null;
  onVideoFileLoaded?: (file: File) => void;
  onMixRendered?: (res: { wavBlob: Blob; audioBuffer: AudioBuffer; totalDuration: number }) => void;
}

export const ExportStudio: React.FC<ExportStudioProps> = ({
  subtitles,
  originalAudioBuffer,
  originalAudioName,
  subtitleFileName,
  outputBaseName,
  onChangeOutputBaseName,
  mixMode,
  persianVolume,
  backgroundVolume,
  duckingAmount,
  sharedWavBlob,
  sharedDuration,
  originalVideoFile,
  onVideoFileLoaded,
  onMixRendered,
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ percent: number; message: string }>({
    percent: 0,
    message: '',
  });
  const [renderedWavBlob, setRenderedWavBlob] = useState<Blob | null>(sharedWavBlob || null);
  const [renderedWavUrl, setRenderedWavUrl] = useState<string | null>(
    sharedWavBlob ? URL.createObjectURL(sharedWavBlob) : null
  );
  const [renderedDuration, setRenderedDuration] = useState<number>(sharedDuration || 0);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(originalVideoFile || null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedVideoBlob, setRenderedVideoBlob] = useState<Blob | null>(null);

  // Video branding options
  const [includeIntro, setIncludeIntro] = useState<boolean>(true);
  const [includeLogo, setIncludeLogo] = useState<boolean>(true);
  const [encodingPreset, setEncodingPreset] = useState<'fast' | 'medium'>('medium');
  const [introOffsetSeconds] = useState<number>(8.07);

  React.useEffect(() => {
    if (originalVideoFile) {
      setSelectedVideoFile(originalVideoFile);
    }
  }, [originalVideoFile]);

  // Render video with intro and watermark
  const handleRenderDubbedVideo = async () => {
    if (!selectedVideoFile) {
      alert('لطفاً ابتدا فایل ویدیوی اصلی را انتخاب کنید.');
      return;
    }

    let activeWav = renderedWavBlob;
    if (!activeWav) {
      // Render audio if not ready
      setIsRendering(true);
      try {
        const res = await renderDubbedTrack(
          {
            originalBuffer: originalAudioBuffer,
            subtitles,
            mixMode,
            persianVolume,
            backgroundVolume,
            duckingAmount,
          },
          (percent, message) => setRenderProgress({ percent, message })
        );
        activeWav = res.wavBlob;
        setRenderedWavBlob(res.wavBlob);
        setRenderedWavUrl(URL.createObjectURL(res.wavBlob));
        setRenderedDuration(res.totalDuration);
      } catch (err: any) {
        alert('خطا در رندر اولیه صوت: ' + err.message);
        setIsRendering(false);
        return;
      } finally {
        setIsRendering(false);
      }
    }

    setIsRenderingVideo(true);
    try {
      // Upload dubbed audio
      setRenderProgress({ percent: 25, message: 'در حال ارسال ترک صوتی دوبله به سرور...' });
      const audioRes = await fetch('/api/upload-dubbed-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: activeWav,
      });

      if (!audioRes.ok) {
        const errJson = await audioRes.json().catch(() => null);
        throw new Error(errJson?.error || 'خطا در بارگذاری ترک صوتی دوبله به سرور');
      }

      const audioData = await audioRes.json();
      const audioId = audioData.audioId;
      if (!audioId) {
        throw new Error('شناسه ترک صوتی از سرور دریافت نشد');
      }

      // Upload video and start muxing
      const statusMsg = includeIntro && includeLogo
        ? 'در حال اتصال تیزر موشن‌گرافیک Vidans، جایگذاری صدای دوبله و درج لوگو با FFmpeg...'
        : includeIntro
        ? 'در حال اتصال تیزر موشن‌گرافیک Vidans و جایگذاری صدای دوبله فارسی...'
        : includeLogo
        ? 'در حال درج واترمارک لوگوی Vidans و جایگذاری صدای دوبله فارسی...'
        : 'در حال میکس ترک دوبله روی ویدیو با FFmpeg...';

      setRenderProgress({ percent: 60, message: statusMsg });

      const urlParams = new URLSearchParams({
        audioId,
        outputName: `${effectiveBaseName}_dubbed`,
        includeIntro: String(includeIntro),
        includeLogo: String(includeLogo),
        preset: encodingPreset,
      });

      const res = await fetch(`/api/render-dubbed-video?${urlParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': selectedVideoFile.type || 'video/mp4',
        },
        body: selectedVideoFile,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'خطا در رندر ویدیو با سرور');
      }

      setRenderProgress({ percent: 100, message: 'ویدیوی نهایی دوبله شده با موفقیت آماده شد!' });
      const videoBlob = await res.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      setRenderedVideoBlob(videoBlob);
      setRenderedVideoUrl(videoUrl);

      // Trigger auto download
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${effectiveBaseName}_dubbed.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert('خطا در خروجی ویدیو: ' + (err.message || 'خطای نامشخص'));
    } finally {
      setIsRenderingVideo(false);
    }
  };

  // Sync with shared render from TimelinePlayer
  React.useEffect(() => {
    if (sharedWavBlob) {
      setRenderedWavBlob(sharedWavBlob);
      const url = URL.createObjectURL(sharedWavBlob);
      setRenderedWavUrl(url);
      if (sharedDuration) {
        setRenderedDuration(sharedDuration);
      }
    }
  }, [sharedWavBlob, sharedDuration]);

  const readyVoicesCount = subtitles.filter((s) => s.audioBase64).length;
  const canRender = readyVoicesCount > 0;

  // Master Offline Render
  const handleRenderDubbedTrack = async () => {
    setIsRendering(true);
    setRenderedWavBlob(null);
    setRenderedWavUrl(null);

    try {
      const result = await renderDubbedTrack(
        {
          originalBuffer: originalAudioBuffer,
          subtitles,
          mixMode,
          persianVolume,
          backgroundVolume,
          duckingAmount,
        },
        (percent, message) => {
          setRenderProgress({ percent, message });
        }
      );

      setRenderedWavBlob(result.wavBlob);
      setRenderedWavUrl(URL.createObjectURL(result.wavBlob));
      setRenderedDuration(result.totalDuration);
      onMixRendered?.(result);
    } catch (err: any) {
      alert('خطا در رندر فایل صوتی: ' + (err.message || 'خطای نامشخص'));
    } finally {
      setIsRendering(false);
    }
  };

  const defaultBaseName = deriveProjectOutputName(originalAudioName, subtitleFileName);
  const [customBaseName, setCustomBaseName] = useState<string>(outputBaseName || defaultBaseName);

  React.useEffect(() => {
    if (outputBaseName && outputBaseName !== customBaseName) {
      setCustomBaseName(outputBaseName);
    } else if (!customBaseName && defaultBaseName) {
      setCustomBaseName(defaultBaseName);
    }
  }, [outputBaseName, defaultBaseName]);

  const effectiveBaseName = (customBaseName || defaultBaseName || 'persian_dub').trim();

  const handleBaseNameChange = (val: string) => {
    setCustomBaseName(val);
    onChangeOutputBaseName?.(val);
  };

  // Export WAV audio
  const handleDownloadWav = () => {
    if (!renderedWavBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(renderedWavBlob);
    a.download = `${effectiveBaseName}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export Persian subtitles
  const handleDownloadSrt = (withLangCode = false, withIntroOffset = false) => {
    const offset = withIntroOffset ? introOffsetSeconds : 0;
    const srtContent = exportToSrt(subtitles, offset);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const suffix = withIntroOffset ? '_branded' : '';
    a.download = withLangCode ? `${effectiveBaseName}${suffix}.fa.srt` : `${effectiveBaseName}${suffix}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-[#0f151d] rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden font-['Vazirmatn',sans-serif]">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#099767]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#099767]/20 border border-[#099767]/40 flex items-center justify-center text-[#34d399] shadow-lg shadow-[#099767]/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                خروجی نهایی، تیزر Vidans و میکس ویدیوی دوبله شده
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تولید صوت استودیویی WAV، الحاق موشن‌گرافیک آغازین، درج واترمارک لوگو و خروجی ویدیو MP4
              </p>
            </div>
          </div>
        </div>

        {/* Master Render Trigger Button */}
        <button
          type="button"
          onClick={handleRenderDubbedTrack}
          disabled={!canRender || isRendering}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#099767] hover:bg-[#0ba873] text-white font-bold text-xs transition duration-200 shadow-xl shadow-[#099767]/25 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
        >
          {isRendering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isRendering ? 'در حال رندر و میکس...' : 'ساخت و رندر فایل صوتی نهایی (WAV)'}</span>
        </button>
      </div>

      {/* Render Progress Card */}
      {isRendering && (
        <div className="mb-6 p-5 bg-slate-950 rounded-2xl border border-[#099767]/40">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-medium text-[#34d399] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{renderProgress.message}</span>
            </span>
            <span className="font-mono text-[#34d399] font-bold">{renderProgress.percent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#099767] to-[#10b981] transition-all duration-200"
              style={{ width: `${renderProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Branding & Video Automation Configuration Panel */}
      <div className="mb-6 p-5 bg-slate-950/90 rounded-2xl border border-slate-800/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>تنظیمات موشن‌گرافیک و برندینگ Vidans</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                  اتوماسیون ویدیو
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                این قابلیت‌ها به‌صورت خودکار قبل از رندر ویدیوی نهایی MP4 اعمال می‌شوند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">کیفیت خروجی H.264:</span>
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setEncodingPreset('medium')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  encodingPreset === 'medium'
                    ? 'bg-[#099767] text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                استاندارد (CRF 20)
              </button>
              <button
                type="button"
                onClick={() => setEncodingPreset('fast')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  encodingPreset === 'fast'
                    ? 'bg-[#099767] text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                سریع (Fast)
              </button>
            </div>
          </div>
        </div>

        {/* Branding Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Intro Motion Graphic Option */}
          <div
            onClick={() => setIncludeIntro((prev) => !prev)}
            className={`p-4 rounded-xl border cursor-pointer transition-all select-none flex items-start gap-3.5 ${
              includeIntro
                ? 'bg-purple-950/20 border-purple-500/50 shadow-md shadow-purple-500/5'
                : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-90'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition ${
                includeIntro
                  ? 'bg-purple-500 border-purple-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">
                  الحاق موشن‌گرافیک تیزر آغازین (Intro Video)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  8.07 ثانیه
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                تیزر اختصاصی و باکیفیت Vidans در ابتدای ویدیو قرار گرفته و سپس فیلم اصلی با صدای دوبله فارسی شروع می‌شود.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>Final (1).mp4</span>
                <span>&bull;</span>
                <span>Full HD 1080p</span>
                <span>&bull;</span>
                <span>30 FPS Stereo</span>
              </div>
            </div>
          </div>

          {/* 2. Logo Watermark Option */}
          <div
            onClick={() => setIncludeLogo((prev) => !prev)}
            className={`p-4 rounded-xl border cursor-pointer transition-all select-none flex items-start gap-3.5 ${
              includeLogo
                ? 'bg-emerald-950/20 border-[#099767]/50 shadow-md shadow-[#099767]/5'
                : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-90'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition ${
                includeLogo
                  ? 'bg-[#099767] border-emerald-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">
                  حک واترمارک لوگوی Vidans روی فیلم (Watermark)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-[#34d399] border border-emerald-500/30">
                  ۱۲٪ عرض تصویر
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                لوگوی شفاف و رسمی Vidans در گوشه پایین سمت راست فیلم با فاصله مارجین استاندارد ۲٪ درج می‌شود.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>Logo-Vidans.png</span>
                <span>&bull;</span>
                <span>شفاف بدون پس‌زمینه</span>
                <span>&bull;</span>
                <span>گوشه پایین راست</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Output File Naming Synchronization Bar */}
      <div className="mb-6 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#099767]/10 border border-[#099767]/30 text-[#34d399] flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>نام فایل‌های خروجی:</span>
              <span className="text-[11px] font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                همنام با فایل ورودی
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              فایل‌های خروجی صوتی (WAV)، ویدیویی (MP4) و زیرنویس (SRT) با همین پیشوند نام‌گذاری می‌شوند.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 focus-within:border-[#099767] transition w-full md:w-auto">
            <input
              type="text"
              value={customBaseName}
              onChange={(e) => handleBaseNameChange(e.target.value)}
              placeholder="نام فایل ورودی"
              className="bg-transparent text-xs text-[#34d399] font-mono focus:outline-none w-full md:w-56 ltr text-left"
            />
            <span className="text-[11px] text-slate-500 font-mono mr-1.5 shrink-0">.mp4/.wav/.srt</span>
          </div>
          {customBaseName !== defaultBaseName && defaultBaseName && (
            <button
              type="button"
              onClick={() => handleBaseNameChange(defaultBaseName)}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] border border-slate-700 transition shrink-0"
              title="بازنشانی به نام اولیه ورودی"
            >
              بازنشانی
            </button>
          )}
        </div>
      </div>

      {/* Ready Downloads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* 1. Download Dubbed MP4 Video Card */}
        <div
          className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
            renderedVideoBlob
              ? 'bg-gradient-to-b from-slate-950 to-slate-900 border-[#099767] shadow-lg shadow-[#099767]/15 ring-1 ring-[#099767]/40'
              : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Video className="w-6 h-6" />
              </div>
              {renderedVideoBlob ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ویدیو آماده است
                </span>
              ) : selectedVideoFile ? (
                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-full font-mono">
                  {selectedVideoFile.name.slice(0, 18)}...
                </span>
              ) : (
                <span className="text-xs text-slate-500 bg-slate-800/80 px-2.5 py-1 rounded-full">
                  انتخاب ویدیو
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              ویدیوی کامل دوبله شده (MP4 با تیزر و لوگو)
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              ترکیب ویدیوی اولیه با صوت دوبله فارسی، انکود خودکار FFmpeg، الصاق تیزر ابتدایی و واترمارک لوگوی Vidans.
            </p>

            {/* Feature Active Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {includeIntro && (
                <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  <span>تیزر موشن‌گرافیک</span>
                </span>
              )}
              {includeLogo && (
                <span className="text-[10px] bg-emerald-500/15 text-[#34d399] border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>واترمارک لوگو</span>
                </span>
              )}
              <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Mic2 className="w-3 h-3" />
                <span>دوبله فارسی</span>
              </span>
            </div>

            {/* If video file not selected, provide quick picker */}
            {!selectedVideoFile && (
              <label className="mb-3 block cursor-pointer p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 hover:border-[#099767] text-center transition">
                <span className="text-xs text-[#34d399] font-medium">کلیک برای انتخاب فایل ویدیوی فیلم (MP4)</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedVideoFile(f);
                      onVideoFileLoaded?.(f);
                    }
                  }}
                />
              </label>
            )}

            {renderedVideoUrl && (
              <div className="mb-3 rounded-xl overflow-hidden border border-slate-800 bg-black">
                <video controls src={renderedVideoUrl} className="w-full max-h-36 object-contain" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRenderDubbedVideo}
            disabled={isRenderingVideo || (!selectedVideoFile && !originalAudioBuffer)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-[#099767] hover:from-purple-500 hover:to-[#0ba873] text-white font-bold text-xs transition shadow-lg shadow-purple-500/20 disabled:opacity-50 font-mono mt-3 cursor-pointer"
            title="رندر ویدیوی MP4 با صوت دوبله فارسی، تیزر آغازین و واترمارک لوگو"
          >
            {isRenderingVideo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ساخت و رندر ویدیو با FFmpeg...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>دانلود ویدیوی نهایی ({effectiveBaseName}_dubbed.mp4)</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Download Dubbed WAV Card */}
        <div
          className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
            renderedWavBlob
              ? 'bg-gradient-to-b from-slate-950 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#099767]/10 border border-[#099767]/30 flex items-center justify-center text-[#34d399]">
                <FileAudio className="w-6 h-6" />
              </div>
              {renderedWavBlob ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  آماده دانلود
                </span>
              ) : (
                <span className="text-xs text-slate-500 bg-slate-800/80 px-2.5 py-1 rounded-full">
                  نیازمند رندر
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              ترک صوتی دوبله فارسی (WAV PCM 16-bit)
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              {renderedWavBlob
                ? `صوت کامل به مدت ${formatPlayerTime(renderedDuration)} با کیفیت استودیویی استخراج شده است. آماده پخش و تدوین.`
                : 'فایل صوتی استودیویی بدون افت کیفیت، قابل استفاده در پریمیر و داوینچی ریزالو.'}
            </p>

            {renderedWavUrl && (
              <div className="mb-3 p-2 bg-slate-900 rounded-xl border border-slate-800">
                <audio controls src={renderedWavUrl} className="w-full h-8" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadWav}
            disabled={!renderedWavBlob}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 font-mono mt-3 cursor-pointer"
            title={`دانلود صوت دوبله فارسی با نام ${effectiveBaseName}.wav`}
          >
            <Download className="w-4 h-4" />
            <span>دانلود صوت دوبله ({effectiveBaseName}.wav)</span>
          </button>
        </div>

        {/* 3. Download Translated Persian SRT Card */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-full font-medium">
                {subtitles.length} خط زیرنویس
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              فایل زیرنویس فارسی همگام (SRT)
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              زیرنویس همگام با زمان‌بندی دقیق صحنه‌های فیلم شامل تمام دیالوگ‌های فارسی ترجمه شده برای استفاده در پخش‌کننده‌ها.
            </p>

            {includeIntro && (
              <div className="mb-3 p-2 rounded-lg bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                <span>امکان دریافت زیرنویس هماهنگ با تیزر آغازین (+8.07 ثانیه) نیز فراهم است.</span>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleDownloadSrt(false, false)}
                disabled={subtitles.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition disabled:opacity-50 font-mono cursor-pointer"
                title={`دانلود زیرنویس هماهنگ با فیلم اصلی: ${effectiveBaseName}.srt`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود SRT اصلی ({effectiveBaseName}.srt)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSrt(true, false)}
                disabled={subtitles.length === 0}
                className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-[#34d399] font-mono text-[11px] border border-slate-700 transition disabled:opacity-50 shrink-0 cursor-pointer"
                title={`دانلود با پسوند زبان: ${effectiveBaseName}.fa.srt`}
              >
                <span>.fa.srt</span>
              </button>
            </div>

            {includeIntro && (
              <button
                type="button"
                onClick={() => handleDownloadSrt(false, true)}
                disabled={subtitles.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 text-[11px] border border-purple-500/30 transition disabled:opacity-50 font-mono cursor-pointer"
                title="دانلود زیرنویس هماهنگ با ویدیوی دارای تیزر آغازین"
              >
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>دانلود SRT هماهنگ با تیزر (+8.07s)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Studio Specs Banner */}
      <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#34d399]" />
          <span>فرمت خروجی صوت: استاندارد استودیویی 16-bit PCM WAV (سازگار با Adobe Premiere, Final Cut, DaVinci Resolve)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>حالت میکس فعلی: {mixMode === 'ducking' ? 'داکینگ هوشمند' : mixMode === 'isolated' ? 'خالص دوبله' : 'میکس کامل'}</span>
          <span>&bull;</span>
          <span>تعداد خطوط دیالوگ: {subtitles.length}</span>
          <span>&bull;</span>
          <span className="text-[#34d399]">موشن‌گرافیک: {includeIntro ? 'فعال' : 'غیرفعال'}</span>
          <span>&bull;</span>
          <span className="text-[#34d399]">واترمارک: {includeLogo ? 'فعال' : 'غیرفعال'}</span>
        </div>
      </div>
    </div>
  );
};
