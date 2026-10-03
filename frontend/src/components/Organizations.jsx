import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Plus, FileText, Search, Trash2, FolderOpen,
  Edit2, Check, X, Eye, Loader2, Image as ImageIcon,
  FolderPlus, Folder, Layers, HelpCircle, RefreshCw,
  ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Tag, MoreHorizontal, Sparkles,
  ZoomIn, ZoomOut, Download, MessageSquare, Copy, StickyNote,
  Send, Share2, Sparkle, CheckSquare, Square, RotateCcw, Maximize2, ExternalLink
} from 'lucide-react';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

// ─────────────────────────────────────────────────────────────────
// Inline File Preview Panel
// ─────────────────────────────────────────────────────────────────
const InlinePreview = ({ doc, onClose, onDelete }) => {
  const isPdf = doc?.name?.toLowerCase().endsWith('.pdf');
  const isImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(doc?.name || '');
  const isWhatsApp = doc?.doc_type === 'whatsapp' || doc?.name?.toLowerCase().includes('whatsapp') || doc?.tags?.includes('whatsapp');
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
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            isWhatsApp
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : isImg
              ? 'bg-emerald-50 text-emerald-600'
              : isPdf
              ? 'bg-red-50 text-red-600'
              : 'bg-indigo-50 text-indigo-600'
          }`}>
            {isWhatsApp ? <MessageSquare className="w-3.5 h-3.5" /> : isImg ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-800 truncate block max-w-[180px]" title={doc.name}>
              {doc.name}
            </span>
            {isWhatsApp && (
              <span className="text-[10px] text-emerald-600 font-medium">WhatsApp / Metin Notu</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(isPdf || isImg) && (
            <>
              <button
                onClick={() => {
                  setIsFit(false);
                  setZoom(z => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))));
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Küçült (-25%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsFit(true);
                  setZoom(1);
                }}
                className="px-2 py-0.5 text-[10px] font-mono text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                title="Ekrana Sığdır / Sıfırla"
              >
                {isFit && zoom === 1 ? 'Sığdır' : `${Math.round(zoom * 100)}%`}
              </button>
              <button
                onClick={() => {
                  setIsFit(false);
                  setZoom(z => Math.min(3, parseFloat((z + 0.25).toFixed(2))));
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Büyüt (+25%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {/* Direct Download */}
          <a
            href={fileUrl}
            download={doc.name}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="Dosyayı İndir"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          {/* Delete Document */}
          {onDelete && (
            <button
              onClick={() => onDelete(doc.name)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Bu Dokümanı Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto bg-slate-100 relative custom-scrollbar">
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
          <div className="flex items-center justify-center min-h-full p-4 overflow-auto">
            <img
              src={fileUrl}
              alt={doc.name}
              className={`rounded-xl shadow-md transition-all duration-200 select-none ${
                isFit && zoom === 1
                  ? 'max-w-full max-h-[calc(100vh-170px)] object-contain'
                  : 'max-w-none'
              }`}
              style={{
                transform: zoom !== 1 ? `scale(${zoom})` : 'none',
                transformOrigin: 'center center',
              }}
            />
          </div>
        ) : (
          <TextPreview filename={doc.name} isWhatsApp={isWhatsApp} />
        )}
      </div>

      {/* Meta footer */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
        <span>{doc.chunk_count || 0} chunk</span>
        <span>·</span>
        <span>{(doc.char_count || 0).toLocaleString()} karakter</span>
        {doc.folder && (
          <>
            <span>·</span>
            <span className="text-indigo-600 font-sans font-semibold">📁 {doc.folder}</span>
          </>
        )}
      </div>
    </div>
  );
};

const TextPreview = ({ filename, isWhatsApp }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/documents/${encodeURIComponent(filename)}/content`)
      .then(r => r.json())
      .then(d => setText(d.content || ''))
      .catch(() => setText('İçerik yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [filename]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {isWhatsApp ? 'WhatsApp / Not İçeriği' : 'Metin İçeriği'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
        </button>
      </div>
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <pre className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
          {text}
        </pre>
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
}) => (
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
      title={`${name}\n(Tıklayın: Aç | Sürükleyin: Dosya Taşı)`}
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
        {isDropTarget ? 'Buraya Bırak' : name}
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
        title={`"${name}" klasörünü sil`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    )}
  </div>
);

const FileCard = ({
  doc, isActive, isSelected, isSelectionMode, isDragging,
  onSelect, onToggleSelect, onPreview, onInspect, onMoveFolder, onAssign, onDelete,
  onDragStart, onDragEnd,
  allFolders, selectedOrg,
}) => {
  const isPdf = doc.name.toLowerCase().endsWith('.pdf');
  const isImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(doc.name);
  const isWhatsApp = doc.doc_type === 'whatsapp' || doc.name.toLowerCase().includes('whatsapp') || doc.tags?.includes('whatsapp');
  const ext = doc.name.split('.').pop().toUpperCase();
  const fileUrl = `/api/documents/${encodeURIComponent(doc.name)}/file`;

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ filename: doc.name, currentFolder: doc.folder, orgId: selectedOrg.id }));
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
      title={`${doc.name}\n(Tıklayın: Önizle | Sürükleyin: Taşı | Seçin: Toplu İşlem)`}
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
        title={isSelected ? 'Seçimi kaldır' : 'Seç'}
      >
        <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100 stroke-[3]' : 'opacity-0'}`} />
      </button>

      {/* File thumbnail / icon */}
      <div className={`relative w-14 h-16 rounded-xl overflow-hidden flex items-end justify-center shadow-sm ${
        isWhatsApp
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
          {isWhatsApp ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[7.5px] font-extrabold text-emerald-700 tracking-wider">WHATSAPP</span>
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
            className="p-1 text-white hover:text-indigo-300 transition-colors"
            title="Önizle"
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveFolder(doc); }}
            className="p-1 text-white hover:text-amber-300 transition-colors"
            title="Klasöre Taşı"
          >
            <FolderOpen className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAssign(doc); }}
            className="p-1 text-white hover:text-indigo-300 transition-colors"
            title="Kuruma Taşı"
          >
            <Building2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(doc.name); }}
            className="p-1 text-white hover:text-red-400 transition-colors"
            title="Sil"
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
        {doc.folder ? (
          <p className="text-[9px] text-indigo-600 font-semibold truncate mt-0.5">📁 {doc.folder}</p>
        ) : isWhatsApp ? (
          <p className="text-[9px] text-emerald-600 font-semibold truncate mt-0.5">💬 WhatsApp</p>
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
  onGoToInspector, setMoveFolderModal, setTargetFolderName, setCustomFolderName,
  setAssignModal, setAssignTargetOrg, setAssignFolder, setAssignTags,
  selectedDocNames, onToggleSelectDoc, onDeleteDoc,
  onDeleteFolder,
}) => {
  // Group docs by folder when viewing "all"
  const showFolderIcons = selectedFolderFilter === 'all' && allFolders.length > 0;
  const isSelectionMode = selectedDocNames.length > 0;

  const handlePreview = (doc) => {
    setPreviewDoc(previewDoc?.name === doc.name ? null : doc);
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
              title="Tüm dokümanlara geri dön"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Geri</span>
            </button>
            <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-700 flex items-center justify-center shadow-2xs">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{selectedFolderFilter}</h3>
                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {docs.length} dosya
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Bu klasör / portföye ait dokümanlar</p>
            </div>
          </div>
          {!selectedOrg.is_system && onDeleteFolder && (
            <button
              onClick={() => onDeleteFolder(selectedFolderFilter)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-xl border border-red-200 hover:border-red-600 transition-all cursor-pointer shadow-2xs"
              title={`"${selectedFolderFilter}" klasörünü sil`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Klasörü Sil</span>
            </button>
          )}
        </div>
      )}

      {/* Folder icons row — only in "all" view */}
      {showFolderIcons && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Klasörler / Portföyler</p>
            {draggedDoc && (
              <span className="text-[10px] text-emerald-600 font-bold animate-pulse">
                👇 Dosyayı bir klasörün üzerine bırakın
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
              Tüm Dosyalar
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
                onInspect={(name) => onGoToInspector?.(name)}
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
const Organizations = ({ onGoToInspector, initialOrgId, openNoteOnMount, onClearInitialOrgId }) => {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState(initialOrgId || null);
  const [orgDocs, setOrgDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(null);
  const [search, setSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('all');
  const [previewDoc, setPreviewDoc] = useState(null);

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

  // Keyboard navigation shortcuts (Alt+Left/Right, Cmd+[ / Cmd+])
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
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
  }, [canGoBack, canGoForward, navState]);

  useEffect(() => {
    if (initialOrgId) {
      setSelectedOrgId(initialOrgId);
      onClearInitialOrgId?.();
    }
  }, [initialOrgId]);

  // Org CRUD
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgColor, setNewOrgColor] = useState('#6366f1');
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
    } catch (err) {
      console.error('Failed to assign doc on drop:', err);
    }
  };

  const openNoteModal = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteOrgId(selectedOrgId && selectedOrgId !== '__unassigned__' ? selectedOrgId : (organizations.find(o => !o.is_system)?.id || ''));
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
          doc_type: 'whatsapp',
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
        setPreviewDoc({
          name: data.filename,
          chunk_count: data.chunk_count,
          char_count: data.char_count,
          folder: data.folder,
          doc_type: 'whatsapp',
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
        // Auto-select first non-system org
        if (!selectedOrgId) {
          const first = data.find(o => !o.is_system);
          if (first) setSelectedOrgId(first.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    const handleUpdate = () => {
      fetchOrganizations();
      if (selectedOrgId) fetchOrgDocs(selectedOrgId);
    };
    window.addEventListener('mainchunk_docs_updated', handleUpdate);
    return () => window.removeEventListener('mainchunk_docs_updated', handleUpdate);
  }, [selectedOrgId]);

  const fetchOrgDocs = async (orgId) => {
    if (!orgId) return;
    setLoadingDocs(orgId);
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(orgId)}/documents`);
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

  // Load docs whenever org selection changes
  useEffect(() => {
    if (selectedOrgId) {
      if (!isNavigatingRef.current) {
        setSelectedFolderFilter('all');
      }
      setDocSearch('');
      setPreviewDoc(null);
      if (!orgDocs[selectedOrgId]) {
        fetchOrgDocs(selectedOrgId);
      }
    }
  }, [selectedOrgId]);

  const selectOrg = (orgId) => {
    setSelectedOrgId(orgId);
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
          tags: newOrgTags.split(',').map(t => t.trim()).filter(Boolean),
          folders: newOrgFolders.split(',').map(f => f.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const newOrg = await res.json();
        setShowCreateModal(false);
        setNewOrgName(''); setNewOrgDesc(''); setNewOrgColor('#6366f1');
        setNewOrgTags(''); setNewOrgFolders('');
        await fetchOrganizations();
        setSelectedOrgId(newOrg.id);
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
        setSelectedOrgId(nextOrg?.id || null);
        await fetchOrganizations();
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
      }
    } catch (err) {
      console.error('Failed to move doc folder:', err);
    } finally {
      setIsMovingFolder(false);
    }
  };

  // Derived data for current org
  const selectedOrg = organizations.find(o => o.id === selectedOrgId);
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

  const userOrgs = organizations.filter(o => !o.is_system && o.name.toLowerCase().includes(search.toLowerCase()));
  const unassignedOrg = organizations.find(o => o.is_system);

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">

      {/* ══════════════════════════════════════════════
          LEFT PANEL — Organization List
      ══════════════════════════════════════════════ */}
      <div className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
        {/* Left header */}
        <div className="px-4 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Kurumlar</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchOrganizations}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs shadow-indigo-600/20"
                title="Yeni Kurum"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kurum ara..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Org list */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          ) : userOrgs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-slate-400">
              <Building2 className="w-8 h-8 text-slate-300" />
              <p className="text-xs text-center">Henüz kurum yok</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                + Kurum oluştur
              </button>
            </div>
          ) : (
            <div className="px-2 space-y-0.5">
              {userOrgs.map(org => {
                const isSelected = selectedOrgId === org.id;
                const isOrgDropTarget = dragOverOrgId === org.id;
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
                      title={isOrgDropTarget ? `"${draggedDoc?.name}" dosyasını buraya bırakın` : org.name}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={{ backgroundColor: isOrgDropTarget ? '#10b98130' : `${org.color}18` }}
                      >
                        <Building2 className="w-4 h-4" style={{ color: isOrgDropTarget ? '#059669' : org.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isOrgDropTarget ? 'text-emerald-800' : isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {isOrgDropTarget ? 'Buraya Taşı' : org.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">{org.document_count} dok.</p>
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
            <div className="px-2 mt-2 pt-2 border-t border-slate-100">
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
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 truncate">
                    {dragOverOrgId === unassignedOrg.id ? 'Atanmamışa Taşı' : 'Atanmamış'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{unassignedOrg.document_count} dok.</p>
                </div>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CENTER PANEL — Document List
      ══════════════════════════════════════════════ */}
      <div className={`relative flex flex-col min-w-0 overflow-hidden transition-all duration-200 ${previewDoc ? 'flex-[2]' : 'flex-1'}`}>
        {!selectedOrg ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Building2 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Bir kurum seçin</p>
            <p className="text-xs mt-1">Sol panelden bir kurum seçerek dosyalarını görüntüleyin</p>
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
                          ? 'text-slate-700 hover:text-indigo-600 hover:bg-white shadow-2xs cursor-pointer active:scale-95'
                          : 'text-slate-300 cursor-not-allowed opacity-40'
                      }`}
                      title={canGoBack ? 'Geri git (Alt + Sol Ok)' : 'Geri gidilemez'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleGoForward}
                      disabled={!canGoForward}
                      className={`p-1.5 rounded-lg transition-all ${
                        canGoForward
                          ? 'text-slate-700 hover:text-indigo-600 hover:bg-white shadow-2xs cursor-pointer active:scale-95'
                          : 'text-slate-300 cursor-not-allowed opacity-40'
                      }`}
                      title={canGoForward ? 'İleri git (Alt + Sağ Ok)' : 'İleri gidilemez'}
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
                          ? 'text-indigo-600 font-bold bg-indigo-50/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                      }`}
                      title={`${selectedOrg.name} tüm dosyaları`}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: selectedOrg.color }} />
                      <span className="truncate max-w-[140px] sm:max-w-[220px]">{selectedOrg.name}</span>
                    </button>

                    {selectedFolderFilter !== 'all' && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-semibold border border-amber-200/60 shadow-2xs min-w-0">
                          <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[160px] sm:max-w-[240px]">
                            {selectedFolderFilter === '__unfolded__' ? 'Klasörsüz Dosyalar' : selectedFolderFilter}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* History position badge */}
                {navState.history.length > 1 && (
                  <div className="hidden sm:flex items-center text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                    Geçmiş: {navState.index + 1}/{navState.history.length}
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
                    {selectedOrg.is_system
                      ? <HelpCircle className="w-5 h-5 text-slate-400" />
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
                          placeholder="Açıklama"
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
                        <h1 className="text-sm font-bold text-slate-900 truncate">{selectedOrg.name}</h1>
                        {selectedOrg.description && (
                          <p className="text-[11px] text-slate-500 truncate">{selectedOrg.description}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {selectedOrg.document_count} dok.
                  </span>
                  {!selectedOrg.is_system && editingOrg !== selectedOrg.id && (
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
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs === selectedOrg.id ? 'animate-spin text-indigo-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Folder filter tabs */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                <button
                  onClick={() => setSelectedFolderFilter('all')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedFolderFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  Tümü ({currentDocs.length})
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
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                        title={isFolderDropTarget ? `"${draggedDoc?.name}" dosyasını buraya bırakın` : folder}
                      >
                        <Folder className={`w-3 h-3 ${isSelected || isFolderDropTarget ? 'text-white' : 'text-indigo-500'}`} />
                        {folder}
                        <span className={`ml-0.5 text-[10px] font-mono ${isSelected || isFolderDropTarget ? 'text-white' : 'text-slate-400'}`}>
                          {count}
                        </span>
                      </button>
                      {!selectedOrg.is_system && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folder);
                          }}
                          className="ml-0.5 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover/pill:opacity-100 transition-all cursor-pointer"
                          title={`"${folder}" klasörünü sil`}
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
                    Genel / Klasörsüz ({currentDocs.filter(d => !d.folder).length})
                  </button>
                )}

                {/* Add folder button */}
                {!selectedOrg.is_system && (
                  showAddFolder ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleCreateFolder(selectedOrg.id, newFolderName); }}
                      className="flex items-center gap-1 bg-white px-1 py-0.5 rounded-lg border border-indigo-300 shadow-xs"
                    >
                      <input
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        placeholder="Klasör adı..."
                        className="text-xs px-1.5 py-0.5 focus:outline-none w-28 bg-transparent text-slate-800"
                        autoFocus
                      />
                      <button type="submit" disabled={!newFolderName.trim()} className="p-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-md">
                        <Check className="w-2.5 h-2.5" />
                      </button>
                      <button type="button" onClick={() => { setShowAddFolder(false); setNewFolderName(''); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddFolder(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all"
                    >
                      <FolderPlus className="w-3 h-3" />
                      + Klasör
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
                    placeholder="Dosya ara..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                {filteredDocs.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                      filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name))
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : selectedDocNames.length > 0
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={
                      filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name))
                        ? 'Tümünün seçimini kaldır'
                        : 'Görüntülenen tüm dosyaları seç'
                    }
                  >
                    {filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name)) ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {filteredDocs.length > 0 && filteredDocs.every(d => selectedDocNames.includes(d.name))
                        ? 'Tümü Seçildi'
                        : selectedDocNames.length > 0
                        ? `Seçildi (${selectedDocNames.length})`
                        : 'Tümünü Seç'}
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
                  <p className="text-xs font-medium">Bu filtrede doküman bulunamadı</p>
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
                  onGoToInspector={onGoToInspector}
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
                  <span className="text-xs font-semibold whitespace-nowrap">dosya seçildi</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setBatchTargetFolder('');
                      setBatchCustomFolder('');
                      setBatchFolderModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
                    title="Seçili dosyaları bir klasöre taşı"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Klasöre Taşı</span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchTargetOrgId('');
                      setBatchTargetFolder('');
                      setBatchOrgModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
                    title="Seçili dosyaları başka bir kuruma taşı"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Kuruma Taşı</span>
                  </button>

                  <button
                    onClick={handleBatchDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-xs font-semibold transition-colors cursor-pointer"
                    title="Seçili dosyaları indir"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>İndir</span>
                  </button>

                  <button
                    onClick={() => setBatchDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-600 text-xs font-semibold text-red-300 hover:text-white transition-colors cursor-pointer"
                    title="Seçili dosyaları kalıcı olarak sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </button>
                </div>

                <button
                  onClick={handleClearSelection}
                  className="p-1.5 ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Seçimi Temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — Inline Preview
      ══════════════════════════════════════════════ */}
      {previewDoc && (
        <div className="flex-[2] min-w-0 max-w-[55%] border-l border-slate-200 overflow-hidden">
          <InlinePreview
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
            onDelete={handleDeleteDoc}
          />
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
            <h3 className="text-sm font-bold text-slate-900 mb-2">Kurumu Sil</h3>
            <p className="text-xs text-slate-500 mb-5">
              Bu kurumu silmek istediğinize emin misiniz? Dosyalar silinmez, "Atanmamış" grubuna taşınır.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">İptal</button>
              <button
                onClick={() => handleDeleteOrg(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Evet, Sil
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
              <Building2 className="w-5 h-5 text-indigo-600" />
              Yeni Kurum / Organizasyon
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Kurum Adı *</label>
                <input
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  placeholder="örn. Nuran Hanım, Bassel Group"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Açıklama</label>
                <input
                  value={newOrgDesc}
                  onChange={e => setNewOrgDesc(e.target.value)}
                  placeholder="örn. Gayrimenkul portföyü ve kira sözleşmeleri"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Başlangıç Klasörleri / Portföyler</label>
                <input
                  value={newOrgFolders}
                  onChange={e => setNewOrgFolders(e.target.value)}
                  placeholder="örn. Portföy A, Sözleşmeler, Fotoğraflar (virgülle ayırın)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Renk</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewOrgColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${newOrgColor === c ? 'ring-2 ring-offset-1 ring-indigo-600 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Etiketler</label>
                <input
                  value={newOrgTags}
                  onChange={e => setNewOrgTags(e.target.value)}
                  placeholder="örn. portfoy, gayrimenkul (virgülle ayırın)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">İptal</button>
              <button
                onClick={handleCreateOrg}
                disabled={!newOrgName.trim() || creating}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Oluştur
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
              Klasöre / Portföye Taşı
            </h2>
            <p className="text-[11px] text-slate-400 mb-4 truncate">{moveFolderModal.filename}</p>

            {moveFolderModal.availableFolders?.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Mevcut Klasörler</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {moveFolderModal.availableFolders.map(folder => (
                    <button
                      key={folder}
                      onClick={() => { setTargetFolderName(folder); setCustomFolderName(''); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all ${
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
                {moveFolderModal.availableFolders?.length > 0 ? 'Veya Yeni Klasör' : 'Klasör Adı'}
              </label>
              <input
                value={customFolderName}
                onChange={e => { setCustomFolderName(e.target.value); if (e.target.value) setTargetFolderName(''); }}
                placeholder="örn. Portföy A, Sözleşmeler, 2026 Fotoğrafları"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => { setTargetFolderName(''); setCustomFolderName(''); handleMoveDocFolder(); }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Klasörden Çıkar
              </button>
              <div className="flex gap-2">
                <button onClick={() => setMoveFolderModal(null)} className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">İptal</button>
                <button
                  onClick={handleMoveDocFolder}
                  disabled={isMovingFolder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20"
                >
                  {isMovingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  Taşı
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
              Başka Kuruma Taşı
            </h2>
            <p className="text-[11px] text-slate-400 mb-4 truncate">{assignModal.filename}</p>

            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar mb-4">
              {organizations.filter(o => !o.is_system && o.id !== assignModal.currentOrgId).map(org => (
                <button
                  key={org.id}
                  onClick={() => setAssignTargetOrg(org.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Klasör / Portföy (Opsiyonel)</label>
                {organizations.find(o => o.id === assignTargetOrg)?.folders?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {organizations.find(o => o.id === assignTargetOrg)?.folders.map(f => (
                      <button
                        key={f}
                        onClick={() => setAssignFolder(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${assignFolder === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                      >
                        📁 {f}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  value={assignFolder}
                  onChange={e => setAssignFolder(e.target.value)}
                  placeholder="örn. Portföy 1, Sözleşmeler"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Etiketler</label>
              <input
                value={assignTags}
                onChange={e => setAssignTags(e.target.value)}
                placeholder="örn. sozlesme, teklif"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">İptal</button>
              <button
                onClick={handleAssignDoc}
                disabled={!assignTargetOrg || assigning}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Taşı
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Note / WhatsApp Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNoteModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[560px] max-w-[94vw] p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                </div>
                WhatsApp / Portföy Notu Ekle
              </h2>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              WhatsApp sohbet geçmişini, müşteri mesajlarını veya serbest notları yapıştırın. Yapay zeka bu bilgileri RAG sistemi için otomatik indeksler.
            </p>

            <div className="space-y-4">
              {/* Note title */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Başlık / Portföy Adı *
                </label>
                <input
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="örn. Nuran Hanım - Kadıköy 3+1 WhatsApp Sohbeti"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Target Organization */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Kurum / Organizasyon
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                  {organizations.filter(o => !o.is_system).map(org => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => setNoteOrgId(org.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all ${
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
                  Klasör / Portföy (Opsiyonel)
                </label>
                {organizations.find(o => o.id === noteOrgId)?.folders?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {organizations.find(o => o.id === noteOrgId)?.folders.map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setNoteFolder(f)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
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
                  placeholder="örn. Portföy A, Görüşmeler, 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Content textarea */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  WhatsApp Mesajları / Not Metni *
                </label>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  rows={7}
                  placeholder="WhatsApp'tan kopyaladığınız mesajları buraya yapıştırın...&#10;&#10;Örnek:&#10;[12.04.2026 14:15] Nuran Hanım: Kadıköy'deki daire için kira 35.000 TL olarak belirlendi. 2 kira depozito isteniyor.&#10;[12.04.2026 14:18] Ben: Randevu ne zaman uygun olur?&#10;[12.04.2026 14:20] Nuran Hanım: Yarın saat 15:00'te mülk sahibiyle görebiliriz."
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
                      Yapay Zeka ile Düzenle ve Yapılandır (Önerilen)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Fiyatlar, tarihler, kişi bilgileri, şartlar ve talepleri madde madde net bir portföy özetine dönüştürür; orijinal mesaj metnini de altında saklar.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                İptal
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!noteTitle.trim() || !noteContent.trim() || noteSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                {noteSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor & İndeksleniyor...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Notu / Sohbeti Kaydet</span>
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
            <h3 className="text-sm font-bold text-slate-900 mb-1">Dokümanı Sil</h3>
            <p className="text-xs text-slate-600 mb-2 font-mono break-all bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {docToDelete}
            </p>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Bu dosya vektör veritabanından, kurum atamasından ve sistem diskinden kalıcı olarak silinecektir. Devam etmek istiyor musunuz?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={confirmDeleteSingleDoc}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shadow-red-600/20"
              >
                Evet, Sil
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
            <h3 className="text-sm font-bold text-slate-900 mb-1">Klasörü Sil</h3>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 my-2.5">
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">{folderToDelete}</span>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Bu klasörü kaldırmak istediğinize emin misiniz? <br />
              <strong className="text-slate-700 font-semibold">Dosyalarınız silinmez</strong>, sadece bu klasörden çıkarılarak <em>Genel (Klasörsüz)</em> bölümüne aktarılır.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shadow-red-600/20"
              >
                Evet, Klasörü Sil
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
              {selectedDocNames.length} Dokümanı Toplu Sil
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Seçilen aşağıdaki {selectedDocNames.length} adet doküman vektör veritabanından ve diskten kalıcı olarak silinecektir:
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
                İptal
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={isBatchOperating}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shadow-red-600/20"
              >
                {isBatchOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Evet, Hepsini Sil
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
              {selectedDocNames.length} Dokümanı Klasöre Taşı
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Seçilen dosyaları bir klasöre taşıyın veya genel klasörsüz bölüme alın.
            </p>

            {allFolders.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Mevcut Klasörler
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
                {allFolders.length > 0 ? 'Veya Yeni Klasör Oluştur' : 'Klasör Adı'}
              </label>
              <input
                value={batchCustomFolder}
                onChange={e => { setBatchCustomFolder(e.target.value); if (e.target.value) setBatchTargetFolder(''); }}
                placeholder="örn. Portföy A, Sözleşmeler, 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => { setBatchTargetFolder(''); setBatchCustomFolder(''); handleBatchMoveFolder(); }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                Klasörden Çıkar (Genel)
              </button>
              <div className="flex gap-2">
                <button onClick={() => setBatchFolderModal(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                  İptal
                </button>
                <button
                  onClick={handleBatchMoveFolder}
                  disabled={isBatchOperating || (!batchTargetFolder && !batchCustomFolder.trim())}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 cursor-pointer"
                >
                  {isBatchOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  Taşı
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
              {selectedDocNames.length} Dokümanı Başka Kuruma Taşı
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Seçilen {selectedDocNames.length} dokümanı hedef kuruma aktarın.
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
                  Hedef Klasör / Portföy (Opsiyonel)
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
                  placeholder="örn. Portföy 1, Sözleşmeler"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setBatchOrgModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                İptal
              </button>
              <button
                onClick={handleBatchMoveOrg}
                disabled={!batchTargetOrgId || isBatchOperating}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                {isBatchOperating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Taşı
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;

