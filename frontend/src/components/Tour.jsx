import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, X, Upload, Sparkles, MessageSquare, Bot, Clock, CheckCircle2, Users, User, Layers } from 'lucide-react';

const Tour = ({ onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState([false, false, false]);
  const [isExiting, setIsExiting] = useState(false);

  // Sequential Staggered Card Reveals on Page Change
  useEffect(() => {
    setRevealedSteps([false, false, false]);
    const t1 = setTimeout(() => setRevealedSteps([true, false, false]), 150);
    const t2 = setTimeout(() => setRevealedSteps([true, true, false]), 550);
    const t3 = setTimeout(() => setRevealedSteps([true, true, true]), 950);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [currentPage]);

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

  const progressPercent = Math.min(100, Math.round(((4 - secondsRemaining) / 4) * 100));

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
        className={`relative w-[520px] max-w-[94vw] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 transition-all duration-700 ease-out transform ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-6'
            : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-95 duration-200'
        }`}
      >
        {/* Top Gradient Accent */}
        <div className={`h-1.5 transition-all duration-500 bg-gradient-to-r ${
          currentPage === 1
            ? 'from-blue-600 via-indigo-600 to-emerald-500'
            : 'from-orange-500 via-amber-500 to-indigo-600'
        }`} />

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

        <div className="p-7 sm:p-8 space-y-5">
          {/* SLIDE 1: Autonomous Ingestion & AI Intelligence */}
          {currentPage === 1 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1.5 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Step 1 of 2 · Autonomous RAG Pipeline</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Document Warehouse & AI Intelligence
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  Self-organizing document warehouse with grounded zero-hallucination AI.
                </p>
              </div>

              {/* 3 Step Cards */}
              <div className="space-y-2.5">
                {/* Step 1 */}
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/40 border border-blue-100 flex items-center justify-between gap-3 transition-all duration-400 ease-out transform ${
                    revealedSteps[0]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        1. Direct Intake & Dropzone
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        Drag & drop PDFs, deed scans, photos or voice notes
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg shrink-0">
                    Dropzone
                  </span>
                </div>

                {/* Step 2 */}
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-r from-violet-50/80 to-purple-50/40 border border-violet-100 flex items-center justify-between gap-3 transition-all duration-400 ease-out transform ${
                    revealedSteps[1]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        2. Autonomous Organization
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        AI auto-names files, tags folders & indexes into ChromaDB
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-lg shrink-0">
                    ChromaDB
                  </span>
                </div>

                {/* Step 3 */}
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/40 border border-emerald-100 flex items-center justify-between gap-3 transition-all duration-400 ease-out transform ${
                    revealedSteps[2]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        3. Grounded AI & Page Citations
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        Ask questions and get answers with clickable source citations
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg shrink-0">
                    Citations
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Dual Workspaces: Team (Orange) vs Personal (Indigo) */}
          {currentPage === 2 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1.5 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-extrabold uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-orange-600" />
                  <span>Step 2 of 2 · Dual Workspace Architecture</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Team vs. Personal Workspaces
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  Collaborative company library alongside isolated personal drafts.
                </p>
              </div>

              {/* 3 Step Cards */}
              <div className="space-y-2.5">
                {/* Team Portfolios */}
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-r from-orange-50/90 to-amber-50/40 border border-orange-200 flex items-center justify-between gap-3 transition-all duration-400 ease-out transform ${
                    revealedSteps[0]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Team Portfolios (Orange)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        Shared digital warehouse uploaded collaboratively with colleagues
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-lg shrink-0">
                    Team Space
                  </span>
                </div>

                {/* Personal Portfolios */}
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-blue-50/40 border border-indigo-200 flex items-center justify-between gap-3 transition-all duration-400 ease-out transform ${
                    revealedSteps[1]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Personal Portfolios (Indigo)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        Confidential client files & notes isolated to your profile
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-lg shrink-0">
                    Private
                  </span>
                </div>

                {/* Scoped Cross-Search */}
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/70 border border-slate-200 flex items-center justify-between gap-3 transition-all duration-400 ease-out transform ${
                    revealedSteps[2]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Scoped Vector Retrieval
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        Query your private notes, team folders, or all documents
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                    Scoped AI
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ephemeral Demo Notice */}
          <div className="text-center pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium">
              ⚡ <strong>Demo Mode:</strong> Uploads are temporary for this live session and reset on refresh.
            </span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-7 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          {/* Left Button / Back */}
          {currentPage === 2 ? (
            <button
              onClick={() => setCurrentPage(1)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {!isUnlocked ? (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span>Ready in <strong className="text-indigo-600 font-mono">{secondsRemaining}s</strong></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready!</span>
                </div>
              )}
            </div>
          )}

          {/* Center Pagination Dots */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentPage === 1 ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              title="Page 1: RAG Pipeline"
            />
            <button
              onClick={() => setCurrentPage(2)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentPage === 2 ? 'w-6 bg-orange-500' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              title="Page 2: Team vs Personal Workspaces"
            />
          </div>

          {/* Right Button / Next / Start */}
          {currentPage === 1 ? (
            <button
              onClick={() => setCurrentPage(2)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
            >
              <span>Next: Workspaces</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleStartExploring}
              disabled={!isUnlocked || isExiting}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                isUnlocked && !isExiting
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{isUnlocked ? 'Start Exploring' : `Please wait (${secondsRemaining}s)`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Top Countdown Bar */}
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

