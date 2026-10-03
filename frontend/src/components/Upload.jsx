import React, { useState, useRef, useEffect } from 'react';
import {
  Upload as UploadIcon, File, CheckCircle2, Loader2,
  ArrowRight, X, Send, Trash2, ChevronDown, ChevronRight, BookOpen,
  Building2, Tag, Eye, FileText, ExternalLink, Image as ImageIcon,
  Plus, Sparkles, Check, Sparkle, AlertCircle, AlertTriangle, RefreshCw, Copy,
  Folder, FolderOpen, FolderPlus, Layers
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

const VALID_EXTENSIONS = ['pdf', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

// ── Upload + Chat Component ───────────────────────────────────
const Upload = ({ onViewDocument, onGoToInspector, onTraceGrounding, initialChatPrompt, onClearInitialPrompt, initialMode, onNavigateToOrgs }) => {
  // Ingestion Mode ('files' | 'text')
  const [ingestionMode, setIngestionMode] = useState(initialMode || 'files');

  // Direct Text / Note Ingestion State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteOrgId, setNoteOrgId] = useState('');
  const [noteFolder, setNoteFolder] = useState('');
  const [noteFormatWithAi, setNoteFormatWithAi] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(null);
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    if (initialMode) setIngestionMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleSaveTextNote = async (e) => {
    e?.preventDefault();
    if (!noteTitle.trim()) {
      setNoteError('Lütfen bir doküman başlığı veya dosya adı girin.');
      return;
    }
    if (!noteContent.trim()) {
      setNoteError('Lütfen doküman metnini veya portföy notunu girin.');
      return;
    }

    setNoteSaving(true);
    setNoteError('');
    setNoteSuccess(null);

    try {
      const res = await fetch('/api/documents/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle.trim(),
          content: noteContent.trim(),
          org_id: noteOrgId === '__unassigned__' ? undefined : (noteOrgId || undefined),
          folder: noteFolder.trim() || undefined,
          format_with_ai: noteFormatWithAi,
          doc_type: 'note',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Not kaydedilemedi.');
      }

      const data = await res.json();
      const targetOrg = orgs.find(o => o.id === (noteOrgId || data.org_id));

      setNoteSuccess({
        filename: data.filename,
        orgId: data.org_id,
        orgName: targetOrg?.name || (noteOrgId === '__unassigned__' ? 'Atanmamış' : 'Genel Portföy'),
        folder: data.folder || 'Ana Dizin',
        charCount: data.char_count,
        chunkCount: data.chunk_count,
      });

      setNoteTitle('');
      setNoteContent('');
      setNoteFolder('');

      // Notify system of new document
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      await fetchOrgs();
    } catch (err) {
      console.error('Failed to save text note:', err);
      setNoteError(err.message || 'Doküman kaydedilirken bir hata oluştu.');
    } finally {
      setNoteSaving(false);
    }
  };

  // Multi-file upload state
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // 'idle' | 'processing' | 'complete' | 'error'
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFilename, setCurrentFilename] = useState('');
  const [activeStep, setActiveStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [fileProgressMap, setFileProgressMap] = useState({}); // filename -> { status, chunks, error, orgDetection }
  const [totalChunksCount, setTotalChunksCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Batch Assignment Queue state
  const [unassignedQueue, setUnassignedQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  // Organization detection result after upload
  const [orgDetection, setOrgDetection] = useState(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [assignOrgId, setAssignOrgId] = useState('');
  const [assignFolder, setAssignFolder] = useState('');
  const [assignTags, setAssignTags] = useState('');
  const [orgs, setOrgs] = useState([]);

  // Smart Batch & Portfolio Analysis state
  const [batchAnalysis, setBatchAnalysis] = useState(null);
  const [batchFileRenames, setBatchFileRenames] = useState({});
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [isCommittingBatch, setIsCommittingBatch] = useState(false);

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

  useEffect(() => {
    if (initialChatPrompt) {
      setInput(initialChatPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialChatPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Resizable panels for Upload & Chat
  const [uploadWidth, setUploadWidth] = useState(440);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(340, Math.min(750, e.clientX - 68));
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

  // ── Drag & drop and file selection handlers ─────────────────
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
    if (e.dataTransfer.files?.length) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length) {
      handleFilesAdded(e.target.files);
    }
  };

  const handleFilesAdded = (incomingList) => {
    const validFiles = Array.from(incomingList).filter((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      return VALID_EXTENSIONS.includes(ext);
    });

    if (validFiles.length === 0) {
      setErrorMsg('Please select supported file types: PDF, TXT, PNG, JPG, WEBP.');
      return;
    }

    setFiles((prev) => {
      const existingNames = new Set(prev.map((p) => p.name));
      const toAdd = validFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...toAdd];
    });

    if (uploadState === 'complete' || uploadState === 'error') {
      setUploadState('idle');
      setFileProgressMap({});
      setCompletedSteps([]);
      setActiveStep(null);
      setErrorMsg('');
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAllFiles = () => {
    setFiles([]);
    resetUpload();
  };

  const resetUpload = () => {
    setUploadState('idle');
    setActiveStep(null);
    setCompletedSteps([]);
    setCurrentFileIndex(0);
    setCurrentFilename('');
    setTotalChunksCount(0);
    setFileProgressMap({});
    setErrorMsg('');
    setOrgDetection(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Batch Process all selected files ────────────────────────
  const handleProcessBatch = async () => {
    if (files.length === 0) return;
    setUploadState('processing');
    setErrorMsg('');
    setAssignFolder('');
    setAssignOrgId('');
    setBatchAnalysis(null);
    setBatchFileRenames({});
    setAssignTags('');

    let cumulativeChunks = 0;
    const progressMap = {};
    const processedForAssignment = [];

    files.forEach((f) => {
      progressMap[f.name] = { status: 'queued', chunks: 0, error: null };
    });
    setFileProgressMap({ ...progressMap });

    const stepMapping = {
      upload_received: 'upload',
      queued: 'queue',
      cleaning: 'clean',
      chunking: 'chunk',
      vectorization: 'embed',
      organizing: 'organize',
    };

    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      setCurrentFileIndex(i);
      setCurrentFilename(currentFile.name);
      setActiveStep('upload');
      setCompletedSteps([]);

      // Update status to processing
      progressMap[currentFile.name] = { status: 'processing', chunks: 0, error: null };
      setFileProgressMap({ ...progressMap });

      try {
        // Step 1: Upload binary
        const formData = new FormData();
        formData.append('file', currentFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error(`Upload failed for ${currentFile.name}`);

        const { filename } = await uploadRes.json();
        setCompletedSteps(['upload']);

        // Step 2: SSE Ingestion Stream
        await new Promise((resolve) => {
          const eventSource = new EventSource(`/api/process/${encodeURIComponent(filename)}`);

          eventSource.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data);
              const mapped = stepMapping[data.step];

              if (data.step === 'done' && data.status === 'success') {
                const match = data.message?.match(/(\d+)\s*chunks/);
                const fileChunks = match ? parseInt(match[1]) : 0;
                cumulativeChunks += fileChunks;

                setCompletedSteps(STEPS.map((s) => s.id));
                setActiveStep(null);

                const detection = data.org_detection || null;
                progressMap[currentFile.name] = {
                  status: 'done',
                  chunks: fileChunks,
                  orgDetection: detection,
                };
                setFileProgressMap({ ...progressMap });

                processedForAssignment.push({
                  filename: currentFile.name,
                  orgDetection: detection,
                });

                if (detection) {
                  setOrgDetection(detection);
                }

                eventSource.close();
                resolve();
              } else if (data.status === 'error') {
                progressMap[currentFile.name] = {
                  status: 'error',
                  chunks: 0,
                  error: data.message || 'Processing error',
                };
                setFileProgressMap({ ...progressMap });
                eventSource.close();
                resolve();
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
            progressMap[currentFile.name] = {
              status: 'error',
              chunks: 0,
              error: 'Connection interrupted',
            };
            setFileProgressMap({ ...progressMap });
            eventSource.close();
            resolve();
          };
        });
      } catch (err) {
        console.error(`Error processing ${currentFile.name}:`, err);
        progressMap[currentFile.name] = {
          status: 'error',
          chunks: 0,
          error: err.message,
        };
        setFileProgressMap({ ...progressMap });
      }
    }

    setTotalChunksCount(cumulativeChunks);
    setUploadState('complete');

    // Automatically trigger Batch or Single-File AI Analysis
    if (processedForAssignment.length > 0) {
      await fetchOrgs();
      setUnassignedQueue(processedForAssignment);
      setCurrentQueueIndex(0);
      const first = processedForAssignment[0];
      setCurrentFilename(first.filename);
      setOrgDetection(first.orgDetection);

      const filenames = processedForAssignment.map(p => p.filename);
      setShowOrgModal(true);
      setIsAnalyzingBatch(true);

      try {
        const res = await fetch('/api/batch-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames }),
        });
        if (res.ok) {
          const analysis = await res.json();
          let targetOrgId = analysis.suggested_org_id || '';
          let isNewOrg = false;

          // If no suggested_org_id, try to match by name against loaded orgs
          if (!targetOrgId && analysis.suggested_org_name) {
            const matched = orgs.find((o) =>
              o.name.toLowerCase().includes(analysis.suggested_org_name.toLowerCase()) ||
              analysis.suggested_org_name.toLowerCase().includes(o.name.toLowerCase())
            );
            if (matched) {
              targetOrgId = matched.id;
            } else {
              isNewOrg = true;
            }
          }

          // If still no org, default to first available org if exists, otherwise "__unassigned__"
          if (!targetOrgId && !isNewOrg && orgs.length > 0) {
            targetOrgId = orgs[0].id;
          }

          setBatchAnalysis(analysis);
          setBatchFileRenames(analysis.file_renames || {});
          setAssignFolder(analysis.suggested_folder || '');
          setAssignOrgId(targetOrgId || '__unassigned__');
          setInlineOrgName(analysis.suggested_org_name || '');
          setAssignTags(analysis.suggested_tags?.join(', ') || '');
          setShowCreateInline(isNewOrg);
        }
      } catch (err) {
        console.error('Batch analyze failed:', err);
      } finally {
        setIsAnalyzingBatch(false);
      }
    }
  };

  const handleCommitBatchPortfolio = async () => {
    setIsCommittingBatch(true);
    try {
      const res = await fetch('/api/batch-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: showCreateInline ? undefined : (assignOrgId === '__unassigned__' ? undefined : assignOrgId),
          org_name: showCreateInline && inlineOrgName.trim() ? inlineOrgName.trim() : undefined,
          folder: assignFolder.trim(),
          tags: assignTags.split(',').map((t) => t.trim()).filter(Boolean),
          file_renames: batchFileRenames,
        }),
      });

      if (res.ok) {
        setShowOrgModal(false);
        setUnassignedQueue([]);
        setBatchAnalysis(null);
        setBatchFileRenames({});
        await fetchOrgs();
      }
    } catch (err) {
      console.error('Failed to commit batch portfolio:', err);
    } finally {
      setIsCommittingBatch(false);
    }
  };

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.filter((o) => !o.is_system));
      }
    } catch {}
  };

  const advanceOrCloseQueue = (targetIndex) => {
    const nextIdx = targetIndex !== undefined ? targetIndex : currentQueueIndex + 1;
    if (nextIdx < unassignedQueue.length) {
      setCurrentQueueIndex(nextIdx);
      const nextItem = unassignedQueue[nextIdx];
      setCurrentFilename(nextItem.filename);
      setOrgDetection(nextItem.orgDetection);
      setInlineOrgName(nextItem.orgDetection?.suggested_org_name || '');
      setAssignTags(nextItem.orgDetection?.suggested_tags?.join(', ') || '');
      setAssignOrgId(nextItem.orgDetection?.suggested_org_id || '');
      setAssignFolder('');
      setShowCreateInline(false);
    } else {
      setShowOrgModal(false);
      setUnassignedQueue([]);
      setCurrentQueueIndex(0);
      setAssignFolder('');
      setBatchAnalysis(null);
    }
  };


  const handleOpenOrgModal = (detection, specificFilename) => {
    fetchOrgs();
    const targetFile = specificFilename || currentFilename;
    const targetDetection = detection || orgDetection;
    setCurrentFilename(targetFile);
    setOrgDetection(targetDetection);
    setUnassignedQueue([{ filename: targetFile, orgDetection: targetDetection }]);
    setCurrentQueueIndex(0);
    if (targetDetection?.suggested_org_name) {
      setInlineOrgName(targetDetection.suggested_org_name);
    }
    if (targetDetection?.suggested_tags?.length) {
      setAssignTags(targetDetection.suggested_tags.join(', '));
    }
    if (targetDetection?.suggested_org_id) {
      setAssignOrgId(targetDetection.suggested_org_id);
    }
    setAssignFolder('');
    setShowCreateInline(false);
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
          folder: assignFolder.trim(),
          tags: assignTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      advanceOrCloseQueue();
    } catch (err) {
      console.error('Failed to assign org:', err);
      advanceOrCloseQueue();
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
          tags: assignTags.split(',').map((t) => t.trim()).filter(Boolean),
          folders: assignFolder.trim() ? [assignFolder.trim()] : [],
        }),
      });

      if (!createRes.ok) throw new Error('Failed to create organization');
      const newOrg = await createRes.json();

      await fetch(`/api/documents/${encodeURIComponent(currentFilename)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: newOrg.id,
          folder: assignFolder.trim(),
          tags: assignTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      await fetchOrgs();
      setInlineOrgName('');
      setInlineOrgDesc('');
      setInlineOrgColor('#6366f1');
      advanceOrCloseQueue();
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
      advanceOrCloseQueue();
    } catch (err) {
      console.error('Failed to skip/unassign:', err);
      advanceOrCloseQueue();
    }
  };

  const handleSkipAll = () => {
    setShowOrgModal(false);
    setUnassignedQueue([]);
    setCurrentQueueIndex(0);
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
      setMessages((prev) => {
        let updated = prev;
        // If the server response indicates completion or cancellation of a pending action (e.g. user typed "evet sil")
        if (data.action?.status === 'completed') {
          updated = updated.map((m) =>
            m.action && m.action.status === 'pending'
              ? { ...m, action: { ...m.action, status: 'completed', resultMessage: data.action.resultMessage } }
              : m
          );
          window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
        } else if (data.action?.status === 'cancelled') {
          updated = updated.map((m) =>
            m.action && m.action.status === 'pending'
              ? { ...m, action: { ...m.action, status: 'cancelled' } }
              : m
          );
        }

        return [
          ...updated,
          {
            role: 'assistant',
            content: data.answer,
            sources: data.sources || [],
            action: data.action || null,
          },
        ];
      });

      if (data.action?.status === 'completed') {
        fetchOrgs();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred while generating the response.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = async (msgIndex, action) => {
    try {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? { ...m, action: { ...m.action, status: 'executing' } }
            : m
        )
      );

      const res = await fetch('/api/chat/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: action.action_id,
          action_type: action.type,
          target_org_id: action.target_org_id,
          target_folder: action.target_folder,
          target_filenames: action.target_filenames || [],
          delete_folder: true,
        }),
      });

      if (!res.ok) throw new Error('Silme işlemi sunucuda tamamlanamadı.');
      const result = await res.json();

      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? {
                ...m,
                action: {
                  ...m.action,
                  status: 'completed',
                  resultMessage: result.message || 'Silme işlemi başarıyla tamamlandı.',
                  completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              }
            : m
        )
      );

      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      fetchOrgs();
    } catch (err) {
      console.error('Error executing chat action:', err);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? { ...m, action: { ...m.action, status: 'error', errorMsg: err.message } }
            : m
        )
      );
    }
  };

  const handleCancelAction = (msgIndex) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex
          ? {
              ...m,
              action: {
                ...m.action,
                status: 'cancelled',
                cancelledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            }
          : m
      )
    );
  };

  const handleClear = async () => {
    try {
      await fetch('/api/chat/history', { method: 'DELETE' });
    } catch {}
    localStorage.removeItem('mainchunk_chat_messages');
    setMessages([]);
  };

  const getFileBadgeStyle = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext)) {
      return {
        icon: ImageIcon,
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        label: 'AI OCR Image',
      };
    }
    if (ext === 'pdf') {
      return {
        icon: FileText,
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        label: 'PDF Document',
      };
    }
    return {
      icon: File,
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      label: 'Text Document',
    };
  };

  // ── Render ──────────────────────────────────
  return (
    <div className={`flex h-full w-full bg-slate-50 ${isResizing ? 'select-none' : ''}`}>
      {/* ═══ LEFT: Multi-File Upload & Ingestion Queue ═══ */}
      <div
        style={{ width: `${uploadWidth}px` }}
        className="shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto p-6 custom-scrollbar shadow-xs"
      >
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Doküman Girişi</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            PDF, görsel (OCR) veya doğrudan metin notlarını portföy ve vektör hafızasına aktarın
          </p>
        </div>

        {/* Ingestion Mode Segmented Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setIngestionMode('files')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              ingestionMode === 'files'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadIcon className="w-3.5 h-3.5" />
            <span>Dosya Yükle</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIngestionMode('text');
              fetchOrgs();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              ingestionMode === 'text'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Metin / Not Ekle (.txt)</span>
          </button>
        </div>

        {/* ── MODE 1: MULTI-FILE UPLOAD ── */}
        {ingestionMode === 'files' && (
          <>
            {/* Drop zone with multiple file support */}
        <div
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[160px]
            ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-200 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50'
            }
            ${uploadState === 'processing' ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => uploadState !== 'processing' && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.bmp,.gif"
          />
          <div className="w-11 h-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-3 text-indigo-600 shadow-xs">
            <UploadIcon className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800 mb-1">
            Drop multiple files here, or click to browse
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">
            Select multiple PDFs, Images (OCR), or Text files at once
          </p>
        </div>

        {/* Selected Files Queue Tray */}
        {files.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Selected Files ({files.length})
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {(files.reduce((a, b) => a + b.size, 0) / (1024 * 1024)).toFixed(2)} MB total
                </span>
              </div>

              {uploadState === 'idle' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>
                  <button
                    onClick={handleClearAllFiles}
                    className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors ml-2"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* File List Cards */}
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
              {files.map((fileObj, idx) => {
                const style = getFileBadgeStyle(fileObj.name);
                const fileInfo = fileProgressMap[fileObj.name];
                const isCurrentFile = uploadState === 'processing' && currentFileIndex === idx;

                return (
                  <div
                    key={fileObj.name + idx}
                    className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                      isCurrentFile
                        ? 'border-indigo-400 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20'
                        : fileInfo?.status === 'done'
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : fileInfo?.status === 'error'
                        ? 'border-rose-200 bg-rose-50/40'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl border shrink-0 ${style.bg} ${style.text} ${style.border}`}>
                        <style.icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-900 truncate" title={fileObj.name}>
                          {fileObj.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{(fileObj.size / 1024).toFixed(1)} KB</span>
                          <span>·</span>
                          <span className="font-medium text-slate-500">{style.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentFile ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-2xs">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : fileInfo?.status === 'done' ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{fileInfo.chunks} chunks</span>
                        </div>
                      ) : fileInfo?.status === 'error' ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg" title={fileInfo.error}>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Error</span>
                        </div>
                      ) : uploadState === 'idle' ? (
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ingestion Trigger Button */}
            {uploadState === 'idle' && (
              <button
                onClick={handleProcessBatch}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  Process {files.length} Document{files.length > 1 ? 's' : ''} (Ingest & Vectorize)
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {errorMsg && (
              <div className="text-red-600 text-xs p-3 bg-red-50 rounded-xl border border-red-200 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Live Batch Ingestion Pipeline steps */}
        {(uploadState === 'processing' || uploadState === 'complete') && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ingestion Pipeline
              </h3>
              {uploadState === 'processing' && (
                <span className="text-[11px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  File {currentFileIndex + 1} / {files.length}
                </span>
              )}
            </div>

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

            {/* Batch Complete Card */}
            {uploadState === 'complete' && (
              <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-emerald-950 font-bold text-xs">
                        All {files.length} Document{files.length > 1 ? 's' : ''} Vectorized!
                      </p>
                      <p className="text-emerald-700 text-[11px] font-mono mt-0.5">
                        {totalChunksCount} total semantic chunks indexed
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="text-xs font-bold px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-100/60 transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload More</span>
                  </button>
                </div>

                {/* Org assignment summary / trigger */}
                <div
                  className={`p-3.5 border rounded-2xl ${
                    orgDetection?.auto_assigned
                      ? 'border-indigo-200 bg-indigo-50/60'
                      : 'border-slate-200 bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Building2
                        className={`w-4 h-4 ${
                          orgDetection?.auto_assigned ? 'text-indigo-600' : 'text-slate-600'
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          orgDetection?.auto_assigned ? 'text-indigo-900' : 'text-slate-800'
                        }`}
                      >
                        {orgDetection?.auto_assigned
                          ? `Atandı: ${orgDetection.assigned_org_name}`
                          : orgDetection?.suggested_org_name
                          ? `Öneri: ${orgDetection.suggested_org_name}`
                          : 'Kurum Yönetimi'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenOrgModal(orgDetection)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <span>Kurum Seç / Düzenle →</span>
                    </button>
                  </div>
                  {orgDetection?.reasoning && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {orgDetection.reasoning}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </>
    )}

        {/* ── MODE 2: DIRECT TEXT / NOTE INGESTION (.txt) ── */}
        {ingestionMode === 'text' && (
          <form onSubmit={handleSaveTextNote} className="space-y-4">
            {/* Success Banner */}
            {noteSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-emerald-950">
                      "{noteSuccess.filename}" Başarıyla Eklendi!
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      {noteSuccess.orgName} &gt; {noteSuccess.folder} · {noteSuccess.chunkCount} vektör parçası
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setNoteSuccess(null)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        Yeni Metin Yaz
                      </button>
                      {onViewDocument && (
                        <button
                          type="button"
                          onClick={() => onViewDocument(noteSuccess.filename)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Görüntüle</span>
                        </button>
                      )}
                      {onNavigateToOrgs && (
                        <button
                          type="button"
                          onClick={() => onNavigateToOrgs(noteSuccess.orgId)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Building2 className="w-3 h-3" />
                          <span>Kurumlarda Aç</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoteSuccess(null)}
                    className="text-emerald-400 hover:text-emerald-700 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {noteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{noteError}</span>
                </div>
                <button type="button" onClick={() => setNoteError('')} className="text-red-400 hover:text-red-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Title / Filename Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Doküman / Not Başlığı <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">.txt formatında kaydedilir</span>
              </div>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Örn: Silivri Arsa Görüşmesi, Nuran Hanım Portföy Notu..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium transition-all"
                disabled={noteSaving}
              />
            </div>

            {/* Target Organization & Folder / Portfolio Selection */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Hedef Portföy & Kurum</span>
              </div>

              <div className="space-y-2.5">
                {/* Org dropdown */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Kurum / Portföy Sahibi
                  </label>
                  <select
                    value={noteOrgId}
                    onChange={(e) => {
                      setNoteOrgId(e.target.value);
                      setNoteFolder('');
                    }}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    disabled={noteSaving}
                  >
                    <option value="">-- Kurum Seçin (veya AI otomatik eşlesin) --</option>
                    <option value="__unassigned__">📁 Genel / Klasörsüzler</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Folder / Portfolio selector / input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Klasör / Portföy
                  </label>
                  <input
                    type="text"
                    list="note-folder-datalist"
                    value={noteFolder}
                    onChange={(e) => setNoteFolder(e.target.value)}
                    placeholder={
                      noteOrgId && orgs.find((o) => o.id === noteOrgId)?.folders?.length > 0
                        ? "Mevcut bir klasör seçin veya yeni yazın..."
                        : "Örn: İzmir dikili 35-65, Arsa Portföyü..."
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
                    disabled={noteSaving}
                  />
                  <datalist id="note-folder-datalist">
                    {noteOrgId &&
                      orgs
                        .find((o) => o.id === noteOrgId)
                        ?.folders?.map((f) => (
                          <option key={f} value={f} />
                        ))}
                  </datalist>

                  {/* Quick folder pill suggestions */}
                  {noteOrgId &&
                    orgs.find((o) => o.id === noteOrgId)?.folders?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {orgs
                          .find((o) => o.id === noteOrgId)
                          .folders.map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setNoteFolder(f)}
                              className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                noteFolder === f
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              📁 {f}
                            </button>
                          ))}
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Metin / Not İçeriği <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {noteContent.length.toLocaleString('tr-TR')} karakter
                </span>
              </div>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="WhatsApp yazışmalarını, görüşme notlarını, tapu/ada-parsel bilgilerini veya portföy şartlarını buraya yapıştırın veya yazın..."
                rows={9}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono leading-relaxed transition-all resize-y min-h-[160px]"
                disabled={noteSaving}
              />
            </div>

            {/* AI Auto-Format Option */}
            <div
              onClick={() => !noteSaving && setNoteFormatWithAi(!noteFormatWithAi)}
              className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={noteFormatWithAi}
                onChange={(e) => setNoteFormatWithAi(e.target.checked)}
                className="mt-0.5 accent-indigo-600 cursor-pointer"
                disabled={noteSaving}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800">
                    Yapay Zeka (AI) ile Biçimlendir &amp; Özetle
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  Kişileri, telefonları, fiyatları ve lokasyon detaylarını tespit eder, düzenli başlıklar ve maddeler halinde yapılandırır.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={noteSaving || !noteTitle.trim() || !noteContent.trim()}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
                noteSaving || !noteTitle.trim() || !noteContent.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white shadow-indigo-600/20 cursor-pointer'
              }`}
            >
              {noteSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Vektörleştiriliyor &amp; Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Metni .txt Olarak Kaydet ve Portföye Ekle</span>
                </>
              )}
            </button>
          </form>
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
        <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">Yapay Zeka Asistanı</h2>
              <p className="text-[11px] text-slate-400 truncate">Portföy ve belgeleriniz hakkında sorularınızı yanıtlar</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Sohbet geçmişini temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Temizle</span>
            </button>
          )}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-2xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">Nasıl yardımcı olabilirim?</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Portföyleriniz, tapu kayıtlarınız, sözleşmeleriniz ve notlarınız hakkında merak ettiğiniz her şeyi sorabilirsiniz.
              </p>
              <div className="w-full space-y-1.5">
                {[
                  "Nuran Hanım'ın portföyündeki şartlar neler?",
                  "Silivri'deki arsa ile ilgili belgeleri özetle.",
                  "En son eklenen portföy notlarında neler var?"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                    }}
                    className="w-full text-left p-2.5 text-xs text-slate-600 bg-white hover:bg-indigo-50/70 hover:text-indigo-700 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                msgIndex={idx}
                message={msg}
                onViewDocument={onViewDocument}
                onGoToInspector={onGoToInspector}
                onTraceGrounding={onTraceGrounding}
                onExecuteAction={handleExecuteAction}
                onCancelAction={handleCancelAction}
              />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-2xs">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="p-3.5 border-t border-slate-200 bg-white">
          <form
            onSubmit={handleSend}
            className="relative bg-slate-50 border border-slate-200/90 rounded-2xl flex items-end p-1.5 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all"
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
              placeholder="Belgeleriniz hakkında bir soru sorun..."
              className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400 resize-none py-2 px-3 max-h-32 min-h-[40px] text-xs leading-relaxed"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              title="Gönder"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex justify-between items-center px-1 mt-1.5 text-[10px] text-slate-400">
            <span>Enter: Gönder · Shift + Enter: Yeni satır</span>
            <span>RAG Hafızası devrede</span>
          </div>
        </div>
      </div>

      {/* ═══ Smart Portfolio & Auto-Naming Assignment Wizard ═══ */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              setShowOrgModal(false);
              setUnassignedQueue([]);
              setBatchAnalysis(null);
            }}
          />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[620px] max-w-[95vw] p-6 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {isAnalyzingBatch ? (
              /* AI Analyzing State */
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-4 text-indigo-600 shadow-sm animate-pulse">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Yapay Zeka Portföy & Dosya Analizi Yapıyor...</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                  Yüklenen {unassignedQueue.length} dosyanın içerikleri inceleniyor; ortak portföy klasörü, ait olduğu kurum ve temiz dosya isimleri hazırlanıyor.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-indigo-50/80 px-4 py-2 rounded-full border border-indigo-100">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>İçerikler eşleştiriliyor ve klasör yapısı kuruluyor...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Header & Direct Question */}
                <div className="pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-sm shadow-indigo-500/20">
                      {Object.keys(batchFileRenames).length > 1 ? <FolderOpen className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 leading-tight">
                        {Object.keys(batchFileRenames).length > 1
                          ? '📁 Portföy Hazırlandı: Hangi Kuruma Eklemek İstersiniz?'
                          : '📄 Dosya Analiz Edildi: Hangi Kuruma Eklemek İstersiniz?'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Yapay zeka {Object.keys(batchFileRenames).length > 1 ? `${Object.keys(batchFileRenames).length} dosyayı tek bir portföy altında topladı` : 'dosyayı analiz etti'}. Lütfen hedef organizasyonu seçin veya onaylayın:
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Summary Banner */}
                {batchAnalysis?.batch_summary && (
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-emerald-50/80 border border-indigo-200/80 rounded-2xl flex items-start gap-3 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                        ✨ Yapay Zeka Eşleştirme Özeti
                      </span>
                      <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                        {batchAnalysis.batch_summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* ═══ STEP 1: ORGANIZATION SELECTION (TOP & PROMINENT) ═══ */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>1. Hedef Kurum / Müşteri Seçimi</span>
                    </label>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setShowCreateInline(false)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                          !showCreateInline
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Mevcut Kurumlar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateInline(true);
                          if (!inlineOrgName && (batchAnalysis?.suggested_org_name || orgDetection?.suggested_org_name)) {
                            setInlineOrgName(batchAnalysis?.suggested_org_name || orgDetection?.suggested_org_name);
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                          showCreateInline
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        + Yeni Kurum Oluştur
                      </button>
                    </div>
                  </div>

                  {/* AI Suggested Org Hint */}
                  {batchAnalysis?.suggested_org_name && (
                    <div className="mb-3 text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>AI Önerisi: <strong className="font-bold">{batchAnalysis.suggested_org_name}</strong></span>
                      </div>
                      {!showCreateInline && orgs.some(o => o.id === batchAnalysis.suggested_org_id || o.name.toLowerCase() === batchAnalysis.suggested_org_name.toLowerCase()) ? (
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold">Eşleşti</span>
                      ) : null}
                    </div>
                  )}

                  {/* Create New Org Form */}
                  {showCreateInline ? (
                    <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Yeni Kurum / Müşteri Adı *
                      </label>
                      <input
                        value={inlineOrgName}
                        onChange={(e) => setInlineOrgName(e.target.value)}
                        placeholder="örn. Nuran Hanım, Bassel Group, Özsoy İnşaat..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                        autoFocus
                      />
                    </div>
                  ) : (
                    /* Existing Orgs Grid */
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {orgs.map((org) => {
                        const isSelected = assignOrgId === org.id;
                        return (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => {
                              setAssignOrgId(org.id);
                              setShowCreateInline(false);
                            }}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                                : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700'
                            }`}
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: org.color || '#6366f1' }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs truncate font-medium">{org.name}</div>
                              {org.folders?.length > 0 && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {org.folders.length} klasör
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* Unassigned / General Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setAssignOrgId('__unassigned__');
                          setShowCreateInline(false);
                        }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          assignOrgId === '__unassigned__'
                            ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-500'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate font-medium">Genel / Klasörsüzler</div>
                          <div className="text-[10px] text-slate-400">Kurumsuz genel arşiv</div>
                        </div>
                        {assignOrgId === '__unassigned__' && (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* ═══ STEP 2: FOLDER / PORTFOLIO NAME ═══ */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Folder className="w-4 h-4 text-amber-500" />
                      <span>2. Portföy / Klasör Adı</span>
                      {Object.keys(batchFileRenames).length > 1 && (
                        <span className="text-[10px] text-emerald-600 font-semibold normal-case">(Tüm dosyalar bu klasöre yerleştirilecek)</span>
                      )}
                    </label>
                    {assignFolder && (
                      <button
                        type="button"
                        onClick={() => setAssignFolder('')}
                        className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Temizle
                      </button>
                    )}
                  </div>

                  {/* Existing Folder Suggestion Chips for Selected Org */}
                  {!showCreateInline && orgs.find((o) => o.id === assignOrgId)?.folders?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <span className="text-[10px] text-slate-400 font-semibold">Mevcut Klasörler:</span>
                      {orgs
                        .find((o) => o.id === assignOrgId)
                        ?.folders.map((fld) => (
                          <button
                            key={fld}
                            type="button"
                            onClick={() => setAssignFolder(fld)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                              assignFolder === fld
                                ? 'bg-amber-500 text-white shadow-xs font-bold'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            📁 {fld}
                          </button>
                        ))}
                    </div>
                  )}

                  <input
                    value={assignFolder}
                    onChange={(e) => setAssignFolder(e.target.value)}
                    placeholder="örn. Izmir Dikili 35-65, Kadıköy 3+1 Daire, Sözleşmeler..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                {/* ═══ STEP 3: FILE RENAMING ═══ */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>3. Temiz Dosya İsimleri ({Object.keys(batchFileRenames).length} Dosya)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(düzenleyebilirsiniz)</span>
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                    {Object.keys(batchFileRenames).length > 0 ? (
                      Object.entries(batchFileRenames).map(([oldName, newName]) => (
                        <div key={oldName} className="p-2.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                          <div className="text-[10px] text-slate-400 truncate mb-1">
                            Orijinal: <span className="font-mono text-slate-500">{oldName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <input
                              value={newName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchFileRenames((prev) => ({ ...prev, [oldName]: val }));
                              }}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                              placeholder="Dosya adı..."
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-xs text-slate-700 font-medium truncate">{currentFilename}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ═══ BOTTOM ACTIONS ═══ */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowOrgModal(false);
                      setUnassignedQueue([]);
                      setBatchAnalysis(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    İptal / Kapat
                  </button>

                  <button
                    onClick={handleCommitBatchPortfolio}
                    disabled={(!assignOrgId && !inlineOrgName.trim()) || isCommittingBatch}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                  >
                    {isCommittingBatch ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Portföy Oluşturuluyor & Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {showCreateInline && inlineOrgName.trim()
                            ? `✨ "${inlineOrgName.trim()}" Kurumuna Kaydet (${Object.keys(batchFileRenames).length} Dosya)`
                            : assignOrgId && assignOrgId !== '__unassigned__'
                            ? `✨ "${orgs.find((o) => o.id === assignOrgId)?.name || 'Kurum'}" Kurumuna Kaydet (${Object.keys(batchFileRenames).length} Dosya)`
                            : `✨ Portföyü Kaydet (${Object.keys(batchFileRenames).length} Dosya)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// ── Source Citation Extraction Helper ─────────────────────────
const extractSourceInfo = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Extract document name
  const docMatch = text.match(/([a-zA-Z0-9_\-\s()]+\.(?:pdf|txt|png|jpg|jpeg|webp|gif|bmp))/i);
  const docName = docMatch ? docMatch[1].trim() : null;

  // Extract page number
  const pageMatch = text.match(/(?:s\.|p\.|page|sayfa|Page:)\s*(\d+)/i);
  const page = pageMatch ? parseInt(pageMatch[1], 10) : 1;

  // Extract organization name
  const orgMatch = text.match(/(?:Kurum|Organization|Org):\s*([^|)\n]+)/i);
  const org = orgMatch ? orgMatch[1].trim() : null;

  if (docName) {
    return { docName, page, org };
  }
  return null;
};

// ── Interactive Source Citation Badge ─────────────────────────
const SourceCitationBadge = ({ text, onViewDocument, onTraceGrounding }) => {
  const info = extractSourceInfo(text);

  if (!info) {
    return <em className="italic text-slate-500">{text}</em>;
  }

  const { docName, page, org } = info;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onViewDocument) {
          onViewDocument({ docName, page });
        }
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 mx-0.5 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-300 rounded-md transition-all cursor-pointer not-italic align-middle"
      title={`Tıkla: ${docName}${page && page > 1 ? ` (Sayfa ${page})` : ''} dokümanını aç`}
    >
      <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
      <span className="truncate max-w-[170px]">{docName}</span>
      {page && page > 1 && (
        <span className="text-[10px] text-slate-400 font-mono">s.{page}</span>
      )}
    </button>
  );
};

// ── Interactive Action Confirmation Card (e.g. for Deleting Portfolios/Docs via Chat) ─
const ActionConfirmationCard = ({ action, msgIndex, onExecute, onCancel }) => {
  if (!action) return null;

  const isPending = !action.status || action.status === 'pending';
  const isExecuting = action.status === 'executing';
  const isCompleted = action.status === 'completed';
  const isCancelled = action.status === 'cancelled';
  const isError = action.status === 'error';

  if (isCompleted) {
    return (
      <div className="mt-4 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>İşlem Başarıyla Tamamlandı</span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  Silindi
                </span>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate">
                {action.resultMessage || `'${action.target_folder || 'Seçilen öğeler'}' sistemden kalıcı olarak kaldırıldı.`}
              </div>
            </div>
          </div>
          {action.completedAt && (
            <span className="text-[10px] text-emerald-600 font-mono bg-emerald-100/90 px-2 py-0.5 rounded-md shrink-0">
              {action.completedAt}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="mt-4 p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 text-xs flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-200/80 flex items-center justify-center text-slate-500">
            <X className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-medium text-slate-600">Silme işlemi iptal edildi. Hiçbir dosya veya kayıt silinmedi.</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
          İptal Edildi
        </span>
      </div>
    );
  }

  if (isExecuting) {
    return (
      <div className="mt-4 p-4 rounded-2xl border border-rose-200 bg-rose-50/70 flex items-center justify-center gap-3 text-rose-800 text-xs font-semibold shadow-xs">
        <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
        <span>Kalıcı olarak siliniyor, vektör veritabanı ve klasörler güncelleniyor...</span>
      </div>
    );
  }

  // Pending State: Prominent interactive confirmation card
  return (
    <div className="mt-4 p-4 rounded-2xl border-2 border-rose-200/90 bg-gradient-to-b from-rose-50/70 to-rose-50/30 shadow-xs text-slate-800 transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-rose-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs shrink-0">
            <Trash2 className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 tracking-tight">
              {action.title || 'Silme İşlemi Onayı'}
            </div>
            <div className="text-[11px] text-rose-600 font-medium">
              Sistemden kalıcı olarak kaldırma işlemi
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
          Onay Bekliyor
        </span>
      </div>

      {/* Target Details Summary Box */}
      <div className="space-y-2 mb-3 bg-white/90 p-3 rounded-xl border border-rose-100 shadow-2xs">
        {action.target_org_name && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px] shrink-0">Kurum:</span>
            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
              {action.target_org_name}
            </span>
          </div>
        )}

        {action.target_folder && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px] shrink-0">Portföy / Klasör:</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-indigo-500" />
              {action.target_folder}
            </span>
          </div>
        )}

        {action.target_filenames && action.target_filenames.length > 0 && (
          <div className="pt-1">
            <div className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Silinecek Dokümanlar ({action.target_filenames.length}):</span>
              <span className="text-[10px] text-rose-500 font-mono">ChromaDB + Disk</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-0.5">
              {action.target_filenames.map((fname, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg text-slate-700 font-medium shadow-2xs hover:bg-slate-100 transition-colors"
                  title={fname}
                >
                  <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[210px]">{fname}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Warning Notice */}
      <div className="flex items-start gap-2 mb-3.5 text-[11px] text-rose-800 bg-rose-100/70 p-2.5 rounded-xl border border-rose-200">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <strong>Dikkat:</strong> Bu işlem geri alınamaz. İlgili portföy, tapu/sözleşme görselleri ve vektör indeksleri sistemden tamamen temizlenecektir.
        </div>
      </div>

      {isError && (
        <div className="mb-3 text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
          Hata: {action.errorMsg || 'Silme işlemi gerçekleştirilemedi.'}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onExecute(msgIndex, action)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Evet, Sistemden Sil</span>
        </button>
        <button
          onClick={() => onCancel(msgIndex)}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 shadow-2xs active:scale-[0.99] transition-all cursor-pointer flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
          <span>Vazgeç / İptal</span>
        </button>
      </div>
    </div>
  );
};

// ── Message Bubble with Clean Typography & Clickable Citations ─
const MessageBubble = ({ message, msgIndex, onViewDocument, onGoToInspector, onTraceGrounding, onExecuteAction, onCancelAction }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert raw legacy citations like ([Document: file.pdf | Organization: Org], Page: 4) into cleaner markdown
  const formattedContent = React.useMemo(() => {
    if (!message.content) return '';
    return message.content
      .replace(
        /\(\[Document:\s*([^\]|]+)\s*\|\s*Organization:\s*([^\]]+)\](?:,\s*Page:\s*(\d+))?\)/gi,
        (_, doc, org, page) => {
          const pStr = page ? `, s. ${page}` : '';
          return `*(Kaynak: ${doc.trim()}${pStr} | Kurum: ${org.trim()})*`;
        }
      )
      .replace(
        /\[Document:\s*([^\]|]+)\s*\|\s*Organization:\s*([^\]]+)\]/gi,
        (_, doc, org) => `*(Kaynak: ${doc.trim()} | Kurum: ${org.trim()})*`
      );
  }, [message.content]);

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl transition-all ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-xs px-4 py-2.5 text-xs sm:text-[13px] shadow-2xs leading-relaxed'
            : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs px-5 py-3.5 shadow-2xs text-xs sm:text-[13px]'
        }`}
      >
        {/* Content with clean typography */}
        <div className={isUser ? 'leading-relaxed text-white' : 'text-slate-800'}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-700">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-500 leading-relaxed text-slate-700">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed text-slate-700">
                    {children}
                  </li>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 space-y-1 pl-4 list-decimal marker:font-bold marker:text-indigo-600 leading-relaxed text-slate-700">
                    {children}
                  </ol>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">
                    {children}
                  </strong>
                ),
                h1: ({ children }) => (
                  <h3 className="text-sm font-bold text-slate-900 mt-3 mb-1.5 pb-1 border-b border-slate-100">
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h4 className="text-xs font-bold text-slate-900 mt-2.5 mb-1">
                    {children}
                  </h4>
                ),
                h3: ({ children }) => (
                  <h5 className="text-xs font-semibold text-indigo-950 mt-2 mb-1">
                    {children}
                  </h5>
                ),
                em: ({ children }) => {
                  const str = String(children);
                  if (
                    str.includes('Kaynak:') ||
                    str.includes('Source:') ||
                    str.includes('Document:') ||
                    str.includes('Kurum:') ||
                    str.includes('Organization:') ||
                    /\.(pdf|txt|png|jpg|jpeg|webp)/i.test(str)
                  ) {
                    return (
                      <SourceCitationBadge
                        text={str}
                        onViewDocument={onViewDocument}
                        onTraceGrounding={onTraceGrounding}
                      />
                    );
                  }
                  return <em className="italic text-slate-500">{children}</em>;
                },
                a: ({ href, children }) => {
                  const str = String(href || children);
                  const info = extractSourceInfo(str);
                  if (info && onViewDocument) {
                    return (
                      <SourceCitationBadge
                        text={str}
                        onViewDocument={onViewDocument}
                        onTraceGrounding={onTraceGrounding}
                      />
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium inline-flex items-center gap-0.5"
                    >
                      <span>{children}</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="my-2 border-l-2 border-indigo-400 bg-slate-50 px-3 py-1.5 rounded-r-lg text-xs text-slate-600 italic">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                    {children}
                  </thead>
                ),
                th: ({ children }) => <th className="p-2 font-semibold text-slate-800">{children}</th>,
                td: ({ children }) => (
                  <td className="p-2 border-t border-slate-100 text-slate-700">{children}</td>
                ),
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 font-mono text-[11px] rounded border border-slate-200/80">
                      {children}
                    </code>
                  ) : (
                    <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto my-2">
                      <code>{children}</code>
                    </pre>
                  ),
              }}
            >
              {formattedContent}
            </ReactMarkdown>
          )}
        </div>

        {/* Interactive Action Confirmation Card */}
        {!isUser && message.action && (
          <ActionConfirmationCard
            action={message.action}
            msgIndex={msgIndex}
            onExecute={onExecuteAction}
            onCancel={onCancelAction}
          />
        )}

        {!isUser && message.sources?.length > 0 && (
          <Sources
            sources={message.sources}
            onViewDocument={onViewDocument}
            onGoToInspector={onGoToInspector}
            onTraceGrounding={onTraceGrounding}
          />
        )}

        {/* Minimal Footer for Assistant */}
        {!isUser && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-[10px]">
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              <span>Asistan</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
              title="Cevabı kopyala"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sources with Organization Info & PDF/Image Link ────────────
const Sources = ({ sources, onViewDocument, onGoToInspector, onTraceGrounding }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2.5 pt-2 border-t border-slate-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer select-none"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <BookOpen className="w-3 h-3" />
        <span>
          Kaynak Belgeler ({sources.length})
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="bg-slate-50/70 rounded-lg p-2.5 border border-slate-200/60 hover:border-indigo-200 transition-all text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  {src.org_name && (
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-slate-600 bg-slate-200/60 shrink-0"
                    >
                      {src.org_name}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onViewDocument && onViewDocument({ docName: src.source, page: src.page })}
                    className="text-[11px] font-medium text-indigo-600 hover:underline truncate cursor-pointer flex items-center gap-1"
                    title={`Tıkla: ${src.source} dokümanını aç`}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[200px]">{src.source}</span>
                  </button>
                  {src.page && (
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">s.{src.page}</span>
                  )}
                </div>
              </div>
              {src.snippet && (
                <p className="text-[11px] text-slate-500 line-clamp-2 italic leading-relaxed">
                  "{src.snippet}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Upload;

