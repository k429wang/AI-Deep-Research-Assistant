'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ResearchSessionStatus } from '@/lib/types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface Session {
  id: string;
  title: string;
  initialPrompt: string;
  status: string;
  createdAt: Date;
}

interface SessionListProps {
  sessions: Session[];
}

export default function SessionList({ sessions }: SessionListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; prompt: string } | null>(null);

  const getStatusColor = (status: ResearchSessionStatus) => {
    switch (status) {
      case ResearchSessionStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ResearchSessionStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case ResearchSessionStatus.RUNNING_RESEARCH:
        return 'bg-yellow-100 text-yellow-800';
      case ResearchSessionStatus.AWAITING_REFINEMENTS:
      case ResearchSessionStatus.REFINEMENTS_IN_PROGRESS:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ResearchSessionStatus) => {
    if (status === ResearchSessionStatus.AWAITING_REFINEMENTS || 
        status === ResearchSessionStatus.REFINEMENTS_IN_PROGRESS) {
      return 'Awaiting Refinements';
    }
    return String(status).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string, sessionPrompt: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSessionToDelete({ id: sessionId, prompt: sessionPrompt });
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;

    setDeletingId(sessionToDelete.id);
    setModalOpen(false);

    try {
      const response = await fetch(`/api/sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Refresh the router to fetch fresh data from the server
      router.refresh();
      setDeletingId(null);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
      setDeletingId(null);
      setSessionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setModalOpen(false);
    setSessionToDelete(null);
  };

  return (
    <>
      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="group relative p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <Link
                href={`/dashboard/sessions/${session.id}`}
                className="flex-1 pr-4"
              >
                <h3 className="font-semibold text-gray-900 mb-1">
                  {session.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(session.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    session.status as ResearchSessionStatus
                  )}`}
                >
                  {getStatusLabel(session.status as ResearchSessionStatus)}
                </span>
                <button
                  onClick={(e) => handleDeleteClick(e, session.id, session.title)}
                  disabled={deletingId === session.id}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete session"
                >
                  {deletingId === session.id ? (
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmModal
        isOpen={modalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        sessionPrompt={sessionToDelete?.prompt || ''}
      />
    </>
  );
}

