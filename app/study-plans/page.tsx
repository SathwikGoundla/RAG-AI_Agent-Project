'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

type Document = { id: string; name: string };
type StudyPlan = {
  id: string;
  document_id: string;
  document_name: string;
  title: string;
  content?: string;
  created_at: number;
};

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
    .replace(/\n\n/g, '</p><p>');
}

export default function StudyPlansPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [duration, setDuration] = useState('2 weeks');
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then(d => setDocuments(d.documents || []));
    fetchPlans();
  }, []);

  const fetchPlans = () => {
    fetch('/api/study-plans').then(r => r.json()).then(d => setPlans(d.studyPlans || []));
  };

  const generate = async () => {
    if (!selectedDoc) { setError('Please select a document'); return; }
    setError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDoc, focusArea, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchPlans();
      setExpandedId(data.studyPlan.id);
      setExpandedContent(data.studyPlan.content);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = async (plan: StudyPlan) => {
    if (expandedId === plan.id) {
      setExpandedId(null);
      setExpandedContent('');
      return;
    }
    setExpandedId(plan.id);
    if (!plan.content) {
      setLoadingContent(true);
      const res = await fetch(`/api/study-plans?id=${plan.id}`);
      const data = await res.json();
      setExpandedContent(data.content || '');
      setLoadingContent(false);
    } else {
      setExpandedContent(plan.content);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this study plan?')) return;
    await fetch(`/api/study-plans?id=${id}`, { method: 'DELETE' });
    fetchPlans();
    if (expandedId === id) { setExpandedId(null); setExpandedContent(''); }
  };

  return (
    <div style={{ padding: 32, maxWidth: 1000, animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Study Plans
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>AI-generated structured learning plans from your documents</p>
      </div>

      {/* Generator */}
      <div className="card" style={{ padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Sparkles size={16} color="#f59e0b" />
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Generate Study Plan</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'var(--font-syne)', marginBottom: 6 }}>
              Document *
            </label>
            <select
              className="select-field"
              value={selectedDoc}
              onChange={e => setSelectedDoc(e.target.value)}
            >
              <option value="">Select a document...</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'var(--font-syne)', marginBottom: 6 }}>
              Focus Area (optional)
            </label>
            <input
              className="input-field"
              placeholder="e.g., Chapter 3, Key theorems..."
              value={focusArea}
              onChange={e => setFocusArea(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'var(--font-syne)', marginBottom: 6 }}>
              Duration
            </label>
            <select className="select-field" value={duration} onChange={e => setDuration(e.target.value)}>
              <option>1 week</option>
              <option>2 weeks</option>
              <option>1 month</option>
              <option>3 months</option>
            </select>
          </div>
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          className="btn-primary"
          onClick={generate}
          disabled={generating || !selectedDoc}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {generating ? (
            <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Generating...</>
          ) : (
            <><Plus size={14} />Generate Plan</>
          )}
        </button>

        {documents.length === 0 && (
          <p style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
            Upload documents first in the Documents section.
          </p>
        )}
      </div>

      {/* Plans list */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
          Generated Plans ({plans.length})
        </h2>

        {plans.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <BookOpen size={36} color="#1e2d47" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#475569', fontSize: 14 }}>No study plans yet. Generate your first one above!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map(plan => (
              <div key={plan.id} className="card" style={{ overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(plan)}
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#162035')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BookOpen size={16} color="#f59e0b" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-syne)', marginBottom: 2 }}>
                      {plan.title}
                    </p>
                    <p style={{ fontSize: 12, color: '#64748b' }}>
                      {plan.document_name} · {new Date(plan.created_at * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn-danger"
                      onClick={e => { e.stopPropagation(); deletePlan(plan.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Trash2 size={11} />
                    </button>
                    {expandedId === plan.id ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
                  </div>
                </div>

                {expandedId === plan.id && (
                  <div style={{ borderTop: '1px solid #1e2d47', padding: '20px 24px', background: '#080c14' }}>
                    {loadingContent ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        <div className="loading-dots"><span /><span /><span /></div>
                      </div>
                    ) : (
                      <div
                        className="prose-dark"
                        style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 800 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(expandedContent) }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
