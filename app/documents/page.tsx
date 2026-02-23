'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Trash2, File, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  created_at: number;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getTypeLabel(type: string) {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || type.includes('docx')) return 'DOCX';
  return 'TXT';
}

function getTypeBadge(type: string) {
  const label = getTypeLabel(type);
  const colors: Record<string, string> = { PDF: 'badge-red', DOCX: 'badge-cyan', TXT: 'badge-green' };
  return colors[label] || 'badge-violet';
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDocuments = () => {
    setLoading(true);
    fetch('/api/documents')
      .then(r => r.json())
      .then(d => setDocuments(d.documents || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/documents', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        showToast('success', `"${file.name}" uploaded (${data.document.chunks} chunks)`);
      } catch (err) {
        showToast('error', String(err));
      }
    }

    setUploading(false);
    fetchDocuments();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove its chunks and any related study plans/quizzes.`)) return;
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('success', `"${name}" deleted`);
      fetchDocuments();
    } else {
      showToast('error', 'Delete failed');
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 1100, animation: 'fadeIn 0.4s ease-out' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 10,
            background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color: toast.type === 'success' ? '#34d399' : '#f87171',
            fontSize: 13,
            fontWeight: 500,
            animation: 'slideUp 0.3s ease-out',
            backdropFilter: 'blur(10px)',
            maxWidth: 360,
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 4 }}>
              Documents
            </h1>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              {documents.length} document{documents.length !== 1 ? 's' : ''} · Supported: PDF, DOCX, TXT, MD
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={fetchDocuments} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={14} />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#7c3aed' : '#1e2d47'}`,
          borderRadius: 12,
          padding: '32px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          background: dragOver ? 'rgba(124,58,237,0.05)' : 'transparent',
          marginBottom: 24,
        }}
      >
        <Upload size={28} color={dragOver ? '#7c3aed' : '#1e2d47'} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', fontFamily: 'var(--font-syne)', marginBottom: 4 }}>
          {uploading ? 'Processing...' : 'Drop files here or click to upload'}
        </p>
        <p style={{ fontSize: 12, color: '#475569' }}>PDF, DOCX, TXT, MD · Max 50MB per file</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {/* Documents List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 120px 120px 80px',
            padding: '12px 20px',
            borderBottom: '1px solid #1e2d47',
            fontSize: 11,
            fontWeight: 700,
            color: '#475569',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-syne)',
          }}
        >
          <span>Name</span>
          <span>Type</span>
          <span>Size</span>
          <span>Uploaded</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
            <div className="loading-dots" style={{ marginBottom: 12 }}>
              <span /><span /><span />
            </div>
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <File size={40} color="#1e2d47" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#475569', fontSize: 14 }}>No documents yet. Upload your first file above.</p>
          </div>
        ) : (
          documents.map((doc, i) => (
            <div
              key={doc.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 120px 120px 80px',
                padding: '14px 20px',
                borderBottom: i < documents.length - 1 ? '1px solid #1e2d47' : 'none',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#080c14')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={15} color="#a78bfa" />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#e2e8f0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {doc.name}
                </span>
              </div>
              <div>
                <span className={`badge ${getTypeBadge(doc.type)}`}>{getTypeLabel(doc.type)}</span>
              </div>
              <span style={{ fontSize: 13, color: '#64748b' }}>{formatBytes(doc.size)}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                {new Date(doc.created_at * 1000).toLocaleDateString()}
              </span>
              <button
                className="btn-danger"
                onClick={() => handleDelete(doc.id, doc.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
