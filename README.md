# DocuMind AI 🧠

A full-stack RAG (Retrieval-Augmented Generation) AI application. Upload documents, chat with them, generate study plans, and create quizzes — all powered by Claude.

---

## Features

- **Document Management** — Upload PDF, DOCX, and TXT files
- **RAG Chat** — Ask questions grounded in your documents
- **Study Plans** — AI-generated structured learning plans from your documents
- **Quizzes** — Auto-generated multiple-choice quizzes to test your knowledge
- **Admin Panel** — View system stats and manage data

---

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **Anthropic API Key** — [Get one here](https://console.anthropic.com)

---

## Quick Start

### 1. Install dependencies

```bash
cd documind-ai
npm install
```

> **Note**: `better-sqlite3` is a native module and requires Python + a C compiler (usually pre-installed on macOS/Linux). On Windows, install [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022).

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
documind-ai/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── documents/      # Document CRUD + file upload
│   │   ├── chat/           # RAG chat endpoint
│   │   ├── study-plans/    # Study plan generation
│   │   ├── quizzes/        # Quiz generation
│   │   └── stats/          # Dashboard statistics
│   ├── page.tsx            # Dashboard
│   ├── documents/          # Document manager UI
│   ├── chat/               # Chat interface
│   ├── study-plans/        # Study plans UI
│   ├── quizzes/            # Quizzes UI
│   └── admin/              # Admin panel
├── components/
│   └── Sidebar.tsx         # Navigation sidebar
├── lib/
│   ├── db.ts               # SQLite database layer
│   └── rag.ts              # RAG: text extraction, chunking, retrieval
├── data/                   # Created at runtime (gitignored)
│   ├── documind.db         # SQLite database
│   └── uploads/            # Uploaded document files
└── .env.local              # Your API key (gitignored)
```

---

## How It Works

### RAG Pipeline
1. **Upload** — Files are stored locally; text is extracted and split into ~500-word chunks
2. **Index** — Chunks are stored in SQLite with their source document
3. **Query** — User query is scored against all chunks using TF-IDF-style keyword overlap
4. **Generate** — Top-k relevant chunks are sent to Claude as context for grounded answers

### Agents
| Agent | Description |
|-------|-------------|
| **Document Chat** | Answers questions using retrieved document chunks |
| **Study Plan Agent** | Generates structured study plans with topics, objectives, and schedules |
| **Quiz Generator** | Creates multiple-choice questions with explanations |

---

## Supported File Types

| Format | Extension |
|--------|-----------|
| PDF | `.pdf` |
| Word Document | `.docx` |
| Plain Text | `.txt` |
| Markdown | `.md` |

---

## Troubleshooting

**`better-sqlite3` fails to install on Windows**
Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) and run:
```bash
npm install --global windows-build-tools
npm install
```

**API key not working**
Make sure your `.env.local` file exists (not just `.env.local.example`) and contains your valid key.

**Port already in use**
Run on a different port: `npm run dev -- -p 3001`
