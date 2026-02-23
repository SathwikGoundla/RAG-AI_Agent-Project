import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    apiKey: !!process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    status: 'ok',
  });
}
