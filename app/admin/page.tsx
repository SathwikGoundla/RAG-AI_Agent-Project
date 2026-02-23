'use client';

import { useEffect, useState } from 'react';
import { Settings, Database, FileText, MessageSquare, BookOpen, ClipboardList, RefreshCw, Cpu, HardDrive, Zap, AlertCircle } from 'lucide-react';

type Stats = { documents: number; sessions: number; studyPlans: number; quizzes: number };

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'ok' | 'missing'>('checking');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    checkApiKey();
  }, []);

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setStats(d.stats); setLoading(false); });
  };

  const checkApiKey = async () => {
    const res = await fetch('/api/admin/health');
    const data = await res.json();
    setApiKeyStatus(data.apiKey ? 'ok' : 'missing');
  };

  return (
    <div style={{ padding: 32, maxWidth: 900, animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Admin
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>System status, configuration, and statistics</p>
      </div>

      {/* API Key Status */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Zap size={16} color="#f59e0b" />
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
            System Status
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {/* API Key */}
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: '#080c14',
              border: `1px solid ${apiKeyStatus === 'ok' ? 'rgba(16,185,129,0.3)' : apiKeyStatus === 'missing' ? 'rgba(239,68,68,0.3)' : '#1e2d47'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {apiKeyStatus === 'ok' ? (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              ) : apiKeyStatus === 'missing' ? (
                <AlertCircle size={14} color="#ef4444" />
              ) : (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              )}
              <span style={{ fontSize: 12, fontFamily: 'var(--font-syne)', fontWeight: 600, color: apiKeyStatus === 'ok' ? '#34d399' : apiKeyStatus === 'missing' ? '#f87171' : '#fbbf24' }}>
                {apiKeyStatus === 'ok' ? 'API Key Valid' : apiKeyStatus === 'missing' ? 'API Key Missing' : 'Checking...'}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#475569' }}>
              {apiKeyStatus === 'missing' ? 'Set ANTHROPIC_API_KEY in .env.local' : 'Anthropic Claude API'}
            </p>
          </div>

          {/* Database */}
          <div style={{ padding: 16, borderRadius: 10, background: '#080c14', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-syne)', fontWeight: 600, color: '#34d399' }}>Database OK</span>
            </div>
            <p style={{ fontSize: 11, color: '#475569' }}>SQLite · ./data/documind.db</p>
          </div>

          {/* Model */}
          <div style={{ padding: 16, borderRadius: 10, background: '#080c14', border: '1px solid rgba(124,58,237,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Cpu size={12} color="#a78bfa" />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-syne)', fontWeight: 600, color: '#a78bfa' }}>AI Model</span>
            </div>
            <p style={{ fontSize: 11, color: '#475569' }}>claude-sonnet-4-6</p>
          </div>

          {/* Storage */}
          <div style={{ padding: 16, borderRadius: 10, background: '#080c14', border: '1px solid rgba(6,182,212,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <HardDrive size={12} color="#22d3ee" />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-syne)', fontWeight: 600, color: '#22d3ee' }}>Storage</span>
            </div>
            <p style={{ fontSize: 11, color: '#475569' }}>Local · ./data/uploads/</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={16} color="#7c3aed" />
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
              Database Statistics
            </h2>
          </div>
          <button className="btn-secondary" onClick={fetchStats} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} />Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Documents', value: stats?.documents, icon: FileText, color: '#7c3aed' },
            { label: 'Chat Sessions', value: stats?.sessions, icon: MessageSquare, color: '#06b6d4' },
            { label: 'Study Plans', value: stats?.studyPlans, icon: BookOpen, color: '#f59e0b' },
            { label: 'Quizzes', value: stats?.quizzes, icon: ClipboardList, color: '#10b981' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{ padding: '16px', background: '#080c14', border: '1px solid #1e2d47', borderRadius: 10 }}>
                <Icon size={16} color={item.color} style={{ marginBottom: 8 }} />
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
                  {loading ? '—' : item.value}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuration Reference */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Settings size={16} color="#94a3b8" />
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
            Configuration
          </h2>
        </div>

        <div
          style={{
            background: '#080c14',
            border: '1px solid #1e2d47',
            borderRadius: 10,
            padding: 20,
            fontFamily: 'var(--font-jetbrains)',
            fontSize: 13,
            color: '#94a3b8',
            lineHeight: 2,
          }}
        >
          <div><span style={{ color: '#475569' }}># Required</span></div>
          <div><span style={{ color: '#a78bfa' }}>ANTHROPIC_API_KEY</span><span style={{ color: '#475569' }}>=</span><span style={{ color: '#34d399' }}>sk-ant-...</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: '#475569' }}># Optional</span></div>
          <div><span style={{ color: '#a78bfa' }}>CLAUDE_MODEL</span><span style={{ color: '#475569' }}>=</span><span style={{ color: '#34d399' }}>claude-sonnet-4-6</span></div>
          <div><span style={{ color: '#a78bfa' }}>MAX_TOKENS</span><span style={{ color: '#475569' }}>=</span><span style={{ color: '#34d399' }}>4096</span></div>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: '#fbbf24' }}>
            <strong>📁 .env.local</strong> — Copy from <code style={{ fontSize: 12, color: '#94a3b8' }}>.env.local.example</code> and add your API key. Never commit this file.
          </p>
        </div>
      </div>

      {/* Tech Stack */}
      <div style={{ marginTop: 24, padding: 20, background: '#111b2e', border: '1px solid #1e2d47', borderRadius: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>Tech Stack</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Next.js 14', color: 'badge-violet' },
            { label: 'TypeScript', color: 'badge-cyan' },
            { label: 'SQLite (better-sqlite3)', color: 'badge-amber' },
            { label: 'Anthropic Claude API', color: 'badge-violet' },
            { label: 'BM25 RAG', color: 'badge-green' },
            { label: 'pdf-parse', color: 'badge-red' },
            { label: 'mammoth (DOCX)', color: 'badge-cyan' },
            { label: 'Tailwind CSS', color: 'badge-violet' },
          ].map(tech => (
            <span key={tech.label} className={`badge ${tech.color}`}>{tech.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
