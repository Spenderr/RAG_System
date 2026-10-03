import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Trash2, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, sources: data.sources }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, an error occurred while processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/chat/history', { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    
    return (
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl p-5 ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-sm' 
            : 'bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl text-slate-200 rounded-bl-sm shadow-xl'
        }`}>
          <div className={`prose prose-invert max-w-none ${isUser ? 'prose-p:text-white' : 'prose-p:text-slate-300'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          
          {!isUser && message.sources && message.sources.length > 0 && (
            <Sources sources={message.sources} />
          )}
        </div>
      </div>
    );
  };

  const Sources = ({ sources }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <div className="mt-4 border-t border-white/[0.08] pt-4">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <BookOpen className="w-4 h-4" />
          <span>{sources.length} {sources.length === 1 ? 'Source' : 'Sources'} Used</span>
        </button>
        
        {expanded && (
          <div className="mt-3 space-y-3">
            {sources.map((source, idx) => (
              <div key={idx} className="bg-black/20 rounded-lg p-3 border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-md">
                    {source.source}
                  </span>
                  <span className="text-xs text-slate-500">Chunk #{source.chunk_index || idx}</span>
                </div>
                <p className="text-xs text-slate-400 italic border-l-2 border-indigo-500/30 pl-2">
                  "{source.preview || source.text?.substring(0, 150) + '...'}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 flex justify-between items-center border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Document Chat</h2>
          <p className="text-sm text-slate-400">Ask questions based on your ingested documents.</p>
        </div>
        <button 
          onClick={handleClearHistory}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Clear Chat History"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
            <p>Start asking questions about your documents.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start mb-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-sm p-5 flex items-center gap-1.5 h-14">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#0a0a0f]">
        <form 
          onSubmit={handleSend}
          className="relative bg-white/[0.03] border border-white/[0.1] focus-within:border-indigo-500/50 rounded-2xl flex items-end p-2 transition-colors"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything..."
            className="w-full bg-transparent border-none focus:outline-none text-slate-200 resize-none py-3 px-4 max-h-40 min-h-[56px] text-base"
            rows={1}
            style={{ height: 'auto' }}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 mb-1 mr-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/[0.05] disabled:text-slate-500 text-white rounded-xl transition-colors shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-xs text-slate-500 mt-3">
          MainChunk can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
};

export default Chat;
