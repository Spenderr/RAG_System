import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, X, Upload, Sparkles, MessageSquare, Bot, Users, User, Layers, Clock, CheckCircle2, Zap } from 'lucide-react';

const COUNTDOWN_SECONDS = 5;

const Tour = ({ onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [revealedSteps, setRevealedSteps] = useState([false, false, false]);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);

  // Sequential Staggered Card Reveals on Page Change
  useEffect(() => {
    setRevealedSteps([false, false, false]);
    setSecondsLeft(COUNTDOWN_SECONDS);

    const t1 = setTimeout(() => setRevealedSteps([true, false, false]), 100);
    const t2 = setTimeout(() => setRevealedSteps([true, true, false]), 300);
    const t3 = setTimeout(() => setRevealedSteps([true, true, true]), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [currentPage]);

  // 5-Second Countdown Timer per Slide (Runs after card entrance animations)
  useEffect(() => {
    if (isPaused || isExiting) return;

    // Small initial delay so user sees cards finish animating before timer ticks
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Automatic transition when countdown hits 0
            if (currentPage === 1) {
              setCurrentPage(2);
            } else {
              handleStartExploring();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 600);

    return () => {
      clearTimeout(startDelay);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentPage, isPaused, isExiting]);

  // Elegant, Smooth Fade-Out Exit
  const handleStartExploring = () => {
    if (isExiting) return;
    setIsExiting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleNextPage = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentPage(2);
  };

  const handlePrevPage = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentPage(1);
  };

  const progressPercent = Math.min(100, Math.round(((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Backdrop with Smooth Fade-Out */}
      <div
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-all duration-500 ease-in-out ${
          isExiting ? 'opacity-0 backdrop-blur-none' : 'opacity-100'
        }`}
        onClick={handleStartExploring}
      />

      {/* Card Modal with Smooth Scale & Fade-Out */}
      <div
        className={`relative w-[640px] max-w-[95vw] bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 transition-all duration-500 ease-out transform ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-4'
            : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-95 duration-200'
        }`}
      >
        {/* Top Gradient Accent */}
        <div className={`h-2 transition-all duration-500 bg-gradient-to-r ${
          currentPage === 1
            ? 'from-blue-600 via-indigo-600 to-emerald-500'
            : 'from-orange-500 via-amber-500 to-indigo-600'
        }`} />

        {/* 5-Second Progress Bar */}
        <div className="w-full bg-slate-100 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              currentPage === 1 ? 'bg-indigo-600' : 'bg-orange-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={handleStartExploring}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-20 cursor-pointer"
          title="Close Tour"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* SLIDE 1: Autonomous Ingestion & AI Intelligence */}
          {currentPage === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-extrabold uppercase tracking-widest shadow-2xs">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Step 1 of 2 · Autonomous RAG Pipeline</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Document Warehouse & Autonomous AI
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                  Self-organizing document warehouse with grounded zero-hallucination AI and exact page citations.
                </p>
              </div>

              {/* 3 Step Cards - Full text, No truncating */}
              <div className="space-y-3">
                {/* Step 1 */}
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-100/90 flex items-start gap-4 transition-all duration-300 ease-out shadow-2xs ${
                    revealedSteps[0]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20 mt-0.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        1. Direct Intake & Multi-Format Dropzone
                      </h3>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-lg shrink-0">
                        Instant Ingest
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                      Drag and drop PDF contracts, real estate deed scans, images, or paste unstructured notes directly into your workspace.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-r from-violet-50/90 via-purple-50/40 to-white border border-violet-100/90 flex items-start gap-4 transition-all duration-300 ease-out shadow-2xs ${
                    revealedSteps[1]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/20 mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        2. Autonomous Organization & Vector Indexing
                      </h3>
                      <span className="text-[10px] font-bold text-violet-700 bg-violet-100/90 border border-violet-200 px-2 py-0.5 rounded-lg shrink-0">
                        ChromaDB Vectors
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                      AI auto-categorizes files, organizes folders, generates dense vector embeddings, and stores indexed chunks for lightning-fast retrieval.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white border border-emerald-100/90 flex items-start gap-4 transition-all duration-300 ease-out shadow-2xs ${
                    revealedSteps[2]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20 mt-0.5">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        3. Grounded AI Search & Exact Page Citations
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-lg shrink-0">
                        Verified Citations
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                      Ask complex questions and get factual, zero-hallucination answers backed by clickable source page highlights and confidence metrics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Dual Workspaces: Team (Orange) vs Personal (Indigo) */}
          {currentPage === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-extrabold uppercase tracking-widest shadow-2xs">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span>Step 2 of 2 · Dual Workspace Architecture</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Team vs. Personal Workspaces
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                  Collaborative shared company knowledge base alongside isolated private client files.
                </p>
              </div>

              {/* 3 Step Cards - Full text, No truncating */}
              <div className="space-y-3">
                {/* Team Portfolios */}
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-r from-orange-50/95 via-amber-50/40 to-white border border-orange-200/90 flex items-start gap-4 transition-all duration-300 ease-out shadow-2xs ${
                    revealedSteps[0]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 mt-0.5">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Team Portfolios (Shared Library)
                      </h3>
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100/90 border border-orange-200 px-2 py-0.5 rounded-lg shrink-0">
                        Team Shared
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                      Shared digital warehouse for you and your colleagues. Upload company assets, deeds, and portfolios that the entire team can query and collaborate on.
                    </p>
                  </div>
                </div>

                {/* Personal Portfolios */}
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-r from-indigo-50/95 via-blue-50/40 to-white border border-indigo-200/90 flex items-start gap-4 transition-all duration-300 ease-out shadow-2xs ${
                    revealedSteps[1]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 mt-0.5">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Personal Portfolios (Private Vault)
                      </h3>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded-lg shrink-0">
                        Private Vault
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                      Confidential client files, sensitive contracts, and individual drafts strictly isolated to your own profile without team visibility.
                    </p>
                  </div>
                </div>

                {/* Scoped Cross-Search */}
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-slate-100/50 to-white border border-slate-200 flex items-start gap-4 transition-all duration-300 ease-out shadow-2xs ${
                    revealedSteps[2]
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-md shadow-slate-800/20 mt-0.5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Scoped Vector Retrieval & Cross-Search
                      </h3>
                      <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                        Scoped AI
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                      Seamlessly target your AI questions to a single folder, your private notes, team workspaces, or query the entire document warehouse in one unified prompt.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ephemeral Demo Notice */}
          <div className="text-center pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span><strong>Live Session:</strong> Uploads and portfolios are processed dynamically in real-time.</span>
            </span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-4">
          {/* Left Button / Back / Countdown indicator */}
          <div className="flex items-center gap-2">
            {currentPage === 2 ? (
              <button
                onClick={handlePrevPage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                onClick={handleStartExploring}
                className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer px-2"
              >
                Skip Tour
              </button>
            )}

            {/* Countdown Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono font-semibold">
              <Clock className={`w-3.5 h-3.5 ${currentPage === 1 ? 'text-indigo-600' : 'text-orange-500'} ${secondsLeft > 0 ? 'animate-spin' : ''}`} />
              <span>{secondsLeft > 0 ? `${secondsLeft}s` : 'Ready'}</span>
            </div>
          </div>

          {/* Center Pagination Dots */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                currentPage === 1 ? 'w-8 bg-indigo-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title="Page 1: RAG Pipeline"
            />
            <button
              onClick={() => setCurrentPage(2)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                currentPage === 2 ? 'w-8 bg-orange-500' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title="Page 2: Team vs Personal Workspaces"
            />
          </div>

          {/* Right Button / Next / Start Exploring */}
          {currentPage === 1 ? (
            <button
              onClick={handleNextPage}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 hover:scale-[1.02]"
            >
              <span>Next: Workspaces</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleStartExploring}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 transition-all duration-200 cursor-pointer active:scale-95 hover:scale-[1.02]"
            >
              <span>Start Exploring</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tour;
