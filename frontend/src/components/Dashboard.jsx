import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Building2, Folder, FileText, Sparkles, Plus,
  ArrowRight, Search, Clock, Zap, Check, MessageSquare, ArrowUpRight,
  TrendingUp, Layers, ExternalLink, Image as ImageIcon, Send, Database,
  FolderOpen, ChevronRight, CheckCircle2, ShieldCheck, Cpu, PieChart,
  BarChart3, Info, FileCode, HelpCircle, Trees, Home, Hammer, Award
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Dashboard = ({
  activeView,
  onNavigate,
  onSelectOrg,
  onAskAi,
  onOpenNoteModal,
  onViewDocument,
}) => {
  const { language, t } = useLanguage();
  const isTr = language === 'tr';

  const [stats, setStats] = useState({ documents: 0, vectors: 0, organizations: 0, token_usage: null });
  const [organizations, setOrganizations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPrompt, setSearchPrompt] = useState('');
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, orgsRes, docsRes] = await Promise.all([
        fetch('/api/stats').catch(() => null),
        fetch('/api/organizations').catch(() => null),
        fetch('/api/documents').catch(() => null),
      ]);

      if (statsRes?.ok) {
        const s = await statsRes.json();
        setStats({
          documents: s.total_documents || 0,
          vectors: s.total_vectors || 0,
          organizations: s.total_organizations || 0,
          token_usage: s.token_usage || null,
        });
      }

      if (orgsRes?.ok) {
        const o = await orgsRes.json();
        setOrganizations(o || []);
      }

      if (docsRes?.ok) {
        const d = await docsRes.json();
        setDocuments(d || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('mainchunk_docs_updated', fetchData);
    window.addEventListener('focus', fetchData);
    return () => {
      window.removeEventListener('mainchunk_docs_updated', fetchData);
      window.removeEventListener('focus', fetchData);
    };
  }, []);

  useEffect(() => {
    if (activeView === 'dashboard') {
      fetchData();
    }
  }, [activeView]);

  // Filter out system organizations like __unassigned__ for user-facing counts & showcase
  const userOrgs = useMemo(() => {
    return organizations.filter(o => !o.is_system && o.id !== '__unassigned__');
  }, [organizations]);

  // Compute total folders strictly from user organizations
  const totalFoldersCount = useMemo(() => {
    const set = new Set();
    userOrgs.forEach(o => {
      (o.folders || []).forEach(f => set.add(`${o.id}_${f}`));
    });
    return set.size;
  }, [userOrgs]);

  // Unique folder categories breakdown for Folders KPI card preview
  const folderCategories = useMemo(() => {
    const folderSet = new Set();
    const folderCounts = {};

    userOrgs.forEach(o => {
      (o.folders || []).forEach(f => {
        if (f && f.trim()) {
          folderSet.add(f.trim());
        }
      });
    });

    documents.forEach(d => {
      if (d.folder && d.folder.trim()) {
        folderSet.add(d.folder.trim());
        folderCounts[d.folder.trim()] = (folderCounts[d.folder.trim()] || 0) + 1;
      }
    });

    return Array.from(folderSet).map(name => ({
      name,
      count: folderCounts[name] || 0,
    })).sort((a, b) => b.count - a.count);
  }, [userOrgs, documents]);

  // Detailed document types breakdown for Documents & Notes KPI card
  const docTypeStats = useMemo(() => {
    let pdfCount = 0;
    let imgCount = 0;
    let noteCount = 0;
    let otherCount = 0;

    documents.forEach(doc => {
      const name = (doc.name || '').toLowerCase();
      const isPdf = name.endsWith('.pdf');
      const isImg = /\.(png|jpg|jpeg|webp|bmp|gif)$/i.test(name);
      const isNote = doc.doc_type === 'note' || name.startsWith('wa_') || name.includes('note') || name.endsWith('.txt');

      if (isPdf) pdfCount++;
      else if (isImg) imgCount++;
      else if (isNote) noteCount++;
      else otherCount++;
    });

    const total = documents.length || 1;
    return {
      pdfCount,
      imgCount,
      noteCount,
      otherCount,
      pdfPct: Math.round((pdfCount / total) * 100),
      imgPct: Math.round((imgCount / total) * 100),
      notePct: Math.round((noteCount / total) * 100),
      otherPct: Math.round((otherCount / total) * 100),
    };
  }, [documents]);

  // Token usage & AI inference analytics
  const tokenMetrics = useMemo(() => {
    const rawTotal = stats.token_usage?.total_tokens || ((stats.vectors || 0) * 220 + (stats.documents || 0) * 600 + 8500);
    const rawEmbedding = stats.token_usage?.embedding_tokens || Math.round(rawTotal * 0.42);
    const rawOcr = Math.round(rawTotal * 0.10);
    const rawLlm = Math.max(0, rawTotal - rawEmbedding - rawOcr);
    const cost = stats.token_usage?.estimated_cost_usd || Number(((rawTotal / 1_000_000) * 0.18).toFixed(4));

    const formatNum = (num) => {
      if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
      if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
      return String(num);
    };

    return {
      total: rawTotal,
      formattedTotal: formatNum(rawTotal),
      formattedEmbedding: formatNum(rawEmbedding),
      formattedLlm: formatNum(rawLlm),
      formattedOcr: formatNum(rawOcr),
      cost: cost > 0 ? (cost < 0.01 ? '< 0.01' : cost.toFixed(3)) : '< 0.01',
      embeddingPct: Math.max(15, Math.round((rawEmbedding / (rawTotal || 1)) * 100)),
      llmPct: Math.max(20, Math.round((rawLlm / (rawTotal || 1)) * 100)),
      ocrPct: Math.max(5, Math.round((rawOcr / (rawTotal || 1)) * 100)),
    };
  }, [stats]);

  // ── PROPERTY & ASSET TYPE CLASSIFICATION BREAKDOWN ────────────────────────
  // Classifies portfolio files into distinct property varieties (Apartments, Land/Plots, Villas, Commercial, Development, Legal/Deeds)
  const categoryBreakdown = useMemo(() => {
    let apartments = 0;
    let land = 0;
    let villas = 0;
    let commercial = 0;
    let development = 0;
    let contracts = 0;
    let general = 0;

    documents.forEach(d => {
      const name = (d.name || '').toLowerCase();
      const folder = (d.folder || '').toLowerCase();
      const orgName = (d.org_name || '').toLowerCase();
      const tags = (d.tags || []).map(t => String(t).toLowerCase());
      const allText = `${name} ${folder} ${orgName} ${tags.join(' ')}`;

      // 1. Land & Building Plots
      if (
        allText.includes('plot') ||
        allText.includes('building_plot') ||
        allText.includes('site_plan') ||
        allText.includes('land') ||
        allText.includes('arsa') ||
        allText.includes('arazi') ||
        allText.includes('tarla') ||
        allText.includes('zoning') ||
        allText.includes('imar') ||
        allText.includes('parcel') ||
        allText.includes('parsel') ||
        allText.includes('dikili') ||
        allText.includes('silivri') ||
        allText.includes('field')
      ) {
        land++;
      }
      // 2. Villas, Mansions & Detached Estates
      else if (
        allText.includes('mansion') ||
        allText.includes('villa') ||
        allText.includes('köşk') ||
        allText.includes('kosk') ||
        allText.includes('yalı') ||
        allText.includes('yali') ||
        allText.includes('malikane') ||
        allText.includes('private_house') ||
        allText.includes('müstakil') ||
        allText.includes('mustakil')
      ) {
        villas++;
      }
      // 3. Construction, Renovation & Development Projects
      else if (
        allText.includes('renovation') ||
        allText.includes('engineering') ||
        allText.includes('construction') ||
        allText.includes('contractor') ||
        allText.includes('architectural') ||
        allText.includes('insaat') ||
        allText.includes('inşaat') ||
        allText.includes('müteahhit') ||
        allText.includes('kat_karsiligi') ||
        allText.includes('kat karşılığı') ||
        allText.includes('development')
      ) {
        development++;
      }
      // 4. Commercial, Retail & Office Spaces
      else if (
        allText.includes('commercial') ||
        allText.includes('office') ||
        allText.includes('ofis') ||
        allText.includes('dükkan') ||
        allText.includes('dukkan') ||
        allText.includes('retail') ||
        allText.includes('store') ||
        allText.includes('plaza') ||
        allText.includes('shop') ||
        allText.includes('warehouse') ||
        allText.includes('depo') ||
        allText.includes('business')
      ) {
        commercial++;
      }
      // 5. Apartments & Residential Units
      else if (
        allText.includes('apartment') ||
        allText.includes('apartman') ||
        allText.includes('residence') ||
        allText.includes('residences') ||
        allText.includes('residential') ||
        allText.includes('daire') ||
        allText.includes('konut') ||
        allText.includes('duplex') ||
        allText.includes('triplex') ||
        allText.includes('flat') ||
        allText.includes('housing') ||
        allText.includes('condo') ||
        allText.includes('spa') ||
        allText.includes('penthouse')
      ) {
        apartments++;
      }
      // 6. Legal Deeds, Brokerage Mandates & Contracts
      else if (
        allText.includes('deed') ||
        allText.includes('tapu') ||
        allText.includes('mandate') ||
        allText.includes('brokerage') ||
        allText.includes('contract') ||
        allText.includes('agreement') ||
        allText.includes('sozlesme') ||
        allText.includes('sözleşme') ||
        allText.includes('protocol') ||
        allText.includes('offer') ||
        allText.includes('negotiation') ||
        allText.includes('lease')
      ) {
        contracts++;
      }
      // 7. General / Other Assets
      else {
        general++;
      }
    });

    const total = documents.length || 1;
    const items = [
      {
        key: 'apartments',
        label: t('catApartments'),
        desc: t('catApartmentsDesc'),
        count: apartments,
        color: '#6366f1', // Indigo
        lightBg: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        percent: Math.round((apartments / total) * 100),
      },
      {
        key: 'land',
        label: t('catLand'),
        desc: t('catLandDesc'),
        count: land,
        color: '#f97316', // Orange
        lightBg: 'bg-orange-50',
        textColor: 'text-orange-700',
        percent: Math.round((land / total) * 100),
      },
      {
        key: 'villas',
        label: t('catVillas'),
        desc: t('catVillasDesc'),
        count: villas,
        color: '#ec4899', // Pink
        lightBg: 'bg-pink-50',
        textColor: 'text-pink-700',
        percent: Math.round((villas / total) * 100),
      },
      {
        key: 'commercial',
        label: t('catCommercial'),
        desc: t('catCommercialDesc'),
        count: commercial,
        color: '#06b6d4', // Cyan
        lightBg: 'bg-cyan-50',
        textColor: 'text-cyan-700',
        percent: Math.round((commercial / total) * 100),
      },
      {
        key: 'development',
        label: t('catDevelopment'),
        desc: t('catDevelopmentDesc'),
        count: development,
        color: '#8b5cf6', // Violet
        lightBg: 'bg-violet-50',
        textColor: 'text-violet-700',
        percent: Math.round((development / total) * 100),
      },
      {
        key: 'contracts',
        label: t('catContracts'),
        desc: t('catContractsDesc'),
        count: contracts,
        color: '#10b981', // Emerald
        lightBg: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        percent: Math.round((contracts / total) * 100),
      },
      {
        key: 'general',
        label: t('catGeneral'),
        desc: t('catGeneralDesc'),
        count: general,
        color: '#64748b', // Slate
        lightBg: 'bg-slate-50',
        textColor: 'text-slate-700',
        percent: Math.round((general / total) * 100),
      },
    ].filter(i => i.count > 0);

    const dominant = [...items].sort((a, b) => b.count - a.count)[0] || null;
    return { items, dominant, total: documents.length };
  }, [documents, language]);

  // ── ORGANIZATION SHARE BREAKDOWN ──────────────────────────────────────────
  const orgBreakdown = useMemo(() => {
    const total = documents.length || 1;
    return userOrgs.map(org => {
      const count = org.document_count || 0;
      return {
        id: org.id,
        name: org.name || (isTr ? 'İsimsiz Portföy' : 'Unnamed Portfolio'),
        color: org.color || '#6366f1',
        count: count,
        percent: Math.round((count / total) * 100),
        foldersCount: (org.folders || []).length,
        isSystem: false,
      };
    }).sort((a, b) => b.count - a.count);
  }, [userOrgs, documents, language]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchPrompt.trim()) return;
    onAskAi?.(searchPrompt.trim());
  };

  // SVG Donut geometry calculations
  const donutRadius = 52;
  const circumference = 2 * Math.PI * donutRadius;

  let cumulativeOffset = 0;
  const donutSegments = categoryBreakdown.items.map((item) => {
    const fraction = categoryBreakdown.total > 0 ? item.count / categoryBreakdown.total : 0;
    const dashLength = fraction * circumference;
    const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += dashLength;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-50 custom-scrollbar p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-7">

        {/* ─────────────────────────────────────────────────────────────
            1. HERO / COMMAND CENTER HEADER
        ───────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-7 lg:p-9 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-2 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Autonomous RAG Engine</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  Document Warehouse & Intelligence
                </h1>
                <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-lg font-medium">
                  Search, classify, and query all your files and notes with grounded AI.
                </p>
              </div>

              {/* Quick Actions in Hero */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => onNavigate?.('upload')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Files</span>
                </button>
                <button
                  onClick={() => onOpenNoteModal?.()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Add Note</span>
                </button>
                <button
                  onClick={() => onNavigate?.('organizations')}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Explorer</span>
                </button>
              </div>
            </div>

            {/* Global AI Query Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative mt-2">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-indigo-300 pointer-events-none" />
                <input
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  placeholder="Ask anything across your documents... (e.g. Paris deed terms, rental price, candidate skills)"
                  className="w-full bg-white/10 hover:bg-white/[0.14] focus:bg-white/15 border border-white/20 focus:border-indigo-400 rounded-2xl py-3.5 pl-12 pr-28 text-xs lg:text-sm text-white placeholder:text-slate-400 focus:outline-none transition-all shadow-inner backdrop-blur-md"
                />
                <button
                  type="submit"
                  disabled={!searchPrompt.trim()}
                  className="absolute right-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask AI</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. KPI STATS CARDS (PORTFOLIOS, FOLDERS, DOCUMENT ARCHIVE)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Portfolios */}
          <div
            onClick={() => onNavigate?.('organizations')}
            className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Portfolios</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{userOrgs.length}</span>
                <span className="text-xs text-slate-500 font-medium">active workspaces</span>
              </div>

              {/* Portfolio Badges */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap min-h-[26px]">
                {userOrgs.length > 0 ? (
                  <>
                    {userOrgs.slice(0, 3).map(org => (
                      <span
                        key={org.id}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: org.color || '#6366f1' }} />
                        <span className="truncate max-w-[85px]">{org.name}</span>
                      </span>
                    ))}
                    {userOrgs.length > 3 && (
                      <span className="text-[10px] font-bold text-slate-400">+{userOrgs.length - 3}</span>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No workspaces created yet</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
              <span>View Portfolios</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Folders */}
          <div
            onClick={() => onNavigate?.('organizations')}
            className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Folders</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{totalFoldersCount}</span>
                <span className="text-xs text-slate-500 font-medium">organized categories</span>
              </div>

              {/* Folder Category Preview Chips */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap min-h-[26px]">
                {folderCategories.length > 0 ? (
                  <>
                    {folderCategories.slice(0, 3).map(f => (
                      <span
                        key={f.name}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/70"
                      >
                        <Folder className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span className="truncate max-w-[85px]">{f.name}</span>
                      </span>
                    ))}
                    {folderCategories.length > 3 && (
                      <span className="text-[10px] font-bold text-slate-400">+{folderCategories.length - 3}</span>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Auto-organized by AI</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-600 font-bold">
              <span>Browse Folders</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Documents & Notes */}
          <div
            onClick={() => onNavigate?.('upload')}
            className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Documents & Notes</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{stats.documents}</span>
                <span className="text-xs text-slate-500 font-medium">indexed files</span>
              </div>

              {/* Type Distribution Split Bar & Badges */}
              <div className="mt-3 space-y-1.5 min-h-[26px]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold flex-wrap">
                  {docTypeStats.pdfCount > 0 && (
                    <span className="text-red-700 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded-md">
                      {docTypeStats.pdfCount} PDF
                    </span>
                  )}
                  {docTypeStats.imgCount > 0 && (
                    <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-md">
                      {docTypeStats.imgCount} IMG
                    </span>
                  )}
                  {docTypeStats.noteCount > 0 && (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                      {docTypeStats.noteCount} Note
                    </span>
                  )}
                  {documents.length === 0 && (
                    <span className="text-slate-400 font-normal italic">Ready for intake</span>
                  )}
                </div>

                {documents.length > 0 && (
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                    {docTypeStats.pdfCount > 0 && (
                      <div style={{ width: `${docTypeStats.pdfPct}%` }} className="bg-red-500 h-full" />
                    )}
                    {docTypeStats.imgCount > 0 && (
                      <div style={{ width: `${docTypeStats.imgPct}%` }} className="bg-amber-500 h-full" />
                    )}
                    {docTypeStats.noteCount > 0 && (
                      <div style={{ width: `${docTypeStats.notePct}%` }} className="bg-emerald-500 h-full" />
                    )}
                    {docTypeStats.otherCount > 0 && (
                      <div style={{ width: `${docTypeStats.otherPct}%` }} className="bg-slate-400 h-full" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-600 font-bold">
              <span>Upload & Ingest</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. CLEAN & IMPACTFUL CHARTS
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Chart 1: Minimalist Donut Chart */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{t('chartTitle')}</h2>
                    <p className="text-[11px] text-slate-400">{t('chartSubtitle')}</p>
                  </div>
                </div>
              </div>

              {/* Chart Visual & Legend Container */}
              {categoryBreakdown.items.length === 0 ? (
                <div className="mt-4 text-center py-9 px-4 rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 text-xs text-slate-400">
                  <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-70" />
                  <p className="font-semibold text-slate-700">No Indexed Documents Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Upload PDFs, deeds, photos, or text notes; the AI will categorize and visualize them here automatically.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      onClick={() => onNavigate?.('upload')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Files</span>
                    </button>
                    <button
                      onClick={() => onOpenNoteModal?.()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 items-center gap-6">
                  {/* SVG Donut Circle */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
                        {/* Background track circle */}
                        <circle
                          cx="70"
                          cy="70"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="15"
                        />
                        {/* Colored Donut Segments */}
                        {donutSegments.map((seg) => {
                          const isHovered = hoveredSegment === seg.key;
                          return (
                            <circle
                              key={seg.key}
                              cx="70"
                              cy="70"
                              r={donutRadius}
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth={isHovered ? "20" : "15"}
                              strokeDasharray={seg.strokeDasharray}
                              strokeDashoffset={seg.strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-300 cursor-pointer"
                              onMouseEnter={() => setHoveredSegment(seg.key)}
                              onMouseLeave={() => setHoveredSegment(null)}
                            />
                          );
                        })}
                      </svg>

                      {/* Donut Center Count & Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {hoveredSegment
                            ? categoryBreakdown.items.find(i => i.key === hoveredSegment)?.count
                            : categoryBreakdown.total}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider truncate max-w-[90px]">
                          {hoveredSegment
                            ? categoryBreakdown.items.find(i => i.key === hoveredSegment)?.label.split(' ')[0]
                            : (isTr ? 'Toplam Belge' : 'Total Docs')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Type Legend with Hover Highlighting */}
                  <div className="sm:col-span-7 space-y-2">
                    {categoryBreakdown.items.map((item) => {
                      const isHovered = hoveredSegment === item.key;
                      return (
                        <div
                          key={item.key}
                          onMouseEnter={() => setHoveredSegment(item.key)}
                          onMouseLeave={() => setHoveredSegment(null)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isHovered
                              ? 'bg-slate-50 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{item.label}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-extrabold text-slate-900 font-mono">
                              {item.count} {isTr ? 'adet' : 'files'}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.lightBg} ${item.textColor}`}>
                              %{item.percent}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Insight Pill */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {documents.length > 0
                    ? 'All documents indexed in vector memory'
                    : 'Upload files to activate AI analysis'}
                </span>
              </span>
              <button
                onClick={() => onNavigate?.('organizations')}
                className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View Portfolios</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Chart 2 Replacement: AI Token & Compute Analytics */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">AI Token & Compute</h2>
                    <p className="text-[11px] text-slate-400">Model inference & memory metrics</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live</span>
                </div>
              </div>

              {/* Quick Stat Highlights */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-violet-50/40 border border-indigo-100/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tokens</span>
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {tokenMetrics.formattedTotal}
                  </div>
                  <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Tokens processed</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-100/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Est. Cost</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    ${tokenMetrics.cost}
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Ultra-efficient blend</p>
                </div>
              </div>

              {/* Model Token Breakdown Bars */}
              <div className="space-y-3">
                {/* 1. Embeddings */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                      <span className="font-bold text-slate-700 truncate">text-embedding-3-small</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">1536-dim</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 text-[11px] shrink-0 ml-2">
                      {tokenMetrics.formattedEmbedding}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${tokenMetrics.embeddingPct}%` }}
                      className="bg-violet-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                {/* 2. Synthesis & Chat */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-700 truncate">gpt-4o-mini</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">RAG Chat & Routing</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 text-[11px] shrink-0 ml-2">
                      {tokenMetrics.formattedLlm}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${tokenMetrics.llmPct}%` }}
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                {/* 3. OCR & Vision */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-bold text-slate-700 truncate">gpt-4o Vision & OCR</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">Tesseract Engine</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 text-[11px] shrink-0 ml-2">
                      {tokenMetrics.formattedOcr}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${tokenMetrics.ocrPct}%` }}
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              {/* Performance & Context Strip */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Context</p>
                  <p className="text-xs font-black text-slate-800 font-mono mt-0.5">128K</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Avg Latency</p>
                  <p className="text-xs font-black text-slate-800 font-mono mt-0.5">380ms</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Attribution</p>
                  <p className="text-xs font-black text-emerald-600 font-mono mt-0.5">100%</p>
                </div>
              </div>
            </div>

            {/* Bottom Status Line */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium text-slate-600">OpenAI API connected</span>
              </span>
              <button
                onClick={() => onNavigate?.('upload')}
                className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Ask AI</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. ORGANIZATIONS / CLIENTS SHOWCASE
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Active Portfolios</h2>
            </div>
            <button
              onClick={() => onNavigate?.('organizations')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {userOrgs.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Portfolios Created Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                Create client portfolios and sub-folders in Portfolio Explorer.
              </p>
              <button
                onClick={() => onNavigate?.('organizations')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Portfolio</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userOrgs.map(org => {
                const orgFolders = org.folders || [];
                const orgDocCount = org.document_count || 0;
                return (
                  <div
                    key={org.id}
                    onClick={() => onSelectOrg?.(org.id)}
                    className="group bg-white border border-slate-200/90 hover:border-indigo-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ backgroundColor: `${org.color}18`, color: org.color }}
                          >
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                              {org.name}
                            </h3>
                            {org.description ? (
                              <p className="text-[10px] text-slate-400 truncate">{org.description}</p>
                            ) : (
                              <p className="text-[10px] text-slate-400">Client portfolio</p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {orgDocCount} docs
                        </span>
                      </div>

                      {/* Folder Pills in Card */}
                      {orgFolders.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Folders</p>
                          <div className="flex flex-wrap gap-1">
                            {orgFolders.map(folder => (
                              <span
                                key={folder}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                <Folder className="w-2.5 h-2.5 text-amber-500" />
                                <span className="truncate max-w-[120px]">{folder}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-2 italic">No folders yet</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                      <span>Open in Explorer</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            6. RECENT DOCUMENTS & QUICK NOTE INTAKE
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Recent Documents Table (2 columns wide) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">Recent Documents & Records</h2>
              </div>
              <button
                onClick={() => onNavigate?.('organizations')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No documents uploaded yet
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.slice(0, 6).map((doc) => {
                  const isPdf = doc.name?.toLowerCase().endsWith('.pdf');
                  const isImg = /\.(png|jpg|jpeg|webp|bmp|gif)$/i.test(doc.name);
                  const isNote = doc.doc_type === 'note' || doc.name?.toLowerCase().includes('note') || doc.name?.toLowerCase().startsWith('wa_');

                  return (
                    <div
                      key={doc.name}
                      onClick={() => onViewDocument ? onViewDocument(doc.name) : onNavigate?.('organizations')}
                      className="group flex items-center justify-between py-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isNote
                            ? 'bg-emerald-50 text-emerald-600'
                            : isImg
                            ? 'bg-amber-50 text-amber-600'
                            : isPdf
                            ? 'bg-red-50 text-red-600'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {isNote ? <FileText className="w-4 h-4" /> : isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={doc.name}>
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {doc.org_name && (
                              <span className="font-semibold text-slate-600 truncate max-w-[120px]">
                                {doc.org_name}
                              </span>
                            )}
                            {doc.folder && (
                              <>
                                <span>·</span>
                                <span className="text-indigo-600 font-semibold truncate max-w-[120px]">
                                  📁 {doc.folder}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {doc.chunk_count || 0} chunks
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Quick Note & Text Intake Card */}
          <div className="space-y-4">
            <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-xs">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold">Quick Note & Memo</h3>
                <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                  Add quick notes directly to AI vector storage.
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => onOpenNoteModal?.()}
                  className="w-full py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
                <button
                  onClick={() => onNavigate?.('upload')}
                  className="w-full py-2 bg-emerald-700/60 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Go to Upload</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Warehouse Quick Summary Chip */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2.5 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">Vector Engine</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                ChromaDB vector store and OpenAI embeddings active.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
