import React, { useEffect, useState } from 'react';
import { Upload, Database, Zap, Lightbulb, Files, Building2, Layers, LayoutDashboard, Globe, Users, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ activeView, setActiveView, onShowTour }) => {
  const { language, setLanguage, t } = useLanguage();
  const [stats, setStats] = useState({ documents: 0, vectors: 0, organizations: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/stats')
        .then((res) => res.ok ? res.json() : { total_documents: 0, total_vectors: 0, total_organizations: 0 })
        .then((data) => setStats({
          documents: data.total_documents || 0,
          vectors: data.total_vectors || 0,
          organizations: data.total_organizations || 0,
        }))
        .catch((err) => console.error('Error fetching stats:', err));
    };

    fetchStats();
    window.addEventListener('mainchunk_docs_updated', fetchStats);
    window.addEventListener('focus', fetchStats);
    return () => {
      window.removeEventListener('mainchunk_docs_updated', fetchStats);
      window.removeEventListener('focus', fetchStats);
    };
  }, [activeView]);

  const navItems = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'upload', label: t('navUpload'), icon: Upload },
    { id: 'team_portfolios', label: t('navTeamPortfolios'), icon: Users },
    { id: 'personal_portfolios', label: t('navPersonalPortfolios'), icon: User },
  ];

  return (
    <div
      className={`bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none shadow-xs transition-all duration-300 ease-out overflow-hidden z-30 ${
        isHovered ? 'w-64 shadow-lg' : 'w-[68px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between h-[68px] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 shrink-0 mx-auto">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div
            className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isHovered ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 pointer-events-none'
            }`}
          >
            <span className="text-sm font-bold text-slate-900 tracking-tight block leading-none">MainChunk</span>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">{t('appSubtitle')}</span>
          </div>
        </div>

        {isHovered && (
          <button
            onClick={onShowTour}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 shrink-0"
            title={t('pipelineTour')}
          >
            <Lightbulb className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 space-y-1.5 mt-4">
        <div
          className={`px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0 h-0 p-0 overflow-hidden'
          }`}
        >
          {t('menu')}
        </div>

        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const isTeam = item.id === 'team_portfolios';
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={!isHovered ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-2xl transition-all duration-200 text-left cursor-pointer ${
                isHovered ? 'px-3.5 py-2.5' : 'p-2.5 justify-center'
              } ${
                isActive
                  ? isTeam
                    ? 'bg-orange-500 text-white font-semibold shadow-md shadow-orange-500/25'
                    : 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25'
                  : isTeam
                  ? 'text-slate-600 hover:text-orange-600 hover:bg-orange-50/80 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : isTeam
                    ? 'text-orange-500'
                    : 'text-slate-400'
                }`}
              />
              <span
                className={`text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isHovered ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 hidden'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Language Section in Hover Menu */}
      <div className="px-2.5 py-2 border-t border-slate-100 shrink-0">
        {isHovered ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Language</span>
            </div>
            <div className="flex items-center bg-white rounded-lg px-2 py-0.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-600 font-mono">EN</span>
            </div>
          </div>
        ) : (
          <div
            className="w-10 h-8 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center mx-auto text-[10px] font-bold text-slate-600"
            title="English"
          >
            EN
          </div>
        )}
      </div>

      {/* Bottom Section: Compact Indicator vs Full System Stats */}
      <div className="p-3 shrink-0 border-t border-slate-100">
        {isHovered ? (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('systemStats')}
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">{t('statDocuments')}</span>
                <span className="text-slate-900 font-bold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {stats.documents}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">{t('statOrganizations')}</span>
                <span className="text-slate-900 font-bold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {stats.organizations}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">{t('statVectors')}</span>
                <span className="text-indigo-600 font-bold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {stats.vectors}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={onShowTour}
            className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
            title={`${t('appName')} - ${t('activeStatus')}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
