import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, Upload, ClipboardList, Eraser, Scissors, Database } from 'lucide-react';

const TOUR_STEPS = [
  {
    icon: Upload,
    title: 'Upload & Ingest',
    subtitle: 'Step 1 of 5',
    description: 'Upload your PDF, TXT, or PNG/JPG image documents. Drag & drop or click to browse files.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    icon: ClipboardList,
    title: 'Queue & Extraction',
    subtitle: 'Step 2 of 5',
    description: 'Your document is queued for processing. Multimodal AI extracts full text, tables, and notes.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    icon: Eraser,
    title: 'Clean & Partition',
    subtitle: 'Step 3 of 5',
    description: 'Text is parsed, soft wraps are repaired, and citations/noise are removed for higher retrieval quality.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    icon: Scissors,
    title: 'Semantic Section Chunking',
    subtitle: 'Step 4 of 5',
    description: 'The cleaned text is split into title- and paragraph-aware semantic chunks without splitting mid-sentence.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    icon: Database,
    title: 'Embed, Ground & Organize',
    subtitle: 'Step 5 of 5',
    description: 'Chunks are converted to OpenAI vector embeddings in ChromaDB and automatically grouped into organizations.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
];

const Tour = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animDir, setAnimDir] = useState('in');

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setAnimDir('out');
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setAnimDir('in');
    }, 200);
  };

  const goBack = () => {
    if (currentStep === 0) return;
    setAnimDir('out');
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setAnimDir('in');
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-[500px] max-w-[94vw] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header accent line */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* Content */}
        <div className="p-8">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Processing Pipeline Tour
            </span>
          </div>

          {/* Animated step content */}
          <div
            key={currentStep}
            className={`transition-all duration-200 ${
              animDir === 'in'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl ${step.bg} ${step.border} border flex items-center justify-center mb-5 shadow-sm`}>
              <step.icon className={`w-8 h-8 ${step.color}`} />
            </div>

            {/* Subtitle */}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {step.subtitle}
            </p>

            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-slate-600 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-between border-t border-slate-100 pt-4 bg-slate-50/50">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-indigo-600'
                    : idx < currentStep
                    ? 'w-2 bg-indigo-300'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={goBack}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
            >
              {isLast ? 'Get Started' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tour;
