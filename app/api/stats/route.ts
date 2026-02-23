import { NextResponse } from 'next/server';
import { getStats, getAllDocuments } from '@/lib/db';

export async function GET() {
  try {
    const stats = getStats();
    const docs = getAllDocuments() as Array<{ id: string; name: string; type: string; size: number; created_at: number }>;
    const recentDocs = docs.slice(0, 5);
    return NextResponse.json({ stats, recentDocs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
