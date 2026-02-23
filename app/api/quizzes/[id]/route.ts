import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const quiz = getQuiz(params.id) as { id: string; questions: string } | undefined;
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ questions: JSON.parse(quiz.questions) });
}
