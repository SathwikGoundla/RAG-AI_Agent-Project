import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import {
  getSession,
  getSessionMessages,
  insertMessage,
  updateSessionTitle,
  getAllChunks,
  getChunksForDocuments,
} from '@/lib/db';
import { retrieveRelevantChunks, formatContextForPrompt } from '@/lib/rag';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    const messages = getSessionMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, documentIds = [] } = body;

    console.log('Chat API called:', { sessionId, message, documentIds });

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing sessionId or message' }, { status: 400 });
    }

    const session = getSession(sessionId) as { id: string; title: string; document_ids: string } | undefined;
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Get relevant document chunks via RAG
    const allDocs = documentIds.length > 0 ? documentIds : JSON.parse(session.document_ids || '[]');
    console.log('All docs for chunking:', allDocs);
    
    const chunks = allDocs.length > 0 ? getChunksForDocuments(allDocs) : getAllChunks();
    console.log('Total chunks available:', chunks.length);
    
    const relevantChunks = retrieveRelevantChunks(message, chunks, 6);
    console.log('Relevant chunks found:', relevantChunks.length);
    
    const context = formatContextForPrompt(relevantChunks);
    console.log('Context prepared:', context.length, 'chars');

    // Build conversation history
    const history = getSessionMessages(sessionId) as Array<{ role: string; content: string }>;
    const anthropicMessages = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add current user message
    anthropicMessages.push({ role: 'user', content: message });

    // System prompt for RAG
    const systemPrompt = `You are DocuMind AI, an intelligent document assistant. Answer questions based on the provided document context below. 

Guidelines:
- Ground your answers in the document content provided
- If the answer is not in the documents, say so clearly
- Be concise, accurate, and helpful
- Use markdown formatting for structured responses
- Cite which document(s) you're drawing from when relevant

Document Context:
${context}`;

    // Save user message
    const userMsgId = uuidv4();
    insertMessage({ id: userMsgId, session_id: sessionId, role: 'user', content: message });

    // Update session title if first message
    if (history.length === 0) {
      const shortTitle = message.length > 50 ? message.slice(0, 47) + '...' : message;
      updateSessionTitle(sessionId, shortTitle);
    }

    // Call Claude (streaming)
    console.log('Calling Claude API with model:', MODEL);
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    
    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: parseInt(process.env.MAX_TOKENS || '4096'),
      system: systemPrompt,
      messages: anthropicMessages,
    });

    let fullResponse = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              fullResponse += text;
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }

          // Save assistant message
          const asstMsgId = uuidv4();
          insertMessage({ id: asstMsgId, session_id: sessionId, role: 'assistant', content: fullResponse });

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, sources: relevantChunks.map(c => c.document_name) })}\n\n`));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
