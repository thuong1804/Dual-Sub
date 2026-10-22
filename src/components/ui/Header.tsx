'use client';

import React, { useState, useEffect } from 'react';
import { Subtitles, Sparkles, Key, X, Code2, Check, ExternalLink } from 'lucide-react';

export const Header: React.FC = () => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setGeminiKey(savedKey);
    }
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', geminiKey.trim());
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setShowConfigModal(false);
      }, 1200);
    }
  };

  const handleClearKey = () => {
    setGeminiKey('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gemini_api_key');
    }
  };

  return (
    <>
      <header className="w-full border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Subtitles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  DualSub<span className="text-indigo-400">.ai</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                YouTube Dual-Subtitle & Real-Time AI Translation
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{geminiKey ? 'API Key: Đã lưu' : 'Cấu hình API'}</span>
            </button>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
              title="GitHub Repository"
            >
              <Code2 className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-2 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold text-white text-base">Cấu hình Translation Engine</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed mb-5">
              Hệ thống tích hợp sẵn bộ dịch miễn phí tốc độ cao, hoặc bạn có thể dán Google Gemini API Key để dịch theo ngữ cảnh LLM tốt nhất.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Google Gemini API Key (Miễn phí từ Google AI Studio)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                  >
                    <span>Lấy Key miễn phí</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {geminiKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs px-1.5 py-0.5 rounded"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Key được lưu an toàn trong trình duyệt của bạn (Local Storage) hoặc có thể lưu vào file <code>.env.local</code>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-800/40 border border-neutral-700/50 text-xs space-y-1 text-neutral-300">
                <p className="font-medium text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Bộ dịch dự phòng tự động (Đang hoạt động)</span>
                </p>
                <p className="text-[11px] text-neutral-400">
                  Nếu không có API key, hệ thống sẽ sử dụng bộ dịch Google Translate Batch siêu tốc để dịch sang tiếng Việt mà không tốn chi phí.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã lưu thành công!</span>
                    </>
                  ) : (
                    <span>Lưu cấu hình</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
                >
                  Đóng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
