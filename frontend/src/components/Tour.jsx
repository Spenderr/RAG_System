import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, Upload, MessageSquare, FolderGit2, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

const Tour = ({ onClose }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(6);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      setIsUnlocked(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsUnlocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const progressPercent = Math.min(100, Math.round(((6 - secondsRemaining) / 6) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={isUnlocked ? onClose : undefined}
      />

      {/* Card */}
      <div className="relative w-[560px] max-w-[95vw] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Header accent line */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500" />

        {/* Close button (active only after unlock or accessible with skip) */}
        {isUnlocked && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Content */}
        <div className="p-7 sm:p-8 space-y-6">
          {/* Top Badge & Header */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>MainChunk Live Demo Environment</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome to Autonomous RAG Intelligence
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
              Experience end-to-end document intake, vector embeddings, and grounded AI synthesis in real-time.
            </p>
          </div>

          {/* Ephemeral Notice Box */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold block mb-0.5">Ephemeral Session Storage:</span>
              This is an interactive public demo. Any documents, photos, or text memos you upload are stored temporarily in a sandbox session and will <strong>not persist</strong> after restarts or refresh.
            </div>
          </div>

          {/* 3 Step Testing Guide */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              How to Test the System
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 font-bold text-xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">1. Upload Files</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Upload PDFs, property deed scans, or memos. AI auto-names and categorizes them.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-2 font-bold text-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">2. Chat with AI</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Ask questions in natural language. AI answers with verifiable inline citations.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 font-bold text-xs">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">3. Full-Screen View</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Click any citation or card to browse documents using arrow keys.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Timer Progress & Unlock Button */}
        <div className="px-7 sm:px-8 py-4.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Progress / Status indicator */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isUnlocked ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <Clock className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Reading overview... <strong className="font-mono text-indigo-600">{secondsRemaining}s</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ready to explore</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            disabled={!isUnlocked}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer ${
              isUnlocked
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{isUnlocked ? 'Start Exploring Demo' : `Please wait (${secondsRemaining}s)`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle timer progress bar at bottom */}
        {!isUnlocked && (
          <div className="w-full bg-slate-100 h-1">
            <div
              className="bg-indigo-600 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Tour;
