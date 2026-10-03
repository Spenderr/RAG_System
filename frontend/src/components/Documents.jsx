import React, { useState, useEffect } from 'react';
import {
  FileText, Database, Trash2, Search, Eye, ArrowRight,
  BookOpen, RefreshCw, File, X, Maximize2, Minimize2,
  Building2, Tag, FolderOpen, Filter, Check, Loader2,
  Image as ImageIcon, Plus
} from 'lucide-react';

const Documents = ({ onSelectDocForInspector, openReaderDoc, onReaderDocHandled }) => {
  const [documents, setDocuments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Reader Modal State
  const [selectedReaderDoc, setSelectedReaderDoc] = useState(null);
  const [selectedReaderPage, setSelectedReaderPage] = useState(1);
  const [readerMode, setReaderMode] = useState('pdf');
  const [docContent, setDocContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Assign Org Modal State
  const [assignModalDoc, setAssignModalDoc] = useState(null);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [docFolder, setDocFolder] = useState('');
  const [assignTags, setAssignTags] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showCreateInlineInDocs, setShowCreateInlineInDocs] = useState(false);
  const [inlineDocOrgName, setInlineDocOrgName] = useState('');
  const [inlineDocOrgDesc, setInlineDocOrgDesc] = useState('');
  const [inlineDocOrgColor, setInlineDocOrgColor] = useState('#6366f1');

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (openReaderDoc) {
      handleOpenReader(openReaderDoc);
      if (onReaderDocHandled) {
        onReaderDocHandled();
      }
    }
  }, [openReaderDoc]);

  const handleOpenReader = async (docParam) => {
    const docName = typeof docParam === 'object' && docParam !== null ? docParam.docName : docParam;
    const pageNum = typeof docParam === 'object' && docParam !== null ? (docParam.page || 1) : 1;
    if (!docName) return;

    setSelectedReaderDoc(docName);
    setSelectedReaderPage(pageNum);
    const isPdf = docName.toLowerCase().endsWith('.pdf');
    const isImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(docName);
    setReaderMode(isImg ? 'image' : isPdf ? 'pdf' : 'text');
    setLoadingContent(true);

    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docName)}/content`);
      if (res.ok) {
        const data = await res.json();
        setDocContent(data.content || 'No text extracted for this document.');
      } else {
        setDocContent('Text content could not be loaded. Please view the original file.');
      }
    } catch {
      setDocContent('Text content could not be loaded. Please view the original file.');
    } finally {
      setLoadingContent(false);
    }
  };

  const [reprocessingDoc, setReprocessingDoc] = useState(null);

  const handleReprocess = async (docName) => {
    setReprocessingDoc(docName);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docName)}/reprocess`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (err) {
      console.error('Failed to reprocess document:', err);
    } finally {
      setReprocessingDoc(null);
    }
  };

  const handleCloseReader = () => {
    setSelectedReaderDoc(null);
    setDocContent('');
    setIsFullScreen(false);
  };

  const handleDelete = async (docName) => {
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docName)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.name !== docName));
        if (selectedReaderDoc === docName) {
          handleCloseReader();
        }
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleOpenAssign = (doc) => {
    setAssignModalDoc(doc);
    setTargetOrgId(doc.org_id || '__unassigned__');
    setDocFolder(doc.folder || '');
    setAssignTags(doc.tags ? doc.tags.join(', ') : '');
    setShowCreateInlineInDocs(false);
  };

  const handleSaveAssign = async () => {
    if (!assignModalDoc || !targetOrgId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(assignModalDoc.name)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: targetOrgId,
          folder: docFolder.trim(),
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setAssignModalDoc(null);
        await fetchDocuments();
        await fetchOrganizations();
      }
    } catch (err) {
      console.error('Failed to assign organization:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateAndAssignInDocModal = async () => {
    if (!inlineDocOrgName.trim() || !assignModalDoc) return;
    setIsAssigning(true);
    try {
      const createRes = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inlineDocOrgName.trim(),
          description: inlineDocOrgDesc.trim(),
          color: inlineDocOrgColor,
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
          folders: docFolder.trim() ? [docFolder.trim()] : [],
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create organization');
      const newOrg = await createRes.json();

      await fetch(`/api/documents/${encodeURIComponent(assignModalDoc.name)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: newOrg.id,
          folder: docFolder.trim(),
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      setAssignModalDoc(null);
      setShowCreateInlineInDocs(false);
      setInlineDocOrgName('');
      setInlineDocOrgDesc('');
      setDocFolder('');
      await fetchDocuments();
      await fetchOrganizations();
    } catch (err) {
      console.error('Failed to create and assign organization:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.org_name && doc.org_name.toLowerCase().includes(search.toLowerCase())) ||
      (doc.tags && doc.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

    const matchesOrg = selectedOrgFilter === 'all'
      ? true
      : selectedOrgFilter === '__unassigned__'
      ? (!doc.org_id || doc.org_id === '__unassigned__')
      : doc.org_id === selectedOrgFilter;

    return matchesSearch && matchesOrg;
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* ═══ Header ═══ */}
      <div className="p-6 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Documents Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse, inspect, and manage indexed files and knowledge vectors
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Org Filter */}
          <div className="relative">
            <select
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer shadow-2xs"
            >
              <option value="all">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.document_count || 0})
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents, tags..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <button
            onClick={() => { fetchDocuments(); fetchOrganizations(); }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ Document Cards Grid ═══ */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-3xl max-w-2xl mx-auto shadow-2xs">
            <BookOpen className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No documents found</p>
            <p className="text-xs text-slate-400 mt-1">Upload a PDF, TXT, or PNG in the Upload & Chat tab to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-6xl">
            {filteredDocs.map((doc) => {
              const ext = doc.name.split('.').pop().toUpperCase();
              const isPdf = ext.toLowerCase() === 'pdf';
              const isImg = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'BMP'].includes(ext);
              const orgName = doc.org_name || 'Unassigned';
              const orgColor = doc.org_color || '#6b7280';

              return (
                <div
                  key={doc.name}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Top Row: Icon + Org Badge + Delete */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className={`p-3 rounded-2xl ${
                          isImg
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : isPdf
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                        }`}>
                          {isImg ? <ImageIcon className="w-5 h-5" /> : <File className="w-5 h-5" />}
                        </div>
                        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold tracking-wider">
                          {ext}
                        </span>

                        {/* Organization Badge Button */}
                        <button
                          onClick={() => handleOpenAssign(doc)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                          style={{
                            backgroundColor: `${orgColor}15`,
                            color: orgColor,
                            border: `1px solid ${orgColor}35`,
                          }}
                          title="Click to assign or move organization"
                        >
                          <Building2 className="w-3 h-3" />
                          <span className="truncate max-w-[130px]">{orgName}</span>
                        </button>

                        {/* Folder Badge */}
                        {doc.folder && (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 max-w-[130px] truncate"
                            title={`Klasör / Portföy: ${doc.folder}`}
                          >
                            📁 {doc.folder}
                          </span>
                        )}
                      </div>

                      {deleteConfirm === doc.name ? (
                        <div className="flex items-center gap-1.5 animate-[fadeIn_0.2s_ease-out]">
                          <button
                            onClick={() => handleDelete(doc.name)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(doc.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors opacity-70 group-hover:opacity-100"
                          title="Delete document and vectors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* File Name */}
                    <h3 className="font-bold text-slate-900 text-sm mb-3 line-clamp-2 leading-snug min-h-[40px]" title={doc.name}>
                      {doc.name}
                    </h3>

                    {/* Tags List */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {doc.tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Chunks</span>
                        <span className="text-base font-bold text-indigo-600 flex items-center gap-1.5 font-mono">
                          <Database className="w-3.5 h-3.5" /> {doc.chunk_count || 0}
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Characters</span>
                        <span className="text-base font-bold text-slate-900 font-mono block whitespace-nowrap">
                          {(doc.char_count || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-3.5 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenReader(doc.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm shadow-indigo-600/20"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Read / View</span>
                    </button>

                    <button
                      onClick={() => handleOpenAssign(doc)}
                      className="p-2.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 transition-colors"
                      title="Assign / Move organization"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleReprocess(doc.name)}
                      disabled={reprocessingDoc === doc.name}
                      className="p-2.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 disabled:opacity-50 transition-colors"
                      title="Re-chunk with sentence and paragraph preservation"
                    >
                      <RefreshCw className={`w-4 h-4 ${reprocessingDoc === doc.name ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>

                    {onSelectDocForInspector && (
                      <button
                        onClick={() => onSelectDocForInspector(doc.name)}
                        className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
                        title="Inspect chunks for this document"
                      >
                        <span>Chunks</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Assign Organization Modal ═══ */}
      {assignModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAssignModalDoc(null)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[520px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              Assign Organization & Tags
            </h2>
            <p className="text-xs text-slate-500 mb-4 truncate">
              Document: <span className="text-slate-800 font-semibold">{assignModalDoc.name}</span>
            </p>

            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {showCreateInlineInDocs ? 'New Organization Details' : 'Select Organization'}
              </span>
              <button
                onClick={() => setShowCreateInlineInDocs(!showCreateInlineInDocs)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
              >
                {showCreateInlineInDocs ? '← Back to List' : '+ Create New Organization'}
              </button>
            </div>

            {showCreateInlineInDocs ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                    Organization Name *
                  </label>
                  <input
                    value={inlineDocOrgName}
                    onChange={(e) => setInlineDocOrgName(e.target.value)}
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
                    value={inlineDocOrgDesc}
                    onChange={(e) => setInlineDocOrgDesc(e.target.value)}
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
                        onClick={() => setInlineDocOrgColor(c)}
                        className={`w-6 h-6 rounded-lg transition-all ${inlineDocOrgColor === c ? 'ring-2 ring-indigo-600 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowCreateInlineInDocs(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAndAssignInDocModal}
                    disabled={!inlineDocOrgName.trim() || isAssigning}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
                  >
                    {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Create & Assign
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar mb-4">
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => setTargetOrgId(org.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      targetOrgId === org.id
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: org.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{org.name}</div>
                      {org.description && (
                        <div className="text-[10px] text-slate-500 truncate">{org.description}</div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{org.document_count || 0} docs</span>
                    {targetOrgId === org.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* Folder / Portfolio Selection */}
            {(targetOrgId || showCreateInlineInDocs) && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📁 Folder / Portfolio</span>
                    <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  {docFolder && (
                    <button
                      type="button"
                      onClick={() => setDocFolder('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Existing Folder Suggestion Chips */}
                {!showCreateInlineInDocs && organizations.find((o) => o.id === targetOrgId)?.folders?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {organizations
                      .find((o) => o.id === targetOrgId)
                      ?.folders.map((fld) => (
                        <button
                          key={fld}
                          type="button"
                          onClick={() => setDocFolder(fld)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                            docFolder === fld
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          📁 {fld}
                        </button>
                      ))}
                  </div>
                )}

                <input
                  value={docFolder}
                  onChange={(e) => setDocFolder(e.target.value)}
                  placeholder="e.g. Portfolio A, Contracts, Photos or new folder..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Tags (comma-separated)</label>
              <input
                value={assignTags}
                onChange={(e) => setAssignTags(e.target.value)}
                placeholder="e.g. contract, proposal, 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setAssignModalDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              {!showCreateInlineInDocs && (
                <button
                  onClick={handleSaveAssign}
                  disabled={!targetOrgId || isAssigning}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
                >
                  {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Professional Full Reader Modal / Dialog ═══ */}
      {selectedReaderDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleCloseReader}
          />

          <div
            className={`relative bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isFullScreen
                ? 'w-full h-full m-0 rounded-none'
                : 'w-[94vw] max-w-6xl h-[88vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm text-slate-900 truncate">{selectedReaderDoc}</h3>
                  <span className="text-[11px] font-medium text-slate-400">Document Reader & OCR Inspector</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {selectedReaderDoc.toLowerCase().endsWith('.pdf') && (
                  <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      onClick={() => setReaderMode('pdf')}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                        readerMode === 'pdf'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      PDF View
                    </button>
                    <button
                      onClick={() => setReaderMode('text')}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                        readerMode === 'text'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Text View
                    </button>
                  </div>
                )}

                {/\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(selectedReaderDoc) && (
                  <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      onClick={() => setReaderMode('image')}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                        readerMode === 'image'
                          ? 'bg-white text-emerald-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Image View
                    </button>
                    <button
                      onClick={() => setReaderMode('text')}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                        readerMode === 'text'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      OCR Text View
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleCloseReader}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Close (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden relative bg-slate-100/70">
              {readerMode === 'image' && /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(selectedReaderDoc) ? (
                <div className="w-full h-full flex items-center justify-center p-6 bg-slate-900/5 overflow-auto">
                  <img
                    src={`/api/documents/${encodeURIComponent(selectedReaderDoc)}/file`}
                    alt={selectedReaderDoc}
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-xl border border-slate-200 bg-white"
                  />
                </div>
              ) : readerMode === 'pdf' && selectedReaderDoc.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`/api/documents/${encodeURIComponent(selectedReaderDoc)}/file${selectedReaderPage ? `#page=${selectedReaderPage}` : ''}`}
                  className="w-full h-full border-none bg-white"
                  title="PDF Reader"
                />
              ) : (
                <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                  {loadingContent ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto text-slate-800 leading-relaxed font-mono whitespace-pre-wrap text-xs bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                      {docContent}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
