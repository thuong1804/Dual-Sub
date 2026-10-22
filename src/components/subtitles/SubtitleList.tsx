'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SubtitleSegment } from '@/types/subtitles';
import { SubtitleRow } from './SubtitleRow';
import {
  Search,
  ArrowDownCircle,
  Download,
  SlidersHorizontal,
  LayoutGrid,
  Columns,
  Check,
  Languages,
} from 'lucide-react';

interface SubtitleListProps {
  subtitles: SubtitleSegment[];
  activeIndex: number;
  onSeek: (seconds: number) => void;
  sourceLang?: string;
  targetLang?: string;
}

export const SubtitleList: React.FC<SubtitleListProps> = ({
  subtitles,
  activeIndex,
  onSeek,
  sourceLang = 'en',
  targetLang = 'vi',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollLocked, setIsAutoScrollLocked] = useState(true);
  const [userInterruptedUntil, setUserInterruptedUntil] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'stacked'>('side-by-side');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Filter segments based on search
  const filteredSubtitles = useMemo(() => {
    if (!searchQuery.trim()) return subtitles;
    const q = searchQuery.toLowerCase();
    return subtitles.filter(
      (sub) => sub.original.toLowerCase().includes(q) || sub.translated.toLowerCase().includes(q)
    );
  }, [subtitles, searchQuery]);

  // Handle user scroll / touch wheel interruption (Section 5.3)
  const handleUserInteraction = () => {
    // Pause auto-scroll for 5 seconds on user scroll/wheel
    const resumeTime = Date.now() + 5000;
    setUserInterruptedUntil(resumeTime);
  };

  // Section 5.3: Smart Auto-Scroll Behavior
  useEffect(() => {
    if (activeIndex < 0 || !isAutoScrollLocked) return;

    const isTemporarilyPaused = Date.now() < userInterruptedUntil;
    if (isTemporarilyPaused) return;

    const activeSegment = subtitles[activeIndex];
    if (!activeSegment) return;

    const element = document.getElementById(`sub-segment-${activeSegment.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, isAutoScrollLocked, userInterruptedUntil, subtitles]);

  // Export handlers
  const handleExport = (format: 'srt' | 'txt' | 'json') => {
    let content = '';
    let mime = 'text/plain';
    let filename = `subtitles_${targetLang}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(subtitles, null, 2);
      mime = 'application/json';
    } else if (format === 'txt') {
      content = subtitles.map((s) => `[${s.start.toFixed(1)}s] ${s.original}\n-> ${s.translated}\n`).join('\n');
    } else if (format === 'srt') {
      content = subtitles
        .map((s, idx) => {
          const formatSrtTime = (sec: number) => {
            const date = new Date(sec * 1000);
            const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
            const mm = String(date.getUTCMinutes()).padStart(2, '0');
            const ss = String(date.getUTCSeconds()).padStart(2, '0');
            const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
            return `${hh}:${mm}:${ss},${ms}`;
          };
          return `${idx + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.original}\n${s.translated}\n`;
        })
        .join('\n');
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(format.toUpperCase());
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const isUserScrollingPaused = Date.now() < userInterruptedUntil;

  return (
    <div className="flex flex-col h-full bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Controls Bar */}
      <div className="p-4 border-b border-neutral-800/80 space-y-3 bg-neutral-950/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Phụ đề Song ngữ</h2>
              <p className="text-xs text-neutral-400">
                {subtitles.length} câu • {activeIndex >= 0 ? `Câu ${activeIndex + 1}` : 'Chờ phát'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle */}
            <div className="flex bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-700/50">
              <button
                onClick={() => setLayoutMode('side-by-side')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  layoutMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="Song song 2 cột"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLayoutMode('stacked')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  layoutMode === 'stacked' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="Dạng dòng nối tiếp"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font Size Selector */}
            <div className="flex bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-700/50">
              {(['sm', 'base', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`px-2 py-1 rounded text-xs font-semibold uppercase transition-colors ${
                    fontSize === sz ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {sz === 'sm' ? 'A-' : sz === 'base' ? 'A' : 'A+'}
                </button>
              ))}
            </div>

            {/* Export Dropdown */}
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700/50 transition-colors"
                title="Tải phụ đề về máy"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{downloadSuccess}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Lưu</span>
                  </>
                )}
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 z-30 min-w-[120px]">
                <button
                  onClick={() => handleExport('srt')}
                  className="px-3 py-1.5 text-left text-xs text-neutral-300 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  Tải .SRT (SubRip)
                </button>
                <button
                  onClick={() => handleExport('txt')}
                  className="px-3 py-1.5 text-left text-xs text-neutral-300 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  Tải .TXT (Văn bản)
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="px-3 py-1.5 text-left text-xs text-neutral-300 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  Tải .JSON (Dữ liệu)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar & Auto-Scroll status */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung phụ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          {/* Auto-Scroll Toggle */}
          <button
            onClick={() => {
              setIsAutoScrollLocked(!isAutoScrollLocked);
              setUserInterruptedUntil(0);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isAutoScrollLocked && !isUserScrollingPaused
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700/50 hover:text-neutral-200'
            }`}
            title="Tự động cuộn theo tiến trình video"
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${isAutoScrollLocked ? 'animate-bounce' : ''}`} />
            <span>
              {isUserScrollingPaused
                ? 'Tạm dừng cuộn (5s)'
                : isAutoScrollLocked
                ? 'Tự cuộn: Bật'
                : 'Tự cuộn: Tắt'}
            </span>
          </button>
        </div>
      </div>

      {/* Subtitles Scrollable List Container */}
      <div
        ref={containerRef}
        onWheel={handleUserInteraction}
        onTouchMove={handleUserInteraction}
        className="flex-1 overflow-y-auto p-4 space-y-2.5 scroll-smooth custom-scrollbar"
      >
        {filteredSubtitles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-neutral-500 text-xs">
            <Search className="w-8 h-8 mb-2 opacity-40" />
            <p>Không tìm thấy đoạn phụ đề nào khớp với từ khóa.</p>
          </div>
        ) : (
          filteredSubtitles.map((segment) => {
            const isCurrentlyActive =
              activeIndex >= 0 && subtitles[activeIndex]?.id === segment.id;
            return (
              <SubtitleRow
                key={segment.id}
                segment={segment}
                isActive={isCurrentlyActive}
                onSeek={onSeek}
                fontSize={fontSize}
                layoutMode={layoutMode}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
