'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BookOpen,
  ClipboardList,
  Settings,
  Brain,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/study-plans', label: 'Study Plans', icon: BookOpen },
  { href: '/quizzes', label: 'Quizzes', icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: '#0d1525',
        borderRight: '1px solid #1e2d47',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e2d47' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(124,58,237,0.4)',
            }}
          >
            <Brain size={20} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              DocuMind
            </div>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>AI Assistant</div>
          </div>
        </Link>
      </div>

      {/* AI Status Badge */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e2d47' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 8,
            padding: '7px 12px',
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
              animation: 'pulse 2s infinite',
            }}
          />
          <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600, fontFamily: 'var(--font-syne)' }}>
            Claude Active
          </span>
          <Sparkles size={12} color="#34d399" style={{ marginLeft: 'auto' }} />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        <div style={{ marginBottom: 6, padding: '0 8px 6px', fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-syne)' }}>
          Navigation
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--font-syne)',
                background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: isActive ? '#a78bfa' : '#94a3b8',
                border: isActive ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                }
              }}
            >
              <Icon size={16} />
              {label}
              {isActive && (
                <div
                  style={{
                    marginLeft: 'auto',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#7c3aed',
                    boxShadow: '0 0 8px rgba(124,58,237,0.8)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom - Admin */}
      <div style={{ padding: '12px', borderTop: '1px solid #1e2d47' }}>
        <Link
          href="/admin"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: pathname === '/admin' ? 600 : 400,
            fontFamily: 'var(--font-syne)',
            background: pathname === '/admin' ? 'rgba(124,58,237,0.15)' : 'transparent',
            color: pathname === '/admin' ? '#a78bfa' : '#94a3b8',
            border: pathname === '/admin' ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          <Settings size={16} />
          Admin
        </Link>
      </div>
    </aside>
  );
}
