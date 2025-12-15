import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { ResearchOrchestrator } from '@/lib/research-orchestrator';
import { z } from 'zod';

const submitRefinementSchema = z.object({
  questionIndex: z.number().int().min(0),
  answer: z.string().min(1).max(2000),
});

// POST /api/sessions/[id]/refinements - Submit a refinement answer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questionIndex, answer } = submitRefinementSchema.parse(body);

    await ResearchOrchestrator.submitRefinementAnswer(
      params.id,
      session.user.id,
      questionIndex,
      answer
    );

    // Return updated session
    const updatedSession = await ResearchOrchestrator.getSession(
      params.id,
      session.user.id
    );

    return NextResponse.json({ session: updatedSession });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error submitting refinement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit refinement' },
      { status: 500 }
    );
  }
}

