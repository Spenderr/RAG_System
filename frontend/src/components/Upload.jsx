import React, { useState, useRef, useEffect } from 'react';
import {
  Upload as UploadIcon, File, CheckCircle2, Loader2,
  ArrowRight, X, Send, Trash2, ChevronDown, ChevronRight, BookOpen,
  Building2, Tag, Eye, FileText, ExternalLink, Image as ImageIcon,
  Plus, Sparkles, Check, Sparkle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Pipeline step definitions ─────────────────────────────────
const STEPS = [
  { id: 'upload', title: 'Upload', desc: 'File received' },
  { id: 'queue', title: 'Queue', desc: 'Waiting for processor' },
  { id: 'clean', title: 'Clean & Partition', desc: 'Extracting text & OCR' },
  { id: 'chunk', title: 'Chunk', desc: 'Semantic splitting' },
  { id: 'embed', title: 'Embed & Store', desc: 'Vectorizing' },
  { id: 'organize', title: 'Organize', desc: 'AI detecting org' },
];

// ── Upload + Chat Component ───────────────────────────────────
const Upload = ({ onViewDocument, onGoToInspector, onTraceGrounding }) => {
  // Upload state
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle');
  const [activeStep, setActiveStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [chunksCount, setChunksCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Organization detection result after upload
  const [orgDetection, setOrgDetection] = useState(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [assignOrgId, setAssignOrgId] = useState('');
  const [assignTags, setAssignTags] = useState('');
  const [orgs, setOrgs] = useState([]);
  const [currentFilename, setCurrentFilename] = useState('');

  // Inline Org Creation state inside assignment modal
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [inlineOrgName, setInlineOrgName] = useState('');
  const [inlineOrgDesc, setInlineOrgDesc] = useState('');
  const [inlineOrgColor, setInlineOrgColor] = useState('#6366f1');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Chat state with localStorage persistence
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('mainchunk_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Resizable panels for Upload & Chat
  const [uploadWidth, setUploadWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(320, Math.min(750, e.clientX - 256));
      setUploadWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Sync messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mainchunk_chat_messages', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat to localStorage:', err);
    }
  }, [messages]);

  // ── Drag & drop handlers ────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      resetUpload();
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      resetUpload();
    }
  };

  const resetUpload = () => {
    setUploadState('idle');
    setActiveStep(null);
    setCompletedSteps([]);
    setChunksCount(0);
    setErrorMsg('');
    setOrgDetection(null);
  };

  // ── Process document ────────────────────────
  const handleProcess = async () => {
    if (!file) return;
    setUploadState('uploading');
    setActiveStep('upload');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');

      const { filename } = await res.json();
      setCurrentFilename(filename);
      setCompletedSteps(['upload']);
      setUploadState('processing');

      const eventSource = new EventSource(`/api/process/${encodeURIComponent(filename)}`);

      const stepMapping = {
        upload_received: 'upload',
        queued: 'queue',
        cleaning: 'clean',
        chunking: 'chunk',
        vectorization: 'embed',
        organizing: 'organize',
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const mapped = stepMapping[data.step];

          if (data.step === 'done' && data.status === 'success') {
            const match = data.message?.match(/(\d+)\s*chunks/);
            setChunksCount(match ? parseInt(match[1]) : 0);
            setCompletedSteps(STEPS.map((s) => s.id));
            setActiveStep(null);
            setUploadState('complete');
            eventSource.close();

            // Handle org detection result
            if (data.org_detection) {
              setOrgDetection(data.org_detection);
              if (!data.org_detection.auto_assigned) {
                handleOpenOrgModal(data.org_detection);
              }
            }
          } else if (data.status === 'error') {
            setErrorMsg(data.message || 'Processing error');
            setUploadState('error');
            eventSource.close();
          } else if (mapped) {
            if (data.status === 'done') {
              setCompletedSteps((prev) => [...new Set([...prev, mapped])]);
              const idx = STEPS.findIndex((s) => s.id === mapped);
              if (idx < STEPS.length - 1) setActiveStep(STEPS[idx + 1].id);
            } else if (data.status === 'in_progress') {
              setActiveStep(mapped);
              const idx = STEPS.findIndex((s) => s.id === mapped);
              const prev = STEPS.slice(0, idx).map((s) => s.id);
              setCompletedSteps((p) => [...new Set([...p, ...prev])]);
            }
          }
        } catch (err) {
          console.error('SSE parse error', err);
        }
      };

      eventSource.onerror = () => {
        if (uploadState !== 'complete') {
          setErrorMsg('Connection lost during processing');
          setUploadState('error');
        }
        eventSource.close();
      };
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred');
      setUploadState('error');
    }
  };

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.filter(o => !o.is_system));
      }
    } catch {}
  };

  const handleOpenOrgModal = (detection) => {
    fetchOrgs();
    if (detection?.suggested_org_name) {
      setInlineOrgName(detection.suggested_org_name);
    }
    if (detection?.suggested_tags?.length) {
      setAssignTags(detection.suggested_tags.join(', '));
    }
    setShowOrgModal(true);
  };

  const handleAssignOrg = async () => {
    if (!assignOrgId || !currentFilename) return;
    try {
      await fetch(`/api/documents/${encodeURIComponent(currentFilename)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: assignOrgId,
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      setShowOrgModal(false);
    } catch (err) {
      console.error('Failed to assign org:', err);
    }
  };

  const handleCreateAndAssignOrg = async (nameToUse) => {
    const name = (nameToUse || inlineOrgName).trim();
    if (!name || !currentFilename) return;
    setIsCreatingOrg(true);
    try {
      const createRes = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          description: inlineOrgDesc.trim(),
          color: inlineOrgColor,
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (!createRes.ok) throw new Error('Failed to create organization');
      const newOrg = await createRes.json();

      await fetch(`/api/documents/${encodeURIComponent(currentFilename)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: newOrg.id,
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      setShowOrgModal(false);
      setShowCreateInline(false);
      setInlineOrgName('');
      setInlineOrgDesc('');
      setInlineOrgColor('#6366f1');
      await fetchOrgs();
    } catch (err) {
      console.error('Failed to create and assign organization:', err);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleAssignUnassigned = async () => {
    if (!currentFilename) return;
    try {
      await fetch(`/api/documents/${encodeURIComponent(currentFilename)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: '__unassigned__', tags: [] }),
      });
      setShowOrgModal(false);
    } catch {}
  };

  // ── Chat handlers ───────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred while generating the response.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try { await fetch('/api/chat/history', { method: 'DELETE' }); } catch {}
    localStorage.removeItem('mainchunk_chat_messages');
    setMessages([]);
  };

  // ── Render ──────────────────────────────────
  return (
    <div className={`flex h-full w-full bg-slate-50 ${isResizing ? 'select-none' : ''}`}>
      {/* ═══ LEFT: Upload + Pipeline ═══ */}
      <div
        style={{ width: `${uploadWidth}px` }}
        className="shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto p-6 custom-scrollbar shadow-xs"
      >
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Document Ingestion</h1>
          <p className="text-slate-500 text-xs mt-0.5">Upload PDFs, text, or images into vector storage</p>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[170px]
            ${isDragging
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-200 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50'
            }
            ${uploadState !== 'idle' && uploadState !== 'error' ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => uploadState === 'idle' && fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" />
          <div className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-3 text-indigo-600 shadow-xs">
            <UploadIcon className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-semibold text-slate-800 mb-1">Click to browse or drop file here</h3>
          <p className="text-[11px] text-slate-400 font-medium">PDF, TXT, PNG, JPG (Multimodal OCR)</p>
        </div>

        {/* Selected file card */}
        {file && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  /\.(png|jpg|jpeg|webp)$/i.test(file.name)
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : file.name.endsWith('.pdf')
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                }`}>
                  {/\.(png|jpg|jpeg|webp)$/i.test(file.name) ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <File className="w-4 h-4" />
                  )}
                </div>
                <div className="truncate">
                  <h4 className="text-slate-900 font-semibold text-xs truncate">{file.name}</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB {/\.(png|jpg|jpeg|webp)$/i.test(file.name) && '· AI OCR'}
                  </p>
                </div>
              </div>
              {uploadState === 'idle' && (
                <button onClick={() => setFile(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {(uploadState === 'idle' || uploadState === 'error') && (
              <button
                onClick={handleProcess}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20"
              >
                <span>Process Document</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {uploadState === 'error' && (
              <div className="mt-2 text-red-600 text-xs p-2.5 bg-red-50 rounded-xl border border-red-200 font-medium">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Pipeline steps */}
        {(uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'complete') && (
          <div className="mt-5 space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ingestion Pipeline</h3>
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const isDone = completedSteps.includes(step.id);

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDone
                      ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                      : isActive
                      ? 'border-indigo-300 bg-indigo-50/50 text-indigo-900 shadow-2xs'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold block">{step.title}</span>
                    <span className="text-[10px] text-slate-400 block">{step.desc}</span>
                  </div>
                </div>
              );
            })}

            {uploadState === 'complete' && (
              <div className="mt-4 space-y-3">
                <div className="p-3.5 border border-emerald-200 bg-emerald-50 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-emerald-900 font-bold text-xs">Vectorized Successfully</p>
                      <p className="text-emerald-700 text-[11px] font-mono">{chunksCount} semantic chunks indexed</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { resetUpload(); setFile(null); }}
                    className="text-xs font-semibold px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100/50 transition-colors shadow-2xs"
                  >
                    + New
                  </button>
                </div>

                {/* Org detection result card */}
                {orgDetection && (
                  <div className={`p-3.5 border rounded-2xl ${
                    orgDetection.auto_assigned
                      ? 'border-indigo-200 bg-indigo-50/60'
                      : 'border-amber-200 bg-amber-50/60'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Building2 className={`w-4 h-4 ${orgDetection.auto_assigned ? 'text-indigo-600' : 'text-amber-600'}`} />
                      <span className={`text-xs font-bold ${orgDetection.auto_assigned ? 'text-indigo-900' : 'text-amber-900'}`}>
                        {orgDetection.auto_assigned
                          ? `Assigned to ${orgDetection.assigned_org_name}`
                          : orgDetection.suggested_org_name
                            ? `Suggested: ${orgDetection.suggested_org_name}`
                            : 'Organization not detected'
                        }
                      </span>
                    </div>
                    {orgDetection.reasoning && (
                      <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">{orgDetection.reasoning}</p>
                    )}
                    {orgDetection.suggested_tags?.length > 0 && (
                      <div className="flex gap-1.5 mb-2.5 flex-wrap">
                        {orgDetection.suggested_tags.map((tag, i) => (
                          <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {!orgDetection.auto_assigned && (
                      <button
                        onClick={() => handleOpenOrgModal(orgDetection)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                      >
                        Assign to organization →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resizer Handle */}
      <div
        onMouseDown={handleResizeStart}
        className={`w-1 hover:w-1.5 transition-all cursor-col-resize flex items-center justify-center shrink-0 z-20 ${
          isResizing ? 'bg-indigo-500' : 'bg-slate-200 hover:bg-indigo-400'
        }`}
        title="Drag to resize panels"
      >
        <div className="w-0.5 h-6 bg-slate-400 rounded-full" />
      </div>

      {/* ═══ RIGHT: Chat ═══ */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Chat header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white shrink-0 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">AI Knowledge Assistant</h2>
            <p className="text-xs text-slate-400">Ask questions, compare institutions, and ground answers with sources</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-slate-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-indigo-500 mb-3">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">Ready for your questions</h3>
              <p className="text-xs text-slate-400 max-w-sm text-center">
                Ask about pricing, clauses, suppliers, or compare different documents.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                onViewDocument={onViewDocument}
                onGoToInspector={onGoToInspector}
                onTraceGrounding={onTraceGrounding}
              />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-2 shadow-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={handleSend}
            className="relative bg-slate-50 border border-slate-200 rounded-2xl flex items-end p-1.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all shadow-xs"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything about your documents..."
              className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400 resize-none py-2.5 px-3 max-h-32 min-h-[44px] text-xs leading-relaxed"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all shrink-0 shadow-xs shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ═══ Organization Assignment Modal ═══ */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowOrgModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[520px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Where does this document belong?
            </h2>
            <p className="text-xs text-slate-500 mb-4 truncate">
              File: <span className="text-slate-800 font-semibold">{currentFilename}</span>
            </p>

            {/* AI Suggestion 1-Click Card */}
            {orgDetection?.suggested_org_name && (
              <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 shadow-xs shadow-indigo-600/25">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] text-indigo-700 uppercase tracking-wider font-bold">AI Detected Organization</div>
                    <div className="text-xs text-slate-900 font-bold truncate">{orgDetection.suggested_org_name}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleCreateAndAssignOrg(orgDetection.suggested_org_name)}
                  disabled={isCreatingOrg}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                >
                  {isCreatingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create & Assign
                </button>
              </div>
            )}

            {/* Choose Existing or Create New Header */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {showCreateInline ? 'New Organization Details' : 'Select Existing Organization'}
              </span>
              <button
                onClick={() => {
                  setShowCreateInline(!showCreateInline);
                  if (!showCreateInline && orgDetection?.suggested_org_name) {
                    setInlineOrgName(orgDetection.suggested_org_name);
                  }
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
              >
                {showCreateInline ? '← Back to List' : '+ Create New Organization'}
              </button>
            </div>

            {/* Inline Creation Form */}
            {showCreateInline ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                    Organization Name *
                  </label>
                  <input
                    value={inlineOrgName}
                    onChange={(e) => setInlineOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp, Hotel Group"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                    Description (optional)
                  </label>
                  <input
                    value={inlineOrgDesc}
                    onChange={(e) => setInlineOrgDesc(e.target.value)}
                    placeholder="e.g. Real estate and hotel properties"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                    Color Badge
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setInlineOrgColor(c)}
                        className={`w-6 h-6 rounded-lg transition-all ${inlineOrgColor === c ? 'ring-2 ring-indigo-600 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowCreateInline(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateAndAssignOrg()}
                    disabled={!inlineOrgName.trim() || isCreatingOrg}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
                  >
                    {isCreatingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Create & Assign
                  </button>
                </div>
              </div>
            ) : (
              /* Existing Orgs List */
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar mb-4">
                {orgs.map(org => (
                  <button
                    key={org.id}
                    onClick={() => setAssignOrgId(org.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      assignOrgId === org.id
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: org.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{org.name}</div>
                      {org.description && <div className="text-[10px] text-slate-500 truncate">{org.description}</div>}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{org.document_count || 0} docs</span>
                    {assignOrgId === org.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                ))}

                {orgs.length === 0 && (
                  <div className="text-center py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-xs">
                    <p className="mb-2.5 font-medium text-slate-700">No organizations created yet.</p>
                    <button
                      onClick={() => {
                        setShowCreateInline(true);
                        if (orgDetection?.suggested_org_name) {
                          setInlineOrgName(orgDetection.suggested_org_name);
                        }
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create New Organization
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tags Input */}
            <div className="mb-5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Tags</label>
              <input
                value={assignTags}
                onChange={(e) => setAssignTags(e.target.value)}
                placeholder="e.g. contract, proposal, 2026 (comma-separated)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                onClick={handleAssignUnassigned}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip → Keep Unassigned
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOrgModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                {!showCreateInline && (
                  <button
                    onClick={handleAssignOrg}
                    disabled={!assignOrgId}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Assign
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Message Bubble ────────────────────────────────────────────
const MessageBubble = ({ message, onViewDocument, onGoToInspector, onTraceGrounding }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm shadow-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-xs'
        }`}
      >
        <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert text-white prose-p:text-white' : 'prose-slate text-slate-800'}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>

        {!isUser && message.sources?.length > 0 && (
          <Sources
            sources={message.sources}
            onViewDocument={onViewDocument}
            onGoToInspector={onGoToInspector}
            onTraceGrounding={onTraceGrounding}
          />
        )}
      </div>
    </div>
  );
};

// ── Sources with Organization Info & PDF/Image Link ────────────
const Sources = ({ sources, onViewDocument, onGoToInspector, onTraceGrounding }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3.5 border-t border-slate-100 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <BookOpen className="w-3.5 h-3.5" />
        <span>{sources.length} Grounded Source{sources.length > 1 ? 's' : ''}</span>
      </button>

      {expanded && (
        <div className="mt-2.5 space-y-2">
          {sources.map((src, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  {/* Organization badge */}
                  {src.org_name && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0"
                      style={{
                        backgroundColor: `${src.org_color || '#6b7280'}15`,
                        color: src.org_color || '#475569',
                        border: `1px solid ${src.org_color || '#6b7280'}30`,
                      }}
                    >
                      <Building2 className="w-2.5 h-2.5" />
                      {src.org_name}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200/60 truncate">
                    {src.source}
                  </span>
                  {src.page && (
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">p.{src.page}</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Glowing Trace Flow Button */}
                  {onTraceGrounding && (
                    <button
                      onClick={() => onTraceGrounding({
                        docName: src.source,
                        snippet: src.preview,
                        page: src.page
                      })}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 rounded-lg transition-all font-bold shadow-xs hover:scale-105 active:scale-95 shadow-indigo-600/25"
                      title="Animate line flow to exact chunk & highlight"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                      <span>Trace Flow ➔</span>
                    </button>
                  )}

                  {(src.is_pdf || /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(src.source)) && onViewDocument && (
                    <button
                      onClick={() => onViewDocument(src.source)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors font-semibold border border-slate-200 shadow-2xs"
                      title={src.is_pdf ? "View PDF" : "View Image"}
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      View
                    </button>
                  )}
                </div>
              </div>

              {/* Tags */}
              {src.tags?.length > 0 && (
                <div className="flex gap-1 mb-1.5 flex-wrap">
                  {src.tags.map((tag, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-600 italic leading-relaxed bg-white p-2 rounded-lg border border-slate-200/60">
                "{src.preview?.substring(0, 160)}..."
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Upload;
