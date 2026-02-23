'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare, Send, Plus, Trash2, Bot, User,
  FileText, ChevronDown, CheckCircle2,
} from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant'; content: string; sources?: string[] };
type Session = { id: string; title: string; document_ids: string; created_at: number };
type Document = { id: string; name: string };

// Simple markdown renderer
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`);
}

export default function ChatPage() {
  // --- Auth (local-only starter UX) ---
  type AuthMode = 'signup' | 'signin';
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const nameInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }, [user]);

  const loadUser = () => {
    try {
      const stored = localStorage.getItem('documind_user');
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load user', e);
    }
  };

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [showAuth, setShowAuth] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadUser();
    fetchSessions();
    fetchDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    const res = await fetch('/api/chat/sessions');
    const data = await res.json();
    setSessions(data.sessions || []);
  };

  const fetchDocuments = async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    setDocuments(data.documents || []);
  };

  const loadSession = async (session: Session) => {
    setCurrentSession(session);
    const res = await fetch(`/api/chat?sessionId=${session.id}`);
    const data = await res.json();
    setMessages(data.messages || []);
    setSelectedDocs(JSON.parse(session.document_ids || '[]'));
  };

  const createSession = async () => {
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds: selectedDocs }),
    });
    const data = await res.json();
    setSessions(prev => [data.session, ...prev]);
    setCurrentSession(data.session);
    setMessages([]);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/sessions?id=${id}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSession?.id === id) { setCurrentSession(null); setMessages([]); }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!user) {
      setAuthMode('signin');
      return;
    }

    let session = currentSession;
    if (!session) {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: selectedDocs }),
      });
      const data = await res.json();
      session = data.session;
      setCurrentSession(session);
      setSessions(prev => [data.session, ...prev]);
    }

    setInput('');
    setStreaming(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = Date.now().toString() + '_a';
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session!.id, message: text, documentIds: selectedDocs }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let sources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const jsonStr = line.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
              );
            }
            if (parsed.error) {
              const friendly = parsed.error.includes('credit balance')
                ? 'The AI service is unavailable because the credit balance is too low. Please add credits or try again later.'
                : parsed.error;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: `Error: ${friendly}` } : m)
              );
            }
            if (parsed.done && parsed.sources) {
              sources = [...new Set(parsed.sources as string[])];
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, sources } : m)
              );
            }
          } catch {}
        }
      }

      // Refresh sessions list to update title
      fetchSessions();
    } catch (err) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: `Error: ${String(err)}` } : m)
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sessions sidebar */}
      <div
        style={{
          width: 260,
          borderRight: '1px solid #1e2d47',
          background: '#0d1525',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e2d47' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
            Chat Sessions
          </h2>
          <button
            className="btn-primary"
            onClick={createSession}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {sessions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: '24px 16px' }}>
              No chats yet. Create one!
            </p>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => loadSession(s)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: currentSession?.id === s.id ? 'rgba(124,58,237,0.15)' : 'transparent',
                  border: currentSession?.id === s.id ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (currentSession?.id !== s.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  if (currentSession?.id !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <MessageSquare size={13} color={currentSession?.id === s.id ? '#a78bfa' : '#475569'} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: currentSession?.id === s.id ? '#e2e8f0' : '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.title}
                  </p>
                  <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                    {new Date(s.created_at * 1000).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={e => deleteSession(s.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2, borderRadius: 4, opacity: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Doc filter */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d47' }}>
          <button
            onClick={() => setShowDocPicker(!showDocPicker)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: '1px solid #1e2d47',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: 12,
              fontFamily: 'var(--font-syne)',
            }}
          >
            <FileText size={12} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {selectedDocs.length === 0 ? 'All documents' : `${selectedDocs.length} selected`}
            </span>
            <ChevronDown size={12} />
          </button>

          {showDocPicker && (
            <div
              style={{
                marginTop: 8,
                background: '#080c14',
                border: '1px solid #1e2d47',
                borderRadius: 8,
                overflow: 'hidden',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <div
                onClick={() => setSelectedDocs([])}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: selectedDocs.length === 0 ? '#a78bfa' : '#94a3b8',
                  borderBottom: '1px solid #1e2d47',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {selectedDocs.length === 0 && <CheckCircle2 size={11} color="#7c3aed" />}
                All documents
              </div>
              {documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocs(prev =>
                    prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                  )}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: selectedDocs.includes(doc.id) ? '#a78bfa' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedDocs.includes(doc.id) && <CheckCircle2 size={11} color="#7c3aed" />}
                  {doc.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #1e2d47',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#0d1525',
          }}
        >
          <Bot size={18} color="#7c3aed" />
          <div>
            <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
              {currentSession?.title || 'Document Chat'}
            </h1>
            <p style={{ fontSize: 11, color: '#475569' }}>
              {selectedDocs.length === 0 ? 'Searching all documents' : `${selectedDocs.length} document(s) selected`}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={28} color="#7c3aed" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                  Ask about your documents
                </h2>
                <p style={{ color: '#64748b', fontSize: 14 }}>
                  {documents.length === 0
                    ? 'Upload documents first, then start chatting!'
                    : 'Type a question and I\'ll find relevant answers from your documents.'}
                </p>
              </div>
              {['What are the main topics covered?', 'Summarize the key points', 'What are the important definitions?'].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  style={{
                    background: '#111b2e',
                    border: '1px solid #1e2d47',
                    borderRadius: 8,
                    padding: '8px 16px',
                    color: '#94a3b8',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-syne)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2d47'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, margin: '0 auto' }}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    animation: 'slideUp 0.3s ease-out',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: msg.role === 'user' ? 'rgba(245,158,11,0.15)' : 'rgba(124,58,237,0.15)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(245,158,11,0.3)' : 'rgba(124,58,237,0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {msg.role === 'user' ? <User size={14} color="#fbbf24" /> : <Bot size={14} color="#a78bfa" />}
                  </div>

                  <div style={{ flex: 1, maxWidth: 'calc(100% - 44px)' }}>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                        background: msg.role === 'user' ? '#162035' : '#111b2e',
                        border: `1px solid ${msg.role === 'user' ? '#1e2d47' : '#1e2d47'}`,
                      }}
                    >
                      {msg.content === '' && streaming ? (
                        <div className="loading-dots"><span /><span /><span /></div>
                      ) : (
                        <div
                          className="prose-dark"
                          style={{ fontSize: 14, lineHeight: 1.7 }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                      )}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {msg.sources.map(src => (
                          <span key={src} className="badge badge-violet" style={{ fontSize: 10 }}>
                            <FileText size={9} style={{ marginRight: 4 }} />
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1e2d47', background: '#0d1525' }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              background: '#080c14',
              border: '1px solid #1e2d47',
              borderRadius: 12,
              padding: '8px 8px 8px 16px',
              maxWidth: 800,
              margin: '0 auto',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'}
            onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d47'}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your documents... (Enter to send, Shift+Enter for newline)"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#e2e8f0',
                fontSize: 14,
                fontFamily: 'var(--font-dm-sans)',
                resize: 'none',
                minHeight: 40,
                maxHeight: 120,
                lineHeight: 1.5,
                padding: '4px 0',
              }}
              rows={1}
            />
            <button
              className="btn-primary"
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              style={{ alignSelf: 'flex-end', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={14} />
              Send
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 8 }}>
            Powered by Claude · BM25 RAG retrieval
          </p>
        </div>
      </div>
    </div>
  );
}
