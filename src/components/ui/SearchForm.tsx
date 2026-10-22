'use client';

import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '@/types/subtitles';
import { Search, Sparkles, Video, Globe, ArrowRight, X } from 'lucide-react';

interface SearchFormProps {
  onSubmit: (url: string, targetLanguage: string) => void;
  isLoading: boolean;
}

const SAMPLE_VIDEOS = [
  {
    title: 'Never Gonna Give You Up',
    id: 'dQw4w9WgXcQ',
    label: 'Rick Astley (Classic)',
  },
  {
    title: 'Steve Jobs Stanford Speech',
    id: 'UF8uR6Z6KLc',
    label: 'Steve Jobs Stanford',
  },
  {
    title: 'The Origin of Life',
    id: 'b8k0-FkP6x4',
    label: 'Kurzgesagt',
  },
];

export const SearchForm: React.FC<SearchFormProps> = ({ onSubmit, isLoading }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [targetLang, setTargetLang] = useState('vi');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || isLoading) return;
    onSubmit(inputUrl.trim(), targetLang);
  };

  const handleSelectSample = (id: string) => {
    const url = `https://www.youtube.com/watch?v=${id}`;
    setInputUrl(url);
    onSubmit(url, targetLang);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5 p-2 bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl transition-all duration-300 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20">
          {/* URL Input */}
          <div className="relative flex-1 flex items-center">
            <div className="pl-3.5 pr-2 text-red-500 flex items-center">
              <Video className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Dán link YouTube hoặc Video ID (vd: https://youtu.be/...)"
              disabled={isLoading}
              className="w-full bg-transparent py-3 pr-8 text-sm text-white placeholder-neutral-500 focus:outline-none disabled:opacity-50"
            />
            {inputUrl && !isLoading && (
              <button
                type="button"
                onClick={() => setInputUrl('')}
                className="p-1 text-neutral-400 hover:text-white transition-colors mr-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center border-t sm:border-t-0 sm:border-l border-neutral-800/80 pt-2 sm:pt-0 sm:pl-2">
            <div className="relative flex items-center w-full sm:w-auto">
              <div className="pl-2.5 pr-1.5 text-indigo-400">
                <Globe className="w-4 h-4" />
              </div>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={isLoading}
                aria-label="Chọn ngôn ngữ dịch"
                className="w-full sm:w-auto bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/60 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-neutral-900 text-white">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!inputUrl.trim() || isLoading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Xem Phụ Đề</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Sample Quick-pick Buttons */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
        <span className="flex items-center gap-1 text-neutral-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Thử video mẫu:</span>
        </span>
        {SAMPLE_VIDEOS.map((sample) => (
          <button
            key={sample.id}
            onClick={() => handleSelectSample(sample.id)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all text-xs disabled:opacity-50"
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
};
