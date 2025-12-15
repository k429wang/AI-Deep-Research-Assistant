import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { ResearchOrchestrator } from '@/lib/research-orchestrator';
import { z } from 'zod';

const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  initialPrompt: z.string().min(1).max(5000),
});

// GET /api/sessions - List all sessions for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await ResearchOrchestrator.listSessions(session.user.id);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Error listing sessions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new research session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, initialPrompt } = createSessionSchema.parse(body);

    const researchSession = await ResearchOrchestrator.startSession(
      session.user.id,
      title,
      initialPrompt
    );

    // Revalidate the dashboard to ensure fresh data
    revalidatePath('/dashboard');

    return NextResponse.json({ session: researchSession }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}

