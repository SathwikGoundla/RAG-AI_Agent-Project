import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDocument, insertQuiz, getAllQuizzes, deleteQuiz } from '@/lib/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index 0-3
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export async function GET() {
  try {
    const quizzes = getAllQuizzes();
    return NextResponse.json({ quizzes });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { documentId, numQuestions = 10, difficulty = 'mixed' } = await req.json();
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });

    const doc = getDocument(documentId) as { id: string; name: string; content: string } | undefined;
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const content = doc.content.slice(0, 15000);

    const prompt = `You are an expert quiz creator. Based on the document below, create ${numQuestions} multiple-choice questions.

Document: "${doc.name}"
Difficulty: ${difficulty}
Content:
${content}

Generate exactly ${numQuestions} questions. Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct",
    "difficulty": "medium"
  }
]

Rules:
- correctAnswer is the index (0-3) of the correct option in the options array
- Each question must have exactly 4 options
- Difficulty must be "easy", "medium", or "hard"
- Questions should test genuine understanding, not just memorization
- Explanations should be informative and educational
- Cover different aspects of the document`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: parseInt(process.env.MAX_TOKENS || '4096'),
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '[]';
    
    // Parse JSON, stripping any markdown code fences
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let questions: QuizQuestion[];
    try {
      questions = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse quiz questions from AI response' }, { status: 500 });
    }

    const quizId = uuidv4();
    const title = `Quiz: ${doc.name}`;

    insertQuiz({
      id: quizId,
      document_id: documentId,
      document_name: doc.name,
      title,
      questions: JSON.stringify(questions),
    });

    return NextResponse.json({ quiz: { id: quizId, title, questions, document_name: doc.name } });
  } catch (err) {
    console.error('Quiz error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    deleteQuiz(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
