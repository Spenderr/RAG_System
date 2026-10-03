import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, FileText, Search, Trash2, Tag, FolderOpen,
  ChevronRight, ChevronDown, Edit2, Check, X, Eye, Palette,
  ArrowRight, RefreshCw, HelpCircle, Loader2, Image as ImageIcon
} from 'lucide-react';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const Organizations = ({ onViewDocument, onGoToInspector }) => {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrg, setExpandedOrg] = useState(null);
  const [orgDocs, setOrgDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(null);
  const [search, setSearch] = useState('');

  // Create org modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgColor, setNewOrgColor] = useState('#6366f1');
  const [newOrgTags, setNewOrgTags] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit org
  const [editingOrg, setEditingOrg] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Assign modal
  const [assignModal, setAssignModal] = useState(null);
  const [assignTargetOrg, setAssignTargetOrg] = useState('');
  const [assignTags, setAssignTags] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Unassigned docs alert
  const [unassignedDocs, setUnassignedDocs] = useState([]);
  const [showUnassignedAlert, setShowUnassignedAlert] = useState(false);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);

        // Check unassigned
        const unassigned = data.find(o => o.id === '__unassigned__');
        if (unassigned && unassigned.document_count > 0) {
          setShowUnassignedAlert(true);
          const udRes = await fetch('/api/organizations/__unassigned__/documents');
          if (udRes.ok) {
            const udData = await udRes.json();
            setUnassignedDocs(udData);
          }
        } else {
          setShowUnassignedAlert(false);
          setUnassignedDocs([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrganizations(); }, []);

  const fetchOrgDocs = async (orgId) => {
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

  const toggleOrg = (orgId) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null);
    } else {
      setExpandedOrg(orgId);
      if (!orgDocs[orgId]) {
        fetchOrgDocs(orgId);
      }
    }
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
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewOrgName('');
        setNewOrgDesc('');
        setNewOrgColor('#6366f1');
        setNewOrgTags('');
        await fetchOrganizations();
      }
    } catch (err) {
      console.error('Failed to create org:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOrg = async (orgId) => {
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(orgId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirm(null);
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
          tags: assignTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setAssignModal(null);
        setAssignTargetOrg('');
        setAssignTags('');
        await fetchOrganizations();
        if (expandedOrg) {
          await fetchOrgDocs(expandedOrg);
        }
      }
    } catch (err) {
      console.error('Failed to assign doc:', err);
    } finally {
      setAssigning(false);
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.description?.toLowerCase().includes(search.toLowerCase())
  );

  const userOrgs = filteredOrgs.filter(o => !o.is_system);
  const systemOrgs = filteredOrgs.filter(o => o.is_system);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* ═══ Header ═══ */}
      <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organization Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Group, classify, and track multi-source document archives
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            New Organization
          </button>
          <button
            onClick={fetchOrganizations}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ Unassigned Documents Alert ═══ */}
      {showUnassignedAlert && unassignedDocs.length > 0 && (
        <div className="mx-6 mt-5 p-4 bg-amber-50 border border-amber-200/90 rounded-2xl shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-amber-900 mb-0.5">
                {unassignedDocs.length} document{unassignedDocs.length > 1 ? 's' : ''} awaiting assignment
              </h3>
              <p className="text-[11px] text-amber-700/80 mb-3">
                These documents are currently unassigned. Click a document to place it in an organization.
              </p>
              <div className="flex flex-wrap gap-2">
                {unassignedDocs.slice(0, 6).map(doc => (
                  <button
                    key={doc.name}
                    onClick={() => {
                      setAssignModal({ filename: doc.name, currentOrgId: '__unassigned__' });
                      setAssignTargetOrg('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-200 rounded-xl text-xs font-medium transition-colors shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span className="truncate max-w-[160px]">{doc.name}</span>
                    <ArrowRight className="w-3 h-3 text-amber-500" />
                  </button>
                ))}
                {unassignedDocs.length > 6 && (
                  <span className="text-xs text-amber-700/70 px-2 py-1.5 font-medium">
                    +{unassignedDocs.length - 6} more
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowUnassignedAlert(false)}
              className="p-1 text-amber-500 hover:text-amber-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Organizations List ═══ */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3.5 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-3xl max-w-2xl mx-auto shadow-2xs">
            <Building2 className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No organizations found</p>
            <p className="text-xs text-slate-400 mt-1">Create an organization to group files by vendor, project, or contract</p>
          </div>
        ) : (
          <>
            {/* User organizations */}
            {userOrgs.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                isExpanded={expandedOrg === org.id}
                onToggle={() => toggleOrg(org.id)}
                docs={orgDocs[org.id] || []}
                loadingDocs={loadingDocs === org.id}
                onDelete={() => setDeleteConfirm(org.id)}
                deleteConfirm={deleteConfirm === org.id}
                onCancelDelete={() => setDeleteConfirm(null)}
                onConfirmDelete={() => handleDeleteOrg(org.id)}
                onEdit={() => {
                  setEditingOrg(org.id);
                  setEditName(org.name);
                  setEditDesc(org.description);
                }}
                isEditing={editingOrg === org.id}
                editName={editName}
                editDesc={editDesc}
                onEditNameChange={setEditName}
                onEditDescChange={setEditDesc}
                onSaveEdit={() => handleSaveEdit(org.id)}
                onCancelEdit={() => setEditingOrg(null)}
                onAssignDoc={(filename) => {
                  setAssignModal({ filename, currentOrgId: org.id });
                  setAssignTargetOrg('');
                }}
                onViewDocument={onViewDocument}
                onGoToInspector={onGoToInspector}
              />
            ))}

            {/* System orgs (Unassigned) — shown at bottom */}
            {systemOrgs.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                isExpanded={expandedOrg === org.id}
                onToggle={() => toggleOrg(org.id)}
                docs={orgDocs[org.id] || []}
                loadingDocs={loadingDocs === org.id}
                isSystem
                onAssignDoc={(filename) => {
                  setAssignModal({ filename, currentOrgId: org.id });
                  setAssignTargetOrg('');
                }}
                onViewDocument={onViewDocument}
                onGoToInspector={onGoToInspector}
              />
            ))}
          </>
        )}
      </div>

      {/* ═══ Create Organization Modal ═══ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[520px] max-w-[94vw] p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              New Organization
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Name *</label>
                <input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Description</label>
                <input
                  value={newOrgDesc}
                  onChange={(e) => setNewOrgDesc(e.target.value)}
                  placeholder="e.g. Main supplier for minerals"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Color Badge</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewOrgColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${newOrgColor === c ? 'ring-2 ring-indigo-600 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Tags (comma-separated)</label>
                <input
                  value={newOrgTags}
                  onChange={(e) => setNewOrgTags(e.target.value)}
                  placeholder="e.g. supplier, minerals, contracts"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={!newOrgName.trim() || creating}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Assign Document Modal ═══ */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-[480px] max-w-[94vw] p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              Assign Document
            </h2>
            <p className="text-xs text-slate-500 mb-4 truncate">
              Move <span className="text-slate-900 font-semibold">{assignModal.filename}</span> to an organization
            </p>

            <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar mb-4">
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
                  <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: org.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{org.name}</div>
                    {org.description && (
                      <div className="text-[10px] text-slate-500 truncate">{org.description}</div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{org.document_count} docs</span>
                  {assignTargetOrg === org.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              ))}
              {organizations.filter(o => !o.is_system && o.id !== assignModal.currentOrgId).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No other organizations. Create one first.
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Tags (comma-separated)</label>
              <input
                value={assignTags}
                onChange={(e) => setAssignTags(e.target.value)}
                placeholder="e.g. contract, proposal"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDoc}
                disabled={!assignTargetOrg || assigning}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Assign Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ── Organization Card ────────────────────────────────────────
const OrgCard = ({
  org, isExpanded, onToggle, docs, loadingDocs, isSystem,
  onDelete, deleteConfirm, onCancelDelete, onConfirmDelete,
  onEdit, isEditing, editName, editDesc, onEditNameChange, onEditDescChange,
  onSaveEdit, onCancelEdit, onAssignDoc, onViewDocument, onGoToInspector,
}) => {
  return (
    <div className={`bg-white border rounded-2xl transition-all duration-200 overflow-hidden ${
      isExpanded
        ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100'
        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
    }`}>
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/60 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
          style={{ backgroundColor: `${org.color}15` }}
        >
          {isSystem ? (
            <HelpCircle className="w-5 h-5" style={{ color: org.color }} />
          ) : (
            <Building2 className="w-5 h-5" style={{ color: org.color }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 w-48"
                autoFocus
              />
              <input
                value={editDesc}
                onChange={(e) => onEditDescChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-xs text-slate-600 focus:outline-none focus:border-indigo-500 flex-1"
                placeholder="Description"
              />
              <button onClick={onSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={onCancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-900 truncate">{org.name}</h3>
              {org.description && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{org.description}</p>
              )}
            </>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {org.tags?.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-medium">
              #{tag}
            </span>
          ))}
        </div>

        {/* Doc count & controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {org.document_count} doc{org.document_count !== 1 ? 's' : ''}
          </span>

          {!isSystem && !isEditing && (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {deleteConfirm ? (
                <div className="flex items-center gap-1">
                  <button onClick={onConfirmDelete} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-semibold">
                    Delete
                  </button>
                  <button onClick={onCancelDelete} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded: Documents List */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4">
          {loadingDocs ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">
              No documents currently in this organization.
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                const isImg = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(doc.name);
                return (
                  <div
                    key={doc.name}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 hover:shadow-2xs transition-all group"
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isImg
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : isPdf
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    }`}>
                      {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{doc.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5 font-mono">
                        <span className="text-[10px] text-slate-500">{doc.chunk_count} chunks</span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-500">{(doc.char_count || 0).toLocaleString()} chars</span>
                        {doc.doc_type && doc.doc_type !== 'other' && (
                          <>
                            <span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 font-sans">
                              {doc.doc_type}
                            </span>
                          </>
                        )}
                      </div>
                      {doc.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {doc.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                      {(isPdf || isImg) && (
                        <button
                          onClick={() => onViewDocument?.(doc.name)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                          title={isPdf ? "View PDF" : "View Image"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onGoToInspector?.(doc.name)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                        title="Inspect chunks"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAssignDoc(doc.name)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200"
                        title="Move to another organization"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Organizations;
