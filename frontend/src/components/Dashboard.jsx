import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, Folder, FileText, Sparkles, Plus,
  ArrowRight, Search, Clock, Zap, Check, MessageSquare, ArrowUpRight,
  TrendingUp, Layers, ExternalLink, Image as ImageIcon, Send, Database,
  FolderOpen, ChevronRight, CheckCircle2, ShieldCheck, Cpu
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
  const totalFoldersCount = React.useMemo(() => {
    const set = new Set();
    organizations.forEach(o => {
      (o.folders || []).forEach(f => set.add(`${o.id}_${f}`));
    });
    return set.size;
  }, [organizations]);

  // Total WhatsApp notes count
  const whatsappCount = React.useMemo(() => {
    return documents.filter(d => d.doc_type === 'whatsapp' || d.tags?.includes('whatsapp') || d.name?.toLowerCase().includes('whatsapp')).length;
  }, [documents]);

  // Image / OCR count
  const imageCount = React.useMemo(() => {
    return documents.filter(d => /\.(png|jpg|jpeg|webp|bmp|gif)$/i.test(d.name)).length;
  }, [documents]);

  // PDF count
  const pdfCount = React.useMemo(() => {
    return documents.filter(d => d.name?.toLowerCase().endsWith('.pdf')).length;
  }, [documents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchPrompt.trim()) return;
    onAskAi?.(searchPrompt.trim());
  };

  // Curated AI suggested prompts based on actual database documents
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

  return (
    <div className="h-full overflow-y-auto bg-slate-50 custom-scrollbar p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-7">

        {/* ─────────────────────────────────────────────────────────────
            1. HERO / COMMAND CENTER HEADER
        ───────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-7 lg:p-9 shadow-xl border border-slate-800">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2.5 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Yapay Zeka Destekli Belge & Portföy Hafızası</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Hoş Geldiniz 👋
                </h1>
                <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-xl">
                  Tüm müşteri portföyleriniz, tapu belgeleriniz, sözleşmeleriniz ve WhatsApp notlarınız indekslendi ve sorgulamaya hazır.
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
                  <span>Gezgin</span>
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
                  placeholder="Yapay zekaya belgeleriniz hakkında herhangi bir şey sorun... (Örn: Nuran Hanım'ın arsa portföyündeki şartlar neler?)"
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
          {/* Card 1: Organizations */}
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
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kurumlar / Müşteriler</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{stats.organizations}</span>
              <span className="text-xs text-slate-500 font-medium">aktif kurum</span>
            </div>
            <div className="mt-2 text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              <span>Gezginde Görüntüle</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 2: Folders */}
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
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Portföyler & Klasörler</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{totalFoldersCount}</span>
              <span className="text-xs text-slate-500 font-medium">düzenli klasör</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <span>Portföyleri İncele</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 3: Documents */}
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

          {/* Card 4: Vectors */}
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
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vektör Havuzu (RAG)</p>
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
            3. AI QUICK PROMPT SUGGESTIONS (SMART CHIPS)
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
            4. ORGANIZATIONS / CLIENTS SHOWCASE
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
            5. RECENT DOCUMENTS & SYSTEM FORMAT BREAKDOWN
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

          {/* Right: Storage & Format Distribution Widget (1 column) */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Belge Formatları</span>
              </h2>

              <div className="space-y-3">
                {/* PDF */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      PDF Dokümanları
                    </span>
                    <span className="font-bold text-slate-800">{pdfCount}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${stats.documents > 0 ? (pdfCount / stats.documents) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Images & OCR */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Görsel & Tapu / OCR
                    </span>
                    <span className="font-bold text-slate-800">{imageCount}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${stats.documents > 0 ? (imageCount / stats.documents) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* WhatsApp & Notes */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      WhatsApp & Notlar
                    </span>
                    <span className="font-bold text-slate-800">{whatsappCount}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${stats.documents > 0 ? (whatsappCount / stats.documents) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick WhatsApp / Quick Note Promo Card */}
            <div className="rounded-3xl p-5 bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-xs">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold">WhatsApp Sohbetlerini İndeksleyin</h3>
                <p className="text-[11px] text-emerald-100 mt-1 leading-relaxed">
                  Müşteriyle anlaştığınız şartları veya WhatsApp konuşmasını yapıştırın; yapay zeka RAG hafızasına eklesin.
                </p>
              </div>
              <button
                onClick={() => onOpenNoteModal?.()}
                className="mt-4 w-full py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                + Not Ekle
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
