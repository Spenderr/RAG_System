import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Plus, FileText, Search, Trash2, FolderOpen,
  Edit2, Check, X, Eye, Loader2, Image as ImageIcon,
  FolderPlus, Folder, Layers, HelpCircle, RefreshCw,
  ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Tag, MoreHorizontal, Sparkles,
  ZoomIn, ZoomOut, Download, MessageSquare, Copy, StickyNote,
  Send, Share2, Sparkle, CheckSquare, Square, RotateCcw, Maximize2, Minimize2, ExternalLink,
  Users, User
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

// ─────────────────────────────────────────────────────────────────
// Inline File Preview Panel
// ─────────────────────────────────────────────────────────────────
const InlinePreview = ({
  doc,
  onClose,
  onDelete,
  onPrevDoc,
  onNextDoc,
  hasPrevDoc,
  hasNextDoc,
  currentIndex = 0,
  totalDocs = 1,
}) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';
  const isPdf = doc?.name?.toLowerCase().endsWith('.pdf');
  const isImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(doc?.name || '');
  const isNote = doc?.doc_type === 'note' || doc?.name?.toLowerCase().includes('note') || doc?.tags?.includes('note');
  const [zoom, setZoom] = useState(1);
  const [isFit, setIsFit] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setZoom(1);
    setIsFit(true);
  }, [doc?.name]);

  if (!doc) return null;

  const fileUrl = `/api/documents/${encodeURIComponent(doc.name)}/file`;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0 bg-white z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-xl shrink-0 ${
            isNote
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : isImg
              ? 'bg-emerald-50 text-emerald-600'
              : isPdf
              ? 'bg-red-50 text-red-600'
              : 'bg-indigo-50 text-indigo-600'
          }`}>
            {isNote ? <FileText className="w-4 h-4" /> : isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-slate-800 truncate block max-w-[320px] sm:max-w-md" title={doc.name}>
              {doc.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {isNote && (
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  Text Note / Memo
                </span>
              )}
              {doc.folder && (
                <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                  📁 {doc.folder}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Doc Navigation bar */}
        {totalDocs > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-2xl shadow-2xs">
            <button
              onClick={onPrevDoc}
              disabled={!hasPrevDoc}
              className={`p-1.5 rounded-xl transition-all ${
                hasPrevDoc
                  ? 'text-slate-700 hover:text-indigo-600 hover:bg-white hover:shadow-xs active:scale-95 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Previous Document (← Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 px-2 select-none">
              {currentIndex + 1} / {totalDocs}
            </span>
            <button
              onClick={onNextDoc}
              disabled={!hasNextDoc}
              className={`p-1.5 rounded-xl transition-all ${
                hasNextDoc
                  ? 'text-slate-700 hover:text-indigo-600 hover:bg-white hover:shadow-xs active:scale-95 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Next Document (→ Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {(isPdf || isImg) && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 p-0.5 rounded-xl">
              <button
                onClick={() => {
                  setIsFit(false);
                  setZoom(z => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))));
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title={isTr ? "Küçült (-25%)" : "Zoom Out (-25%)"}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsFit(true);
                  setZoom(1);
                }}
                className="px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                title={isTr ? "Ekrana Sığdır / Sıfırla" : "Fit to Screen / Reset"}
              >
                {isFit && zoom === 1 ? (isTr ? 'Sığdır' : 'Fit') : `${Math.round(zoom * 100)}%`}
              </button>
              <button
                onClick={() => {
                  setIsFit(false);
                  setZoom(z => Math.min(3, parseFloat((z + 0.25).toFixed(2))));
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title={isTr ? "Büyüt (+25%)" : "Zoom In (+25%)"}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Direct Download */}
          <a
            href={fileUrl}
            download={doc.name}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-indigo-100"
            title={isTr ? "Dosyayı İndir" : "Download File"}
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Delete Document */}
          {onDelete && (
            <button
              onClick={() => onDelete(doc.name)}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
              title={isTr ? "Bu Dokümanı Sil" : "Delete This Document"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer ml-1"
            title={isTr ? "Kapat (ESC)" : "Close (ESC)"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="flex-1 overflow-auto bg-slate-100 relative custom-scrollbar flex items-center justify-center">
        {/* Floating Prev Button */}
        {hasPrevDoc && (
          <button
            onClick={onPrevDoc}
            className="absolute left-5 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-full shadow-2xl border border-slate-200/80 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer group"
            title="Previous Document (← Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Floating Next Button */}
        {hasNextDoc && (
          <button
            onClick={onNextDoc}
            className="absolute right-5 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-full shadow-2xl border border-slate-200/80 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer group"
            title="Next Document (→ Right Arrow)"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {isPdf ? (
          <div style={{ width: '100%', height: '100%' }}>
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-none"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
              title={doc.name}
            />
          </div>
        ) : isImg ? (
          <div className="flex items-center justify-center w-full h-full p-6 overflow-auto">
            <img
              src={fileUrl}
              alt={doc.name}
              className={`rounded-2xl shadow-xl transition-all duration-200 select-none ${
                isFit && zoom === 1
                  ? 'max-w-full max-h-[calc(100vh-160px)] object-contain'
                  : 'max-w-none'
              }`}
              style={{
                transform: zoom !== 1 ? `scale(${zoom})` : 'none',
                transformOrigin: 'center center',
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full">
            <TextPreview filename={doc.name} isNote={isNote} />
          </div>
        )}
      </div>

      {/* Meta footer */}
      <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/90 shrink-0 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{doc.chunk_count || 0} {isTr ? 'chunk' : 'chunks'}</span>
          <span>·</span>
          <span>{(doc.char_count || 0).toLocaleString()} {isTr ? 'karakter' : 'chars'}</span>
          {doc.folder && (
            <>
              <span>·</span>
              <span className="text-indigo-600 font-sans font-semibold">📁 {doc.folder}</span>
            </>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          {totalDocs > 1 && (isTr ? 'Gezinmek için ← ve → tuşlarını kullanabilirsiniz' : 'Use ← and → arrow keys to browse documents')}
        </div>
      </div>
    </div>
  );
};

const TextPreview = ({ filename, isNote }) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setIsEditing(false);
    setSaveSuccess(false);
    fetch(`/api/documents/${encodeURIComponent(filename)}/content`)
      .then(r => r.json())
      .then(d => {
        setText(d.content || '');
        setEditedText(d.content || '');
      })
      .catch(() => setText(isTr ? 'İçerik yüklenemedi.' : 'Failed to load content.'))
      .finally(() => setLoading(false));
  }, [filename, isTr]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditedText(text);
    setIsEditing(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditedText(text);
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!editedText.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(filename)}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || (isTr ? 'Kayıt başarısız oldu' : 'Failed to save content'));
      }
      setText(editedText);
      setIsEditing(false);
      setSaveSuccess(true);
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isNote ? '📄 Quick Note / Memo' : '📄 Text Content'}
          </span>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <Check className="w-3 h-3 text-emerald-600" />
              {isTr ? 'Depo Hafızası Güncellendi' : 'Memory Updated'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200/80 shadow-2xs transition-all cursor-pointer"
                title={isTr ? "Notun içine yeni bilgi ekle veya düzenle" : "Add or edit note content"}
              >
                <Edit2 className="w-3 h-3" />
                <span>{isTr ? 'Düzenle / Not Düş' : 'Edit / Add Note'}</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? (isTr ? 'Kopyalandı' : 'Copied!') : (isTr ? 'Kopyala' : 'Copy')}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>{isTr ? 'Vazgeç' : 'Cancel'}</span>
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{isTr ? 'Kaydediliyor...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Kaydet & Hafızayı Güncelle' : 'Save & Re-index'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <X className="w-3.5 h-3.5 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex-1 flex flex-col overflow-hidden">
        {isEditing ? (
          <div className="flex-1 flex flex-col">
            <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{isTr ? 'İçeriği düzenleyin veya altına yeni notlar ekleyin (Markdown desteklenir)' : 'Edit content or append new notes (Markdown supported)'}</span>
              <span>{editedText.length.toLocaleString()} {isTr ? 'karakter' : 'chars'}</span>
            </div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 w-full p-3 text-xs text-slate-800 font-sans leading-relaxed border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none custom-scrollbar"
              placeholder={isTr ? "Not içeriğini buraya yazın..." : "Type note content here..."}
              autoFocus
            />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
            <pre className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// ExplorerGrid — macOS Finder / Windows Explorer style
// ─────────────────────────────────────────────────────────────────
const FolderIcon = ({
  name, count, isActive, onClick, onDelete,
  isDropTarget, onDragOver, onDragLeave, onDrop
}) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  return (
    <div className="group relative select-none">
      <button
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-24 cursor-pointer ${
          isDropTarget
            ? 'bg-emerald-100/90 ring-4 ring-emerald-400 scale-110 shadow-lg'
            : isActive
            ? 'bg-indigo-100/80 ring-2 ring-indigo-400/60'
            : 'hover:bg-slate-100/80 active:bg-slate-200/60'
        }`}
        title={isTr ? `${name}\n(Tıklayın: Aç | Sürükleyin: Dosya Taşı)` : `${name}\n(Click: Open | Drag: Move File)`}
      >
        {/* Folder body */}
        <div className={`relative w-14 h-11 transition-transform ${isDropTarget ? 'scale-105' : ''}`}>
          {/* Folder back */}
          <div className={`absolute bottom-0 left-0 w-full h-9 rounded-xl rounded-tl-none shadow-sm transition-colors ${
            isDropTarget ? 'bg-emerald-400' : 'bg-amber-300'
          }`} />
          {/* Folder tab */}
          <div className={`absolute top-0 left-0 w-8 h-2.5 rounded-t-md transition-colors ${
            isDropTarget ? 'bg-emerald-400' : 'bg-amber-300'
          }`} />
          {/* Folder front highlight */}
          <div className={`absolute bottom-0 left-0 w-full h-8 rounded-xl rounded-tl-none transition-colors ${
            isDropTarget ? 'bg-gradient-to-b from-emerald-300 to-emerald-400' : 'bg-gradient-to-b from-amber-200 to-amber-300'
          }`} />
          {/* Count badge */}
          {count > 0 && (
            <div className={`absolute bottom-1.5 right-1.5 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none transition-colors ${
              isDropTarget ? 'bg-emerald-600' : 'bg-amber-500/80'
            }`}>
              {count}
            </div>
          )}
        </div>
        <span className={`text-[11px] font-semibold text-center leading-tight max-w-full truncate w-full transition-colors ${
          isDropTarget ? 'text-emerald-800 font-bold' : isActive ? 'text-indigo-700' : 'text-slate-700'
        }`}>
          {isDropTarget ? (isTr ? 'Buraya Bırak' : 'Drop Here') : name}
        </span>
      </button>

      {/* Delete Folder button on hover */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(name);
          }}
          className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/95 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 shadow-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer"
          title={isTr ? `"${name}" klasörünü sil` : `Delete folder "${name}"`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

const FileCard = ({
  doc, isActive, isSelected, isSelectionMode, isDragging,
  onSelect, onToggleSelect, onPreview, onInspect, onMoveFolder, onAssign, onDelete,
  onDragStart, onDragEnd,
  allFolders, selectedOrg,
}) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';
  const isPdf = doc.name.toLowerCase().endsWith('.pdf');
  const isImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(doc.name);
  const isNote = doc.doc_type === 'note' || doc.name.toLowerCase().includes('note') || doc.tags?.includes('note') || doc.doc_type === 'whatsapp';
  const ext = doc.name.split('.').pop().toUpperCase();
  const fileUrl = `/api/documents/${encodeURIComponent(doc.name)}/file`;

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ filename: doc.name, currentFolder: doc.folder, orgId: doc.org_id || selectedOrg?.id }));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(doc);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey || isSelectionMode) {
          onToggleSelect(doc.name);
        } else {
          onSelect(doc);
        }
      }}
      className={`group relative flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all select-none w-24 cursor-pointer ${
        isDragging
          ? 'opacity-40 scale-90 ring-2 ring-indigo-400 rotate-1'
          : isSelected
          ? 'bg-indigo-100/90 ring-2 ring-indigo-500 shadow-xs'
          : isActive
          ? 'bg-indigo-50/90 ring-2 ring-indigo-300'
          : 'hover:bg-slate-100/80 active:bg-slate-200/60'
      }`}
      title={isTr ? `${doc.name}\n(Tıklayın: Önizle | Sürükleyin: Taşı | Seçin: Toplu İşlem)` : `${doc.name}\n(Click: Preview | Drag: Move | Select: Batch Action)`}
    >
      {/* Multi-Selection Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(doc.name);
        }}
        className={`absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
          isSelected
            ? 'bg-indigo-600 text-white shadow-xs scale-105'
            : isSelectionMode
            ? 'bg-white/95 border border-slate-300 text-slate-400 hover:border-indigo-400'
            : 'bg-white/90 border border-slate-300 text-transparent hover:text-slate-400 opacity-0 group-hover:opacity-100'
        }`}
        title={isSelected ? (isTr ? 'Seçimi kaldır' : 'Deselect') : (isTr ? 'Seç' : 'Select')}
      >
        <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100 stroke-[3]' : 'opacity-0'}`} />
      </button>

      {/* File thumbnail / icon */}
      <div className={`relative w-14 h-16 rounded-xl overflow-hidden flex items-end justify-center shadow-sm ${
        isNote
          ? 'bg-emerald-50 border border-emerald-200'
          : isImg
          ? 'bg-slate-200'
          : isPdf
          ? 'bg-red-50 border border-red-100'
          : 'bg-indigo-50 border border-indigo-100'
      }`}>
        {isImg ? (
          <img
            src={fileUrl}
            alt={doc.name}
            className="w-full h-full object-cover pointer-events-none"
            loading="lazy"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
          />
        ) : null}

        {/* Fallback icon / overlay for non-image */}
        <div className={`${isImg ? 'hidden' : 'flex'} absolute inset-0 flex-col items-center justify-center gap-1 pointer-events-none`}>
          {isNote ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-xs">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[7.5px] font-extrabold text-emerald-700 tracking-wider">NOTE</span>
            </div>
          ) : isPdf ? (
            <svg viewBox="0 0 32 40" className="w-8 h-10">
              <rect x="0" y="0" width="32" height="40" rx="4" fill="#fff1f2" />
              <rect x="0" y="0" width="32" height="40" rx="4" fill="none" stroke="#fca5a5" strokeWidth="1.5"/>
              <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="#ef4444">PDF</text>
            </svg>
          ) : (
            <svg viewBox="0 0 32 40" className="w-8 h-10">
              <rect x="0" y="0" width="32" height="40" rx="4" fill="#eef2ff" />
              <rect x="0" y="0" width="32" height="40" rx="4" fill="none" stroke="#a5b4fc" strokeWidth="1.5"/>
              <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="800" fill="#6366f1">{ext}</text>
            </svg>
          )}
        </div>

        {/* Hover action bar */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 py-1 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(doc); }}
            className="p-1 text-white hover:text-indigo-300 transition-colors cursor-pointer"
            title={isTr ? "Önizle" : "Preview"}
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveFolder(doc); }}
            className="p-1 text-white hover:text-amber-300 transition-colors cursor-pointer"
            title={isTr ? "Klasöre Taşı" : "Move to Folder"}
          >
            <FolderOpen className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAssign(doc); }}
            className="p-1 text-white hover:text-indigo-300 transition-colors cursor-pointer"
            title={isTr ? "Kuruma Taşı" : "Move to Portfolio"}
          >
            <Building2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(doc.name); }}
            className="p-1 text-white hover:text-red-400 transition-colors cursor-pointer"
            title={isTr ? "Sil" : "Delete"}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* File name */}
      <div className="w-full text-center pointer-events-none">
        <p className={`text-[11px] font-medium leading-tight line-clamp-2 ${isSelected ? 'text-indigo-900 font-bold' : isActive ? 'text-indigo-800' : 'text-slate-700'}`}>
          {doc.name.length > 20 ? doc.name.substring(0, 18) + '…' : doc.name}
        </p>
        {selectedOrg?.is_all ? (
          <p className="text-[9px] font-semibold truncate mt-0.5" style={{ color: doc.org_color || '#6366f1' }}>
            🏢 {doc.org_name || (isTr ? 'Genel' : 'General')}{doc.folder ? ` / 📁 ${doc.folder}` : ''}
          </p>
        ) : doc.folder ? (
          <p className="text-[9px] text-indigo-600 font-semibold truncate mt-0.5">📁 {doc.folder}</p>
        ) : selectedOrg?.id === '__unassigned__' && doc.org_name && doc.org_id !== '__unassigned__' ? (
          <p className="text-[9px] font-semibold truncate mt-0.5" style={{ color: doc.org_color || '#6366f1' }}>
            🏢 {doc.org_name}
          </p>
        ) : isNote ? (
          <p className="text-[9px] text-emerald-600 font-semibold truncate mt-0.5">📄 Note / Memo</p>
        ) : null}
      </div>
    </div>
  );
};


const ExplorerGrid = ({
  docs, allFolders, selectedOrg, previewDoc, setPreviewDoc,
  selectedFolderFilter, setSelectedFolderFilter,
  draggedDoc, onDragStart, onDragEnd,
  dragOverFolder, setDragOverFolder, onDropDocOnFolder,
  setMoveFolderModal, setTargetFolderName, setCustomFolderName,
  setAssignModal, setAssignTargetOrg, setAssignFolder, setAssignTags,
  selectedDocNames, onToggleSelectDoc, onDeleteDoc,
  onDeleteFolder,
}) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';
  // Group docs by folder when viewing "all"
  const showFolderIcons = selectedFolderFilter === 'all' && allFolders.length > 0;
  const isSelectionMode = selectedDocNames.length > 0;

  const handlePreview = (doc) => {
    setPreviewDoc(doc);
  };

  const handleMoveFolder = (doc) => {
    setMoveFolderModal({
      filename: doc.name,
      currentFolder: doc.folder || '',
      orgId: selectedOrg.id,
      orgName: selectedOrg.name,
      availableFolders: allFolders,
    });
    setTargetFolderName(doc.folder || '');
    setCustomFolderName('');
  };

  const handleAssign = (doc) => {
    setAssignModal({ filename: doc.name, currentOrgId: selectedOrg.id });
    setAssignTargetOrg('');
    setAssignFolder('');
    setAssignTags('');
  };

  return (
    <div className="p-5">
      {/* Folder header banner when inside a specific folder view */}
      {selectedFolderFilter !== 'all' && selectedFolderFilter !== '__unfolded__' && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/90">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedFolderFilter('all')}
              className="px-2.5 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200/80 shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-semibold bg-white"
              title={isTr ? "Tüm dokümanlara geri dön" : "Back to all files"}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{isTr ? 'Geri' : 'Back'}</span>
            </button>
            <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-700 flex items-center justify-center shadow-2xs">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{selectedFolderFilter}</h3>
                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {docs.length} {isTr ? 'dosya' : 'files'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{isTr ? 'Bu klasör / portföye ait dokümanlar' : 'Documents in this folder / portfolio'}</p>
            </div>
          </div>
          {!selectedOrg.is_system && onDeleteFolder && (
            <button
              onClick={() => onDeleteFolder(selectedFolderFilter)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-xl border border-red-200 hover:border-red-600 transition-all cursor-pointer shadow-2xs"
              title={isTr ? `"${selectedFolderFilter}" klasörünü sil` : `Delete folder "${selectedFolderFilter}"`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isTr ? 'Klasörü Sil' : 'Delete Folder'}</span>
            </button>
          )}
        </div>
      )}

      {/* Folder icons row — only in "all" view */}
      {showFolderIcons && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isTr ? 'Klasörler / Portföyler' : 'Folders / Sub-Portfolios'}</p>
            {draggedDoc && (
              <span className="text-[10px] text-emerald-600 font-bold animate-pulse">
                {isTr ? '👇 Dosyayı bir klasörün üzerine bırakın' : '👇 Drop the file onto a folder'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {allFolders.map(folder => {
              const count = docs.filter(d => d.folder === folder).length;
              return (
                <FolderIcon
                  key={folder}
                  name={folder}
                  count={count}
                  isActive={false}
                  isDropTarget={dragOverFolder === folder}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverFolder !== folder) setDragOverFolder(folder);
                  }}
                  onDragLeave={() => {
                    if (dragOverFolder === folder) setDragOverFolder(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverFolder(null);
                    onDropDocOnFolder(folder);
                  }}
                  onClick={() => setSelectedFolderFilter(folder)}
                  onDelete={!selectedOrg.is_system && onDeleteFolder ? () => onDeleteFolder(folder) : null}
                />
              );
            })}
          </div>
          {docs.length > 0 && (
            <div className="mt-4 mb-2.5 border-t border-slate-200/80" />
          )}
        </div>
      )}

      {/* File icon grid */}
      {docs.length > 0 && (
        <>
          {showFolderIcons && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              {isTr ? 'Tüm Dosyalar' : 'All Files'}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {docs.map(doc => (
              <FileCard
                key={doc.name}
                doc={doc}
                isActive={previewDoc?.name === doc.name}
                isSelected={selectedDocNames.includes(doc.name)}
                isSelectionMode={isSelectionMode}
                isDragging={draggedDoc?.name === doc.name}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onSelect={handlePreview}
                onToggleSelect={onToggleSelectDoc}
                onPreview={handlePreview}
                onMoveFolder={handleMoveFolder}
                onAssign={handleAssign}
                onDelete={onDeleteDoc}
                allFolders={allFolders}
                selectedOrg={selectedOrg}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main Organizations Component
// ─────────────────────────────────────────────────────────────────
const Organizations = ({ initialDocName, initialOrgId, initialScope = 'all', openNoteOnMount, onClearInitialOrgId, onClearInitialDocName, activeView }) => {
  const { language, t } = useLanguage();
  const isTr = language === 'tr';
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState(initialOrgId || null);
  const [orgDocs, setOrgDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(null);
  const [search, setSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState(initialScope || (activeView === 'personal_portfolios' ? 'personal' : (activeView === 'team_portfolios' ? 'team' : 'all')));
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('all');
  const [previewDoc, setPreviewDoc] = useState(null);

  // Sync scope filter when activeView or initialScope changes
  useEffect(() => {
    if (activeView === 'personal_portfolios') {
      setScopeFilter('personal');
    } else if (activeView === 'team_portfolios') {
      setScopeFilter('team');
    } else if (initialScope && initialScope !== 'all') {
      setScopeFilter(initialScope);
    }
  }, [activeView, initialScope]);

  // Navigation History State (Finder / Explorer style Back & Forward)
  const [navState, setNavState] = useState({ history: [], index: -1 });
  const isNavigatingRef = useRef(false);

  // Sync navigation history whenever selectedOrgId or selectedFolderFilter changes
  useEffect(() => {
    if (!selectedOrgId) return;

    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    const currentEntry = { orgId: selectedOrgId, folder: selectedFolderFilter || 'all' };

    setNavState(prev => {
      const current = prev.history[prev.index];
      if (current && current.orgId === currentEntry.orgId && current.folder === currentEntry.folder) {
        return prev;
      }
      const newHistory = [...prev.history.slice(0, prev.index + 1), currentEntry];
      return {
        history: newHistory,
        index: newHistory.length - 1,
      };
    });
  }, [selectedOrgId, selectedFolderFilter]);

  const canGoBack = navState.index > 0;
  const canGoForward = navState.index >= 0 && navState.index < navState.history.length - 1;

  const handleGoBack = () => {
    if (!canGoBack) return;
    const targetIndex = navState.index - 1;
    const target = navState.history[targetIndex];
    if (target) {
      isNavigatingRef.current = true;
      setNavState(prev => ({ ...prev, index: targetIndex }));
      if (target.orgId !== selectedOrgId) {
        setSelectedOrgId(target.orgId);
      }
      setSelectedFolderFilter(target.folder);
    }
  };

  const handleGoForward = () => {
    if (!canGoForward) return;
    const targetIndex = navState.index + 1;
    const target = navState.history[targetIndex];
    if (target) {
      isNavigatingRef.current = true;
      setNavState(prev => ({ ...prev, index: targetIndex }));
      if (target.orgId !== selectedOrgId) {
        setSelectedOrgId(target.orgId);
      }
      setSelectedFolderFilter(target.folder);
    }
  };

  useEffect(() => {
    if (initialOrgId) {
      setSelectedOrgId(initialOrgId);
      onClearInitialOrgId?.();
    }
  }, [initialOrgId]);

  useEffect(() => {
    if (!initialDocName) return;
    const targetName = typeof initialDocName === 'object' ? initialDocName.docName : initialDocName;
    if (!targetName) return;

    fetch('/api/documents')
      .then(res => res.ok ? res.json() : [])
      .then(allDocs => {
        const found = allDocs.find(d =>
          d.name === targetName ||
          d.name.toLowerCase() === targetName.toLowerCase() ||
          d.name.toLowerCase().startsWith(targetName.toLowerCase().replace(/\.[^/.]+$/, ''))
        );
        if (found) {
          const targetOrgId = found.org_id || '__unassigned__';
          setSelectedOrgId(targetOrgId);
          if (found.folder) setSelectedFolderFilter(found.folder);
          setPreviewDoc(found);
          fetchOrgDocs(targetOrgId);
        }
        onClearInitialDocName?.();
      })
      .catch(console.error);
  }, [initialDocName]);

  // Org CRUD
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgColor, setNewOrgColor] = useState('#6366f1');
  const [newOrgScope, setNewOrgScope] = useState('team');
  const [newOrgTags, setNewOrgTags] = useState('');
  const [newOrgFolders, setNewOrgFolders] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingOrg, setEditingOrg] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Doc assignment
  const [assignModal, setAssignModal] = useState(null);
  const [assignTargetOrg, setAssignTargetOrg] = useState('');
  const [assignFolder, setAssignFolder] = useState('');
  const [assignTags, setAssignTags] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Folder management
  const [moveFolderModal, setMoveFolderModal] = useState(null);
  const [targetFolderName, setTargetFolderName] = useState('');
  const [customFolderName, setCustomFolderName] = useState('');
  const [isMovingFolder, setIsMovingFolder] = useState(false);

  // Add folder inline
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Quick Note / WhatsApp Modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteOrgId, setNoteOrgId] = useState('');
  const [noteFolder, setNoteFolder] = useState('');
  const [noteFormatWithAi, setNoteFormatWithAi] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);

  // Drag and Drop state
  const [draggedDoc, setDraggedDoc] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [dragOverOrgId, setDragOverOrgId] = useState(null);
  const [dropToast, setDropToast] = useState(null);

  // Multi-selection & batch actions state
  const [selectedDocNames, setSelectedDocNames] = useState([]);
  const [docToDelete, setDocToDelete] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchFolderModal, setBatchFolderModal] = useState(false);
  const [batchOrgModal, setBatchOrgModal] = useState(false);
  const [batchTargetFolder, setBatchTargetFolder] = useState('');
  const [batchCustomFolder, setBatchCustomFolder] = useState('');
  const [batchTargetOrgId, setBatchTargetOrgId] = useState('');
  const [isBatchOperating, setIsBatchOperating] = useState(false);

  // Clear selection on org change
  useEffect(() => {
    setSelectedDocNames([]);
  }, [selectedOrgId]);

  const handleToggleSelectDoc = (docName) => {
    setSelectedDocNames(prev =>
      prev.includes(docName) ? prev.filter(n => n !== docName) : [...prev, docName]
    );
  };

  const handleSelectAll = () => {
    const visibleDocNames = filteredDocs.map(d => d.name);
    const allSelected = visibleDocNames.length > 0 && visibleDocNames.every(n => selectedDocNames.includes(n));
    if (allSelected) {
      setSelectedDocNames(prev => prev.filter(n => !visibleDocNames.includes(n)));
    } else {
      setSelectedDocNames(prev => Array.from(new Set([...prev, ...visibleDocNames])));
    }
  };

  const handleClearSelection = () => {
    setSelectedDocNames([]);
  };

  const handleDeleteDoc = (docName) => {
    setDocToDelete(docName);
  };

  const confirmDeleteSingleDoc = async () => {
    if (!docToDelete) return;
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docToDelete)}`, { method: 'DELETE' });
      if (res.ok) {
        if (previewDoc?.name === docToDelete) setPreviewDoc(null);
        setSelectedDocNames(prev => prev.filter(n => n !== docToDelete));
        setDocToDelete(null);
        await fetchOrganizations();
        if (selectedOrgId) await fetchOrgDocs(selectedOrgId);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedDocNames.length === 0) return;
    setIsBatchOperating(true);
    try {
      const res = await fetch('/api/documents/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: selectedDocNames }),
      });
      if (res.ok) {
        if (previewDoc && selectedDocNames.includes(previewDoc.name)) {
          setPreviewDoc(null);
        }
        setSelectedDocNames([]);
        setBatchDeleteConfirm(false);
        await fetchOrganizations();
        if (selectedOrgId) await fetchOrgDocs(selectedOrgId);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed batch delete:', err);
    } finally {
      setIsBatchOperating(false);
    }
  };

  const handleBatchMoveFolder = async () => {
    if (selectedDocNames.length === 0) return;
    const finalFolder = (batchCustomFolder.trim() || batchTargetFolder).trim();
    setIsBatchOperating(true);
    try {
      const res = await fetch('/api/documents/batch-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filenames: selectedDocNames,
          target_folder: finalFolder,
        }),
      });
      if (res.ok) {
        setBatchFolderModal(false);
        setBatchTargetFolder('');
        setBatchCustomFolder('');
        setSelectedDocNames([]);
        await fetchOrganizations();
        if (selectedOrgId) await fetchOrgDocs(selectedOrgId);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed batch move folder:', err);
    } finally {
      setIsBatchOperating(false);
    }
  };

  const handleBatchMoveOrg = async () => {
    if (selectedDocNames.length === 0 || !batchTargetOrgId) return;
    setIsBatchOperating(true);
    try {
      const res = await fetch('/api/documents/batch-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filenames: selectedDocNames,
          target_org_id: batchTargetOrgId,
          target_folder: batchTargetFolder.trim() || '',
        }),
      });
      if (res.ok) {
        setBatchOrgModal(false);
        setBatchTargetOrgId('');
        setBatchTargetFolder('');
        setSelectedDocNames([]);
        await fetchOrganizations();
        if (selectedOrgId) await fetchOrgDocs(selectedOrgId);
        await fetchOrgDocs(batchTargetOrgId);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed batch move org:', err);
    } finally {
      setIsBatchOperating(false);
    }
  };

  const handleBatchDownload = () => {
    selectedDocNames.forEach((name, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `/api/documents/${encodeURIComponent(name)}/file`;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 250);
    });
  };

  const handleDragStart = (doc) => {
    setDraggedDoc(doc);
  };

  const handleDragEnd = () => {
    setDraggedDoc(null);
    setDragOverFolder(null);
    setDragOverOrgId(null);
  };

  const handleDropDocOnFolder = async (folderName) => {
    if (!draggedDoc) return;
    const targetFolder = folderName === '__unfolded__' ? '' : folderName;
    if ((draggedDoc.folder || '') === targetFolder) return;

    const docName = draggedDoc.name;

    // Instant optimistic update in UI
    setOrgDocs(prev => {
      const orgDocsList = prev[selectedOrgId] || [];
      return {
        ...prev,
        [selectedOrgId]: orgDocsList.map(d => d.name === docName ? { ...d, folder: targetFolder } : d)
      };
    });

    setDropToast(`✓ "${docName}" dosyası "${targetFolder || 'Genel / Klasörsüz'}" klasörüne taşındı`);
    setTimeout(() => setDropToast(null), 3500);

    try {
      await fetch(`/api/documents/${encodeURIComponent(docName)}/folder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder }),
      });
      await fetchOrganizations();
      await fetchOrgDocs(selectedOrgId);
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
    } catch (err) {
      console.error('Failed to move doc on drop:', err);
    }
  };

  const handleDropDocOnOrg = async (targetOrgId) => {
    if (!draggedDoc || !targetOrgId || targetOrgId === selectedOrgId) return;

    const docName = draggedDoc.name;
    const targetOrg = organizations.find(o => o.id === targetOrgId);

    // Instant optimistic update
    setOrgDocs(prev => ({
      ...prev,
      [selectedOrgId]: (prev[selectedOrgId] || []).filter(d => d.name !== docName)
    }));

    setDropToast(`✓ "${docName}" dosyası "${targetOrg?.name || 'Kurum'}" kurumuna taşındı`);
    setTimeout(() => setDropToast(null), 3500);

    try {
      await fetch(`/api/documents/${encodeURIComponent(docName)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: targetOrgId,
          folder: '',
          tags: draggedDoc.tags || [],
        }),
      });
      await fetchOrganizations();
      await fetchOrgDocs(selectedOrgId);
      await fetchOrgDocs(targetOrgId);
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
    } catch (err) {
      console.error('Failed to assign doc on drop:', err);
    }
  };

  const openNoteModal = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteOrgId(selectedOrgId && selectedOrgId !== '__unassigned__' && selectedOrgId !== '__all__' ? selectedOrgId : (organizations.find(o => !o.is_system)?.id || ''));
    setNoteFolder(selectedFolderFilter !== 'all' && selectedFolderFilter !== '__unfolded__' ? selectedFolderFilter : '');
    setNoteFormatWithAi(true);
    setShowNoteModal(true);
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch('/api/documents/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle.trim(),
          content: noteContent.trim(),
          org_id: noteOrgId || undefined,
          folder: noteFolder.trim() || undefined,
          format_with_ai: noteFormatWithAi,
          doc_type: 'note',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNoteModal(false);
        setNoteTitle('');
        setNoteContent('');
        await fetchOrganizations();
        if (noteOrgId) {
          setSelectedOrgId(noteOrgId);
          await fetchOrgDocs(noteOrgId);
        }
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
        setPreviewDoc({
          name: data.filename,
          chunk_count: data.chunk_count,
          char_count: data.char_count,
          folder: data.folder,
          doc_type: 'note',
        });
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setNoteSaving(false);
    }
  };


  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
        // Default to All Documents if no selection
        if (!selectedOrgId) {
          setSelectedOrgId('__all__');
        }
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrgDocs = async (orgId) => {
    if (!orgId) return;
    setLoadingDocs(orgId);
    try {
      const url = orgId === '__all__'
        ? '/api/documents'
        : `/api/organizations/${encodeURIComponent(orgId)}/documents`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrgDocs(prev => ({ ...prev, [orgId]: data }));
      }
    } catch (err) {
      console.error('Failed to fetch org docs:', err);
    } finally {
      setLoadingDocs(null);
    }
  };

  // Listen to mainchunk_docs_updated event and window focus
  useEffect(() => {
    fetchOrganizations();
    const handleUpdate = () => {
      fetchOrganizations();
      if (selectedOrgId) fetchOrgDocs(selectedOrgId);
      if (selectedOrgId !== '__all__') fetchOrgDocs('__all__');
    };
    window.addEventListener('mainchunk_docs_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('mainchunk_docs_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [selectedOrgId]);

  // When switching views to 'organizations', always refresh organizations and docs
  useEffect(() => {
    if (activeView === 'organizations') {
      fetchOrganizations();
      if (selectedOrgId) fetchOrgDocs(selectedOrgId);
    }
  }, [activeView, selectedOrgId]);

  // Load docs whenever org selection changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDocs(selectedOrgId);
    }
  }, [selectedOrgId]);

  const selectOrg = (orgId) => {
    setSelectedOrgId(orgId);
    if (!isNavigatingRef.current) {
      setSelectedFolderFilter('all');
    }
    setDocSearch('');
    setPreviewDoc(null);
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName.trim(),
          description: newOrgDesc.trim(),
          color: newOrgColor,
          scope: newOrgScope,
          tags: newOrgTags.split(',').map(t => t.trim()).filter(Boolean),
          folders: newOrgFolders.split(',').map(f => f.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const newOrg = await res.json();
        setShowCreateModal(false);
        setNewOrgName(''); setNewOrgDesc(''); setNewOrgColor('#6366f1');
        setNewOrgTags(''); setNewOrgFolders(''); setNewOrgScope('team');
        await fetchOrganizations();
        setSelectedOrgId(newOrg.id);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed to create org:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOrg = async (orgId) => {
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(orgId)}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        const nextOrg = organizations.find(o => o.id !== orgId && !o.is_system);
        setSelectedOrgId(nextOrg?.id || '__all__');
        await fetchOrganizations();
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed to delete org:', err);
    }
  };

  const handleSaveEdit = async (orgId) => {
    try {
      await fetch(`/api/organizations/${encodeURIComponent(orgId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      setEditingOrg(null);
      await fetchOrganizations();
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
    } catch (err) {
      console.error('Failed to update org:', err);
    }
  };

  const handleAssignDoc = async () => {
    if (!assignModal || !assignTargetOrg) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(assignModal.filename)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: assignTargetOrg,
          folder: assignFolder.trim(),
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setAssignModal(null); setAssignTargetOrg(''); setAssignFolder(''); setAssignTags('');
        await fetchOrganizations();
        if (selectedOrgId) await fetchOrgDocs(selectedOrgId);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed to assign doc:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateFolder = async (orgId, folderName) => {
    if (!folderName?.trim()) return;
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(orgId)}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim() }),
      });
      if (res.ok) {
        setShowAddFolder(false);
        setNewFolderName('');
        await fetchOrganizations();
        await fetchOrgDocs(orgId);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete || !selectedOrgId) return;
    const targetFolder = folderToDelete;
    try {
      // Optimistic update
      setOrgDocs(prev => {
        const list = prev[selectedOrgId] || [];
        return {
          ...prev,
          [selectedOrgId]: list.map(d => d.folder === targetFolder ? { ...d, folder: '' } : d)
        };
      });
      if (selectedFolderFilter === targetFolder) {
        setSelectedFolderFilter('all');
      }
      setFolderToDelete(null);

      let res = await fetch(`/api/organizations/${encodeURIComponent(selectedOrgId)}/folders/${encodeURIComponent(targetFolder)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        await fetch(`/api/organizations/${encodeURIComponent(selectedOrgId)}/folders/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: targetFolder }),
        });
      }
      await fetchOrganizations();
      await fetchOrgDocs(selectedOrgId);
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const handleMoveDocFolder = async () => {
    if (!moveFolderModal) return;
    setIsMovingFolder(true);
    const finalFolder = (customFolderName.trim() || targetFolderName).trim();
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(moveFolderModal.filename)}/folder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: finalFolder }),
      });
      if (res.ok) {
        setMoveFolderModal(null); setTargetFolderName(''); setCustomFolderName('');
        await fetchOrganizations();
        if (selectedOrgId) await fetchOrgDocs(selectedOrgId);
        window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
      }
    } catch (err) {
      console.error('Failed to move doc folder:', err);
    } finally {
      setIsMovingFolder(false);
    }
  };

  // Derived data for current org
  const totalDocsCount = React.useMemo(() => {
    return organizations.reduce((acc, o) => acc + (o.document_count || 0), 0);
  }, [organizations]);

  const allDocsOrg = React.useMemo(() => ({
    id: '__all__',
    name: isTr ? 'Tüm Dokümanlar' : 'All Documents',
    description: isTr ? 'Tüm portföylerdeki bütün dosyalar' : 'All files across all portfolios and folders',
    color: '#6366f1',
    is_all: true,
    document_count: totalDocsCount,
    folders: Array.from(new Set(organizations.flatMap(o => o.folders || []))).sort(),
  }), [isTr, totalDocsCount, organizations]);

  const selectedOrg = selectedOrgId === '__all__'
    ? allDocsOrg
    : organizations.find(o => o.id === selectedOrgId);
  const currentDocs = orgDocs[selectedOrgId] || [];

  const allFolders = React.useMemo(() => {
    const set = new Set(selectedOrg?.folders || []);
    currentDocs.forEach(d => { if (d.folder) set.add(d.folder); });
    return Array.from(set).sort();
  }, [selectedOrg, currentDocs]);

  const filteredDocs = React.useMemo(() => {
    let docs = currentDocs;
    if (selectedFolderFilter !== 'all') {
      if (selectedFolderFilter === '__unfolded__') {
        docs = docs.filter(d => !d.folder);
      } else {
        docs = docs.filter(d => d.folder === selectedFolderFilter);
      }
    }
    if (docSearch) {
      const kw = docSearch.toLowerCase();
      docs = docs.filter(d =>
        d.name.toLowerCase().includes(kw) ||
        d.folder?.toLowerCase().includes(kw) ||
        d.tags?.some(t => t.toLowerCase().includes(kw))
      );
    }
    return docs;
  }, [currentDocs, selectedFolderFilter, docSearch]);

  const effectiveDocList = React.useMemo(() => {
    if (!previewDoc) return filteredDocs;
    const idx = filteredDocs.findIndex(d => d.name === previewDoc.name);
    if (idx !== -1) return filteredDocs;
    const currIdx = currentDocs.findIndex(d => d.name === previewDoc.name);
    if (currIdx !== -1) return currentDocs;
    return [previewDoc];
  }, [filteredDocs, currentDocs, previewDoc]);

  const docIndex = previewDoc ? effectiveDocList.findIndex(d => d.name === previewDoc.name) : -1;
  const hasPrevDoc = docIndex > 0;
  const hasNextDoc = docIndex >= 0 && docIndex < effectiveDocList.length - 1;

  const handlePrevDoc = () => {
    if (hasPrevDoc) {
      setPreviewDoc(effectiveDocList[docIndex - 1]);
    }
  };

  const handleNextDoc = () => {
    if (hasNextDoc) {
      setPreviewDoc(effectiveDocList[docIndex + 1]);
    }
  };

  // Unified keyboard navigation shortcuts (Left/Right arrows for docs in modal, Alt+Left/Right for history, ESC to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }

      if (previewDoc) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setPreviewDoc(null);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevDoc();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextDoc();
          return;
        }
      }

      if ((e.altKey && e.key === 'ArrowLeft') || ((e.metaKey || e.ctrlKey) && e.key === '[')) {
        e.preventDefault();
        handleGoBack();
      } else if ((e.altKey && e.key === 'ArrowRight') || ((e.metaKey || e.ctrlKey) && e.key === ']')) {
        e.preventDefault();
        handleGoForward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, hasPrevDoc, hasNextDoc, docIndex, effectiveDocList, canGoBack, canGoForward, navState]);

  const teamCount = organizations.filter(o => !o.is_system && (o.scope || 'team') === 'team').length;
  const personalCount = organizations.filter(o => !o.is_system && o.scope === 'personal').length;
  const isTeamScope = scopeFilter === 'team' || (selectedOrg && selectedOrg.scope === 'team');

  const teamDocsCount = React.useMemo(() => {
    return organizations
      .filter(o => !o.is_system && (o.scope || 'team') === 'team')
      .reduce((acc, o) => acc + (o.document_count || 0), 0);
  }, [organizations]);

  const userOrgs = organizations.filter(o => {
    if (o.is_system) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (scopeFilter === 'team') return (o.scope || 'team') === 'team';
    if (scopeFilter === 'personal') return o.scope === 'personal';
    return true;
  });
  const unassignedOrg = organizations.find(o => o.is_system);

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">

      {/* ══════════════════════════════════════════════
          LEFT PANEL — Organization List
      ══════════════════════════════════════════════ */}
      <div className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
        {/* Left header */}
        <div className="px-3.5 pt-4 pb-3 border-b border-slate-100 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {scopeFilter === 'team'
                ? (isTr ? 'Ekip Portföyleri' : 'Team Portfolios')
                : scopeFilter === 'personal'
                ? (isTr ? 'Kişisel Portföyler' : 'Personal Portfolios')
                : (isTr ? 'Tüm Portföyler' : 'Portfolios & Workspaces')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchOrganizations}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title={isTr ? "Yenile" : "Refresh"}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? (scopeFilter === 'team' ? 'animate-spin text-orange-500' : 'animate-spin text-indigo-500') : ''}`} />
              </button>
              <button
                onClick={() => {
                  setNewOrgScope(scopeFilter === 'personal' ? 'personal' : 'team');
                  if (scopeFilter === 'team') setNewOrgColor('#f97316');
                  setShowCreateModal(true);
                }}
                className={`p-1.5 rounded-lg transition-colors shadow-xs cursor-pointer text-white ${
                  scopeFilter === 'team'
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
                title={isTr ? "Yeni Portföy" : "New Portfolio"}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scope Segment Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setScopeFilter('all')}
              className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{isTr ? 'Tümü' : 'All'}</span>
            </button>
            <button
              onClick={() => setScopeFilter('team')}
              className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
                scopeFilter === 'team'
                  ? 'bg-orange-500 text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-orange-600'
              }`}
              title={isTr ? "Ekip portföyleri" : "Team portfolios"}
            >
              <Users className="w-3 h-3 shrink-0" />
              <span>{isTr ? 'Ekip' : 'Team'}</span>
            </button>
            <button
              onClick={() => setScopeFilter('personal')}
              className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
                scopeFilter === 'personal'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={isTr ? "Kişisel portföyler" : "Personal portfolios"}
            >
              <User className="w-3 h-3 shrink-0" />
              <span>{isTr ? 'Kişisel' : 'Personal'}</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isTr ? "Portföy ara..." : "Search portfolios..."}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none ${
                scopeFilter === 'team' ? 'focus:border-orange-400' : 'focus:border-indigo-400'
              }`}
            />
          </div>
        </div>

        {/* Org list */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className={`w-5 h-5 animate-spin ${scopeFilter === 'team' ? 'text-orange-400' : 'text-indigo-400'}`} />
            </div>
          ) : (
            <div className="px-2 space-y-1">
              {/* All Documents option */}
              {scopeFilter !== 'team' && (
                <>
                  <button
                    onClick={() => selectOrg('__all__')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all ${
                      selectedOrgId === '__all__'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    title={isTr ? 'Tüm portföylerdeki bütün dokümanları göster' : 'Show all documents across all portfolios'}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedOrgId === '__all__' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${selectedOrgId === '__all__' ? 'text-white' : 'text-slate-800'}`}>
                        {isTr ? 'Tüm Dokümanlar' : 'All Documents'}
                      </p>
                      <p className={`text-[10px] font-mono ${selectedOrgId === '__all__' ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {totalDocsCount} {isTr ? 'doküman' : 'docs'}
                      </p>
                    </div>
                    {selectedOrgId === '__all__' && (
                      <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />
                    )}
                  </button>
                  <div className="my-1.5 border-t border-slate-100" />
                </>
              )}

              {/* User Orgs list or empty state */}
              {userOrgs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-slate-400">
                  {scopeFilter === 'team' ? (
                    <Users className="w-8 h-8 text-orange-300" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-300" />
                  )}
                  <p className="text-xs text-center font-medium text-slate-500">
                    {scopeFilter === 'team'
                      ? (isTr ? 'Henüz ekip portföyü yok' : 'No team portfolios yet')
                      : (isTr ? 'Henüz portföy yok' : 'No portfolios found')}
                  </p>
                  <button
                    onClick={() => {
                      setNewOrgScope(scopeFilter === 'personal' ? 'personal' : 'team');
                      if (scopeFilter === 'team') setNewOrgColor('#f97316');
                      setShowCreateModal(true);
                    }}
                    className={`text-xs font-bold hover:underline cursor-pointer ${
                      scopeFilter === 'team' ? 'text-orange-600' : 'text-indigo-600'
                    }`}
                  >
                    + {scopeFilter === 'personal' ? (isTr ? 'Kişisel Portföy Oluştur' : 'Create Personal Portfolio') : (isTr ? 'Ekip Portföyü Oluştur' : 'Create Team Portfolio')}
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {userOrgs.map(org => {
                    const isSelected = selectedOrgId === org.id;
                    const isOrgDropTarget = dragOverOrgId === org.id;
                    const isPersonal = org.scope === 'personal';
                    return (
                      <div key={org.id} className="group relative">
                        <button
                          onClick={() => selectOrg(org.id)}
                          onDragOver={(e) => {
                            if (draggedDoc && selectedOrgId !== org.id) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverOrgId !== org.id) setDragOverOrgId(org.id);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverOrgId === org.id) setDragOverOrgId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverOrgId(null);
                            handleDropDocOnOrg(org.id);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all ${
                            isOrgDropTarget
                              ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-[1.02] shadow-sm'
                              : isSelected
                              ? 'bg-indigo-50 border border-indigo-200/80 shadow-xs'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                          title={isOrgDropTarget ? (isTr ? `"${draggedDoc?.name}" dosyasını buraya bırakın` : `Drop "${draggedDoc?.name}" here`) : org.name}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                            style={{ backgroundColor: isOrgDropTarget ? '#10b98130' : `${org.color}18` }}
                          >
                            {isPersonal ? (
                              <User className="w-4 h-4" style={{ color: isOrgDropTarget ? '#059669' : org.color }} />
                            ) : (
                              <Users className="w-4 h-4" style={{ color: isOrgDropTarget ? '#059669' : org.color }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-xs font-bold truncate ${isOrgDropTarget ? 'text-emerald-800' : isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {isOrgDropTarget ? (isTr ? 'Buraya Taşı' : 'Move Here') : org.name}
                              </p>
                              {scopeFilter === 'all' && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                  isPersonal
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                                    : 'bg-orange-50 text-orange-700 border border-orange-200/80'
                                }`}>
                                  {isPersonal ? (isTr ? 'Kişisel' : 'Personal') : (isTr ? 'Ekip' : 'Team')}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">{org.document_count} {isTr ? 'dok.' : 'docs'}</p>
                          </div>
                          {isSelected && !isOrgDropTarget && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        </button>

                        {/* Hover actions */}
                        {!isSelected && !isOrgDropTarget && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingOrg(org.id); setEditName(org.name); setEditDesc(org.description); }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(org.id); }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unassigned system org at bottom */}
              {unassignedOrg && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => selectOrg(unassignedOrg.id)}
                    onDragOver={(e) => {
                      if (draggedDoc && selectedOrgId !== unassignedOrg.id) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverOrgId !== unassignedOrg.id) setDragOverOrgId(unassignedOrg.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverOrgId === unassignedOrg.id) setDragOverOrgId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverOrgId(null);
                      handleDropDocOnOrg(unassignedOrg.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all ${
                      dragOverOrgId === unassignedOrg.id
                        ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-[1.02] shadow-sm'
                        : selectedOrgId === unassignedOrg.id
                        ? 'bg-slate-100 border border-slate-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Folder className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-600 truncate">
                        {dragOverOrgId === unassignedOrg.id ? (isTr ? 'Klasörsüz Havuza Taşı' : 'Move to Unassigned') : (unassignedOrg.id === '__unassigned__' ? (isTr ? 'Genel / Klasörsüzler' : 'General / Unassigned') : unassignedOrg.name)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{unassignedOrg.document_count} {isTr ? 'doküman' : 'docs'}</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CENTER PANEL — Document List
      ══════════════════════════════════════════════ */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {scopeFilter === 'team' && userOrgs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-orange-50/40 via-white to-slate-50 overflow-y-auto custom-scrollbar">
            <div className="w-20 h-20 rounded-3xl bg-orange-100 border border-orange-200/80 text-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/15 mb-6 animate-[scaleIn_0.3s_ease-out]">
              <Users className="w-10 h-10" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-orange-600 bg-orange-100/90 border border-orange-200 px-3 py-1 rounded-full mb-3 shadow-2xs">
              {isTr ? 'Ortak Ekip Kütüphanesi' : 'Team Shared Knowledge Base'}
            </span>

            <h2 className="text-2xl font-black text-slate-900 mb-3 max-w-lg tracking-tight">
              {isTr ? 'Henüz Ekip Portföyü Oluşturulmadı' : 'No Team Portfolios Created Yet'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mb-8 leading-relaxed">
              {isTr
                ? 'İş arkadaşlarınızla ortak kullanabileceğiniz paylaşımlı portföyler oluşturun. Yüklediğiniz dokümanları, sözleşmeleri ve gayrimenkul dosyalarını tüm ekip tek bir AI destekli arama ve sohbet üzerinden sorgulayabilir.'
                : 'Create shared portfolios for you and your colleagues. Upload documents, contracts, and property files so your entire team can collaborate and query them through unified AI search.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mb-8 text-left">
              <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-2.5">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 mb-1">{isTr ? 'Ekip İçi Paylaşım' : 'Shared with Colleagues'}</h3>
                <p className="text-[11px] text-slate-500">{isTr ? 'Sizin ve meslektaşlarınızın ortak erişebileceği dijital depo.' : 'Central repository accessible to all team members.'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-2.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 mb-1">{isTr ? 'Ortak AI Sorgulama' : 'Unified Team AI'}</h3>
                <p className="text-[11px] text-slate-500">{isTr ? 'Tüm ekip dosyaları tek bir AI sorgusuyla taranır ve özetlenir.' : 'AI searches across all team files with precise citations.'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-2.5">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 mb-1">{isTr ? 'Ayrılmış Çalışma Alanı' : 'Workspace Isolation'}</h3>
                <p className="text-[11px] text-slate-500">{isTr ? 'Kişisel dosyalarınız gizli kalırken ekip dosyaları ortaklaşır.' : 'Personal files stay private while team docs are shared.'}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setNewOrgScope('team');
                setNewOrgColor('#f97316');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isTr ? 'İlk Ekip Portföyünü Oluştur' : 'Create First Team Portfolio'}</span>
            </button>
          </div>
        ) : !selectedOrg ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Building2 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-600">{isTr ? 'Bir kurum seçin' : 'Select a portfolio'}</p>
            <p className="text-xs mt-1">{isTr ? 'Sol panelden bir kurum seçerek dosyalarını görüntüleyin' : 'Select a portfolio from the left panel to view its files'}</p>
          </div>
        ) : (
          <>
            {/* Center header */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-200 bg-white shrink-0">
              {/* Explorer Navigation Toolbar (Finder-style Back / Forward + Breadcrumb path) */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Back & Forward button pill */}
                  <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shadow-2xs shrink-0">
                    <button
                      onClick={handleGoBack}
                      disabled={!canGoBack}
                      className={`p-1.5 rounded-lg transition-all ${
                        canGoBack
                          ? isTeamScope
                            ? 'text-slate-700 hover:text-orange-600 hover:bg-white shadow-2xs cursor-pointer active:scale-95'
                            : 'text-slate-700 hover:text-indigo-600 hover:bg-white shadow-2xs cursor-pointer active:scale-95'
                          : 'text-slate-300 cursor-not-allowed opacity-40'
                      }`}
                      title={canGoBack ? (isTr ? 'Geri git (Alt + Sol Ok)' : 'Go back (Alt + Left Arrow)') : (isTr ? 'Geri gidilemez' : 'Cannot go forward')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleGoForward}
                      disabled={!canGoForward}
                      className={`p-1.5 rounded-lg transition-all ${
                        canGoForward
                          ? isTeamScope
                            ? 'text-slate-700 hover:text-orange-600 hover:bg-white shadow-2xs cursor-pointer active:scale-95'
                            : 'text-slate-700 hover:text-indigo-600 hover:bg-white shadow-2xs cursor-pointer active:scale-95'
                          : 'text-slate-300 cursor-not-allowed opacity-40'
                      }`}
                      title={canGoForward ? (isTr ? 'İleri git (Alt + Sağ Ok)' : 'Go forward (Alt + Right Arrow)') : (isTr ? 'İleri gidilemez' : 'Cannot go forward')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Breadcrumbs path */}
                  <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0 truncate">
                    <button
                      onClick={() => setSelectedFolderFilter('all')}
                      className={`flex items-center gap-1.5 font-medium px-2 py-1 rounded-lg transition-all ${
                        selectedFolderFilter === 'all'
                          ? isTeamScope
                            ? 'text-orange-600 font-bold bg-orange-50/80'
                            : 'text-indigo-600 font-bold bg-indigo-50/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                      }`}
                      title={isTr ? `${selectedOrg.name} tüm dosyaları` : `All files in ${selectedOrg.name}`}
                    >
                      {selectedOrg.is_all ? (
                        <Layers className={`w-3.5 h-3.5 shrink-0 ${isTeamScope ? 'text-orange-600' : 'text-indigo-600'}`} />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: selectedOrg.color }} />
                      )}
                      <span className="truncate max-w-[140px] sm:max-w-[220px]">
                        {selectedOrg.is_system ? (isTr ? 'Genel / Klasörsüzler' : 'General / Unassigned') : selectedOrg.name}
                      </span>
                    </button>

                    {selectedFolderFilter !== 'all' && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-semibold border border-amber-200/60 shadow-2xs min-w-0">
                          <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[160px] sm:max-w-[240px]">
                            {selectedFolderFilter === '__unfolded__' ? (isTr ? 'Klasörsüz Dosyalar' : 'Unassigned Files') : selectedFolderFilter}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* History position badge */}
                {navState.history.length > 1 && (
                  <div className="hidden sm:flex items-center text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                    {isTr ? 'Geçmiş:' : 'History:'} {navState.index + 1}/{navState.history.length}
                  </div>
                )}
              </div>

              {/* Org title row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${selectedOrg.color}15` }}
                  >
                    {selectedOrg.is_all
                      ? <Layers className={`w-5 h-5 ${isTeamScope ? 'text-orange-600' : 'text-indigo-600'}`} />
                      : selectedOrg.is_system
                      ? <HelpCircle className="w-5 h-5 text-slate-400" />
                      : isTeamScope
                      ? <Users className="w-5 h-5" style={{ color: selectedOrg.color }} />
                      : <Building2 className="w-5 h-5" style={{ color: selectedOrg.color }} />
                    }
                  </div>
                  <div className="min-w-0">
                    {editingOrg === selectedOrg.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="text-sm font-bold bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-400 w-40"
                          autoFocus
                        />
                        <input
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder={isTr ? "Açıklama" : "Description"}
                          className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-400 w-48"
                        />
                        <button onClick={() => handleSaveEdit(selectedOrg.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingOrg(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-sm font-bold text-slate-900 truncate">
                          {selectedOrg.is_system ? (isTr ? 'Genel / Klasörsüzler' : 'General / Unassigned') : selectedOrg.name}
                        </h1>
                        {selectedOrg.description && (
                          <p className="text-[11px] text-slate-500 truncate">{selectedOrg.description}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {selectedOrg.document_count} {isTr ? 'dok.' : 'docs'}
                  </span>
                  {!selectedOrg.is_system && !selectedOrg.is_all && editingOrg !== selectedOrg.id && (
                    <>
                      <button
                        onClick={() => { setEditingOrg(selectedOrg.id); setEditName(selectedOrg.name); setEditDesc(selectedOrg.description); }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(selectedOrg.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fetchOrgDocs(selectedOrg.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs === selectedOrg.id ? (isTeamScope ? 'animate-spin text-orange-500' : 'animate-spin text-indigo-500') : ''}`} />
                  </button>
                </div>
              </div>

              {/* Folder filter tabs */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                <button
                  onClick={() => setSelectedFolderFilter('all')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedFolderFilter === 'all'
                      ? isTeamScope
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  {isTr ? 'Tümü' : 'All'} ({currentDocs.length})
                </button>

                {allFolders.map(folder => {
                  const count = currentDocs.filter(d => d.folder === folder).length;
                  const isSelected = selectedFolderFilter === folder;
                  const isFolderDropTarget = dragOverFolder === folder;
                  return (
                    <div key={folder} className="inline-flex items-center group/pill">
                      <button
                        onClick={() => setSelectedFolderFilter(folder)}
                        onDragOver={(e) => {
                          if (draggedDoc) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverFolder !== folder) setDragOverFolder(folder);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverFolder === folder) setDragOverFolder(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverFolder(null);
                          handleDropDocOnFolder(folder);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isFolderDropTarget
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105 shadow-xs'
                            : isSelected
                            ? isTeamScope
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-indigo-600 text-white shadow-xs'
                            : isTeamScope
                            ? 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50 hover:text-orange-700'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                        title={isFolderDropTarget ? (isTr ? `"${draggedDoc?.name}" dosyasını buraya bırakın` : `Drop "${draggedDoc?.name}" here`) : folder}
                      >
                        <Folder className={`w-3 h-3 ${isSelected || isFolderDropTarget ? 'text-white' : isTeamScope ? 'text-orange-500' : 'text-indigo-500'}`} />
                        {folder}
                        <span className={`ml-0.5 text-[10px] font-mono ${isSelected || isFolderDropTarget ? 'text-white' : 'text-slate-400'}`}>
                          {count}
                        </span>
                      </button>
                      {!selectedOrg.is_system && !selectedOrg.is_all && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folder);
                          }}
                          className="ml-0.5 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover/pill:opacity-100 transition-all cursor-pointer"
                          title={isTr ? `"${folder}" klasörünü sil` : `Delete folder "${folder}"`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {currentDocs.some(d => !d.folder) && allFolders.length > 0 && (
                  <button
                    onClick={() => setSelectedFolderFilter('__unfolded__')}
                    onDragOver={(e) => {
                      if (draggedDoc) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverFolder !== '__unfolded__') setDragOverFolder('__unfolded__');
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverFolder === '__unfolded__') setDragOverFolder(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverFolder(null);
                      handleDropDocOnFolder('__unfolded__');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      dragOverFolder === '__unfolded__'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 scale-105 shadow-xs'
                        : selectedFolderFilter === '__unfolded__'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-white text-slate-500 border border-dashed border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Folder className={`w-3 h-3 ${selectedFolderFilter === '__unfolded__' || dragOverFolder === '__unfolded__' ? 'text-white' : 'text-slate-400'}`} />
                    <span>{isTr ? 'Klasörsüz' : 'Unassigned'} ({currentDocs.filter(d => !d.folder).length})</span>
                  </button>
                )}

                {/* Add folder button */}
                {!selectedOrg.is_system && !selectedOrg.is_all && (
                  showAddFolder ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleCreateFolder(selectedOrg.id, newFolderName); }}
                      className={`flex items-center gap-1 bg-white px-1 py-0.5 rounded-lg border shadow-xs ${isTeamScope ? 'border-orange-300' : 'border-indigo-300'}`}
                    >
                      <input
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        placeholder={isTr ? "Klasör adı..." : "Folder name..."}
                        className="text-xs px-1.5 py-0.5 focus:outline-none w-28 bg-transparent text-slate-800"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!newFolderName.trim()}
                        className={`p-1 disabled:opacity-40 text-white rounded-md ${isTeamScope ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                      <button type="button" onClick={() => { setShowAddFolder(false); setNewFolderName(''); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddFolder(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isTeamScope
                          ? 'text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100'
                          : 'text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      <FolderPlus className="w-3 h-3" />
                      + {isTr ? 'Klasör' : 'Folder'}
                    </button>
                  )
                )}
              </div>

              {/* Doc search & Multi-select toolbar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={docSearch}
                    onChange={e => setDocSearch(e.target.value)}
                    placeholder={isTr ? "Dosya ara..." : "Search files..."}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none ${
                      isTeamScope ? 'focus:border-orange-400' : 'focus:border-indigo-400'
                    }`}
                  />
                </div>

                {filteredDocs.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                      filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name))
                        ? isTeamScope
                          ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                          : 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : selectedDocNames.length > 0
                        ? isTeamScope
                          ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={
                      filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name))
                        ? (isTr ? 'Tümünün seçimini kaldır' : 'Deselect all')
                        : (isTr ? 'Görüntülenen tüm dosyaları seç' : 'Select all visible files')
                    }
                  >
                    {filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name)) ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name))
                        ? (isTr ? 'Tümü Seçildi' : 'All Selected')
                        : selectedDocNames.length > 0
                        ? `${isTr ? 'Seçildi' : 'Selected'} (${selectedDocNames.length})`
                        : (isTr ? 'Tümünü Seç' : 'Select All')}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Drop Toast Notification */}
            {dropToast && (
              <div className="mx-5 mt-3 p-3 bg-emerald-600 text-white text-xs font-semibold rounded-2xl shadow-lg flex items-center justify-between animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>{dropToast}</span>
                </div>
                <button onClick={() => setDropToast(null)} className="p-1 hover:bg-emerald-700 rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Document Grid — Finder/Explorer Style */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-16">
              {loadingDocs === selectedOrg.id ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <FileText className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-medium">{isTr ? 'Bu filtrede doküman bulunamadı' : 'No documents found in this filter'}</p>
                </div>
              ) : (
                <ExplorerGrid
                  docs={filteredDocs}
                  allFolders={allFolders}
                  selectedOrg={selectedOrg}
                  previewDoc={previewDoc}
                  setPreviewDoc={setPreviewDoc}
                  selectedFolderFilter={selectedFolderFilter}
                  setSelectedFolderFilter={setSelectedFolderFilter}
                  draggedDoc={draggedDoc}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  dragOverFolder={dragOverFolder}
                  setDragOverFolder={setDragOverFolder}
                  onDropDocOnFolder={handleDropDocOnFolder}
                  setMoveFolderModal={setMoveFolderModal}
                  setTargetFolderName={setTargetFolderName}
                  setCustomFolderName={setCustomFolderName}
                  setAssignModal={setAssignModal}
                  setAssignTargetOrg={setAssignTargetOrg}
                  setAssignFolder={setAssignFolder}
                  setAssignTags={setAssignTags}
                  selectedDocNames={selectedDocNames}
                  onToggleSelectDoc={handleToggleSelectDoc}
                  onDeleteDoc={handleDeleteDoc}
                  onDeleteFolder={setFolderToDelete}
                />
              )}
            </div>

            {/* Floating Batch Action Bar */}
            {selectedDocNames.length > 0 && (
              <div className="absolute bottom-5 inset-x-0 mx-auto w-max max-w-[92%] z-30 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-[slideUp_0.2s_ease-out]">
                <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-extrabold text-white">
                    {selectedDocNames.length}
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {isTr ? 'dosya seçildi' : (selectedDocNames.length === 1 ? 'file selected' : 'files selected')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setBatchTargetFolder('');
                      setBatchCustomFolder('');
                      setBatchFolderModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
                    title={isTr ? "Seçili dosyaları bir klasöre taşı" : "Move selected files to a folder"}
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTr ? 'Klasöre Taşı' : 'Move to Folder'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchTargetOrgId('');
                      setBatchTargetFolder('');
                      setBatchOrgModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
                    title={isTr ? "Seçili dosyaları başka bir kuruma taşı" : "Move selected files to another portfolio"}
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isTr ? 'Kuruma Taşı' : 'Move to Portfolio'}</span>
                  </button>

                  <button
                    onClick={handleBatchDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-xs font-semibold transition-colors cursor-pointer"
                    title={isTr ? "Seçili dosyaları indir" : "Download selected files"}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTr ? 'İndir' : 'Download'}</span>
                  </button>

                  <button
                    onClick={() => setBatchDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-600 text-xs font-semibold text-red-300 hover:text-white transition-colors cursor-pointer"
                    title={isTr ? "Seçili dosyaları kalıcı olarak sil" : "Permanently delete selected files"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Sil' : 'Delete'}</span>
                  </button>
                </div>

                <button
                  onClick={handleClearSelection}
                  className="p-1.5 ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title={isTr ? "Seçimi Temizle" : "Clear Selection"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          FULLSCREEN DOCUMENT VIEWER MODAL
      ══════════════════════════════════════════════ */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
          <div className="relative w-full h-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/30">
            <InlinePreview
              doc={previewDoc}
              onClose={() => setPreviewDoc(null)}
              onDelete={handleDeleteDoc}
              onPrevDoc={handlePrevDoc}
              onNextDoc={handleNextDoc}
              hasPrevDoc={hasPrevDoc}
              hasNextDoc={hasNextDoc}
              currentIndex={docIndex}
              totalDocs={effectiveDocList.length}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════ */}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-[360px] max-w-[94vw]">
            <h3 className="text-sm font-bold text-slate-900 mb-2">{isTr ? 'Kurumu Sil' : 'Delete Portfolio'}</h3>
            <p className="text-xs text-slate-500 mb-5">
              {isTr
                ? 'Bu kurumu silmek istediğinize emin misiniz? Dosyalar silinmez, "Genel / Klasörsüzler" grubuna taşınır.'
                : 'Are you sure you want to delete this portfolio? Files will not be deleted; they will be moved to "General / Unassigned".'}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteOrg(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isTr ? 'Evet, Sil' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[500px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
              {newOrgScope === 'team' ? (
                <Users className="w-5 h-5 text-orange-500" />
              ) : (
                <Building2 className="w-5 h-5 text-indigo-600" />
              )}
              {newOrgScope === 'team'
                ? (isTr ? 'Yeni Ekip / Ortak Portföy' : 'New Team / Shared Portfolio')
                : (isTr ? 'Yeni Kişisel Portföy' : 'New Personal Portfolio')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  {isTr ? 'Kurum Adı *' : 'Portfolio Name *'}
                </label>
                <input
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  placeholder={isTr ? 'örn. Nuran Hanım, Bassel Group' : 'e.g. Acme Corp, Investment Portfolio'}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none ${
                    newOrgScope === 'team' ? 'focus:border-orange-400' : 'focus:border-indigo-400'
                  }`}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  {isTr ? 'Açıklama' : 'Description'}
                </label>
                <input
                  value={newOrgDesc}
                  onChange={e => setNewOrgDesc(e.target.value)}
                  placeholder={isTr ? 'örn. Gayrimenkul portföyü ve kira sözleşmeleri' : 'e.g. Real estate portfolio & lease agreements'}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none ${
                    newOrgScope === 'team' ? 'focus:border-orange-400' : 'focus:border-indigo-400'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  {isTr ? 'Başlangıç Klasörleri / Portföyler' : 'Initial Folders / Sub-portfolios'}
                </label>
                <input
                  value={newOrgFolders}
                  onChange={e => setNewOrgFolders(e.target.value)}
                  placeholder={isTr ? 'örn. Portföy A, Sözleşmeler, Fotoğraflar (virgülle ayırın)' : 'e.g. Folder A, Contracts, Photos (comma separated)'}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none ${
                    newOrgScope === 'team' ? 'focus:border-orange-400' : 'focus:border-indigo-400'
                  }`}
                />
              </div>

              {/* Portfolio Scope / Type */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  {isTr ? 'Portföy Kapsamı' : 'Portfolio Scope'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewOrgScope('team');
                      setNewOrgColor('#f97316');
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newOrgScope === 'team'
                        ? 'border-orange-500 bg-orange-50/90 ring-1 ring-orange-500 shadow-2xs'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${newOrgScope === 'team' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${newOrgScope === 'team' ? 'text-orange-950' : 'text-slate-900'}`}>{isTr ? 'Ekip / Ortak' : 'Team / Shared'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{isTr ? 'Tüm ekip erişebilir' : 'Accessible by whole team'}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewOrgScope('personal');
                      setNewOrgColor('#6366f1');
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newOrgScope === 'personal'
                        ? 'border-indigo-500 bg-indigo-50/90 ring-1 ring-indigo-500 shadow-2xs'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${newOrgScope === 'personal' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{isTr ? 'Kişisel / Özel' : 'Personal / Private'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{isTr ? 'Sadece size özel' : 'Private to your profile'}</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  {isTr ? 'Renk' : 'Color'}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewOrgColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${
                        newOrgColor === c
                          ? `ring-2 ring-offset-1 ${newOrgScope === 'team' ? 'ring-orange-500' : 'ring-indigo-600'} scale-110`
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  {isTr ? 'Etiketler' : 'Tags'}
                </label>
                <input
                  value={newOrgTags}
                  onChange={e => setNewOrgTags(e.target.value)}
                  placeholder={isTr ? 'örn. portfoy, gayrimenkul (virgülle ayırın)' : 'e.g. portfolio, real estate (comma separated)'}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none ${
                    newOrgScope === 'team' ? 'focus:border-orange-400' : 'focus:border-indigo-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={!newOrgName.trim() || creating}
                className={`flex items-center gap-1.5 px-5 py-2.5 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer ${
                  newOrgScope === 'team'
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isTr ? 'Oluştur' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {moveFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMoveFolderModal(null)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[440px] max-w-[94vw] p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              {isTr ? 'Klasöre / Portföye Taşı' : 'Move to Folder / Sub-portfolio'}
            </h2>
            <p className="text-[11px] text-slate-400 mb-4 truncate">{moveFolderModal.filename}</p>

            {moveFolderModal.availableFolders?.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  {isTr ? 'Mevcut Klasörler' : 'Existing Folders'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {moveFolderModal.availableFolders.map(folder => (
                    <button
                      key={folder}
                      onClick={() => { setTargetFolderName(folder); setCustomFolderName(''); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        targetFolderName === folder && !customFolderName
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{folder}</span>
                      {targetFolderName === folder && !customFolderName && <Check className="w-3 h-3 text-indigo-600 shrink-0 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                {moveFolderModal.availableFolders?.length > 0 ? (isTr ? 'Veya Yeni Klasör' : 'Or New Folder') : (isTr ? 'Klasör Adı' : 'Folder Name')}
              </label>
              <input
                value={customFolderName}
                onChange={e => { setCustomFolderName(e.target.value); if (e.target.value) setTargetFolderName(''); }}
                placeholder={isTr ? 'örn. Portföy A, Sözleşmeler, 2026 Fotoğrafları' : 'e.g. Contracts, Invoices, Photos 2026'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => { setTargetFolderName(''); setCustomFolderName(''); handleMoveDocFolder(); }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {isTr ? 'Klasörden Çıkar' : 'Remove from Folder'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setMoveFolderModal(null)} className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  onClick={handleMoveDocFolder}
                  disabled={isMovingFolder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 cursor-pointer"
                >
                  {isMovingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  {isTr ? 'Taşı' : 'Move'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Org Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[480px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              {isTr ? 'Başka Kuruma Taşı' : 'Move to Another Portfolio'}
            </h2>
            <p className="text-[11px] text-slate-400 mb-4 truncate">{assignModal.filename}</p>

            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar mb-4">
              {organizations.filter(o => !o.is_system && o.id !== assignModal.currentOrgId).map(org => (
                <button
                  key={org.id}
                  onClick={() => setAssignTargetOrg(org.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                    assignTargetOrg === org.id
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: org.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{org.name}</div>
                    {org.description && <div className="text-[10px] text-slate-500 truncate">{org.description}</div>}
                  </div>
                  {assignTargetOrg === org.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>

            {/* Folder input for target org */}
            {assignTargetOrg && (
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {isTr ? 'Klasör / Portföy (Opsiyonel)' : 'Folder / Sub-portfolio (Optional)'}
                </label>
                {organizations.find(o => o.id === assignTargetOrg)?.folders?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {organizations.find(o => o.id === assignTargetOrg)?.folders.map(f => (
                      <button
                        key={f}
                        onClick={() => setAssignFolder(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${assignFolder === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                      >
                        📁 {f}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  value={assignFolder}
                  onChange={e => setAssignFolder(e.target.value)}
                  placeholder={isTr ? 'örn. Portföy 1, Sözleşmeler' : 'e.g. Portfolio 1, Contracts'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                {isTr ? 'Etiketler' : 'Tags'}
              </label>
              <input
                value={assignTags}
                onChange={e => setAssignTags(e.target.value)}
                placeholder={isTr ? 'örn. sozlesme, teklif' : 'e.g. contract, proposal'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={handleAssignDoc}
                disabled={!assignTargetOrg || assigning}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isTr ? 'Taşı' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNoteModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[560px] max-w-[94vw] p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                Add Quick Note / Memo
              </h2>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Paste meeting notes, customer transcripts, or memos. AI will automatically vectorize and index this information for search and retrieval.
            </p>

            <div className="space-y-4">
              {/* Note title */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Title / Note Name *
                </label>
                <input
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="e.g. Client Call - Paris Property Discussion"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Target Organization */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Portfolio / Organization
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                  {organizations.filter(o => !o.is_system).map(org => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => setNoteOrgId(org.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        noteOrgId === org.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: org.color }} />
                      <span className="truncate flex-1">{org.name}</span>
                      {noteOrgId === org.id && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Folder */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Folder / Sub-portfolio (Optional)
                </label>
                {organizations.find(o => o.id === noteOrgId)?.folders?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {organizations.find(o => o.id === noteOrgId)?.folders.map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setNoteFolder(f)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          noteFolder === f
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        📁 {f}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  value={noteFolder}
                  onChange={e => setNoteFolder(e.target.value)}
                  placeholder="e.g. Portfolio A, Meetings, 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Content textarea */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Note / Memo Text *
                </label>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  rows={7}
                  placeholder={"Paste messages, transcripts, or notes here...\n\nExample:\n[12.04.2026 14:15] John: Rent is set to $2,500/month. 2 months deposit requested.\n[12.04.2026 14:18] Me: When can we arrange a viewing?\n[12.04.2026 14:20] John: Tomorrow at 3:00 PM works best."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed custom-scrollbar"
                />
              </div>

              {/* AI Auto-Format Checkbox */}
              <div
                onClick={() => setNoteFormatWithAi(!noteFormatWithAi)}
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-emerald-50/70 to-indigo-50/70 border border-emerald-200/80 rounded-2xl cursor-pointer hover:border-emerald-300 transition-colors"
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={noteFormatWithAi}
                    onChange={e => setNoteFormatWithAi(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      {isTr ? 'Yapay Zeka ile Düzenle ve Yapılandır (Önerilen)' : 'Auto-Format & Structure with AI (Recommended)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isTr
                      ? 'Fiyatlar, tarihler, kişi bilgileri, şartlar ve talepleri madde madde net bir portföy özetine dönüştürür; orijinal mesaj metnini de altında saklar.'
                      : 'Converts prices, dates, contacts, and terms into a clean structured summary while preserving the original transcript.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!noteTitle.trim() || !noteContent.trim() || noteSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                {noteSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isTr ? 'Kaydediliyor & İndeksleniyor...' : 'Saving & Indexing...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Notu / Sohbeti Kaydet' : 'Save Note / Chat'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Document Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDocToDelete(null)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 w-[400px] max-w-[94vw]">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">{isTr ? 'Dokümanı Sil' : 'Delete Document'}</h3>
            <p className="text-xs text-slate-600 mb-2 font-mono break-all bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {docToDelete}
            </p>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {isTr
                ? 'Bu dosya vektör veritabanından, kurum atamasından ve sistem diskinden kalıcı olarak silinecektir. Devam etmek istiyor musunuz?'
                : 'This document will be permanently removed from the vector database, portfolio assignments, and disk storage. Do you wish to proceed?'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteSingleDoc}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shadow-red-600/20"
              >
                {isTr ? 'Evet, Sil' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Delete Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFolderToDelete(null)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 w-[420px] max-w-[94vw]">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Folder className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">{isTr ? 'Klasörü Sil' : 'Delete Folder'}</h3>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 my-2.5">
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">{folderToDelete}</span>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {isTr ? (
                <>
                  Bu klasörü kaldırmak istediğinize emin misiniz? <br />
                  <strong className="text-slate-700 font-semibold">Dosyalarınız silinmez</strong>, sadece bu klasörden çıkarılarak <em>Genel (Klasörsüz)</em> bölümüne aktarılır.
                </>
              ) : (
                <>
                  Are you sure you want to remove this folder? <br />
                  <strong className="text-slate-700 font-semibold">Your files will not be deleted</strong>, they will simply be moved to the <em>General (Unassigned)</em> section.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shadow-red-600/20"
              >
                {isTr ? 'Evet, Klasörü Sil' : 'Yes, Delete Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setBatchDeleteConfirm(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 w-[430px] max-w-[94vw]">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {isTr ? `${selectedDocNames.length} Dokümanı Toplu Sil` : `Batch Delete ${selectedDocNames.length} Documents`}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {isTr
                ? `Seçilen aşağıdaki ${selectedDocNames.length} adet doküman vektör veritabanından ve diskten kalıcı olarak silinecektir:`
                : `The following ${selectedDocNames.length} selected document(s) will be permanently deleted from the vector database and disk:`}
            </p>
            <div className="max-h-36 overflow-y-auto mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-700 font-mono custom-scrollbar">
              {selectedDocNames.map(name => (
                <div key={name} className="truncate">• {name}</div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBatchDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={isBatchOperating}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shadow-red-600/20"
              >
                {isBatchOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isTr ? 'Evet, Hepsini Sil' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Move to Folder Modal */}
      {batchFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setBatchFolderModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[460px] max-w-[94vw] p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              {isTr ? `${selectedDocNames.length} Dokümanı Klasöre Taşı` : `Move ${selectedDocNames.length} Documents to Folder`}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {isTr ? 'Seçilen dosyaları bir klasöre taşıyın veya genel klasörsüz bölüme alın.' : 'Move selected files to a folder or leave them unassigned.'}
            </p>

            {allFolders.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  {isTr ? 'Mevcut Klasörler' : 'Existing Folders'}
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {allFolders.map(folder => (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => { setBatchTargetFolder(folder); setBatchCustomFolder(''); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        batchTargetFolder === folder && !batchCustomFolder
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate flex-1">{folder}</span>
                      {batchTargetFolder === folder && !batchCustomFolder && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                {allFolders.length > 0 ? (isTr ? 'Veya Yeni Klasör Oluştur' : 'Or Create New Folder') : (isTr ? 'Klasör Adı' : 'Folder Name')}
              </label>
              <input
                value={batchCustomFolder}
                onChange={e => { setBatchCustomFolder(e.target.value); if (e.target.value) setBatchTargetFolder(''); }}
                placeholder={isTr ? 'örn. Portföy A, Sözleşmeler, 2026' : 'e.g. Portfolio A, Contracts, 2026'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => { setBatchTargetFolder(''); setBatchCustomFolder(''); handleBatchMoveFolder(); }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {isTr ? 'Klasörden Çıkar (Genel)' : 'Remove from Folder (General)'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setBatchFolderModal(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  onClick={handleBatchMoveFolder}
                  disabled={isBatchOperating || (!batchTargetFolder && !batchCustomFolder.trim())}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 cursor-pointer"
                >
                  {isBatchOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  {isTr ? 'Taşı' : 'Move'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Move to Organization Modal */}
      {batchOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setBatchOrgModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[480px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              {isTr ? `${selectedDocNames.length} Dokümanı Başka Kuruma Taşı` : `Move ${selectedDocNames.length} Documents to Another Portfolio`}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {isTr ? `Seçilen ${selectedDocNames.length} dokümanı hedef kuruma aktarın.` : `Move the ${selectedDocNames.length} selected document(s) to the destination portfolio.`}
            </p>

            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar mb-4">
              {organizations.filter(o => !o.is_system && o.id !== selectedOrgId).map(org => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setBatchTargetOrgId(org.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                    batchTargetOrgId === org.id
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: org.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{org.name}</div>
                    {org.description && <div className="text-[10px] text-slate-500 truncate">{org.description}</div>}
                  </div>
                  {batchTargetOrgId === org.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>

            {/* Target Org folder */}
            {batchTargetOrgId && (
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {isTr ? 'Hedef Klasör / Portföy (Opsiyonel)' : 'Target Folder / Sub-portfolio (Optional)'}
                </label>
                {organizations.find(o => o.id === batchTargetOrgId)?.folders?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {organizations.find(o => o.id === batchTargetOrgId)?.folders.map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBatchTargetFolder(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          batchTargetFolder === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        📁 {f}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  value={batchTargetFolder}
                  onChange={e => setBatchTargetFolder(e.target.value)}
                  placeholder={isTr ? 'örn. Portföy 1, Sözleşmeler' : 'e.g. Portfolio 1, Contracts'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setBatchOrgModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={handleBatchMoveOrg}
                disabled={!batchTargetOrgId || isBatchOperating}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                {isBatchOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                {isTr ? 'Taşı' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;

