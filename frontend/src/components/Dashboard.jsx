import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Building2, Folder, FileText, Sparkles, Plus,
  ArrowRight, Search, Clock, Zap, Check, MessageSquare, ArrowUpRight,
  TrendingUp, Layers, ExternalLink, Image as ImageIcon, Send, Database,
  FolderOpen, ChevronRight, CheckCircle2, ShieldCheck, Cpu, PieChart,
  BarChart3, Info, FileCode, HelpCircle, Trees, Home, Hammer, Award
} from 'lucide-react';

const Dashboard = ({
  onNavigate,
  onSelectOrg,
  onAskAi,
  onOpenNoteModal,
  onViewDocument,
}) => {
  const [stats, setStats] = useState({ documents: 0, vectors: 0, organizations: 0 });
  const [organizations, setOrganizations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPrompt, setSearchPrompt] = useState('');
  const [hoveredSegment, setHoveredSegment] = useState(null);

  useEffect(() => {
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

    fetchData();
  }, []);

  // Compute total folders across all orgs
  const totalFoldersCount = useMemo(() => {
    const set = new Set();
    organizations.forEach(o => {
      (o.folders || []).forEach(f => set.add(`${o.id}_${f}`));
    });
    return set.size;
  }, [organizations]);

  // ── REAL ESTATE & PORTFOLIO CATEGORY BREAKDOWN ────────────────────────────
  // Classifies documents into business categories: Arsa, Kat Karşılığı, Kiralık/Satılık, vb.
  const categoryBreakdown = useMemo(() => {
    let arsa = 0;
    let katKarsiligi = 0;
    let kiralikSatilik = 0;
    let ticariSozlesme = 0;
    let sertifikalar = 0;
    let musteriNotlari = 0;
    let diger = 0;

    documents.forEach(d => {
      const name = (d.name || '').toLowerCase();
      const folder = (d.folder || '').toLowerCase();
      const tags = (d.tags || []).map(t => String(t).toLowerCase());
      const allText = `${name} ${folder} ${tags.join(' ')}`;

      // 1. Kat Karşılığı
      if (allText.includes('kat_karsiligi') || allText.includes('kat karşılığı') || allText.includes('müteahhit') || allText.includes('insaat') || allText.includes('inşaat')) {
        katKarsiligi++;
      }
      // 2. Arsa & Arazi (Silivri, Dikili, Tapu, vb.)
      else if (allText.includes('arsa') || allText.includes('dikili') || allText.includes('silivri') || allText.includes('tapu') || allText.includes('parsel') || allText.includes('tarla') || allText.includes('arazi')) {
        arsa++;
      }
      // 3. Kiralık & Satılık Konut / Ticari
      else if (allText.includes('kiralık') || allText.includes('kiralik') || allText.includes('satılık') || allText.includes('satilik') || allText.includes('daire') || allText.includes('konut') || allText.includes('villa') || allText.includes('dükkan') || allText.includes('dukkan')) {
        kiralikSatilik++;
      }
      // 4. Müşteri Notları & Teklifler
      else if (d.doc_type === 'whatsapp' || tags.includes('whatsapp') || allText.includes('teklif') || allText.includes('pazarlık') || allText.includes('görüşme') || allText.includes('not') || name.startsWith('wa_')) {
        musteriNotlari++;
      }
      // 5. Sertifikalar & Yetki Belgeleri
      else if (tags.includes('sertifika') || allText.includes('sertifika') || allText.includes('certificate') || allText.includes('yetki') || allText.includes('hackerrank') || allText.includes('freecodecamp')) {
        sertifikalar++;
      }
      // 6. Ticari Sözleşmeler & Prosedürler
      else if (allText.includes('procedure') || allText.includes('draft') || allText.includes('sozlesme') || allText.includes('sözleşme') || allText.includes('minerals') || allText.includes('commercial')) {
        ticariSozlesme++;
      }
      else {
        diger++;
      }
    });

    const total = documents.length || 1;
    const items = [
      {
        key: 'arsa',
        label: 'Arsa & Arazi Portföyü',
        desc: 'Tapu kayıtları, ada/parsel ve imar durumu',
        count: arsa,
        color: '#f97316', // Orange
        lightBg: 'bg-orange-50',
        textColor: 'text-orange-700',
        percent: Math.round((arsa / total) * 100),
      },
      {
        key: 'katKarsiligi',
        label: 'Kat Karşılığı & Projeler',
        desc: 'İnşaat sözleşmeleri ve paylaşım şartları',
        count: katKarsiligi,
        color: '#8b5cf6', // Violet
        lightBg: 'bg-violet-50',
        textColor: 'text-violet-700',
        percent: Math.round((katKarsiligi / total) * 100),
      },
      {
        key: 'kiralikSatilik',
        label: 'Satılık & Kiralık Portföy',
        desc: 'Daire, dükkan ve konut ilan/kayıtları',
        count: kiralikSatilik,
        color: '#06b6d4', // Cyan
        lightBg: 'bg-cyan-50',
        textColor: 'text-cyan-700',
        percent: Math.round((kiralikSatilik / total) * 100),
      },
      {
        key: 'musteriNotlari',
        label: 'Müşteri Notları & Teklifler',
        desc: 'WhatsApp pazarlıkları ve görüşme özetleri',
        count: musteriNotlari,
        color: '#ec4899', // Pink
        lightBg: 'bg-pink-50',
        textColor: 'text-pink-700',
        percent: Math.round((musteriNotlari / total) * 100),
      },
      {
        key: 'sertifikalar',
        label: 'Sertifikalar & Yetki Evrakı',
        desc: 'Mesleki ve teknik sertifika dökümleri',
        count: sertifikalar,
        color: '#10b981', // Emerald
        lightBg: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        percent: Math.round((sertifikalar / total) * 100),
      },
      {
        key: 'ticariSozlesme',
        label: 'Ticari Sözleşmeler & Prosedür',
        desc: 'Şirket ve tedarik akreditif evrakları',
        count: ticariSozlesme,
        color: '#3b82f6', // Blue
        lightBg: 'bg-blue-50',
        textColor: 'text-blue-700',
        percent: Math.round((ticariSozlesme / total) * 100),
      },
      {
        key: 'diger',
        label: 'Genel Belgeler & Diğer',
        desc: 'Kategorize edilmemiş genel evraklar',
        count: diger,
        color: '#64748b', // Slate
        lightBg: 'bg-slate-50',
        textColor: 'text-slate-700',
        percent: Math.round((diger / total) * 100),
      },
    ].filter(i => i.count > 0);

    const dominant = [...items].sort((a, b) => b.count - a.count)[0] || null;
    return { items, dominant, total: documents.length };
  }, [documents]);

  // ── ORGANIZATION SHARE BREAKDOWN ──────────────────────────────────────────
  const orgBreakdown = useMemo(() => {
    const total = documents.length || 1;
    return organizations.map(org => {
      const count = org.document_count || 0;
      const isUnassigned = org.id === '__unassigned__';
      return {
        id: org.id,
        name: org.name || (isUnassigned ? 'Genel / Klasörsüzler' : 'İsimsiz Portföy'),
        color: org.color || (isUnassigned ? '#64748b' : '#6366f1'),
        count: count,
        percent: Math.round((count / total) * 100),
        foldersCount: (org.folders || []).length,
        isSystem: org.is_system || isUnassigned,
      };
    }).sort((a, b) => b.count - a.count);
  }, [organizations, documents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchPrompt.trim()) return;
    onAskAi?.(searchPrompt.trim());
  };

  const samplePrompts = [
    {
      title: 'Silivri Arsa & Kat Karşılığı',
      desc: 'Nuran Hanım portföyündeki Silivri arsa tapusu ve kat karşılığı şartları neler?',
      tag: 'Nuran Hanım',
      color: '#f97316',
    },
    {
      title: 'Bakır & Metal Tedariği',
      desc: '1000mt x 12 bakır veya ticari akreditif şartları hangi sözleşmelerde geçiyor?',
      tag: 'Ticari Sözleşmeler',
      color: '#3b82f6',
    },
    {
      title: 'Sertifika & Yetkinlikler',
      desc: 'Ahmed Patel hangi teknik, web tasarım ve versiyon kontrolü sertifikalarına sahip?',
      tag: 'Ahmed Patel',
      color: '#6366f1',
    },
    {
      title: 'Dikili Arsa Portföyü',
      desc: 'İzmir Dikili 35-65 portföyüne ait görseller ve ada/parsel tapu detayları',
      tag: 'Gayrimenkul',
      color: '#10b981',
    },
  ];

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2.5 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Depo Yöneticisi · Akıllı Emlak & Portföy Arşivi</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Depo Kontrol Merkezi 🏛️
                </h1>
                <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-xl">
                  Arsa, kat karşılığı, ticari sözleşmeler ve WhatsApp notlarınız depolandı, analiz edildi ve sorgulanmaya hazır.
                </p>
              </div>

              {/* Quick Actions in Hero */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  onClick={() => onNavigate?.('upload')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Dosya Yükle</span>
                </button>
                <button
                  onClick={() => onOpenNoteModal?.()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>+ Metin / Not Ekle</span>
                </button>
                <button
                  onClick={() => onNavigate?.('organizations')}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Portföy Gezgini</span>
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
                  placeholder="Depo Yöneticisine sorun... (Örn: Silivri arsa kat karşılığı şartları ve son müşteri teklifi nedir?)"
                  className="w-full bg-white/10 hover:bg-white/[0.14] focus:bg-white/15 border border-white/20 focus:border-indigo-400 rounded-2xl py-3.5 pl-12 pr-28 text-xs lg:text-sm text-white placeholder:text-slate-400 focus:outline-none transition-all shadow-inner backdrop-blur-md"
                />
                <button
                  type="submit"
                  disabled={!searchPrompt.trim()}
                  className="absolute right-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sor</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. KPI STATS CARDS
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate?.('organizations')}
            className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kurumlar / Portföyler</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{stats.organizations}</span>
              <span className="text-xs text-slate-500 font-medium">aktif portföy</span>
            </div>
            <div className="mt-2 text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              <span>Gezginde Görüntüle</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onNavigate?.('organizations')}
            className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FolderOpen className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Raflar & Klasörler</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{totalFoldersCount}</span>
              <span className="text-xs text-slate-500 font-medium">düzenli klasör</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <span>Portföyleri İncele</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onNavigate?.('documents')}
            className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">İndekslenmiş Belgeler</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{stats.documents}</span>
              <span className="text-xs text-slate-500 font-medium">toplam dosya</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <span>Doküman Okuyucu</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onNavigate?.('inspector')}
            className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-violet-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-violet-600 transition-colors" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vektör Hafızası</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{stats.vectors}</span>
              <span className="text-xs text-slate-500 font-medium">chunk indeksi</span>
            </div>
            <div className="mt-2 text-[11px] text-violet-600 font-medium flex items-center gap-1">
              <span>Chunk Inspector</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. CLEAN & IMPACTFUL CHARTS (PORTFÖY & GAYRİMENKUL DAĞILIMI)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Chart 1: Minimalist Donut Chart - Real Estate Categories */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Portföy & Gayrimenkul Dağılımı</h2>
                    <p className="text-[11px] text-slate-400">Arsa, kat karşılığı, ticari evrak ve not segmentasyonu</p>
                  </div>
                </div>

                {/* Dominant Highlight Badge */}
                {categoryBreakdown.dominant && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-800 text-xs font-bold shadow-2xs">
                    <span>🏆 En Çok:</span>
                    <span className="font-extrabold">{categoryBreakdown.dominant.label}</span>
                    <span className="text-orange-600 font-mono font-black">(%{categoryBreakdown.dominant.percent})</span>
                  </div>
                )}
              </div>

              {/* Chart Visual & Legend Container */}
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
                          : 'Toplam Belge'}
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
                            {item.count} adet
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
            </div>

            {/* Bottom Insight Pill */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Arsa, kat karşılığı ve tüm tapular AI hafızasında</span>
              </span>
              <button
                onClick={() => onNavigate?.('documents')}
                className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Dokümanları Listele</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Chart 2: Portfolios / Organizations Share (Horizontal Bars) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Portföy Hacim Dağılımı</h2>
                    <p className="text-[11px] text-slate-400">Müşteri portföylerindeki belge yoğunluğu</p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate?.('organizations')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Gezginde Aç</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Horizontal Bar Chart List */}
              <div className="mt-4 space-y-3">
                {orgBreakdown.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => onSelectOrg?.(org.id)}
                    className="group p-2.5 rounded-xl hover:bg-slate-50/80 transition-all cursor-pointer border border-transparent hover:border-slate-200/80"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: org.color }}
                        />
                        <span className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {org.name}
                        </span>
                        {org.foldersCount > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({org.foldersCount} klasör)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold text-slate-900 font-mono text-xs">
                          {org.count} doküman
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          %{org.percent}
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 group-hover:opacity-90"
                        style={{
                          width: `${Math.max(org.percent, 4)}%`,
                          backgroundColor: org.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Status Line */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-violet-500" />
                <span>Toplam {stats.vectors} RAG parçası (Chunks) hazır</span>
              </span>
              <button
                onClick={() => onNavigate?.('inspector')}
                className="font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Vektörleri İncele</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. AI QUICK PROMPT SUGGESTIONS (SMART CHIPS)
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Hızlı Yapay Zeka Soruları</h2>
                <p className="text-[11px] text-slate-500">Mevcut portföy ve belgelerinize göre hazırlanmış tek tıkla sorulabilecek sorular</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('upload')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Sohbete Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {samplePrompts.map((p, idx) => (
              <div
                key={idx}
                onClick={() => onAskAi?.(p.desc)}
                className="group p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.tag}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-indigo-600 font-semibold">
                  <span>Yapay Zekaya Sor</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. ORGANIZATIONS / CLIENTS SHOWCASE
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Kurumlar ve Portföyleri</h2>
            </div>
            <button
              onClick={() => onNavigate?.('organizations')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Tümünü Gör</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {organizations.filter(o => !o.is_system).map(org => {
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
                            <p className="text-[10px] text-slate-400">Özel müşteri portföyü</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {orgDocCount} doküman
                      </span>
                    </div>

                    {/* Folder Pills in Card */}
                    {orgFolders.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Klasörler</p>
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
                      <p className="text-[10px] text-slate-400 mt-2 italic">Henüz klasör oluşturulmadı</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                    <span>Dosyaları Gezginle Aç</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            6. RECENT DOCUMENTS & QUICK WHATSAPP INTAKE
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Recent Documents Table (2 columns wide) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">Son Eklenen Belgeler</h2>
              </div>
              <button
                onClick={() => onNavigate?.('documents')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Tüm Dokümanlar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Henüz doküman yüklenmedi.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.slice(0, 6).map((doc) => {
                  const isPdf = doc.name?.toLowerCase().endsWith('.pdf');
                  const isImg = /\.(png|jpg|jpeg|webp|bmp|gif)$/i.test(doc.name);
                  const isWhatsApp = doc.doc_type === 'whatsapp' || doc.name?.toLowerCase().includes('whatsapp');

                  return (
                    <div
                      key={doc.name}
                      onClick={() => onViewDocument ? onViewDocument(doc.name) : onNavigate?.('documents')}
                      className="group flex items-center justify-between py-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isWhatsApp
                            ? 'bg-emerald-50 text-emerald-600'
                            : isImg
                            ? 'bg-amber-50 text-amber-600'
                            : isPdf
                            ? 'bg-red-50 text-red-600'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {isWhatsApp ? <MessageSquare className="w-4 h-4" /> : isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
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
                          {doc.chunk_count || 0} chunk
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Quick Note & WhatsApp Intake Card */}
          <div className="space-y-4">
            <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-xs">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold">Hızlı Not & WhatsApp Girişi</h3>
                <p className="text-xs text-emerald-100 mt-1.5 leading-relaxed">
                  Danışman mesajlarını, telefon görüşmelerini veya fiyat güncellemelerini ekleyin; Depo Yöneticisi doğru rafa yerleştirsin.
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => onOpenNoteModal?.()}
                  className="w-full py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Metin / Not Ekle</span>
                </button>
                <button
                  onClick={() => onNavigate?.('upload')}
                  className="w-full py-2 bg-emerald-700/60 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>WhatsApp Webhook Testi</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Warehouse Quick Summary Chip */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2.5 mb-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">Depo Durumu</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tüm veritabanı yerel ortamda korunmaktadır. OpenAI embedding motoru ve cosine benzerlik araması devrededir.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
