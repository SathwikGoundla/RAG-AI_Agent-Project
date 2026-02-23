import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'documind.db');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

let _db: ReturnType<typeof Database> | null = null;

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: ReturnType<typeof Database>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      document_ids TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      document_name TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      document_name TEXT NOT NULL,
      title TEXT NOT NULL,
      questions TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

// ─── Document queries ────────────────────────────────────────────────────────

export function getAllDocuments() {
  return getDb().prepare(`SELECT id, name, type, size, created_at FROM documents ORDER BY created_at DESC`).all();
}

export function getDocument(id: string) {
  return getDb().prepare(`SELECT * FROM documents WHERE id = ?`).get(id);
}

export function insertDocument(doc: {
  id: string; name: string; type: string; size: number; file_path: string; content: string;
}) {
  getDb().prepare(`INSERT INTO documents (id, name, type, size, file_path, content) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(doc.id, doc.name, doc.type, doc.size, doc.file_path, doc.content);
}

export function deleteDocument(id: string) {
  const doc = getDocument(id) as { file_path: string } | undefined;
  if (doc) {
    try { if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path); } catch {}
  }
  getDb().prepare(`DELETE FROM documents WHERE id = ?`).run(id);
}

// ─── Chunk queries ───────────────────────────────────────────────────────────

export function insertChunks(chunks: Array<{ id: string; document_id: string; content: string; chunk_index: number }>) {
  const stmt = getDb().prepare(`INSERT INTO chunks (id, document_id, content, chunk_index) VALUES (?, ?, ?, ?)`);
  const insert = getDb().transaction((items: typeof chunks) => {
    for (const c of items) stmt.run(c.id, c.document_id, c.content, c.chunk_index);
  });
  insert(chunks);
}

export function getChunksByDocument(document_id: string) {
  return getDb().prepare(`SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index`).all(document_id) as Array<{ id: string; document_id: string; content: string; chunk_index: number }>;
}

export function getAllChunks() {
  return getDb().prepare(`
    SELECT c.*, d.name as document_name 
    FROM chunks c JOIN documents d ON c.document_id = d.id
    ORDER BY c.document_id, c.chunk_index
  `).all() as Array<{ id: string; document_id: string; document_name: string; content: string; chunk_index: number }>;
}

export function getChunksForDocuments(documentIds: string[]) {
  if (documentIds.length === 0) return getAllChunks();
  const placeholders = documentIds.map(() => '?').join(',');
  return getDb().prepare(`
    SELECT c.*, d.name as document_name 
    FROM chunks c JOIN documents d ON c.document_id = d.id
    WHERE c.document_id IN (${placeholders})
    ORDER BY c.document_id, c.chunk_index
  `).all(...documentIds) as Array<{ id: string; document_id: string; document_name: string; content: string; chunk_index: number }>;
}

// ─── Chat queries ────────────────────────────────────────────────────────────

export function getAllSessions() {
  return getDb().prepare(`SELECT * FROM chat_sessions ORDER BY created_at DESC`).all();
}

export function getSession(id: string) {
  return getDb().prepare(`SELECT * FROM chat_sessions WHERE id = ?`).get(id);
}

export function createSession(id: string, title: string, documentIds: string[]) {
  getDb().prepare(`INSERT INTO chat_sessions (id, title, document_ids) VALUES (?, ?, ?)`)
    .run(id, title, JSON.stringify(documentIds));
  return getSession(id);
}

export function updateSessionTitle(id: string, title: string) {
  getDb().prepare(`UPDATE chat_sessions SET title = ? WHERE id = ?`).run(title, id);
}

export function deleteSession(id: string) {
  getDb().prepare(`DELETE FROM chat_sessions WHERE id = ?`).run(id);
}

export function getSessionMessages(session_id: string) {
  return getDb().prepare(`SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`).all(session_id);
}

export function insertMessage(msg: { id: string; session_id: string; role: string; content: string }) {
  getDb().prepare(`INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)`)
    .run(msg.id, msg.session_id, msg.role, msg.content);
}

// ─── Study plans queries ─────────────────────────────────────────────────────

export function getAllStudyPlans() {
  return getDb().prepare(`SELECT id, document_id, document_name, title, created_at FROM study_plans ORDER BY created_at DESC`).all();
}

export function getStudyPlan(id: string) {
  return getDb().prepare(`SELECT * FROM study_plans WHERE id = ?`).get(id);
}

export function insertStudyPlan(plan: { id: string; document_id: string; document_name: string; title: string; content: string }) {
  getDb().prepare(`INSERT INTO study_plans (id, document_id, document_name, title, content) VALUES (?, ?, ?, ?, ?)`)
    .run(plan.id, plan.document_id, plan.document_name, plan.title, plan.content);
}

export function deleteStudyPlan(id: string) {
  getDb().prepare(`DELETE FROM study_plans WHERE id = ?`).run(id);
}

// ─── Quiz queries ─────────────────────────────────────────────────────────────

export function getAllQuizzes() {
  return getDb().prepare(`SELECT id, document_id, document_name, title, created_at FROM quizzes ORDER BY created_at DESC`).all();
}

export function getQuiz(id: string) {
  return getDb().prepare(`SELECT * FROM quizzes WHERE id = ?`).get(id);
}

export function insertQuiz(quiz: { id: string; document_id: string; document_name: string; title: string; questions: string }) {
  getDb().prepare(`INSERT INTO quizzes (id, document_id, document_name, title, questions) VALUES (?, ?, ?, ?, ?)`)
    .run(quiz.id, quiz.document_id, quiz.document_name, quiz.title, quiz.questions);
}

export function deleteQuiz(id: string) {
  getDb().prepare(`DELETE FROM quizzes WHERE id = ?`).run(id);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getStats() {
  const db = getDb();
  return {
    documents: (db.prepare(`SELECT COUNT(*) as count FROM documents`).get() as { count: number }).count,
    sessions: (db.prepare(`SELECT COUNT(*) as count FROM chat_sessions`).get() as { count: number }).count,
    studyPlans: (db.prepare(`SELECT COUNT(*) as count FROM study_plans`).get() as { count: number }).count,
    quizzes: (db.prepare(`SELECT COUNT(*) as count FROM quizzes`).get() as { count: number }).count,
  };
}
