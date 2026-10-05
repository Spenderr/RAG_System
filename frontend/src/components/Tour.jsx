import React, { useState, useEffect } from 'react';
import { ArrowRight, X, Upload, Sparkles, MessageSquare, Bot, Clock, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={isUnlocked ? onClose : undefined}
      />

      {/* Card */}
      <div className="relative w-[500px] max-w-[94vw] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Top Gradient Bar */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600" />

        {/* Close Button */}
        {isUnlocked && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-7 space-y-5">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Live Demo Environment</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Autonomous Document Intelligence
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Upload documents, let AI organize them into portfolios, and query them in real-time.
            </p>
          </div>

          {/* 3 Bold Animated Cards */}
          <div className="space-y-2.5">
            {/* Step 1 */}
            <div className="group p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-blue-100 flex items-center gap-3.5 hover:border-blue-300 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>1. Upload Any File</span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-md">PDF · Photo · Note</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Drop messy scans, deeds, or notes. No manual naming needed.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group p-3.5 rounded-2xl bg-gradient-to-r from-violet-50/70 to-purple-50/40 border border-violet-100 flex items-center gap-3.5 hover:border-violet-300 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>2. Autonomous Auto-Naming & Folders</span>
                  <span className="text-[10px] font-semibold text-violet-600 bg-violet-100/80 px-2 py-0.5 rounded-md">AI Stored</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  AI reads the contents and places files into ideal portfolio folders with standard names.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-teal-50/40 border border-emerald-100 flex items-center gap-3.5 hover:border-emerald-300 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>3. Ask Anything via AI Chat</span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md">Grounded Citations</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Instantly find and consult any clause or parcel with verifiable citations.
                </p>
              </div>
            </div>
          </div>

          {/* Ephemeral Notice */}
          <div className="text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              ⚡ <strong>Demo Mode:</strong> Uploads are temporary for this session and reset on refresh.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            {!isUnlocked ? (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Ready in <strong className="text-indigo-600 font-mono">{secondsRemaining}s</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready!</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            disabled={!isUnlocked}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
              isUnlocked
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{isUnlocked ? 'Start Exploring' : `Please wait (${secondsRemaining}s)`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
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
