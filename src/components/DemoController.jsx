import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Play, AlertCircle, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export function DemoController({ isRunning, onStop, currentStepText }) {
  if (!isRunning) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl glass-panel rounded-2xl p-4 border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 bg-slate-900/95 animate-slideUp">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[2px] flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-heading">
                Live Presentation Demo Active
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                AUTONOMOUS MODE
              </span>
            </div>
            <p className="text-xs text-slate-100 font-medium mt-0.5 animate-pulse">
              {currentStepText}
            </p>
          </div>
        </div>

        <button
          onClick={onStop}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
