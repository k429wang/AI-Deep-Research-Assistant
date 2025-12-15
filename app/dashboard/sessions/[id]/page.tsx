'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ResearchSessionStatus } from '@/lib/types';
import LogoutButton from '@/components/LogoutButton';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

interface Refinement {
  id: string;
  question: string;
  answer: string | null;
  questionIndex: number;
  answeredAt: Date | null;
}

interface Session {
  id: string;
  title: string;
  initialPrompt: string;
  refinedPrompt: string | null;
  status: ResearchSessionStatus;
  openaiResult: string | null;
  geminiResult: string | null;
  pdfUrl: string | null;
  emailSentAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  refinements: Refinement[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchSession();
    // Poll for updates if research is in progress
    const interval = setInterval(() => {
      if (session?.status === ResearchSessionStatus.RUNNING_RESEARCH) {
        fetchSession();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [params.id, session?.status]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (questionIndex: number) => {
    if (!currentAnswer.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${params.id}/refinements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIndex,
          answer: currentAnswer,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit answer');
      const data = await response.json();
      setSession(data.session);
      setCurrentAnswer('');
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setModalOpen(false);
    setDeleting(true);

    try {
      const response = await fetch(`/api/sessions/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Redirect to dashboard after successful deletion and refresh
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setModalOpen(false);
  };

  const getStatusColor = (status: ResearchSessionStatus) => {
    switch (status) {
      case ResearchSessionStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ResearchSessionStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case ResearchSessionStatus.RUNNING_RESEARCH:
        return 'bg-yellow-100 text-yellow-800 animate-pulse';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <Link
            href="/dashboard"
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = session.refinements.find((r) => !r.answer);
  const isLastQuestion = currentQuestion && 
    currentQuestion.questionIndex === session.refinements.length - 1;
  const isResearching = session.status === ResearchSessionStatus.RUNNING_RESEARCH;
  const isCompleted = session.status === ResearchSessionStatus.COMPLETED;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <Link
            href="/dashboard"
            className="text-primary-600 hover:text-primary-700 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <LogoutButton />
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Research Session
                </h1>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  {session.title}
                </h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Initial Prompt:</p>
                    <p className="text-gray-600">{session.initialPrompt}</p>
                  </div>
                  {session.refinedPrompt && session.refinedPrompt !== session.initialPrompt && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">Refined Prompt:</p>
                      <p className="text-gray-600">{session.refinedPrompt}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                    session.status
                  )}`}
                >
                  {getStatusLabel(session.status)}
                </span>
                <button
                  onClick={handleDeleteClick}
                  disabled={deleting}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete session"
                >
                  {deleting ? (
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

          {/* Refinement Questions */}
          {currentQuestion && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Research: {session.title}</p>
                <h2 className="text-xl font-semibold text-gray-900">
                  Refinement Question {currentQuestion.questionIndex + 1} of{' '}
                  {session.refinements.length}
                </h2>
              </div>
              <p className="text-gray-700 mb-4">{currentQuestion.question}</p>
              <div className="space-y-4">
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Your answer..."
                />
                <button
                  onClick={() => handleSubmitAnswer(currentQuestion.questionIndex)}
                  disabled={!currentAnswer.trim() || submitting}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  {submitting 
                    ? 'Submitting...' 
                    : isLastQuestion 
                      ? 'Submit Answer & Start Research' 
                      : 'Submit Answer'}
                </button>
              </div>
            </div>
          )}

          {/* Research in Progress */}
          {isResearching && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500 mb-2">Research: {session.title}</p>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Research in Progress
                </h2>
                <p className="text-gray-600">
                  Conducting research with OpenAI and Google Gemini...
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {isCompleted && (
            <>
              {session.openaiResult && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    OpenAI Deep Research Results
                  </h2>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {session.openaiResult}
                    </pre>
                  </div>
                </div>
              )}

              {session.geminiResult && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Google Gemini Research Results
                  </h2>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {session.geminiResult}
                    </pre>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Download Report
                </h2>
                <a
                  href={`/api/sessions/${session.id}/pdf`}
                  download
                  className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors"
                >
                  Download PDF Report
                </a>
                {session.emailSentAt && (
                  <p className="mt-2 text-sm text-gray-600">
                    Report also sent to your email
                  </p>
                )}
              </div>
            </>
          )}

          {/* Error State */}
          {session.status === ResearchSessionStatus.FAILED && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                Research Failed
              </h2>
              <p className="text-red-700">{session.errorMessage || 'An error occurred'}</p>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={modalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        sessionPrompt={session.title}
      />
    </div>
  );
}

