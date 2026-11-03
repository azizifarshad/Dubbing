import React, { useState, useEffect } from 'react';
import { SubtitleItem } from './types/dubbing';
import { Header } from './components/Header';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FileUploaderSection } from './components/FileUploaderSection';
import { TranslationStudio } from './components/TranslationStudio';
import { VoiceSynthesisStudio } from './components/VoiceSynthesisStudio';
import { TimelinePlayer } from './components/TimelinePlayer';
import { ExportStudio } from './components/ExportStudio';
import { extractCleanBaseName, deriveProjectOutputName } from './utils/fileNaming';

import {
  FileText,
  Languages,
  Mic2,
  Sliders,
  Download,
  CheckCircle2,
  Film,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function App() {
  // 1. API runtime configuration and credentials
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('persian_dub_api_key') || localStorage.getItem('persian_dub_gemini_key') || '';
  });
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    return localStorage.getItem('persian_dub_base_url') || 'https://api.hormouz.net/v1';
  });
  const [translationModel, setTranslationModel] = useState<string>(() => {
    const saved = localStorage.getItem('persian_dub_translation_model');
    if (!saved || saved === 'Anthropic: Claude Haiku 5.5' || saved === 'anthropic/claude-sonnet-5:batch') {
      localStorage.setItem('persian_dub_translation_model', 'openai/gpt-6-luna');
      return 'openai/gpt-6-luna';
    }
    return saved;
  });
  const [ttsModel, setTtsModel] = useState<string>(() => {
    return localStorage.getItem('persian_dub_tts_model') || 'google/gemini-3.8-flash-lite-tts';
  });
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // 2. Parsed subtitles and project cues
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [subtitleFileName, setSubtitleFileName] = useState<string>('');

  // 3. Audio buffer and reference video tracks
  const [originalAudioBuffer, setOriginalAudioBuffer] = useState<AudioBuffer | null>(null);
  const [originalAudioName, setOriginalAudioName] = useState<string>('');
  const [originalAudioDuration, setOriginalAudioDuration] = useState<number>(0);
  const [originalAudioBlobUrl, setOriginalAudioBlobUrl] = useState<string | null>(null);
  const [originalVideoFile, setOriginalVideoFile] = useState<File | null>(null);

  // 4. Mixing and exported master track states
  const [outputBaseName, setOutputBaseName] = useState<string>('');
  const [mixMode, setMixMode] = useState<'ducking' | 'isolated' | 'full_mix'>('ducking');
  const [persianVolume, setPersianVolume] = useState<number>(1.0);
  const [backgroundVolume, setBackgroundVolume] = useState<number>(0.2);
  const [duckingAmount, setDuckingAmount] = useState<number>(0.8);
  const [sharedWavBlob, setSharedWavBlob] = useState<Blob | null>(null);
  const [sharedAudioBuffer, setSharedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sharedDuration, setSharedDuration] = useState<number>(0);

  // 5. Active stepper view (1 through 5)
  const [activeStep, setActiveStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'stepper' | 'all'>('stepper');

  // Verify server environment credentials on initial mount
  useEffect(() => {
    fetch('/api/check-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        translationModel: translationModel.trim(),
        ttsModel: ttsModel.trim(),
        validateLive: false,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.hasEnvKey) {
          setHasEnvKey(true);
        }
      })
      .catch(() => {});
  }, [apiKey, baseUrl, translationModel, ttsModel]);

  const handleSaveApiKey = (
    newKey: string,
    newBaseUrl?: string,
    newTransModel?: string,
    newTtsModel?: string
  ) => {
    setApiKey(newKey);
    if (newKey) {
      localStorage.setItem('persian_dub_api_key', newKey);
      localStorage.setItem('persian_dub_gemini_key', newKey);
    } else {
      localStorage.removeItem('persian_dub_api_key');
      localStorage.removeItem('persian_dub_gemini_key');
    }

    if (newBaseUrl) {
      setBaseUrl(newBaseUrl);
      localStorage.setItem('persian_dub_base_url', newBaseUrl);
    }
    if (newTransModel) {
      setTranslationModel(newTransModel);
      localStorage.setItem('persian_dub_translation_model', newTransModel);
    }
    if (newTtsModel) {
      setTtsModel(newTtsModel);
      localStorage.setItem('persian_dub_tts_model', newTtsModel);
    }
  };

  const handleSubtitlesLoaded = (items: SubtitleItem[], fileName: string) => {
    setSubtitles(items);
    setSubtitleFileName(fileName);
    const clean = extractCleanBaseName(fileName);
    if (clean && (!outputBaseName || outputBaseName === 'persian_dub')) {
      setOutputBaseName(clean);
    }
  };

  const handleAudioLoaded = (buffer: AudioBuffer, fileName: string, fileBlobUrl: string) => {
    setOriginalAudioBuffer(buffer);
    setOriginalAudioName(fileName);
    setOriginalAudioDuration(buffer.duration);
    setOriginalAudioBlobUrl(fileBlobUrl);
    const clean = extractCleanBaseName(fileName);
    if (clean) {
      setOutputBaseName(clean);
    }
  };

  const handleUpdateSubtitle = (id: number, partial: Partial<SubtitleItem>) => {
    setSubtitles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...partial } : item))
    );
  };

  const handleUpdateAllSubtitles = (items: SubtitleItem[]) => {
    setSubtitles(items);
  };

  // Progress calculations
  const translatedCount = subtitles.filter((s) => s.farsiText.trim().length > 0).length;
  const readyVoicesCount = subtitles.filter((s) => s.audioBase64).length;

  const steps = [
    {
      num: 1,
      titleFa: 'ورودی‌ها و فایل‌ها',
      descFa: 'کلید API، فایل زیرنویس و صوت فیلم',
      icon: Film,
      isCompleted: (apiKey || hasEnvKey) && subtitles.length > 0,
    },
    {
      num: 2,
      titleFa: 'ترجمه و تنظیم متن',
      descFa: 'ترجمه تخصصی دیالوگ‌ها به فارسی',
      icon: Languages,
      isCompleted: subtitles.length > 0 && translatedCount === subtitles.length,
    },
    {
      num: 3,
      titleFa: 'صداپیشگی هوش مصنوعی',
      descFa: 'تولید صدای دوبلورها با هوش مصنوعی',
      icon: Mic2,
      isCompleted: subtitles.length > 0 && readyVoicesCount === subtitles.length,
    },
    {
      num: 4,
      titleFa: 'میکس و تایم‌لاین',
      descFa: 'همگام‌سازی زمانی و داکینگ هوشمند',
      icon: Sliders,
      isCompleted: readyVoicesCount > 0,
    },
    {
      num: 5,
      titleFa: 'خروجی و دانلود',
      descFa: 'دریافت فایل صوتی نهایی WAV و SRT',
      icon: Download,
      isCompleted: readyVoicesCount > 0,
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d11] text-slate-100 flex flex-col font-['Vazirmatn',sans-serif]">
      {/* Top Navigation Bar */}
      <Header
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasApiKey={Boolean(apiKey || hasEnvKey)}
        activeLinesCount={subtitles.length}
        readyVoicesCount={readyVoicesCount}
      />

      {/* Main Studio Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Introduction Banner with prominent logo */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#099767]/20 via-[#0f151d] to-[#090d11] border border-[#099767]/30 p-6 sm:p-8 shadow-2xl shadow-black/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#099767]/20 text-[#34d399] border border-[#099767]/35 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#099767] animate-pulse" />
              <span>استودیو دوبله Vidans</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-sm">
              در پنج مرحله فایل دوبله شما آماده است
            </h2>
          </div>

          <div className="relative z-10 shrink-0 flex items-center justify-center">
            <div className="relative group cursor-pointer">
              <img
                src="/logo.png"
                alt="Vidans"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover shadow-2xl shadow-[#099767]/40 ring-4 ring-[#099767]/60 transition-transform duration-500 group-hover:scale-105 animate-logo-glow"
              />
            </div>
          </div>

          <div className="absolute -left-12 -bottom-12 w-72 h-72 bg-[#099767]/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Stepper Navigation Bar */}
        <div className="bg-[#0f151d]/90 border border-slate-800/80 rounded-2xl p-2 sm:p-3 shadow-lg">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(step.num)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-right transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-[#099767]/15 border-[#099767]/80 text-[#34d399] shadow-md shadow-[#099767]/15 ring-1 ring-[#099767]/40'
                      : step.isCompleted
                      ? 'bg-slate-950/60 border-emerald-500/30 text-slate-300 hover:border-[#099767]/50'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#099767] text-white shadow-md shadow-[#099767]/30'
                        : step.isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      <span>{step.num}.</span>
                      <span>{step.titleFa}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate hidden sm:block">
                      {step.descFa}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Studio Stage Views with smooth fade transition */}
        <div className="space-y-8">
          {/* Step 1: Uploaders */}
          <div className={`animate-fade-in ${activeStep === 1 || viewMode === 'all' ? 'block' : 'hidden'}`}>
            <FileUploaderSection
              onVideoFileLoaded={(file) => setOriginalVideoFile(file)}
              apiKey={apiKey}
              baseUrl={baseUrl}
              hasEnvKey={hasEnvKey}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
              subtitles={subtitles}
              onSubtitlesLoaded={handleSubtitlesLoaded}
              originalAudioBuffer={originalAudioBuffer}
              originalAudioName={originalAudioName}
              originalAudioDuration={originalAudioDuration}
              onAudioLoaded={handleAudioLoaded}
              onProceedToTranslation={() => setActiveStep(2)}
              isProcessingAudio={false}
            />
          </div>

          {/* Step 2: Translation Studio */}
          <div className={`animate-fade-in ${activeStep === 2 || viewMode === 'all' ? 'block' : 'hidden'}`}>
            <TranslationStudio
              apiKey={apiKey}
              baseUrl={baseUrl}
              translationModel={translationModel}
              subtitles={subtitles}
              onUpdateSubtitle={handleUpdateSubtitle}
              onUpdateAllSubtitles={handleUpdateAllSubtitles}
              onProceedToTTS={() => setActiveStep(3)}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          </div>

          {/* Step 3: Voice Synthesis Studio */}
          <div className={`animate-fade-in ${activeStep === 3 || viewMode === 'all' ? 'block' : 'hidden'}`}>
            <VoiceSynthesisStudio
              apiKey={apiKey}
              baseUrl={baseUrl}
              ttsModel={ttsModel}
              subtitles={subtitles}
              onUpdateSubtitle={handleUpdateSubtitle}
              onUpdateAllSubtitles={handleUpdateAllSubtitles}
              onProceedToMixer={() => setActiveStep(4)}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          </div>

          {/* Step 4: Timeline & Mixer */}
          <div className={`animate-fade-in ${activeStep === 4 || viewMode === 'all' ? 'block' : 'hidden'}`}>
            <TimelinePlayer
              subtitles={subtitles}
              onUpdateSubtitle={handleUpdateSubtitle}
              onUpdateAllSubtitles={handleUpdateAllSubtitles}
              originalAudioBuffer={originalAudioBuffer}
              originalAudioName={originalAudioName}
              subtitleFileName={subtitleFileName}
              outputBaseName={outputBaseName}
              mixMode={mixMode}
              onChangeMixMode={setMixMode}
              persianVolume={persianVolume}
              onChangePersianVolume={setPersianVolume}
              backgroundVolume={backgroundVolume}
              onChangeBackgroundVolume={setBackgroundVolume}
              duckingAmount={duckingAmount}
              onChangeDuckingAmount={setDuckingAmount}
              sharedWavBlob={sharedWavBlob}
              sharedAudioBuffer={sharedAudioBuffer}
              onMixRendered={(res) => {
                setSharedWavBlob(res.wavBlob);
                setSharedAudioBuffer(res.audioBuffer);
                setSharedDuration(res.totalDuration);
              }}
            />
          </div>

          {/* Step 5: Export & Download */}
          <div className={`animate-fade-in ${activeStep === 5 || viewMode === 'all' ? 'block' : 'hidden'}`}>
            <ExportStudio
              originalVideoFile={originalVideoFile}
              onVideoFileLoaded={(file) => setOriginalVideoFile(file)}
              subtitles={subtitles}
              originalAudioBuffer={originalAudioBuffer}
              originalAudioName={originalAudioName}
              subtitleFileName={subtitleFileName}
              outputBaseName={outputBaseName}
              onChangeOutputBaseName={setOutputBaseName}
              mixMode={mixMode}
              persianVolume={persianVolume}
              backgroundVolume={backgroundVolume}
              duckingAmount={duckingAmount}
              sharedWavBlob={sharedWavBlob}
              sharedDuration={sharedDuration}
              onMixRendered={(res) => {
                setSharedWavBlob(res.wavBlob);
                setSharedAudioBuffer(res.audioBuffer);
                setSharedDuration(res.totalDuration);
              }}
            />
          </div>
        </div>

        {/* Bottom Step Navigation Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            disabled={activeStep === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>مرحله قبل</span>
          </button>

          <div className="text-xs text-slate-500 font-medium">
            مرحله {activeStep} از ۵
          </div>

          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
            disabled={activeStep === 5}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#099767] hover:bg-[#0ba873] text-white text-xs font-bold transition-all duration-200 active:scale-95 shadow-md shadow-[#099767]/25 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <span>مرحله بعد</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-[#090d11] py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <span className="flex items-center gap-2 text-slate-400">
            <img src="/logo.png" alt="Vidans" className="w-5 h-5 rounded-full object-cover" />
            Vidans
          </span>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        baseUrl={baseUrl}
        translationModel={translationModel}
        ttsModel={ttsModel}
        onSaveApiKey={handleSaveApiKey}
        hasEnvKey={hasEnvKey}
      />
    </div>
  );
}
