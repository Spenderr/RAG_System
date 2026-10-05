import React, { useState, useRef } from 'react';
import {
  Upload as UploadIcon, FileText, CheckCircle2, Loader2, Plus,
  File, AlertCircle, Sparkles, Building2, ChevronRight, X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const VALID_EXTENSIONS = ['pdf', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

export const DashboardIngest = ({ userOrgs = [], onIngestionComplete, onViewDocument }) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'note'

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { step, message }
  const [uploadSuccess, setUploadSuccess] = useState(null); // { filename, org_name, folder, chunks }
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteOrgId, setNoteOrgId] = useState('');
  const [noteFolder, setNoteFolder] = useState('');
  const [noteFormatWithAi, setNoteFormatWithAi] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(null);
  const [noteError, setNoteError] = useState('');

  // ── Drag & Drop Handlers ──────────────────────────────────────────
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
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleProcessFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) {
      setUploadError('Supported file formats: PDF, TXT, PNG, JPG, WEBP.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(null);
    setUploadProgress({ step: 'uploading', message: 'Uploading to warehouse...' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      const { filename } = await res.json();

      setUploadProgress({ step: 'processing', message: 'Extracting text, OCR & vectorizing...' });

      // Connect to SSE stream for ingestion pipeline
      await new Promise((resolve, reject) => {
        const es = new EventSource(`/api/process/${encodeURIComponent(filename)}`);

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.step === 'done') {
              es.close();
              const match = data.message?.match(/(\d+)\s*chunks/);
              const chunks = match ? parseInt(match[1]) : 1;
              const org = data.org_detection || {};

              setUploadSuccess({
                filename,
                orgName: org.org_name || 'General Warehouse',
                folder: org.suggested_folder || 'Archive',
                chunks,
              });
              setUploadProgress(null);
              window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
              onIngestionComplete?.();
              resolve();
            } else if (data.status === 'error') {
              es.close();
              reject(new Error(data.message || 'Processing error'));
            } else {
              setUploadProgress({
                step: data.step,
                message: data.message || `Processing ${data.step}...`,
              });
            }
          } catch (parseErr) {
            console.error('SSE JSON error', parseErr);
          }
        };

        es.onerror = () => {
          es.close();
          // Fallback resolve if stream closes normally
          setUploadProgress(null);
          setUploadSuccess({ filename, orgName: 'Warehouse', chunks: 1 });
          window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
          onIngestionComplete?.();
          resolve();
        };
      });
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'File upload failed');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Quick Note Save Handler ───────────────────────────────────────
  const handleSaveNote = async (e) => {
    e?.preventDefault();
    if (!noteTitle.trim()) {
      setNoteError('Please enter a note title.');
      return;
    }
    if (!noteContent.trim()) {
      setNoteError('Please enter note content.');
      return;
    }

    setIsSavingNote(true);
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
        throw new Error(errData.detail || 'Failed to save note');
      }

      const data = await res.json();
      const targetOrg = userOrgs.find((o) => o.id === (noteOrgId || data.org_id));

      setNoteSuccess({
        filename: data.filename,
        orgName: targetOrg?.name || 'General Portfolio',
        folder: data.folder || 'Notes',
        chunks: data.chunk_count || 1,
      });

      setNoteTitle('');
      setNoteContent('');
      setNoteFolder('');
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      onIngestionComplete?.();
    } catch (err) {
      console.error('Note error:', err);
      setNoteError(err.message || 'Error saving note');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between h-[540px] overflow-hidden">
      <div>
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadIcon className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'note'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>

        {/* Tab 1: Direct File Dropzone */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]'
                  : 'border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 shadow-2xs">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                ) : (
                  <UploadIcon className="w-6 h-6" />
                )}
              </div>

              <p className="text-xs font-bold text-slate-800">
                {isUploading ? 'Processing File...' : 'Click to Upload or Drag & Drop'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[210px] leading-relaxed">
                PDF, Deed Images, Photos, or TXT
              </p>
            </div>

            {/* Ingestion Progress State */}
            {isUploading && uploadProgress && (
              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-indigo-900 truncate">
                    {uploadProgress.message}
                  </p>
                  <div className="w-full h-1 bg-indigo-200 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full w-2/3 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* Ingestion Success Feedback */}
            {uploadSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>File Ingested</span>
                  </span>
                  <button
                    onClick={() => setUploadSuccess(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="font-semibold text-slate-800 truncate" title={uploadSuccess.filename}>
                  {uploadSuccess.filename}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                    📁 {uploadSuccess.folder}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    {uploadSuccess.chunks} vectors
                  </span>
                </div>
              </div>
            )}

            {/* Ingestion Error Alert */}
            {uploadError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Quick Note / Meeting Memo */}
        {activeTab === 'note' && (
          <form onSubmit={handleSaveNote} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Title / Reference
              </label>
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Silivri Client Meeting Note"
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Portfolio (Optional)
              </label>
              <select
                value={noteOrgId}
                onChange={(e) => setNoteOrgId(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">General / Unassigned</option>
                {userOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Content / Notes
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
                placeholder="Paste client WhatsApp messages, meeting memo, or contract terms..."
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all custom-scrollbar resize-none"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={noteFormatWithAi}
                  onChange={(e) => setNoteFormatWithAi(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Format with AI</span>
              </label>

              <button
                type="submit"
                disabled={isSavingNote || !noteTitle.trim() || !noteContent.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                {isSavingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                <span>Save Note</span>
              </button>
            </div>

            {noteSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Saved to vector store: {noteSuccess.filename}</span>
              </div>
            )}

            {noteError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                {noteError}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Autonomous Ingestion</span>
        </span>
        <span className="font-mono text-[10px]">Auto-OCR & Chunks</span>
      </div>
    </div>
  );
};

export default DashboardIngest;
