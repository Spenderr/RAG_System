import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Brand & General
    appName: 'MainChunk',
    appSubtitle: 'Document Butler',
    language: 'Language',
    english: 'English',
    turkish: 'Türkçe',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    search: 'Search',
    all: 'All',
    none: 'None',
    actions: 'Actions',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    saved: 'Saved successfully',
    deleted: 'Deleted successfully',
    download: 'Download',
    preview: 'Preview',
    inspect: 'Inspect',
    move: 'Move',
    assign: 'Assign',
    refresh: 'Refresh',
    copy: 'Copy',
    copied: 'Copied!',
    clear: 'Clear',

    // Sidebar
    navDashboard: 'Dashboard',
    navUpload: 'Upload & AI Chat',
    navOrganizations: 'Organizations & Portfolios',
    navDocuments: 'Documents',
    navInspector: 'Chunk Inspector',
    systemStats: 'System Stats',
    statDocuments: 'Documents',
    statOrganizations: 'Organizations',
    statVectors: 'Vectors',
    pipelineTour: 'Pipeline Tour',
    activeStatus: 'Active',
    menu: 'Menu',

    // Dashboard
    dashTitle: 'Document Butler Dashboard',
    dashSubtitle: 'Real-time AI knowledge repository and organization analytics',
    dashSearchPlaceholder: 'Ask AI anything about your real estate, contracts or documents...',
    dashAskAi: 'Ask AI',
    dashNewNote: 'Quick Note / Record',
    dashUploadDoc: 'Upload Documents',
    dashManageOrgs: 'Manage Portfolios',
    dashTotalDocs: 'Total Documents',
    dashTotalDocsDesc: 'All processed and vectorized files',
    dashIndexedChunks: 'Indexed Chunks',
    dashIndexedChunksDesc: 'Semantic vectors in Chroma DB',
    dashPortfolios: 'Portfolios / Orgs',
    dashPortfoliosDesc: 'Custom workspace categories',
    dashSubFolders: 'Sub-folders',
    dashSubFoldersDesc: 'Nested portfolio groups',

    // Real Estate Chart
    chartTitle: 'Real Estate & Portfolio Breakdown',
    chartSubtitle: 'Automated AI classification across all documents and notes',
    chartTotalRecords: 'Total Records',
    chartAllCategories: 'All Categories',
    chartCategoryHint: 'Hover or click on categories to highlight distribution',
    chartDocDistribution: 'Document Distribution',

    catArsa: 'Land & Field Portfolio',
    catArsaDesc: 'Title deed records, parcel lots, zoning status and land plots',
    catKatKarsiligi: 'Floor Equivalent & Construction',
    catKatKarsiligiDesc: 'Contractor agreements, building shares and project terms',
    catKiralikSatilik: 'For Sale & Rent Portfolio',
    catKiralikSatilikDesc: 'Apartments, shops, residential listings and commercial units',
    catMusteriNotlari: 'Customer Notes & WhatsApp',
    catMusteriNotlariDesc: 'Mobile messages, bargaining notes, meeting logs and inquiries',
    catSertifikalar: 'Certificates & Credentials',
    catSertifikalarDesc: 'Professional certificates, web & tech skills, accreditations',
    catTicariSozlesme: 'Commercial Contracts & Drafts',
    catTicariSozlesmeDesc: 'Business agreements, trade procedures and drafts',
    catDiger: 'General / Other Documents',
    catDigerDesc: 'Unclassified files, photos and misc attachments',

    // Recent Documents
    recentDocsTitle: 'Recent Documents & Records',
    recentDocsDesc: 'Latest ingested files, transcribed notes and scanned deeds',
    viewAllDocs: 'View All Documents',
    noDocsYet: 'No documents uploaded yet',
    noDocsYetDesc: 'Upload a file or create a WhatsApp note to get started.',

    // Active Organizations Widget
    activePortfoliosTitle: 'Active Portfolios & Clients',
    activePortfoliosDesc: 'Organized folders and customer files',
    manageAllOrgs: 'Manage All Portfolios',
    unassignedSystemOrg: 'General / Unassigned',
    unassignedSystemDesc: 'Documents not yet assigned to any folder or client',
    docsCount: '{count} docs',
    docCountSingle: '1 doc',

    // Upload & Ingestion
    tabFileUpload: 'File Upload',
    tabWhatsAppNote: 'WhatsApp / Quick Note',
    tabSmartBatch: 'Smart AI Auto-Organize',
    dropZoneTitle: 'Drag and drop your files here',
    dropZoneSubtitle: 'or click to browse from computer (PDF, PNG, JPG, TXT)',
    uploadingFiles: 'Uploading & processing...',
    processingPipeline: 'Ingestion Pipeline',
    stepUpload: 'Upload Received',
    stepCleaning: 'Cleaning & OCR Vision',
    stepChunking: 'Semantic Chunking',
    stepVectorizing: 'Vector Embedding',
    stepOrganizing: 'AI Organization Matching',
    stepDone: 'Completed',
    aiConfidence: 'AI Confidence',
    assignedToOrg: 'Assigned to {org}',
    suggestedFolder: 'Folder: {folder}',

    // WhatsApp / Note Editor
    noteModalTitle: 'Create Quick Note / WhatsApp Record',
    noteTitleLabel: 'Note Title / Reference',
    noteTitlePlaceholder: 'e.g. Silivri Land Offer - Client Call Note',
    noteContentLabel: 'Content / Message Log',
    noteContentPlaceholder: 'Type or paste WhatsApp message, phone conversation notes, or client offer details...',
    noteOrgLabel: 'Target Portfolio / Client',
    noteFolderLabel: 'Sub-Folder (Optional)',
    noteFolderPlaceholder: 'e.g. Silivri Portfolio, Inquiries...',
    noteAiFormatLabel: 'Auto-format and structure with AI',
    saveNoteBtn: 'Save & Vectorize Note',
    savingNote: 'Saving & Indexing...',
    editNoteTitle: 'Edit Document / Note Content',
    editNoteTip: 'Changes are automatically re-chunked and re-indexed into vector search.',
    editNoteSave: 'Save & Re-index',

    // AI Chat
    chatHeaderTitle: 'Butler AI Search & Chat',
    chatHeaderSubtitle: 'Grounded question answering with exact source citations',
    chatPlaceholder: 'Ask a question about your portfolios, parcels, prices or notes...',
    sendBtn: 'Send',
    sourcesUsed: 'Sources & Citations ({count})',
    groundingConfidence: 'Grounding Match',
    inspectSource: 'Inspect Chunk',
    clearChat: 'Clear History',

    // Organizations Page
    orgsHeaderTitle: 'Portfolios & Organizations',
    newPortfolioBtn: 'New Portfolio',
    searchOrgDocs: 'Search files in portfolio...',
    allFoldersTab: 'All Files',
    unfoldedTab: 'Unassigned / Folderless',
    createFolderBtn: '+ New Folder',
    folderPlaceholder: 'Folder name...',
    batchSelected: '{count} files selected',
    batchMoveFolder: 'Move to Folder',
    batchMoveOrg: 'Change Portfolio',
    batchDownload: 'Download Selected',
    batchDelete: 'Delete Selected',
    deleteDocConfirm: 'Are you sure you want to delete "{name}"?',
    deleteFolderConfirm: 'Are you sure you want to delete folder "{name}"? Its files will be kept in the general pool.',
    deleteOrgConfirm: 'Are you sure you want to delete portfolio "{name}"? All its documents will be moved to General / Unassigned.',
    createOrgTitle: 'Create New Portfolio',
    orgNameLabel: 'Portfolio / Client Name',
    orgDescLabel: 'Description / Context',
    orgColorLabel: 'Color Theme',
    orgFoldersLabel: 'Initial Folders (comma separated)',

    // Documents Page
    docsPageTitle: 'Document Repository',
    docsPageSubtitle: 'Search, filter, preview and manage all uploaded documents',
    filterByOrg: 'Filter by Portfolio',
    allOrgsFilter: 'All Portfolios',
    docTypeAll: 'All Types',
    docTypePdf: 'PDF Documents',
    docTypeImg: 'Images / OCR Scans',
    docTypeNote: 'WhatsApp / Notes',
    tableDocName: 'Document Name',
    tablePortfolio: 'Portfolio & Folder',
    tableType: 'Type',
    tableChunks: 'Chunks',
    tableActions: 'Actions',

    // Inspector Page
    inspectorTitle: 'Vector & Chunk Inspector',
    inspectorSubtitle: 'Deep dive into semantic chunks, token boundaries and vector distances',
    selectDocInspect: 'Select a document to inspect chunks',
    chunkCountLabel: '{count} total chunks',
    similarityScore: 'Similarity: {score}%',
    semanticSearchPlaceholder: 'Type query to test vector similarity against this document...',
    pageNumber: 'Page {page}',
    chunkIndex: 'Chunk #{index}',

    // Tour
    tourTitle: 'MainChunk Interactive Tour',
    tourStep1Title: 'Document Butler & Repository',
    tourStep1Desc: 'Upload land deeds, contractor agreements, and client notes. MainChunk processes, transcribes via Vision OCR, and embeds them into vector storage.',
    tourStep2Title: 'Portfolio Organization',
    tourStep2Desc: 'Organize files into client portfolios and sub-folders with drag & drop support and automatic AI categorization.',
    tourStep3Title: 'Instant Semantic Search & Chat',
    tourStep3Desc: 'Ask complex questions in natural language and receive grounded answers with exact source chunk citations.',
    tourGotIt: 'Got it, let’s begin!',
  },

  tr: {
    // Brand & General
    appName: 'MainChunk',
    appSubtitle: 'Belge Asistanı',
    language: 'Dil',
    english: 'English',
    turkish: 'Türkçe',
    close: 'Kapat',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    back: 'Geri',
    next: 'İleri',
    finish: 'Tamamla',
    search: 'Ara',
    all: 'Tümü',
    none: 'Hiçbiri',
    actions: 'İşlemler',
    loading: 'Yükleniyor...',
    success: 'Başarılı',
    error: 'Hata',
    saved: 'Başarıyla kaydedildi',
    deleted: 'Başarıyla silindi',
    download: 'İndir',
    preview: 'Önizleme',
    inspect: 'İncele',
    move: 'Taşı',
    assign: 'Ata',
    refresh: 'Yenile',
    copy: 'Kopyala',
    copied: 'Kopyalandı!',
    clear: 'Temizle',

    // Sidebar
    navDashboard: 'Ana Sayfa',
    navUpload: 'Yükle & AI Sohbet',
    navOrganizations: 'Kurumlar & Portföyler',
    navDocuments: 'Belgeler',
    navInspector: 'Parça İnceleyici',
    systemStats: 'Sistem İstatistikleri',
    statDocuments: 'Belgeler',
    statOrganizations: 'Kurumlar',
    statVectors: 'Vektörler',
    pipelineTour: 'Tanıtım Turu',
    activeStatus: 'Aktif',
    menu: 'Menü',

    // Dashboard
    dashTitle: 'Belge Asistanı Kontrol Paneli',
    dashSubtitle: 'Gerçek zamanlı AI bilgi havuzu ve portföy analitiği',
    dashSearchPlaceholder: 'Gayrimenkul, sözleşme ve evraklarınız hakkında AI\'ya soru sorun...',
    dashAskAi: 'AI\'ya Sor',
    dashNewNote: 'Hızlı Not / Kayıt',
    dashUploadDoc: 'Doküman Yükle',
    dashManageOrgs: 'Portföyleri Yönet',
    dashTotalDocs: 'Toplam Doküman',
    dashTotalDocsDesc: 'İşlenen ve vektörleştirilen tüm dosyalar',
    dashIndexedChunks: 'İndekslenen Parça',
    dashIndexedChunksDesc: 'Chroma DB içerisindeki semantik vektörler',
    dashPortfolios: 'Portföy / Kurum',
    dashPortfoliosDesc: 'Özel çalışma alanı kategorileri',
    dashSubFolders: 'Alt Klasör',
    dashSubFoldersDesc: 'Hiyerarşik portföy klasörleri',

    // Real Estate Chart
    chartTitle: 'Gayrimenkul & Portföy Dağılımı',
    chartSubtitle: 'Doküman ve notların otomatik AI sınıflandırması',
    chartTotalRecords: 'Toplam Kayıt',
    chartAllCategories: 'Tüm Kategoriler',
    chartCategoryHint: 'Dağılımı incelemek için kategorilerin üzerine gelin veya tıklayın',
    chartDocDistribution: 'Doküman Dağılımı',

    catArsa: 'Arsa & Arazi Portföyü',
    catArsaDesc: 'Tapu kayıtları, ada/parsel, imar durumu ve tarla kayıtları',
    catKatKarsiligi: 'Kat Karşılığı & Projeler',
    catKatKarsiligiDesc: 'Müteahhit sözleşmeleri, paylaşım oranları ve proje şartları',
    catKiralikSatilik: 'Satılık & Kiralık Portföy',
    catKiralikSatilikDesc: 'Daire, dükkan, konut ilanları ve ticari mülkler',
    catMusteriNotlari: 'Müşteri Notları & WhatsApp',
    catMusteriNotlariDesc: 'Mobil mesajlar, pazarlık notları, telefon görüşme kayıtları',
    catSertifikalar: 'Sertifikalar & Belgeler',
    catSertifikalarDesc: 'Mesleki sertifikalar, web & teknik uzmanlık belgeleri',
    catTicariSozlesme: 'Ticari Sözleşmeler & Taslaklar',
    catTicariSozlesmeDesc: 'İş anlaşmaları, ticaret prosedürleri ve protokoller',
    catDiger: 'Genel / Diğer Belgeler',
    catDigerDesc: 'Sınıflandırılmamış dosyalar, fotoğraflar ve ekler',

    // Recent Documents
    recentDocsTitle: 'Son Eklenen Belgeler & Notlar',
    recentDocsDesc: 'En son yüklenen dosyalar, ses kayıtları ve taranan tapular',
    viewAllDocs: 'Tüm Belgeleri Gör',
    noDocsYet: 'Henüz doküman yüklenmedi',
    noDocsYetDesc: 'Başlamak için dosya yükleyin veya bir WhatsApp notu oluşturun.',

    // Active Organizations Widget
    activePortfoliosTitle: 'Aktif Portföyler & Müşteriler',
    activePortfoliosDesc: 'Düzenlenmiş klasörler ve müşteri dosyaları',
    manageAllOrgs: 'Tüm Portföyleri Yönet',
    unassignedSystemOrg: 'Genel / Klasörsüzler',
    unassignedSystemDesc: 'Henüz bir klasöre atanmamış genel belgeler',
    docsCount: '{count} doküman',
    docCountSingle: '1 doküman',

    // Upload & Ingestion
    tabFileUpload: 'Dosya Yükle',
    tabWhatsAppNote: 'WhatsApp / Hızlı Not',
    tabSmartBatch: 'Akıllı AI Düzenleyici',
    dropZoneTitle: 'Dosyaları buraya sürükleyip bırakın',
    dropZoneSubtitle: 'veya bilgisayarınızdan seçin (PDF, PNG, JPG, TXT)',
    uploadingFiles: 'Yükleniyor ve işleniyor...',
    processingPipeline: 'İşleme Hattı',
    stepUpload: 'Dosya Alındı',
    stepCleaning: 'Temizleme & OCR Vision',
    stepChunking: 'Semantik Parçalama',
    stepVectorizing: 'Vektörleştirme',
    stepOrganizing: 'AI Kurum Eşleştirme',
    stepDone: 'Tamamlandı',
    aiConfidence: 'AI Güven Seviyesi',
    assignedToOrg: '{org} kurumuna atandı',
    suggestedFolder: 'Klasör: {folder}',

    // WhatsApp / Note Editor
    noteModalTitle: 'Hızlı Not / WhatsApp Kaydı Oluştur',
    noteTitleLabel: 'Not Başlığı / Referans',
    noteTitlePlaceholder: 'Örn: Silivri Arsa Teklifi - Müşteri Görüşme Notu',
    noteContentLabel: 'İçerik / Mesaj Dökümü',
    noteContentPlaceholder: 'WhatsApp mesajını, telefon notlarını veya teklif detaylarını buraya yazın veya yapıştırın...',
    noteOrgLabel: 'Hedef Portföy / Müşteri',
    noteFolderLabel: 'Alt Klasör (İsteğe Bağlı)',
    noteFolderPlaceholder: 'Örn: Silivri Portföyü, Talepler...',
    noteAiFormatLabel: 'AI ile otomatik düzenle ve yapılandır',
    saveNoteBtn: 'Notu Kaydet ve Vektörleştir',
    savingNote: 'Kaydediliyor & İndeksleniyor...',
    editNoteTitle: 'Doküman / Not İçeriğini Düzenle',
    editNoteTip: 'Yapılan değişiklikler anında yeniden parçalanır ve vektör aramaya eklenir.',
    editNoteSave: 'Kaydet ve Yeniden İndeksle',

    // AI Chat
    chatHeaderTitle: 'Asistan AI Arama & Sohbet',
    chatHeaderSubtitle: 'Doğrudan kaynak doğrulamalı soru-cevap asistanı',
    chatPlaceholder: 'Portföyleriniz, parseller, fiyatlar veya notlar hakkında soru sorun...',
    sendBtn: 'Gönder',
    sourcesUsed: 'Kullanılan Kaynaklar ({count})',
    groundingConfidence: 'Doğruluk Oranı',
    inspectSource: 'Parçayı İncele',
    clearChat: 'Geçmişi Temizle',

    // Organizations Page
    orgsHeaderTitle: 'Portföyler & Kurumlar',
    newPortfolioBtn: 'Yeni Portföy',
    searchOrgDocs: 'Portföydeki dosyalarda ara...',
    allFoldersTab: 'Tüm Dosyalar',
    unfoldedTab: 'Klasörsüz / Genel',
    createFolderBtn: '+ Yeni Klasör',
    folderPlaceholder: 'Klasör adı...',
    batchSelected: '{count} dosya seçildi',
    batchMoveFolder: 'Klasöre Taşı',
    batchMoveOrg: 'Portföyü Değiştir',
    batchDownload: 'Seçilenleri İndir',
    batchDelete: 'Seçilenleri Sil',
    deleteDocConfirm: '"{name}" adlı dokümanı silmek istediğinize emin misiniz?',
    deleteFolderConfirm: '"{name}" klasörünü silmek istediğinize emin misiniz? Dosyaları genel havuza aktarılacaktır.',
    deleteOrgConfirm: '"{name}" portföyünü silmek istediğinize emin misiniz? Tüm dokümanlar Genel / Klasörsüzler havuzuna taşınacaktır.',
    createOrgTitle: 'Yeni Portföy Oluştur',
    orgNameLabel: 'Portföy / Kurum Adı',
    orgDescLabel: 'Açıklama / Not',
    orgColorLabel: 'Renk Teması',
    orgFoldersLabel: 'Başlangıç Klasörleri (virgülle ayırın)',

    // Documents Page
    docsPageTitle: 'Doküman Havuzu',
    docsPageSubtitle: 'Yüklenen tüm belgeleri arayın, filtreleyin, önizleyin ve yönetin',
    filterByOrg: 'Portföye Göre Filtrele',
    allOrgsFilter: 'Tüm Portföyler',
    docTypeAll: 'Tüm Türler',
    docTypePdf: 'PDF Belgeleri',
    docTypeImg: 'Görseller / OCR Taramaları',
    docTypeNote: 'WhatsApp / Notlar',
    tableDocName: 'Doküman Adı',
    tablePortfolio: 'Portföy & Klasör',
    tableType: 'Tür',
    tableChunks: 'Parça Sayısı',
    tableActions: 'İşlemler',

    // Inspector Page
    inspectorTitle: 'Vektör & Parça İnceleyici',
    inspectorSubtitle: 'Semantik parçaları, token sınırlarını ve vektör mesafelerini derinlemesine inceleyin',
    selectDocInspect: 'Parçalarını incelemek için bir doküman seçin',
    chunkCountLabel: 'Toplam {count} parça',
    similarityScore: 'Benzerlik: %{score}',
    semanticSearchPlaceholder: 'Bu dokümana karşı vektör benzerliğini test etmek için sorgu yazın...',
    pageNumber: 'Sayfa {page}',
    chunkIndex: 'Parça #{index}',

    // Tour
    tourTitle: 'MainChunk Tanıtım Turu',
    tourStep1Title: 'Belge Asistanı & Bilgi Deposu',
    tourStep1Desc: 'Arsa tapuları, inşaat sözleşmeleri ve müşteri notlarını yükleyin. MainChunk işler, Vision OCR ile okur ve vektör deposuna kaydeder.',
    tourStep2Title: 'Portföy Organizasyonu',
    tourStep2Desc: 'Dosyaları müşteri portföylerine ve alt klasörlere sürükle-bırak kolaylığı ve AI önerileriyle düzenleyin.',
    tourStep3Title: 'Anında Semantik Arama & Sohbet',
    tourStep3Desc: 'Doğal dille sorular sorun ve doğrudan ilgili kaynak parçası referanslarıyla net cevaplar alın.',
    tourGotIt: 'Anladım, Başlayalım!',
  }
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, params) => key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('mainchunk_language') || 'en';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('mainchunk_language', lang);
  };

  const t = (key, params = {}) => {
    const langDict = translations[language] || translations.en;
    let str = langDict[key] || translations.en[key] || key;
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([pKey, pVal]) => {
        str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations: translations[language] || translations.en }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;

