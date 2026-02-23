'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Trash2, Loader2, CheckCircle2, XCircle, RotateCcw, Sparkles } from 'lucide-react';

type Document = { id: string; name: string };
type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
};
type Quiz = {
  id: string;
  document_id: string;
  document_name: string;
  title: string;
  questions: string | QuizQuestion[];
  created_at: number;
};

type QuizState = {
  quizId: string;
  questions: QuizQuestion[];
  answers: Record<string, number | null>;
  submitted: boolean;
};

const difficultyColors: Record<string, string> = {
  easy: 'badge-green',
  medium: 'badge-amber',
  hard: 'badge-red',
};

export default function QuizzesPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<QuizState | null>(null);

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then(d => setDocuments(d.documents || []));
    fetchQuizzes();
  }, []);

  const fetchQuizzes = () => {
    fetch('/api/quizzes').then(r => r.json()).then(d => setQuizzes(d.quizzes || []));
  };

  const generate = async () => {
    if (!selectedDoc) { setError('Please select a document'); return; }
    setError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDoc, numQuestions, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchQuizzes();
      // Auto-open the new quiz
      startQuiz({ ...data.quiz, questions: data.quiz.questions });
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    const questions: QuizQuestion[] = typeof quiz.questions === 'string'
      ? JSON.parse(quiz.questions)
      : quiz.questions;
    setActiveQuiz({
      quizId: quiz.id,
      questions,
      answers: Object.fromEntries(questions.map(q => [q.id, null])),
      submitted: false,
    });
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;
    await fetch(`/api/quizzes?id=${id}`, { method: 'DELETE' });
    fetchQuizzes();
    if (activeQuiz?.quizId === id) setActiveQuiz(null);
  };

  const selectAnswer = (questionId: string, answerIndex: number) => {
    if (activeQuiz?.submitted) return;
    setActiveQuiz(prev => prev ? {
      ...prev,
      answers: { ...prev.answers, [questionId]: answerIndex },
    } : null);
  };

  const submitQuiz = () => {
    setActiveQuiz(prev => prev ? { ...prev, submitted: true } : null);
  };

  const calcScore = () => {
    if (!activeQuiz) return { correct: 0, total: 0 };
    let correct = 0;
    for (const q of activeQuiz.questions) {
      if (activeQuiz.answers[q.id] === q.correctAnswer) correct++;
    }
    return { correct, total: activeQuiz.questions.length };
  };

  const allAnswered = activeQuiz
    ? Object.values(activeQuiz.answers).every(a => a !== null)
    : false;

  return (
    <div style={{ padding: 32, maxWidth: 1000, animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Quizzes
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Auto-generated multiple-choice quizzes to test your knowledge</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeQuiz ? '380px 1fr' : '1fr', gap: 24 }}>
        {/* Left: Generator + List */}
        <div>
          {/* Generator */}
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Sparkles size={16} color="#10b981" />
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Generate Quiz</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'var(--font-syne)', marginBottom: 6 }}>
                  Document *
                </label>
                <select className="select-field" value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}>
                  <option value="">Select a document...</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'var(--font-syne)', marginBottom: 6 }}>
                    Questions
                  </label>
                  <select className="select-field" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}>
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'var(--font-syne)', marginBottom: 6 }}>
                    Difficulty
                  </label>
                  <select className="select-field" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button
              className="btn-primary"
              onClick={generate}
              disabled={generating || !selectedDoc}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {generating ? (
                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Generating...</>
              ) : (
                <><Plus size={14} />Create Quiz</>
              )}
            </button>
          </div>

          {/* Quizzes list */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
              Saved Quizzes ({quizzes.length})
            </h3>
            {quizzes.length === 0 ? (
              <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
                <ClipboardList size={28} color="#1e2d47" style={{ margin: '0 auto 8px' }} />
                <p style={{ color: '#475569', fontSize: 13 }}>No quizzes yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quizzes.map(quiz => (
                  <div
                    key={quiz.id}
                    className="card"
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      border: activeQuiz?.quizId === quiz.id ? '1px solid rgba(16,185,129,0.4)' : '1px solid #1e2d47',
                    }}
                    onClick={() => startQuiz(quiz)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#10b981')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = activeQuiz?.quizId === quiz.id ? 'rgba(16,185,129,0.4)' : '#1e2d47')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ClipboardList size={14} color="#10b981" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-syne)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {quiz.title}
                        </p>
                        <p style={{ fontSize: 11, color: '#64748b' }}>{quiz.document_name}</p>
                      </div>
                      <button
                        className="btn-danger"
                        onClick={e => { e.stopPropagation(); deleteQuiz(quiz.id); }}
                        style={{ padding: '4px 8px' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active quiz */}
        {activeQuiz && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            {activeQuiz.submitted ? (
              // Results view
              <div>
                {/* Score summary */}
                <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
                  {(() => {
                    const { correct, total } = calcScore();
                    const pct = Math.round((correct / total) * 100);
                    return (
                      <>
                        <div style={{ fontSize: 48, fontFamily: 'var(--font-syne)', fontWeight: 800, color: pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', marginBottom: 8 }}>
                          {pct}%
                        </div>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>
                          {correct} / {total} correct
                        </p>
                        <button
                          className="btn-secondary"
                          onClick={() => setActiveQuiz(prev => prev ? {
                            ...prev,
                            answers: Object.fromEntries(prev.questions.map(q => [q.id, null])),
                            submitted: false,
                          } : null)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <RotateCcw size={13} />Retake
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* Review */}
                {activeQuiz.questions.map((q, i) => {
                  const userAnswer = activeQuiz.answers[q.id];
                  const isCorrect = userAnswer === q.correctAnswer;
                  return (
                    <div key={q.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <span style={{ fontFamily: 'var(--font-syne)', fontSize: 12, fontWeight: 700, color: '#475569' }}>Q{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 }}>{q.question}</p>
                          <span className={`badge ${difficultyColors[q.difficulty] || 'badge-violet'}`}>{q.difficulty}</span>
                        </div>
                        {isCorrect ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                      </div>
                      {q.options.map((opt, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            marginBottom: 6,
                            fontSize: 13,
                            border: `1px solid ${
                              idx === q.correctAnswer ? 'rgba(16,185,129,0.5)' :
                              idx === userAnswer && !isCorrect ? 'rgba(239,68,68,0.5)' : '#1e2d47'
                            }`,
                            background: idx === q.correctAnswer ? 'rgba(16,185,129,0.08)' :
                              idx === userAnswer && !isCorrect ? 'rgba(239,68,68,0.08)' : '#080c14',
                            color: idx === q.correctAnswer ? '#34d399' :
                              idx === userAnswer && !isCorrect ? '#f87171' : '#94a3b8',
                          }}
                        >
                          <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                          {idx === q.correctAnswer && <span style={{ float: 'right', fontSize: 11, fontWeight: 600 }}>✓ Correct</span>}
                        </div>
                      ))}
                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: 13, color: '#94a3b8' }}>
                        <strong style={{ color: '#a78bfa' }}>Explanation:</strong> {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Taking quiz view
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                      {quizzes.find(q => q.id === activeQuiz.quizId)?.title || 'Quiz'}
                    </h2>
                    <p style={{ fontSize: 12, color: '#64748b' }}>
                      {Object.values(activeQuiz.answers).filter(a => a !== null).length} / {activeQuiz.questions.length} answered
                    </p>
                  </div>
                  {allAnswered && (
                    <button
                      className="btn-primary"
                      onClick={submitQuiz}
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    >
                      Submit Quiz
                    </button>
                  )}
                </div>

                {activeQuiz.questions.map((q, i) => (
                  <div key={q.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: 'rgba(124,58,237,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#a78bfa',
                          fontFamily: 'var(--font-syne)',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 6 }}>{q.question}</p>
                        <span className={`badge ${difficultyColors[q.difficulty] || 'badge-violet'}`}>{q.difficulty}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {q.options.map((opt, idx) => {
                        const selected = activeQuiz.answers[q.id] === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => selectAnswer(q.id, idx)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontSize: 13,
                              transition: 'all 0.15s',
                              border: `1px solid ${selected ? 'rgba(124,58,237,0.6)' : '#1e2d47'}`,
                              background: selected ? 'rgba(124,58,237,0.12)' : '#080c14',
                              color: selected ? '#a78bfa' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                            }}
                            onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; }}
                            onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = '#1e2d47'; }}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: `2px solid ${selected ? '#7c3aed' : '#1e2d47'}`,
                                background: selected ? '#7c3aed' : 'transparent',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                color: 'white',
                              }}
                            >
                              {selected && '✓'}
                            </div>
                            <strong style={{ fontFamily: 'var(--font-syne)', fontSize: 11 }}>{String.fromCharCode(65 + idx)}.</strong>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {allAnswered && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <button
                      className="btn-primary"
                      onClick={submitQuiz}
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '12px 32px', fontSize: 15 }}
                    >
                      Submit Quiz
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
