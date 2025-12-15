import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { ResearchOrchestrator } from '@/lib/research-orchestrator';
import { prisma } from '@/lib/db';

// GET /api/sessions/[id] - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const researchSession = await ResearchOrchestrator.getSession(
      params.id,
      session.user.id
    );

    return NextResponse.json({ session: researchSession });
  } catch (error: any) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get session' },
      { status: 404 }
    );
  }
}

// DELETE /api/sessions/[id] - Delete a specific session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session ownership before deleting
    const researchSession = await prisma.researchSession.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!researchSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete the session (cascade will delete refinements)
    await prisma.researchSession.delete({
      where: { id: params.id },
    });

    // Revalidate the dashboard to ensure fresh data
    revalidatePath('/dashboard');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete session' },
      { status: 500 }
    );
  }
}

