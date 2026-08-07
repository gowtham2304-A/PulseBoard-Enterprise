import React, { useState } from 'react';
import { X, GitCommit, Sparkles, Code, CheckCircle, ArrowRight } from 'lucide-react';
import { SAMPLE_COMMITS } from '../data/initialData';

export function CommitSimulatorModal({ isOpen, onClose, onPushCommit }) {
  const [selectedPreset, setSelectedPreset] = useState(SAMPLE_COMMITS[0]);
  const [commitMessage, setCommitMessage] = useState(SAMPLE_COMMITS[0].message);
  const [diffCode, setDiffCode] = useState(SAMPLE_COMMITS[0].diff);
  const [author, setAuthor] = useState(SAMPLE_COMMITS[0].author);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  if (!isOpen) return null;

  const steps = [
    'Connecting to GitHub Webhook...',
    'Extracting raw git diff (2 files, +34/-12)...',
    'Analyzing code diff semantics with Gemini LLM...',
    'Matching inferred intent to task board...',
    'Updating Task Status & generating 1-line AI summary...'
  ];

  const handleSelectPreset = (commit) => {
    setSelectedPreset(commit);
    setCommitMessage(commit.message);
    setDiffCode(commit.diff);
    setAuthor(commit.author);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setStepIndex(0);

    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            onPushCommit({
              sha: Math.random().toString(16).substring(2, 9),
              author,
              message: commitMessage,
              diff: diffCode
            });
            onClose();
          }, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading">Simulate GitHub Commit Push</h2>
              <p className="text-xs text-slate-400">
                Push a commit and let AI read the code diff (even with vague messages like "wip")
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isProcessing ? (
          <div className="p-10 text-center flex flex-col items-center justify-center min-h-[350px]">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            </div>

            <h3 className="text-lg font-bold font-heading mb-2 text-indigo-200">
              PulseBoard Autonomous AI at Work
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-6">
              Reading raw git patch diff and inferring task progress without manual user input...
            </p>

            {/* Step Progress Bar */}
            <div className="w-full max-w-md bg-slate-900 rounded-full h-2 mb-4 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              ></div>
            </div>

            <div className="text-xs font-mono text-cyan-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{steps[stepIndex]}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Quick Preset Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Pre-Configured Demo Commit:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_COMMITS.map((commit) => (
                  <button
                    key={commit.id}
                    type="button"
                    onClick={() => handleSelectPreset(commit)}
                    className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                      selectedPreset.id === commit.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono text-[11px] text-cyan-400 font-semibold mb-0.5">
                      #{commit.sha} ("{commit.message}")
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{commit.author}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Author & Commit Message */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Commit Message <span className="text-slate-400 font-normal">(Try vague: "wip" or "fix")</span>
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Code Diff Editor */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Raw Git Code Diff Patch:
              </label>
              <textarea
                value={diffCode}
                onChange={(e) => setDiffCode(e.target.value)}
                rows={7}
                className="w-full bg-slate-950 font-mono text-[11px] text-emerald-400 p-3 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none leading-relaxed"
                required
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Push & Trigger AI Analysis</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
