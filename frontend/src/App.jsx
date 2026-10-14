import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loadingStatus, setLoadingStatus] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('chat_session_id');
    if (!id) {
      id = 'session-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('chat_session_id', id);
    }
    return id;
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingStatus]);

  const getFriendlyStatus = (technicalStatus) => {
    if (!technicalStatus) return 'Thinking...';
    const lower = technicalStatus.toLowerCase();
    
    if (lower.includes('scout') || lower.includes('searchplaces')) {
      return 'Exploring destinations, vegan options & accessibility...';
    }
    if (lower.includes('weather') || lower.includes('calendar') || lower.includes('date')) {
      return 'Checking weather forecast & holiday schedules...';
    }
    if (lower.includes('budget') || lower.includes('policy') || lower.includes('calculate')) {
      return 'Calculating budget in ILS and verifying company policy...';
    }
    if (lower.includes('routing') || lower.includes('analyzing')) {
      return 'Analyzing request...';
    }
    return 'Processing your request...';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);
    setLoadingStatus('Analyzing request...');

    let assistantIndex = -1;

    try {
      const response = await fetch(
        `http://localhost:3000/api/chat/stream?sessionId=${sessionId}&message=${encodeURIComponent(userMessage)}`
      );

      if (!response.ok) throw new Error('Network error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const payload = trimmed.replace(/^data:\s*/, '').trim();
            if (payload === '[DONE]') break;

            try {
              const data = JSON.parse(payload);

              if (data.type === 'status') {
                setLoadingStatus(getFriendlyStatus(data.content));
              } else if (data.type === 'message') {
                setLoadingStatus('');
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];

                  if (lastMsg && lastMsg.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      content: lastMsg.content + data.content
                    };
                  } else {
                    updated.push({
                      role: 'assistant',
                      content: data.content
                    });
                  }
                  return updated;
                });
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Connection error. Please ensure the backend is running.' }
      ]);
    } finally {
      setIsStreaming(false);
      setLoadingStatus('');
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat_history');
  };

  return (
    <div className="flex flex-col h-screen bg-[#efeae2] font-sans" dir="ltr">
      <div className="bg-[#00a884] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-2xl">
            🤖
          </div>
          <div>
            <h1 className="font-semibold text-xl leading-tight">Consoto Assistant</h1>
            <p className="text-sm text-emerald-100 mt-0.5">Online</p>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="text-sm bg-emerald-700/50 hover:bg-emerald-700 px-4 py-2 rounded-lg transition font-medium"
        >
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-5xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-500 bg-white/60 rounded-2xl p-6 shadow-sm max-w-lg mx-auto mt-10">
            <p className="text-lg font-medium text-slate-700">💬 How can I help you today?</p>
            <p className="text-sm text-slate-500 mt-2">Type a message below to start planning destinations, weather, and budgets.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-base leading-relaxed text-left ${
                msg.role === 'user'
                  ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none whitespace-pre-wrap'
                  : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="[&>p]:mb-3 last:[&>p]:mb-0 [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-3 [&>li]:mb-2.5 [&>strong]:font-semibold">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && loadingStatus && (
          <div className="flex justify-start">
            <div className="bg-white/80 backdrop-blur text-slate-600 px-5 py-2.5 rounded-xl text-sm shadow-sm flex items-center space-x-3 border border-slate-200">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span>{loadingStatus}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-[#f0f2f5] px-6 py-4 border-t border-slate-200">
        <form onSubmit={sendMessage} className="max-w-5xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isStreaming}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-5 py-3 text-base text-slate-900 focus:outline-none focus:border-[#00a884] disabled:opacity-50 shadow-inner"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="bg-[#00a884] hover:bg-[#008f72] text-white px-8 py-3 rounded-xl text-base font-medium transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}