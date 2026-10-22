'use client';

import React, { useState } from 'react';
import { Subtitles, Sparkles, Key, HelpCircle, X, Code2 } from 'lucide-react';

export const Header: React.FC = () => {
  const [showConfigModal, setShowConfigModal] = useState(false);

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
              <span>Cấu hình API</span>
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
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold text-white text-base">Cấu hình Translation Engine</h3>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
              Hệ thống hỗ trợ 2 chế độ dịch thuật:
            </p>

            <div className="space-y-3 text-xs mb-5">
              <div className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                <p className="font-semibold text-neutral-200 mb-1">1. Chế độ Mặc định (Out-of-the-box)</p>
                <p className="text-neutral-400">
                  Hoạt động ngay lập tức mà <strong className="text-emerald-400">không cần API key</strong> nhờ bộ dịch dự phòng tự động.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                <p className="font-semibold text-indigo-300 mb-1">2. Chế độ AI Contextual (Khuyên dùng)</p>
                <p className="text-neutral-300 mb-2">
                  Để kích hoạt dịch hàng loạt theo ngữ cảnh qua <strong>Gemini 1.5 Flash</strong> hoặc <strong>GPT-4o-mini</strong>:
                </p>
                <code className="block bg-neutral-950 p-2 rounded text-[11px] font-mono text-neutral-300 border border-neutral-800">
                  # Thêm vào file .env.local<br />
                  GEMINI_API_KEY=your_gemini_key<br />
                  # hoặc<br />
                  OPENAI_API_KEY=your_openai_key
                </code>
              </div>
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
};
