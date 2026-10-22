'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import { SearchForm } from '@/components/ui/SearchForm';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { YouTubePlayer } from '@/components/video/YouTubePlayer';
import { SubtitleList } from '@/components/subtitles/SubtitleList';
import { extractVideoId, formatTimestamp } from '@/lib/utils/youtube';
import { findActiveSubtitleIndex } from '@/lib/utils/search';
import { SubtitleSegment, ProcessingStep, ProcessSubtitlesResponse } from '@/types/subtitles';
import { YTPlayerInstance } from '@/types/youtube';
import {
  Sparkles,
  Zap,
  Database,
  Layers,
  Clock,
  RotateCcw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [targetLang, setTargetLang] = useState<string>('vi');
  const [sourceLang, setSourceLang] = useState<string>('en');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const playerRef = useRef<YTPlayerInstance | null>(null);

  // Time update from 100ms sync loop in YouTubePlayer
  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);
      if (subtitles.length > 0) {
        // Section 5.2: O(log N) binary search lookup
        const idx = findActiveSubtitleIndex(subtitles, time);
        setActiveIndex(idx);
      }
    },
    [subtitles]
  );

  // Seek handler when clicking subtitle item
  const handleSeek = useCallback((seconds: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seconds, true);
      // Optional: auto-play if paused
      if (typeof playerRef.current.getPlayerState === 'function') {
        const state = playerRef.current.getPlayerState();
        if (state === 2 || state === -1) {
          playerRef.current.playVideo();
        }
      }
    }
  }, []);

  // Form submission: process subtitles pipeline
  const handleProcessVideo = async (inputUrl: string, selectedLang: string, force = false) => {
    const extractedId = extractVideoId(inputUrl);
    if (!extractedId) {
      setErrorMessage('Đường link YouTube hoặc Video ID không hợp lệ.');
      return;
    }

    setVideoId(extractedId);
    setTargetLang(selectedLang);
    setErrorMessage(null);
    setErrorCode(null);

    try {
      // Step 1: Validating Video
      setProcessingStep('validating');
      await new Promise((r) => setTimeout(r, 400));

      // Step 2: Extracting Captions
      setProcessingStep('extracting');

      const response = await fetch('/api/v1/subtitles/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: extractedId,
          targetLanguage: selectedLang,
          forceRefresh: force,
        }),
      });

      // Step 3: Translating Sentences
      setProcessingStep('translating');

      const data: ProcessSubtitlesResponse = await response.json();

      if (!response.ok || !data.success) {
        throw {
          message: data.error || 'Không thể xử lý phụ đề cho video này.',
          code: data.errorCode || 'FETCH_FAILED',
        };
      }

      setSubtitles(data.subtitles || []);
      setSourceLang(data.sourceLanguage || 'en');
      setIsCached(Boolean(data.isCached));
      setProcessingStep('ready');
      setActiveIndex(-1);
    } catch (err: unknown) {
      console.error('Processing error:', err);
      const errObj = err as { message?: string; code?: string };
      setErrorMessage(errObj.message || 'Đã xảy ra lỗi trong quá trình xử lý phụ đề.');
      setErrorCode(errObj.code || 'UNKNOWN');
      setProcessingStep('error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Search & Configuration Bar */}
        <SearchForm
          onSubmit={(url, lang) => handleProcessVideo(url, lang)}
          isLoading={processingStep === 'validating' || processingStep === 'extracting' || processingStep === 'translating'}
        />

        {/* Progress Stepper during loading */}
        <StatusStepper currentStep={processingStep} error={errorMessage} />

        {/* Error Notification Card (when not in loading stepper) */}
        {processingStep === 'error' && errorMessage && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-sm flex items-start gap-3 shadow-xl">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">
                {errorCode === 'NO_CAPTIONS'
                  ? 'Video không có phụ đề'
                  : errorCode === 'EMBED_DISABLED'
                  ? 'Video giới hạn quyền nhúng'
                  : 'Không thể tải phụ đề'}
              </p>
              <p className="text-xs text-red-300 leading-relaxed mb-3">{errorMessage}</p>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-white text-xs font-medium transition-colors"
                >
                  <span>Mở trên YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleProcessVideo(videoId, targetLang, true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Thử tải lại</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dual Subtitle Interactive Workspace */}
        {videoId && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Video Player & Controls (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-20">
              <YouTubePlayer
                videoId={videoId}
                onTimeUpdate={handleTimeUpdate}
                playerRef={playerRef}
              />

              {/* Video Playback Metadata & Cache Info */}
              <div className="p-4 rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-mono text-neutral-300 bg-neutral-800 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{formatTimestamp(currentTime)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span className="uppercase font-semibold text-neutral-200">{sourceLang}</span>
                    <span>→</span>
                    <span className="uppercase font-semibold text-indigo-400">{targetLang}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Cache indicator badge */}
                  {isCached ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                      <Database className="w-3 h-3" />
                      <span>Cache Hit (0 cost)</span>
                    </span>
                  ) : subtitles.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium text-[11px]">
                      <Zap className="w-3 h-3" />
                      <span>AI Dịch Mới</span>
                    </span>
                  ) : null}

                  {subtitles.length > 0 && (
                    <button
                      onClick={() => handleProcessVideo(videoId, targetLang, true)}
                      title="Làm mới & dịch lại"
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Feature Highlights Card */}
              <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 hidden lg:grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold">Zero Bandwidth</p>
                    <p className="text-[11px] text-neutral-400">Stream trực tiếp CDN YouTube</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-neutral-300">
                  <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold">Ghép Câu Tự Nhiên</p>
                    <p className="text-[11px] text-neutral-400">Hợp nhất câu ngắt vụn</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-neutral-300">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold">Đồng Bộ 100ms</p>
                    <p className="text-[11px] text-neutral-400">Tìm kiếm nhị phân O(log N)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Dual-Subtitle Container (5 cols on desktop, fixed height with scroll) */}
            <div className="lg:col-span-5 h-[560px] sm:h-[620px] lg:h-[calc(100vh-8rem)]">
              {subtitles.length > 0 ? (
                <SubtitleList
                  subtitles={subtitles}
                  activeIndex={activeIndex}
                  onSeek={handleSeek}
                  sourceLang={sourceLang}
                  targetLang={targetLang}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-neutral-900/40 border border-neutral-800/80 rounded-2xl backdrop-blur-md">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">Chưa tải phụ đề</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mb-6 leading-relaxed">
                    Nhập link YouTube hoặc chọn một video mẫu ở trên để bắt đầu xem phụ đề song ngữ được dịch tức thì.
                  </p>
                  <button
                    onClick={() => handleProcessVideo(videoId, 'vi')}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    Tải phụ đề video này ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-6 text-center text-xs text-neutral-400">
        <p>
          DualSub.ai — Nền tảng xem video YouTube với phụ đề song ngữ thời gian thực.
        </p>
      </footer>
    </div>
  );
}
