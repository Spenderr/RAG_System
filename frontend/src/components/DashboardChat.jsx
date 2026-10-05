import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send, Sparkles, Trash2, ArrowRight, Check, Copy, ExternalLink,
  BookOpen, ChevronDown, ChevronRight, FileText, Folder, AlertTriangle,
  X, CheckCircle2, Bot, User
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from '../context/LanguageContext';

export const DashboardChat = ({ onViewDocument }) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('mainchunk_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    try {
      localStorage.setItem('mainchunk_chat_messages', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat to localStorage:', err);
    }
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      if (!res.ok) throw new Error('Chat API returned an error');

      const data = await res.json();
      setMessages((prev) => {
        let updated = prev;
        if (data.action?.status === 'completed') {
          updated = updated.map((m) =>
            m.action && m.action.status === 'pending'
              ? { ...m, action: { ...m.action, status: 'completed', resultMessage: data.action.resultMessage } }
              : m
          );
          window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
        } else if (data.action?.status === 'cancelled') {
          updated = updated.map((m) =>
            m.action && m.action.status === 'pending'
              ? { ...m, action: { ...m.action, status: 'cancelled' } }
              : m
          );
        }

        return [
          ...updated,
          {
            role: 'assistant',
            content: data.answer || '',
            sources: data.sources || [],
            action: data.action || null,
          },
        ];
      });
    } catch (err) {
      console.error('Error querying chat API:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isTr
            ? 'Üzgünüm, sorunuz yanıtlanırken bir hata oluştu. Lütfen OpenAI API anahtarınızı ve ağ bağlantınızı kontrol edin.'
            : 'Sorry, an error occurred while generating the response. Please check your OpenAI API key and network connection.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setMessages([]);
    localStorage.removeItem('mainchunk_chat_messages');
    try {
      await fetch('/api/chat/history', { method: 'DELETE' }).catch(() => null);
    } catch {
      // Ignored
    }
  };

  const handleExecuteAction = async (msgIndex, action) => {
    try {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex ? { ...m, action: { ...m.action, status: 'executing' } } : m
        )
      );

      const res = await fetch('/api/chat/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: action.action_id,
          action_type: action.type,
          target_org_id: action.target_org_id,
          target_folder: action.target_folder,
          target_filenames: action.target_filenames || [],
          delete_folder: true,
        }),
      });

      if (!res.ok) throw new Error('Action execution failed');
      const result = await res.json();

      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? { ...m, action: { ...m.action, status: 'completed', resultMessage: result.message } }
            : m
        )
      );
      window.dispatchEvent(new CustomEvent('mainchunk_docs_updated'));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex ? { ...m, action: { ...m.action, status: 'error', errorMsg: err.message } } : m
        )
      );
    }
  };

  const handleCancelAction = (msgIndex) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex ? { ...m, action: { ...m.action, status: 'cancelled' } } : m
      )
    );
  };

  const starterPrompts = [
    "Summarize terms in recent title deeds and contracts",
    "What are the key points in the latest client notes?",
    "List all zoned land plots and development properties",
    "What are the financial values and rental prices mentioned?"
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between overflow-hidden h-[540px]">
      {/* Header */}
      <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                AI Knowledge Chat
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Query contracts, land plots, notes, and records with grounded sources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3.5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
              <Bot className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Ask Anything About Your Documents
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed max-w-sm">
              The AI searches across all indexed PDFs, deeds, photos, and WhatsApp notes to provide grounded answers with citations.
            </p>

            <div className="w-full space-y-1.5">
              {starterPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left p-2.5 text-xs text-slate-600 bg-slate-50 hover:bg-indigo-50/80 hover:text-indigo-700 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatBubble
              key={idx}
              msgIndex={idx}
              message={msg}
              onViewDocument={onViewDocument}
              onExecuteAction={handleExecuteAction}
              onCancelAction={handleCancelAction}
            />
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-1.5 shadow-2xs">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-100 bg-white shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything about your files... (e.g. Deed terms, Silivri plot, candidate resume)"
            className="flex-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 focus:border-indigo-400 rounded-2xl py-2.5 pl-4 pr-12 text-xs lg:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>Grounded in ChromaDB vector memory</span>
          <span className="font-mono">100% Attribution</span>
        </div>
      </div>
    </div>
  );
};

// ── Individual Chat Bubble ──────────────────────────────────────────
const ChatBubble = ({ message, msgIndex, onViewDocument, onExecuteAction, onCancelAction }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl transition-all ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-xs px-4 py-2.5 text-xs sm:text-[13px] shadow-xs leading-relaxed'
            : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs px-4 py-3 shadow-xs text-xs sm:text-[13px]'
        }`}
      >
        <div className={isUser ? 'leading-relaxed text-white' : 'text-slate-800'}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700">{children}</p>,
                ul: ({ children }) => <ul className="my-1.5 space-y-0.5 pl-4 list-disc marker:text-indigo-500 leading-relaxed text-slate-700">{children}</ul>,
                li: ({ children }) => <li className="leading-relaxed text-slate-700">{children}</li>,
                ol: ({ children }) => <ol className="my-1.5 space-y-0.5 pl-4 list-decimal marker:font-bold marker:text-indigo-600 leading-relaxed text-slate-700">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                h1: ({ children }) => <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-2 mb-1 pb-0.5 border-b border-slate-100">{children}</h3>,
                h2: ({ children }) => <h4 className="text-xs font-bold text-slate-900 mt-2 mb-0.5">{children}</h4>,
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="px-1 py-0.2 bg-slate-100 text-indigo-700 font-mono text-[11px] rounded border border-slate-200/80">{children}</code>
                  ) : (
                    <pre className="p-2 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto my-1.5"><code>{children}</code></pre>
                  ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Action Confirmation Box */}
        {!isUser && message.action && message.action.status === 'pending' && (
          <div className="mt-3 p-3 rounded-xl border border-rose-200 bg-rose-50/60 text-slate-800 text-xs">
            <div className="flex items-center gap-2 mb-2 font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{message.action.title || 'Confirm Action'}</span>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={() => onExecuteAction?.(msgIndex, message.action)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
              >
                Yes, Execute
              </button>
              <button
                onClick={() => onCancelAction?.(msgIndex)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sources Section */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcesList sources={message.sources} onViewDocument={onViewDocument} />
        )}

        {/* Assistant Footer */}
        {!isUser && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              <span>Grounded AI</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors px-1 py-0.5 rounded cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sources List ────────────────────────────────────────────────────
const SourcesList = ({ sources, onViewDocument }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2.5 pt-2 border-t border-slate-100">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer select-none"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <BookOpen className="w-3 h-3" />
        <span>Citations ({sources.length})</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {sources.map((src, i) => (
            <div
              key={i}
              className="bg-slate-50 rounded-lg p-2 border border-slate-200/70 text-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => onViewDocument && onViewDocument({ docName: src.source, page: src.page })}
                  className="font-semibold text-indigo-600 hover:underline truncate cursor-pointer text-left"
                >
                  {src.source}
                </button>
                {src.page && (
                  <span className="text-[10px] text-slate-400 shrink-0">p. {src.page}</span>
                )}
              </div>
              {src.org_name && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 shrink-0 ml-2">
                  {src.org_name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardChat;
