import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { insertDocument, insertChunks, getAllDocuments, UPLOADS_DIR } from '@/lib/db';
import { extractText, getMimeType, chunkText, SUPPORTED_EXTENSIONS } from '@/lib/rag';

export async function GET() {
  try {
    const docs = getAllDocuments();
    return NextResponse.json({ documents: docs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 50MB.' }, { status: 400 });
    }

    const docId = uuidv4();
    const safeFilename = `${docId}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Extract text
    const mimeType = getMimeType(file.name);
    let content = '';
    try {
      content = await extractText(filePath, mimeType);
    } catch (e) {
      content = `[Text extraction failed: ${String(e)}]`;
    }

    // Store document
    insertDocument({
      id: docId,
      name: file.name,
      type: mimeType,
      size: file.size,
      file_path: filePath,
      content,
    });

    // Chunk and store
    const chunks = chunkText(content);
    const chunkRows = chunks.map((text, i) => ({
      id: uuidv4(),
      document_id: docId,
      content: text,
      chunk_index: i,
    }));
    if (chunkRows.length > 0) insertChunks(chunkRows);

    return NextResponse.json({
      document: { id: docId, name: file.name, type: mimeType, size: file.size, chunks: chunkRows.length },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
