import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ResearchOrchestrator } from '@/lib/research-orchestrator';
import LogoutButton from '@/components/LogoutButton';
import SessionList from '@/components/SessionList';
import DashboardRefresh from '@/components/DashboardRefresh';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const sessions = await ResearchOrchestrator.listSessions(session.user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <DashboardRefresh />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Deep Research Assistant
            </h1>
            <p className="text-gray-600">
              Welcome back, {session.user.name || session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/new"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors"
            >
              New Research
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Research Sessions
          </h2>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No research sessions yet.</p>
              <Link
                href="/dashboard/new"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Start your first research →
              </Link>
            </div>
          ) : (
            <SessionList sessions={sessions} />
          )}
        </div>
      </div>
    </div>
  );
}

