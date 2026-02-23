'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, MessageSquare, BookOpen, ClipboardList,
  Upload, Plus, Zap, TrendingUp, Activity,
} from 'lucide-react';

type Stats = { documents: number; sessions: number; studyPlans: number; quizzes: number };
type RecentDoc = { id: string; name: string; type: string; size: number; created_at: number };

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ documents: 0, sessions: 0, studyPlans: 0, quizzes: 0 });
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => {
        setStats(d.stats);
        setRecentDocs(d.recentDocs || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Documents',
      value: stats.documents,
      icon: FileText,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.1)',
      border: 'rgba(124,58,237,0.25)',
      href: '/documents',
    },
    {
      label: 'Chat Sessions',
      value: stats.sessions,
      icon: MessageSquare,
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.1)',
      border: 'rgba(6,182,212,0.25)',
      href: '/chat',
    },
    {
      label: 'Study Plans',
      value: stats.studyPlans,
      icon: BookOpen,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.25)',
      href: '/study-plans',
    },
    {
      label: 'Quizzes Taken',
      value: stats.quizzes,
      icon: ClipboardList,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.25)',
      href: '/quizzes',
    },
  ];

  const agents = [
    {
      name: 'Document Chat Agent',
      desc: 'Answers questions grounded in uploaded documents using RAG',
      icon: MessageSquare,
      color: '#7c3aed',
      href: '/chat',
    },
    {
      name: 'Study Plan Agent',
      desc: 'Generates structured study plans and learning objectives',
      icon: BookOpen,
      color: '#f59e0b',
      href: '/study-plans',
    },
    {
      name: 'Quiz Generator Agent',
      desc: 'Creates multiple-choice quizzes with explanations',
      icon: ClipboardList,
      color: '#10b981',
      href: '/quizzes',
    },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 1200, animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              padding: '3px 10px',
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              color: '#a78bfa',
              fontFamily: 'var(--font-syne)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Dashboard
          </div>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 32,
            fontWeight: 800,
            color: '#e2e8f0',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Welcome to DocuMind AI
        </h1>
        <p style={{ fontSize: 15, color: '#64748b' }}>
          Upload documents and unlock AI-powered learning, chat, and insights.
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="card card-hover"
                style={{ padding: 24, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: card.bg,
                      border: `1px solid ${card.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={18} color={card.color} />
                  </div>
                  <TrendingUp size={14} color="#475569" />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#e2e8f0',
                    lineHeight: 1,
                    marginBottom: 6,
                  }}
                >
                  {loading ? '—' : card.value}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{card.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Recent Documents */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                Recent Documents
              </h2>
              <p style={{ fontSize: 12, color: '#475569' }}>Your latest uploaded files</p>
            </div>
            <Activity size={16} color="#475569" />
          </div>

          {recentDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <FileText size={32} color="#1e2d47" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>No documents uploaded yet</p>
              <Link href="/documents">
                <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
                  Upload your first document
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentDocs.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: '#080c14',
                    borderRadius: 8,
                    border: '1px solid #1e2d47',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(124,58,237,0.1)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={14} color="#a78bfa" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {doc.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {formatBytes(doc.size)} · {formatDate(doc.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
              Quick Actions
            </h2>
            <p style={{ fontSize: 12, color: '#475569' }}>Get started quickly</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Upload Document', href: '/documents', icon: Upload, color: '#7c3aed' },
              { label: 'Start Chat', href: '/chat', icon: MessageSquare, color: '#06b6d4' },
              { label: 'Generate Study Plan', href: '/study-plans', icon: BookOpen, color: '#f59e0b' },
              { label: 'Create Quiz', href: '/quizzes', icon: ClipboardList, color: '#10b981' },
            ].map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: '#080c14',
                      border: '1px solid #1e2d47',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = action.color;
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#1e2d47';
                      (e.currentTarget as HTMLElement).style.background = '#080c14';
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${action.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={15} color={action.color} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#cbd5e1', fontFamily: 'var(--font-syne)' }}>
                      {action.label}
                    </span>
                    <Plus size={14} color="#475569" style={{ marginLeft: 'auto' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent Status */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
            Agent Status
          </h2>
          <p style={{ fontSize: 12, color: '#475569' }}>Powered by Claude · All agents online</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {agents.map(agent => {
            const Icon = agent.icon;
            return (
              <Link key={agent.name} href={agent.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    padding: '16px',
                    background: '#080c14',
                    border: '1px solid #1e2d47',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = agent.color;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#1e2d47';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Icon size={16} color={agent.color} />
                    <span style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                      {agent.name}
                    </span>
                    <div
                      style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '2px 8px',
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: 20,
                      }}
                    >
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
                      <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700, fontFamily: 'var(--font-syne)' }}>ONLINE</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{agent.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Powered by */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <Zap size={12} color="#475569" />
        <span style={{ fontSize: 12, color: '#475569' }}>
          Powered by Claude · RAG with BM25 retrieval · SQLite storage
        </span>
      </div>
    </div>
  );
}
