import React, { useState, useEffect } from 'react';
import { ArrowRight, X, Upload, Sparkles, MessageSquare, Bot, Clock, CheckCircle2 } from 'lucide-react';

const Tour = ({ onClose }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(6);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState([false, false, false]);
  const [isExiting, setIsExiting] = useState(false);

  // Sequential Staggered Card Reveals
  useEffect(() => {
    const t1 = setTimeout(() => setRevealedSteps([true, false, false]), 200);
    const t2 = setTimeout(() => setRevealedSteps([true, true, false]), 900);
    const t3 = setTimeout(() => setRevealedSteps([true, true, true]), 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Countdown Timer
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

  // Elegant, Slow Fade-Out Exit
  const handleStartExploring = () => {
    if (!isUnlocked || isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 650);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-700 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Backdrop with Slow Fade-Out */}
      <div
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-all duration-700 ease-in-out ${
          isExiting ? 'opacity-0 backdrop-blur-none' : 'opacity-100'
        }`}
        onClick={isUnlocked ? handleStartExploring : undefined}
      />

      {/* Card Modal with Smooth Scale & Fade-Out */}
      <div
        className={`relative w-[480px] max-w-[94vw] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 transition-all duration-700 ease-out transform ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-6'
            : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-95 duration-200'
        }`}
      >
        {/* Top Gradient Accent */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500" />

        {/* Close Button */}
        {isUnlocked && (
          <button
            onClick={handleStartExploring}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-7 sm:p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1.5 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Live Demo Environment</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Autonomous Document Intelligence
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Self-organizing document warehouse with grounded AI search.
            </p>
          </div>

          {/* 3 Bold Sequentially Animated Cards */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div
              className={`p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/40 border border-blue-100 flex items-center justify-between gap-3 shadow-2xs transition-all duration-500 ease-out transform ${
                revealedSteps[0]
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  1. Upload Any File
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wide text-blue-700 bg-blue-100/90 px-2.5 py-1 rounded-lg shrink-0">
                PDF · Photo · Note
              </span>
            </div>

            {/* Step 2 */}
            <div
              className={`p-4 rounded-2xl bg-gradient-to-r from-violet-50/80 to-purple-50/40 border border-violet-100 flex items-center justify-between gap-3 shadow-2xs transition-all duration-500 ease-out transform ${
                revealedSteps[1]
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  2. AI Auto-Naming & Folders
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wide text-violet-700 bg-violet-100/90 px-2.5 py-1 rounded-lg shrink-0">
                Auto Stored
              </span>
            </div>

            {/* Step 3 */}
            <div
              className={`p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/40 border border-emerald-100 flex items-center justify-between gap-3 shadow-2xs transition-all duration-500 ease-out transform ${
                revealedSteps[2]
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  3. Ask Anything via AI Chat
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wide text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-lg shrink-0">
                Grounded Citations
              </span>
            </div>
          </div>

          {/* Ephemeral Notice */}
          <div className="text-center pt-1">
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
            onClick={handleStartExploring}
            disabled={!isUnlocked || isExiting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
              isUnlocked && !isExiting
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
