import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Upload from './components/Upload';
import Documents from './components/Documents';
import Inspector from './components/Inspector';
import Organizations from './components/Organizations';
import Tour from './components/Tour';

function App() {
  const [activeView, setActiveView] = useState('upload');
  const [showTour, setShowTour] = useState(false);
  const [inspectorDocName, setInspectorDocName] = useState(null);
  const [inspectorTraceInfo, setInspectorTraceInfo] = useState(null);

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

  const handleViewDocument = (docName) => {
    setActiveView('documents');
    setReaderDoc(docName);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar
        activeView={activeView}
        setActiveView={handleViewChange}
        onShowTour={() => setShowTour(true)}
      />
      <main className="flex-1 overflow-hidden bg-slate-50 relative">
        <div className={`w-full h-full ${activeView === 'upload' ? 'block page-transition' : 'hidden'}`}>
          <Upload
            onViewDocument={handleViewDocument}
            onGoToInspector={handleGoToInspectorForDoc}
            onTraceGrounding={handleTraceGrounding}
          />
        </div>
        <div className={`w-full h-full ${activeView === 'organizations' ? 'block page-transition' : 'hidden'}`}>
          <Organizations
            onViewDocument={handleViewDocument}
            onGoToInspector={handleGoToInspectorForDoc}
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
