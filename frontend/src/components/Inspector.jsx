import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, FileText, File, Database, Maximize2, Minimize2,
  Hash, AlignLeft, Eye, X, LocateFixed, BookOpen, ChevronLeft,
  ChevronRight, GripVertical, Building2, Sparkles, Play, ArrowRight,
  Zap, Copy, Check, ExternalLink
} from 'lucide-react';

const Inspector = ({ initialSelectedDocName, traceInfo }) => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [chunkDetails, setChunkDetails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState(new Set());

  // Grounding / Document Viewer state
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(null);
  const [activePdfPage, setActivePdfPage] = useState(1);
  const [totalPdfPages, setTotalPdfPages] = useState(1);
  const [docContent, setDocContent] = useState('');
  const [loadingDocContent, setLoadingDocContent] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(true);
  const [viewerMode, setViewerMode] = useState('pdf'); // 'pdf' | 'text' | 'image'
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // ── Chunk Pulse State ───────────────────────────────────────
  const [chunkPulsingIndex, setChunkPulsingIndex] = useState(null);

  const chunkCardRefs = useRef({});
  const chunkContainerRef = useRef(null);

  // ── Dynamic Resizing State ──────────────────────────────────
  const [docListWidth, setDocListWidth] = useState(240);
  const [chunksWidth, setChunksWidth] = useState(440);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(null);

  // Resizing mouse handlers
  const handleMouseDown = (resizerType, e) => {
    e.preventDefault();
    setIsDragging(resizerType);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    if (isDragging === 'left') {
      const newWidth = Math.max(180, Math.min(400, e.clientX - 256));
      setDocListWidth(newWidth);
    } else if (isDragging === 'middle') {
      const leftOffset = 256 + (isLeftCollapsed ? 0 : docListWidth);
      const newWidth = Math.max(320, Math.min(850, e.clientX - leftOffset));
      setChunksWidth(newWidth);
    }
  }, [isDragging, isLeftCollapsed, docListWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0) {
          const targetName = traceInfo?.docName || initialSelectedDocName;
          if (targetName) {
            const found = data.find(d => d.name === targetName);
            setSelectedDoc(found || data[0]);
          } else {
            setSelectedDoc(data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  // Handle doc change from outside (initialSelectedDocName or traceInfo)
  useEffect(() => {
    const targetDocName = traceInfo?.docName || initialSelectedDocName;
    if (targetDocName && documents.length > 0) {
      const found = documents.find(d => d.name === targetDocName);
      if (found && found.name !== selectedDoc?.name) {
        setSelectedDoc(found);
      }
    }
  }, [initialSelectedDocName, traceInfo, documents]);

  // When selectedDoc changes, fetch chunks and content
  useEffect(() => {
    if (selectedDoc) {
      fetchChunks();
      fetchDocContent(selectedDoc.name);

      const isPdf = selectedDoc.name.toLowerCase().endsWith('.pdf');
      const isImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(selectedDoc.name);
      setViewerMode(isImg ? 'image' : isPdf ? 'pdf' : 'text');
      setActivePdfPage(1);
      setSelectedChunkIndex(null);
    }
  }, [selectedDoc, searchQuery]);

  const fetchChunks = async () => {
    setIsLoading(true);
    try {
      const url = new URL(`/api/documents/${encodeURIComponent(selectedDoc.name)}/chunks`, window.location.origin);
      if (searchQuery.trim()) {
        url.searchParams.append('search', searchQuery.trim());
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const loadedChunks = data.chunks || [];
        const loadedDetails = data.details || [];
        setChunks(loadedChunks);
        setChunkDetails(loadedDetails);

        // Compute max page count
        let maxPage = 1;
        loadedDetails.forEach(d => {
          if (d.page && d.page > maxPage) maxPage = d.page;
        });
        setTotalPdfPages(maxPage);

        // Check if there is an active traceInfo waiting to be matched
        if (traceInfo && traceInfo.docName === selectedDoc.name) {
          locateAndTraceChunk(loadedChunks, loadedDetails, traceInfo);
        }
      }
    } catch (err) {
      console.error('Failed to fetch chunks', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocContent = async (docName) => {
    setLoadingDocContent(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docName)}/content`);
      if (res.ok) {
        const data = await res.json();
        setDocContent(data.content || '');
        if (data.total_pages && data.total_pages > 1) {
          setTotalPdfPages(data.total_pages);
        }
      } else {
        setDocContent('');
      }
    } catch {
      setDocContent('');
    } finally {
      setLoadingDocContent(false);
    }
  };

  // ── Intelligent Chunk Matching & Page Navigation ────────────
  const locateAndTraceChunk = (currentChunks, currentDetails, trace) => {
    if (!currentChunks || currentChunks.length === 0) return;

    let targetIdx = null;

    // 1. Explicit chunkIndex
    if (trace.chunkIndex !== null && trace.chunkIndex !== undefined && trace.chunkIndex < currentChunks.length) {
      targetIdx = trace.chunkIndex;
    }

    // 2. Snippet matching
    if (targetIdx === null && trace.snippet) {
      const cleanSnippet = trace.snippet.toLowerCase().trim();
      for (let i = 0; i < currentChunks.length; i++) {
        const cText = (currentChunks[i] || '').toLowerCase();
        if (cText.includes(cleanSnippet) || cleanSnippet.includes(cText.substring(0, 40))) {
          targetIdx = i;
          break;
        }
      }

      // If still not found, word overlap
      if (targetIdx === null) {
        const snippetWords = cleanSnippet.split(/\s+/).filter(w => w.length > 4);
        let bestMatch = -1;
        let maxOverlap = 0;
        currentChunks.forEach((c, idx) => {
          const cText = (c || '').toLowerCase();
          const matchCount = snippetWords.filter(w => cText.includes(w)).length;
          if (matchCount > maxOverlap) {
            maxOverlap = matchCount;
            bestMatch = idx;
          }
        });
        if (bestMatch !== -1 && maxOverlap >= 2) {
          targetIdx = bestMatch;
        }
      }
    }

    if (targetIdx === null) targetIdx = 0;

    triggerChunkSelection(targetIdx, currentDetails);
  };

  // Select a chunk, trigger pulse effect, and jump to exact PDF page
  const triggerChunkSelection = (chunkIdx, detailsArray = chunkDetails) => {
    setSelectedChunkIndex(chunkIdx);
    setShowDocViewer(true);
    setChunkPulsingIndex(chunkIdx);

    // Get the exact page number for this chunk
    const targetPage = detailsArray[chunkIdx]?.page || traceInfo?.page || 1;
    setActivePdfPage(targetPage);

    // Scroll chunk card into view
    setTimeout(() => {
      const cardEl = chunkCardRefs.current[chunkIdx];
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Reset pulse effect after animation
    setTimeout(() => {
      setChunkPulsingIndex(null);
    }, 1600);
  };

  const handleChunkClick = (index) => {
    triggerChunkSelection(index);
  };

  const handlePageChange = (newPage) => {
    const validPage = Math.max(1, Math.min(totalPdfPages, newPage));
    setActivePdfPage(validPage);
  };

  const handleCopySnippet = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const toggleChunkExpand = (index, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChunks(newExpanded);
  };

  const isCurrentDocPdf = selectedDoc?.name?.toLowerCase().endsWith('.pdf');
  const isCurrentDocImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(selectedDoc?.name || '');

  const totalChunks = chunks.length;
  const totalChars = chunks.reduce((acc, chunk) => acc + (typeof chunk === 'string' ? chunk.length : 0), 0);
  const avgLength = totalChunks > 0 ? Math.round(totalChars / totalChunks) : 0;

  const currentChunkContent = selectedChunkIndex !== null && chunks[selectedChunkIndex]
    ? chunks[selectedChunkIndex]
    : '';

  return (
    <div
      className={`flex h-full w-full overflow-hidden bg-slate-50 relative ${isDragging ? 'select-none cursor-col-resize' : ''}`}
    >
      {/* ═══ Panel 1: Documents List ═══ */}
      {!isLeftCollapsed && (
        <div
          style={{ width: `${docListWidth}px` }}
          className="border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden shadow-2xs"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents</h2>
            <button
              onClick={() => setIsLeftCollapsed(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="Collapse Panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                No documents
              </div>
            ) : (
              documents.map((doc) => (
                <button
                  key={doc.name}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full flex items-start gap-2.5 p-3 rounded-2xl transition-all text-left ${
                    selectedDoc?.name === doc.name
                      ? 'bg-indigo-50/80 border-indigo-200 border text-indigo-900 shadow-2xs'
                      : 'bg-white border border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${selectedDoc?.name === doc.name ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-xs">
                      {doc.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Database className="w-3 h-3" />
                        {doc.chunk_count || 0}
                      </span>
                      {doc.org_name && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-semibold truncate max-w-[110px]"
                          style={{
                            backgroundColor: `${doc.org_color || '#6b7280'}15`,
                            color: doc.org_color || '#475569',
                            border: `1px solid ${doc.org_color || '#6b7280'}30`,
                          }}
                        >
                          {doc.org_name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Collapse Reopen Button if collapsed */}
      {isLeftCollapsed && (
        <div className="w-9 border-r border-slate-200 bg-white flex flex-col items-center py-4 shrink-0">
          <button
            onClick={() => setIsLeftCollapsed(false)}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Expand Documents"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="[writing-mode:vertical-rl] text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
            Docs
          </span>
        </div>
      )}

      {/* Resizer 1 */}
      {!isLeftCollapsed && (
        <div
          onMouseDown={(e) => handleMouseDown('left', e)}
          className={`w-1 hover:w-1.5 transition-all cursor-col-resize flex items-center justify-center shrink-0 z-20 ${
            isDragging === 'left' ? 'bg-indigo-500' : 'bg-slate-200 hover:bg-indigo-400'
          }`}
          title="Drag to resize panel"
        >
          <div className="w-0.5 h-6 bg-slate-400 rounded-full" />
        </div>
      )}

      {/* ═══ Panel 2: Chunks Explorer ═══ */}
      <div
        style={{ width: showDocViewer ? `${chunksWidth}px` : 'auto' }}
        className={`flex flex-col bg-slate-50 overflow-hidden shrink-0 border-r border-slate-200 ${!showDocViewer ? 'flex-1' : ''}`}
      >
        {selectedDoc ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white shrink-0 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <File className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]" title={selectedDoc.name}>
                    {selectedDoc.name}
                  </h3>
                  {selectedDoc.org_name && (
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0"
                      style={{
                        backgroundColor: `${selectedDoc.org_color || '#6b7280'}15`,
                        color: selectedDoc.org_color || '#475569',
                        border: `1px solid ${selectedDoc.org_color || '#6b7280'}30`,
                      }}
                    >
                      <Building2 className="w-2.5 h-2.5" />
                      {selectedDoc.org_name}
                    </span>
                  )}
                </div>

                {!showDocViewer && (
                  <button
                    onClick={() => setShowDocViewer(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold shrink-0 transition-colors border border-indigo-200"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Viewer</span>
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter chunks by keyword..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Metrics Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono">
                  <Hash className="w-3 h-3 text-blue-600" />
                  <strong className="text-slate-900">{totalChunks}</strong> chunks
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono">
                  <AlignLeft className="w-3 h-3 text-purple-600" />
                  <strong className="text-slate-900">{avgLength}</strong> avg len
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono">
                  <Database className="w-3 h-3 text-emerald-600" />
                  <strong className="text-slate-900">{totalChars.toLocaleString()}</strong> chars
                </span>
              </div>
            </div>

            {/* Chunks List */}
            <div
              ref={chunkContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar"
            >
              {isLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : chunks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  No chunks match your search criteria.
                </div>
              ) : (
                chunks.map((chunk, idx) => {
                  const isExpanded = expandedChunks.has(idx);
                  const isSelected = selectedChunkIndex === idx;
                  const isPulsing = chunkPulsingIndex === idx;
                  const content = typeof chunk === 'string' ? chunk : '';
                  const isLong = content.length > 200;
                  const pageNumber = chunkDetails[idx]?.page;
                  const chunkTitle = chunkDetails[idx]?.title;

                  return (
                    <div
                      key={idx}
                      ref={(el) => (chunkCardRefs.current[idx] = el)}
                      onClick={() => handleChunkClick(idx)}
                      className={`cursor-pointer rounded-2xl border transition-all duration-300 bg-white relative ${
                        isPulsing
                          ? 'animate-chunk-pulse border-indigo-500 ring-4 ring-indigo-400/40 z-10 shadow-lg'
                          : isSelected
                          ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between p-2.5 bg-slate-50/80 border-b border-slate-100 rounded-t-2xl">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold transition-all ${
                            isSelected || isPulsing
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                          }`}>
                            #{idx}
                          </span>
                          {pageNumber && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold transition-all ${
                              isSelected
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                : 'bg-white border border-slate-200 text-slate-600'
                            }`}>
                              Page {pageNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400">
                            {content.length} chars
                          </span>
                          {isLong && (
                            <button
                              onClick={(e) => toggleChunkExpand(idx, e)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                            >
                              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Section Title Header */}
                      {chunkTitle && chunkTitle !== 'Introduction' && (
                        <div className="px-3.5 pt-2.5 pb-0.5 text-xs font-bold text-indigo-700 truncate flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="truncate">{chunkTitle}</span>
                        </div>
                      )}

                      <div className="p-3.5 text-xs text-slate-700 leading-relaxed font-mono">
                        {isExpanded || !isLong ? content : `${content.substring(0, 180)}...`}
                      </div>

                      {/* Active Status Footer */}
                      <div className="px-3.5 pb-2.5 flex items-center justify-between">
                        {isSelected && (
                          <div className="text-[10px] text-indigo-600 flex items-center gap-1 font-bold">
                            <LocateFixed className="w-3 h-3 animate-spin" />
                            <span>Grounded in PDF (Page {pageNumber || activePdfPage})</span>
                          </div>
                        )}
                        {isSelected && (
                          <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1 ml-auto">
                            Jump to PDF ➔
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Database className="w-10 h-10 mb-2 text-slate-300" />
            <p className="text-xs font-medium">Select a document to inspect chunks</p>
          </div>
        )}
      </div>

      {/* Resizer 2 */}
      {showDocViewer && (
        <div
          onMouseDown={(e) => handleMouseDown('middle', e)}
          className={`w-1 hover:w-1.5 transition-all cursor-col-resize flex items-center justify-center shrink-0 z-20 ${
            isDragging === 'middle' ? 'bg-indigo-500' : 'bg-slate-200 hover:bg-indigo-400'
          }`}
          title="Drag to resize panels"
        >
          <div className="w-0.5 h-6 bg-slate-400 rounded-full" />
        </div>
      )}

      {/* ═══ Panel 3: Document Viewer (Raw PDF & Text) ═══ */}
      {showDocViewer && selectedDoc && (
        <div
          className="flex-1 bg-white flex flex-col h-full overflow-hidden min-w-[350px]"
        >
          {/* Header Bar */}
          <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="truncate">
                <h4 className="text-xs font-bold text-slate-900 truncate">{selectedDoc.name}</h4>
                <p className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                  {selectedChunkIndex !== null ? (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>Viewing Chunk #{selectedChunkIndex} (Page {activePdfPage})</span>
                    </>
                  ) : (
                    <>Select a chunk to jump to its page</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Selector */}
              {isCurrentDocPdf && (
                <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                  <button
                    onClick={() => setViewerMode('pdf')}
                    className={`px-3 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                      viewerMode === 'pdf'
                        ? 'bg-white text-indigo-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Raw PDF
                  </button>
                  <button
                    onClick={() => setViewerMode('text')}
                    className={`px-3 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                      viewerMode === 'text'
                        ? 'bg-white text-indigo-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Extracted Text
                  </button>
                </div>
              )}

              {isCurrentDocImg && (
                <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                  <button
                    onClick={() => setViewerMode('image')}
                    className={`px-3 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                      viewerMode === 'image'
                        ? 'bg-white text-emerald-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Image View
                  </button>
                  <button
                    onClick={() => setViewerMode('text')}
                    className={`px-3 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                      viewerMode === 'text'
                        ? 'bg-white text-indigo-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    OCR Text
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowDocViewer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Hide Viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PDF Page Navigation & Locator Bar */}
          {viewerMode === 'pdf' && isCurrentDocPdf && (
            <div className="px-4 py-2.5 bg-indigo-50/80 border-b border-indigo-200/80 flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-xs shrink-0 shadow-2xs flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-300" />
                  Page {activePdfPage}
                </span>

                {selectedChunkIndex !== null && (
                  <span className="text-slate-700 truncate text-[11px] font-mono italic bg-white px-2.5 py-1 rounded-lg border border-indigo-200/80 shadow-2xs max-w-sm" title={currentChunkContent}>
                    🎯 Chunk #{selectedChunkIndex}: "{currentChunkContent.replace(/^##\s+[^\n]+\n*/, '').trim().substring(0, 60)}..."
                  </span>
                )}
              </div>

              {/* Page Stepper & Copy */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <button
                  onClick={() => handlePageChange(activePdfPage - 1)}
                  disabled={activePdfPage <= 1}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  title="Previous Page"
                >
                  ◀ Prev
                </button>

                <span className="text-xs font-mono font-bold text-slate-700 px-1">
                  {activePdfPage} / {totalPdfPages}
                </span>

                <button
                  onClick={() => handlePageChange(activePdfPage + 1)}
                  disabled={activePdfPage >= totalPdfPages}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  title="Next Page"
                >
                  Next ▶
                </button>

                {currentChunkContent && (
                  <button
                    onClick={() => handleCopySnippet(currentChunkContent)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                    title="Copy chunk text"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Viewer Area */}
          <div className={`flex-1 overflow-hidden relative bg-slate-100 flex flex-col ${isDragging ? 'pointer-events-none' : ''}`}>
            {viewerMode === 'image' && isCurrentDocImg ? (
              <div className="w-full h-full flex items-center justify-center p-6 bg-slate-900/5 overflow-auto">
                <img
                  src={`/api/documents/${encodeURIComponent(selectedDoc.name)}/file`}
                  alt={selectedDoc.name}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-xl border border-slate-200 bg-white"
                />
              </div>
            ) : viewerMode === 'pdf' && isCurrentDocPdf ? (
              <iframe
                key={`pdf-viewer-${selectedDoc.name}-page-${activePdfPage}`}
                src={`/api/documents/${encodeURIComponent(selectedDoc.name)}/file#page=${activePdfPage}&view=FitH&toolbar=1`}
                className="w-full h-full border-none bg-white"
                title={`PDF Viewer - Page ${activePdfPage}`}
              />
            ) : (
              <div className="h-full overflow-y-auto p-6 custom-scrollbar text-xs font-mono text-slate-800 bg-white m-3 rounded-2xl border border-slate-200 shadow-2xs">
                {loadingDocContent ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {docContent || 'No extracted text available.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inspector;
