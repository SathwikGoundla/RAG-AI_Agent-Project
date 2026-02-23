import { NextRequest, NextResponse } from 'next/server';
import { getStudyPlan } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const plan = getStudyPlan(params.id) as { id: string; content: string } | undefined;
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ content: plan.content });
}
