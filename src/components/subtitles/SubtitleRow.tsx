'use client';

import React, { useState } from 'react';
import { SubtitleSegment } from '@/types/subtitles';
import { formatTimestamp } from '@/lib/utils/youtube';
import { Play, Check, Copy } from 'lucide-react';

interface SubtitleRowProps {
  segment: SubtitleSegment;
  isActive: boolean;
  onSeek: (start: number) => void;
  fontSize?: 'sm' | 'base' | 'lg';
  layoutMode?: 'side-by-side' | 'stacked';
}

export const SubtitleRow: React.FC<SubtitleRowProps> = ({
  segment,
  isActive,
  onSeek,
  fontSize = 'base',
  layoutMode = 'side-by-side',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${segment.original}\n${segment.translated}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const textClasses = {
    sm: 'text-xs md:text-sm',
    base: 'text-sm md:text-base',
    lg: 'text-base md:text-lg',
  }[fontSize];

  return (
    <div
      id={`sub-segment-${segment.id}`}
      onClick={() => onSeek(segment.start)}
      className={`group relative p-3.5 rounded-xl cursor-pointer transition-all duration-200 border select-text ${
        isActive
          ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/20'
          : 'bg-neutral-900/40 border-neutral-800/60 hover:bg-neutral-800/50 hover:border-neutral-700/80'
      }`}
    >
      {/* Active accent vertical line indicator */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
      )}

      {/* Row Header with timestamp & actions */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSeek(segment.start);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium transition-all ${
            isActive
              ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
              : 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-neutral-200'
          }`}
          title="Nhấp để nhảy tới thời điểm này"
        >
          <Play className={`w-2.5 h-2.5 ${isActive ? 'fill-white' : ''}`} />
          <span>{formatTimestamp(segment.start)}</span>
        </button>

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Sao chép đoạn phụ đề"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content: Side-by-side or Stacked */}
      {layoutMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Original Text */}
          <div className="text-neutral-300 font-normal leading-relaxed">
            <span className={textClasses}>{segment.original}</span>
          </div>
          {/* Translated Text */}
          <div className="text-indigo-200/90 font-medium leading-relaxed border-t md:border-t-0 md:border-l border-neutral-800/80 pt-2 md:pt-0 md:pl-3">
            <span className={textClasses}>{segment.translated}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="text-neutral-300 font-normal leading-relaxed">
            <span className={textClasses}>{segment.original}</span>
          </div>
          <div className="text-indigo-300 font-medium leading-relaxed">
            <span className={textClasses}>{segment.translated}</span>
          </div>
        </div>
      )}
    </div>
  );
};
