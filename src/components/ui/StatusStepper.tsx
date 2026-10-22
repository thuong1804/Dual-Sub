'use client';

import React from 'react';
import { ProcessingStep } from '@/types/subtitles';
import { CheckCircle2, Loader2, Sparkles, FileText, Check } from 'lucide-react';

interface StatusStepperProps {
  currentStep: ProcessingStep;
  error?: string | null;
}

interface StepDef {
  key: ProcessingStep;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  {
    key: 'validating',
    label: 'Xác thực Video',
    desc: 'Kiểm tra đường dẫn & phân giải Video ID',
    icon: CheckCircle2,
  },
  {
    key: 'extracting',
    label: 'Bóc tách Phụ đề',
    desc: 'Trích xuất transcript gốc & ghép câu tự nhiên',
    icon: FileText,
  },
  {
    key: 'translating',
    label: 'Dịch thuật AI',
    desc: 'Xử lý ngữ cảnh từng cụm câu theo thời gian thực',
    icon: Sparkles,
  },
];

export const StatusStepper: React.FC<StatusStepperProps> = ({ currentStep, error }) => {
  if (currentStep === 'idle' || currentStep === 'ready') return null;

  const stepOrder: ProcessingStep[] = ['validating', 'extracting', 'translating'];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          <span>Đang xử lý phụ đề thông minh...</span>
        </h3>
        <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded-full">
          Bước {Math.max(1, currentIndex + 1)} / 3
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((step, idx) => {
          const isDone = currentIndex > idx;
          const isCurrent = currentIndex === idx;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`p-3.5 rounded-xl border transition-all duration-300 ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                  : isCurrent
                  ? 'bg-indigo-950/40 border-indigo-500/60 text-white shadow-lg shadow-indigo-950/50'
                  : 'bg-neutral-900/40 border-neutral-800/60 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-neutral-950'
                      : isCurrent
                      ? 'bg-indigo-500 text-white animate-pulse'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className="text-xs font-semibold">{step.label}</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">{step.desc}</p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}
    </div>
  );
};
