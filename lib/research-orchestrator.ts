import { prisma } from './db';
import { openaiClient } from './openai-client';
import { geminiClient } from './gemini-client';
import { generatePDFBuffer } from './pdf-generator';
import { emailService } from './email-service';
import { ResearchSessionStatus } from './types';
import { ResearchSessionStateMachine } from './state-machine';
import { ApiUsageGuard } from './api-usage-guard';

/**
 * Orchestrates the complete research workflow
 */
export class ResearchOrchestrator {
  /**
   * Start a new research session
   */
  static async startSession(userId: string, title: string, initialPrompt: string) {
    // Create session in database
    const session = await prisma.researchSession.create({
      data: {
        userId,
        title,
        initialPrompt,
        status: ResearchSessionStatus.CREATED,
      },
    });

    // Start the research process
    try {
      // Check usage limits before making API call
      const canMakeRequest = await ApiUsageGuard.canMakeOpenAIRequest(userId);
      if (!canMakeRequest.allowed) {
        await prisma.researchSession.update({
          where: { id: session.id },
          data: {
            status: ResearchSessionStatus.FAILED,
            errorMessage: canMakeRequest.reason || 'API usage limit reached',
          },
        });
        throw new Error(canMakeRequest.reason || 'API usage limit reached');
      }

      const response = await openaiClient.startDeepResearch(initialPrompt);
      
      // Record successful API call
      await ApiUsageGuard.recordOpenAIRequest(userId);

      if (response.requiresRefinement && response.refinementQuestions) {
        // Create refinement questions
        await prisma.refinement.createMany({
          data: response.refinementQuestions.map((q) => ({
            researchSessionId: session.id,
            question: q.question,
            questionIndex: q.index,
          })),
        });

        // Update session status
        await prisma.researchSession.update({
          where: { id: session.id },
          data: { status: ResearchSessionStatus.AWAITING_REFINEMENTS },
        });
      } else if (response.result) {
        // No refinements needed, proceed directly to research
        await this.runResearch(session.id, initialPrompt);
      }
    } catch (error: any) {
      await prisma.researchSession.update({
        where: { id: session.id },
        data: {
          status: ResearchSessionStatus.FAILED,
          errorMessage: error.message,
        },
      });
      throw error;
    }

    return session;
  }

  /**
   * Submit an answer to a refinement question
   */
  static async submitRefinementAnswer(
    sessionId: string,
    userId: string,
    questionIndex: number,
    answer: string
  ) {
    // Verify session ownership
    const session = await prisma.researchSession.findFirst({
      where: { id: sessionId, userId },
      include: { refinements: true },
    });

    if (!session) {
      throw new Error('Session not found or access denied');
    }

    // Update refinement answer
    const refinement = session.refinements.find((r) => r.questionIndex === questionIndex);
    if (!refinement) {
      throw new Error('Refinement question not found');
    }

    await prisma.refinement.update({
      where: { id: refinement.id },
      data: {
        answer,
        answeredAt: new Date(),
      },
    });

    // Update session status
    const updatedSession = await prisma.researchSession.findUnique({
      where: { id: sessionId },
      include: { refinements: true },
    });

    if (!updatedSession) {
      throw new Error('Session not found');
    }

    // Check if all refinements are answered
    const allAnswered = updatedSession.refinements.every((r) => r.answer);
    if (allAnswered && updatedSession.refinements.length > 0) {
      await prisma.researchSession.update({
        where: { id: sessionId },
        data: { status: ResearchSessionStatus.REFINEMENTS_COMPLETE },
      });

      // Generate refined prompt and run research
      const refinedPrompt = this.generateRefinedPrompt(
        updatedSession.initialPrompt,
        updatedSession.refinements
      );

      await prisma.researchSession.update({
        where: { id: sessionId },
        data: { refinedPrompt },
      });

      // Run research with refined prompt
      await this.runResearch(sessionId, refinedPrompt);
    } else {
      await prisma.researchSession.update({
        where: { id: sessionId },
        data: { status: ResearchSessionStatus.REFINEMENTS_IN_PROGRESS },
      });
    }
  }

  /**
   * Generate refined prompt from initial prompt and refinement answers
   */
  private static generateRefinedPrompt(
    initialPrompt: string,
    refinements: Array<{ question: string; answer: string | null }>
  ): string {
    const answers = refinements
      .filter((r) => r.answer)
      .map((r) => `Q: ${r.question}\nA: ${r.answer}`)
      .join('\n\n');

    return `${initialPrompt}\n\n[REFINED]\n\nAdditional context based on clarifications:\n${answers}`;
  }

  /**
   * Run the actual research (OpenAI + Gemini)
   */
  private static async runResearch(sessionId: string, prompt: string) {
    await prisma.researchSession.update({
      where: { id: sessionId },
      data: { status: ResearchSessionStatus.RUNNING_RESEARCH },
    });

    try {
      // Get session to access userId
      const sessionData = await prisma.researchSession.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (!sessionData) {
        throw new Error('Session not found');
      }

      const userId = sessionData.userId;

      // Check usage limits before making API calls
      const canMakeOpenAI = await ApiUsageGuard.canMakeOpenAIRequest(userId);
      const canMakeGemini = await ApiUsageGuard.canMakeGeminiRequest(userId);

      if (!canMakeOpenAI.allowed || !canMakeGemini.allowed) {
        const errorMsg = [
          !canMakeOpenAI.allowed ? canMakeOpenAI.reason : null,
          !canMakeGemini.allowed ? canMakeGemini.reason : null,
        ]
          .filter(Boolean)
          .join(' ');

        await prisma.researchSession.update({
          where: { id: sessionId },
          data: {
            status: ResearchSessionStatus.FAILED,
            errorMessage: errorMsg || 'API usage limit reached',
          },
        });
        throw new Error(errorMsg || 'API usage limit reached');
      }

      // Run both research providers in parallel
      const [openaiResult, geminiResult] = await Promise.allSettled([
        openaiClient.startDeepResearch(prompt).then(async (r) => {
          await ApiUsageGuard.recordOpenAIRequest(userId);
          return r.result || '';
        }),
        geminiClient.research(prompt).then(async (result) => {
          await ApiUsageGuard.recordGeminiRequest(userId);
          return result;
        }),
      ]);

      const openaiText =
        openaiResult.status === 'fulfilled' ? openaiResult.value : 'Research failed';
      const geminiText =
        geminiResult.status === 'fulfilled' ? geminiResult.value : 'Research failed';

      // Update session with results
      const session = await prisma.researchSession.update({
        where: { id: sessionId },
        data: {
          openaiResult: openaiText,
          geminiResult: geminiText,
          status: ResearchSessionStatus.COMPLETED,
        },
        include: { user: true },
      });

      // Generate PDF
      const pdfBuffer = await generatePDFBuffer(
        session.title,
        session.initialPrompt,
        session.refinedPrompt || undefined,
        session.openaiResult || undefined,
        session.geminiResult || undefined,
        session.createdAt
      );

      // Store PDF (in production, upload to cloud storage)
      // For now, we'll store it as base64 in the database or use a file system
      const pdfBase64 = pdfBuffer.toString('base64');
      // In production, upload to S3/Cloud Storage and store URL
      const pdfUrl = `/api/sessions/${sessionId}/pdf`; // Temporary URL

      await prisma.researchSession.update({
        where: { id: sessionId },
        data: {
          pdfUrl,
          pdfGeneratedAt: new Date(),
        },
      });

      // Send email with PDF
      if (session.user.email) {
        try {
          await emailService.sendPDF(session.user.email, pdfBuffer, session.title, sessionId);
          await prisma.researchSession.update({
            where: { id: sessionId },
            data: { emailSentAt: new Date() },
          });
        } catch (emailError: any) {
          console.error('Failed to send email:', emailError);
          // Don't fail the whole process if email fails
        }
      }
    } catch (error: any) {
      await prisma.researchSession.update({
        where: { id: sessionId },
        data: {
          status: ResearchSessionStatus.FAILED,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Get session with all details
   */
  static async getSession(sessionId: string, userId: string) {
    const session = await prisma.researchSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        refinements: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found or access denied');
    }

    return session;
  }

  /**
   * List all sessions for a user
   */
  static async listSessions(userId: string, limit = 50) {
    return prisma.researchSession.findMany({
      where: { userId },
      include: {
        refinements: {
          orderBy: { questionIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

