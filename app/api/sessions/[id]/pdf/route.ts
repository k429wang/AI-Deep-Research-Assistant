import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { generatePDFBuffer } from '@/lib/pdf-generator';
import { sanitizeFilename } from '@/lib/utils';

// GET /api/sessions/[id]/pdf - Download the PDF for a session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const researchSession = await prisma.researchSession.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!researchSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!researchSession.openaiResult || !researchSession.geminiResult) {
      return NextResponse.json(
        { error: 'Research not completed yet' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generatePDFBuffer(
      researchSession.title,
      researchSession.initialPrompt,
      researchSession.refinedPrompt || undefined,
      researchSession.openaiResult,
      researchSession.geminiResult,
      researchSession.createdAt
    );

    // Sanitize title for filename
    const filename = `${sanitizeFilename(researchSession.title)} Research Report.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

