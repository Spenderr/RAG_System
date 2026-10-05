import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Organizations from './components/Organizations';
import Tour from './components/Tour';

const VALID_VIEWS = ['dashboard', 'upload', 'organizations', 'team_portfolios', 'personal_portfolios'];

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showTour, setShowTour] = useState(false);

  // Cross-view state for direct deep linking
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedDocName, setSelectedDocName] = useState(null);
  const [openNoteOnMount, setOpenNoteOnMount] = useState(false);
  const [chatPrompt, setChatPrompt] = useState('');
  const [uploadMode, setUploadMode] = useState('files');

  // Sanitize activeView if it somehow receives a removed view (documents / inspector)
  const currentView = VALID_VIEWS.includes(activeView) ? activeView : 'dashboard';

  // Show tour on first visit
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mainchunk_tour_seen');
    if (!hasSeenTour) {
      setShowTour(true);
    }
  }, []);

  const handleCloseTour = () => {
    setShowTour(false);
    localStorage.setItem('mainchunk_tour_seen', 'true');
  };

  const handleViewChange = (view) => {
    if (view === 'documents' || view === 'inspector') {
      setActiveView('team_portfolios');
      return;
    }
    if (!VALID_VIEWS.includes(view)) {
      setActiveView('dashboard');
      return;
    }
    setActiveView(view);
  };

  const handleSelectOrgFromDashboard = (orgId) => {
    setSelectedOrgId(orgId);
    setSelectedDocName(null);
    setActiveView('team_portfolios');
  };

  const handleAskAiFromDashboard = (prompt) => {
    setChatPrompt(prompt);
    setActiveView('upload');
  };

  const handleOpenNoteModalFromDashboard = () => {
    setUploadMode('text');
    setActiveView('upload');
  };

  const handleViewDocument = (docParam, page) => {
    const docName = typeof docParam === 'object' && docParam !== null ? docParam.docName : docParam;
    setSelectedDocName(docName);
    setActiveView('team_portfolios');
  };

  const isOrgsActive = ['organizations', 'team_portfolios', 'personal_portfolios'].includes(currentView);
  const initialScope = currentView === 'personal_portfolios' ? 'personal' : (currentView === 'team_portfolios' ? 'team' : 'all');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar
        activeView={currentView}
        setActiveView={handleViewChange}
        onShowTour={() => setShowTour(true)}
      />
      <main className="flex-1 overflow-hidden bg-slate-50 relative">
        <div className={`w-full h-full ${currentView === 'dashboard' ? 'block page-transition' : 'hidden'}`}>
          <Dashboard
            activeView={currentView}
            onNavigate={handleViewChange}
            onSelectOrg={handleSelectOrgFromDashboard}
            onAskAi={handleAskAiFromDashboard}
            onOpenNoteModal={handleOpenNoteModalFromDashboard}
            onViewDocument={handleViewDocument}
          />
        </div>
        <div className={`w-full h-full ${currentView === 'upload' ? 'block page-transition' : 'hidden'}`}>
          <Upload
            onViewDocument={handleViewDocument}
            initialChatPrompt={chatPrompt}
            onClearInitialPrompt={() => setChatPrompt('')}
            initialMode={uploadMode}
            onNavigateToOrgs={(orgId) => {
              if (orgId && orgId !== '__unassigned__') setSelectedOrgId(orgId);
              setActiveView('team_portfolios');
            }}
          />
        </div>
        <div className={`w-full h-full ${isOrgsActive ? 'block page-transition' : 'hidden'}`}>
          <Organizations
            activeView={currentView}
            initialScope={initialScope}
            initialDocName={selectedDocName}
            initialOrgId={selectedOrgId}
            openNoteOnMount={openNoteOnMount}
            onClearInitialOrgId={() => setSelectedOrgId(null)}
            onClearInitialDocName={() => setSelectedDocName(null)}
          />
        </div>
      </main>

      {showTour && <Tour onClose={handleCloseTour} />}
    </div>
  );
}

export default App;
