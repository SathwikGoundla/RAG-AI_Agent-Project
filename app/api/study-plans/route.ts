import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDocument, insertStudyPlan, getAllStudyPlans, deleteStudyPlan } from '@/lib/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export async function GET() {
  try {
    const plans = getAllStudyPlans();
    return NextResponse.json({ studyPlans: plans });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { documentId, focusArea, duration } = await req.json();
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });

    const doc = getDocument(documentId) as { id: string; name: string; content: string } | undefined;
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Limit content to avoid token limits
    const content = doc.content.slice(0, 15000);

    const prompt = `You are an expert educator and curriculum designer. Based on the following document content, create a comprehensive, structured study plan.

${focusArea ? `Focus area: ${focusArea}` : ''}
${duration ? `Target duration: ${duration}` : 'Target duration: 2 weeks'}

Document: "${doc.name}"
Content:
${content}

Create a detailed study plan with:
1. **Overview** - Brief summary of what will be learned
2. **Learning Objectives** - 5-8 specific, measurable objectives
3. **Weekly Schedule** - Day-by-day breakdown
4. **Key Topics** - Main concepts to master (with time estimates)
5. **Study Strategies** - Recommended methods for this content
6. **Resources Needed** - Any supplementary materials suggested
7. **Assessment Milestones** - How to measure progress
8. **Review Schedule** - Spaced repetition plan

Format the response in clean Markdown with clear headings and bullet points.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: parseInt(process.env.MAX_TOKENS || '4096'),
      messages: [{ role: 'user', content: prompt }],
    });

    const planContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const title = `Study Plan: ${doc.name}${focusArea ? ` (${focusArea})` : ''}`;
    const planId = uuidv4();

    insertStudyPlan({
      id: planId,
      document_id: documentId,
      document_name: doc.name,
      title,
      content: planContent,
    });

    return NextResponse.json({ studyPlan: { id: planId, title, content: planContent, document_name: doc.name } });
  } catch (err) {
    console.error('Study plan error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    deleteStudyPlan(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
