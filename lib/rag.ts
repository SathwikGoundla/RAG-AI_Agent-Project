import fs from 'fs';
import path from 'path';

// ─── Text Extraction ──────────────────────────────────────────────────────────

export async function extractText(filePath: string, mimeType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  if (mimeType === 'application/pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text / Markdown
  return buffer.toString('utf-8');
}

export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.md': 'text/plain',
  };
  return map[ext] || 'text/plain';
}

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

// ─── Chunking ─────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 600;      // target words per chunk
const CHUNK_OVERLAP = 100;   // words overlap between chunks

export function chunkText(text: string): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Split into paragraphs first
  const paragraphs = normalized.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    
    if (currentWordCount + words.length > CHUNK_SIZE && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap: take last N words from current chunk as start of next
      const overlapWords = currentChunk.trim().split(/\s+/).slice(-CHUNK_OVERLAP);
      currentChunk = overlapWords.join(' ') + '\n\n' + para;
      currentWordCount = overlapWords.length + words.length;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
      currentWordCount += words.length;
    }

    // If a single paragraph is too large, split it by sentences
    if (words.length > CHUNK_SIZE * 1.5) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      let sentChunk = '';
      let sentCount = 0;
      for (const sent of sentences) {
        const sentWords = sent.split(/\s+/).length;
        if (sentCount + sentWords > CHUNK_SIZE && sentChunk) {
          chunks.push(sentChunk.trim());
          sentChunk = sent;
          sentCount = sentWords;
        } else {
          sentChunk += ' ' + sent;
          sentCount += sentWords;
        }
      }
      if (sentChunk.trim()) chunks.push(sentChunk.trim());
      currentChunk = '';
      currentWordCount = 0;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter(c => c.length > 50); // Skip tiny chunks
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

// Stop words to ignore during scoring
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
  'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were',
  'has', 'had', 'been', 'being', 'am', 'does', 'did', 'doing',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function buildTF(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  // Normalize
  for (const [k, v] of freq) freq.set(k, v / tokens.length);
  return freq;
}

export type ScoredChunk = {
  id: string;
  document_id: string;
  document_name: string;
  content: string;
  chunk_index: number;
  score: number;
};

export function retrieveRelevantChunks(
  query: string,
  chunks: Array<{ id: string; document_id: string; document_name: string; content: string; chunk_index: number }>,
  topK: number = 6
): ScoredChunk[] {
  const queryTokens = tokenize(query);
  const queryTF = buildTF(queryTokens);

  const scored = chunks.map(chunk => {
    const chunkTokens = tokenize(chunk.content);
    const chunkTF = buildTF(chunkTokens);

    // BM25-like scoring
    let score = 0;
    const k1 = 1.5;
    const b = 0.75;
    const avgLen = 400; // approximate average chunk length in tokens

    for (const [term, qfreq] of queryTF) {
      const tf = chunkTF.get(term) || 0;
      if (tf === 0) continue;

      // BM25 term score
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (chunkTokens.length / avgLen));
      score += qfreq * (numerator / denominator);
    }

    // Bonus for exact phrase matches
    const queryLower = query.toLowerCase();
    const chunkLower = chunk.content.toLowerCase();
    if (chunkLower.includes(queryLower)) score += 2;

    // Bonus for partial phrase (bigrams)
    const qWords = queryLower.split(/\s+/);
    for (let i = 0; i < qWords.length - 1; i++) {
      const bigram = qWords[i] + ' ' + qWords[i + 1];
      if (chunkLower.includes(bigram)) score += 0.5;
    }

    return { ...chunk, score };
  });

  return scored
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function formatContextForPrompt(chunks: ScoredChunk[]): string {
  if (chunks.length === 0) return 'No relevant document content found.';

  // Group by document
  const byDoc = new Map<string, ScoredChunk[]>();
  for (const chunk of chunks) {
    const key = chunk.document_id;
    if (!byDoc.has(key)) byDoc.set(key, []);
    byDoc.get(key)!.push(chunk);
  }

  let context = '';
  for (const [, docChunks] of byDoc) {
    const docName = docChunks[0].document_name;
    context += `\n--- Document: ${docName} ---\n`;
    for (const chunk of docChunks) {
      context += `\n${chunk.content}\n`;
    }
  }
  return context.trim();
}
