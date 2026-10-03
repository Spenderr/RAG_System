import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Documents from './components/Documents';
import Inspector from './components/Inspector';
import Organizations from './components/Organizations';
import Tour from './components/Tour';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showTour, setShowTour] = useState(false);
  const [inspectorDocName, setInspectorDocName] = useState(null);
  const [inspectorTraceInfo, setInspectorTraceInfo] = useState(null);

  // Cross-view state for direct deep linking
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [openNoteOnMount, setOpenNoteOnMount] = useState(false);
  const [chatPrompt, setChatPrompt] = useState('');
  const [uploadMode, setUploadMode] = useState('files');

  // Document reader modal state (shared across views)
  const [readerDoc, setReaderDoc] = useState(null);

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
    if (view === activeView) return;
    setActiveView(view);
  };

  const handleSelectOrgFromDashboard = (orgId) => {
    setSelectedOrgId(orgId);
    setActiveView('organizations');
  };

  const handleAskAiFromDashboard = (prompt) => {
    setChatPrompt(prompt);
    setActiveView('upload');
  };

  const handleOpenNoteModalFromDashboard = () => {
    setUploadMode('text');
    setActiveView('upload');
  };

  const handleGoToInspectorForDoc = (docName) => {
    setInspectorDocName(docName);
    setInspectorTraceInfo(null);
    setActiveView('inspector');
  };

  const handleTraceGrounding = ({ docName, snippet, page, chunkIndex }) => {
    setInspectorDocName(docName);
    setInspectorTraceInfo({
      docName,
      snippet,
      page,
      chunkIndex,
      timestamp: Date.now(),
    });
    setActiveView('inspector');
  };

  const handleViewDocument = (docParam, page) => {
    setActiveView('documents');
    if (typeof docParam === 'object' && docParam !== null) {
      setReaderDoc(docParam);
    } else if (page) {
      setReaderDoc({ docName: docParam, page });
    } else {
      setReaderDoc(docParam);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar
        activeView={activeView}
        setActiveView={handleViewChange}
        onShowTour={() => setShowTour(true)}
      />
      <main className="flex-1 overflow-hidden bg-slate-50 relative">
        <div className={`w-full h-full ${activeView === 'dashboard' ? 'block page-transition' : 'hidden'}`}>
          <Dashboard
            onNavigate={handleViewChange}
            onSelectOrg={handleSelectOrgFromDashboard}
            onAskAi={handleAskAiFromDashboard}
            onOpenNoteModal={handleOpenNoteModalFromDashboard}
            onViewDocument={handleViewDocument}
          />
        </div>
        <div className={`w-full h-full ${activeView === 'upload' ? 'block page-transition' : 'hidden'}`}>
          <Upload
            onViewDocument={handleViewDocument}
            onGoToInspector={handleGoToInspectorForDoc}
            onTraceGrounding={handleTraceGrounding}
            initialChatPrompt={chatPrompt}
            onClearInitialPrompt={() => setChatPrompt('')}
            initialMode={uploadMode}
            onNavigateToOrgs={(orgId) => {
              if (orgId && orgId !== '__unassigned__') setSelectedOrgId(orgId);
              setActiveView('organizations');
            }}
          />
        </div>
        <div className={`w-full h-full ${activeView === 'organizations' ? 'block page-transition' : 'hidden'}`}>
          <Organizations
            onViewDocument={handleViewDocument}
            onGoToInspector={handleGoToInspectorForDoc}
            initialOrgId={selectedOrgId}
            openNoteOnMount={openNoteOnMount}
            onClearInitialOrgId={() => setSelectedOrgId(null)}
          />
        </div>
        <div className={`w-full h-full ${activeView === 'documents' ? 'block page-transition' : 'hidden'}`}>
          <Documents
            onSelectDocForInspector={handleGoToInspectorForDoc}
            openReaderDoc={readerDoc}
            onReaderDocHandled={() => setReaderDoc(null)}
          />
        </div>
        <div className={`w-full h-full ${activeView === 'inspector' ? 'block page-transition' : 'hidden'}`}>
          <Inspector
            initialSelectedDocName={inspectorDocName}
            traceInfo={inspectorTraceInfo}
          />
        </div>
      </main>

      {showTour && <Tour onClose={handleCloseTour} />}
    </div>
  );
}

export default App;
