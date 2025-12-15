import { prisma } from './db';

/**
 * API Usage Limits Configuration
 * These limits protect your API accounts from overbilling
 */
export const API_LIMITS = {
  // Per-user daily limits
  OPENAI_DAILY_LIMIT: parseInt(process.env.OPENAI_DAILY_LIMIT || '10', 10),
  GEMINI_DAILY_LIMIT: parseInt(process.env.GEMINI_DAILY_LIMIT || '20', 10),
  
  // Per-user monthly limits
  OPENAI_MONTHLY_LIMIT: parseInt(process.env.OPENAI_MONTHLY_LIMIT || '100', 10),
  GEMINI_MONTHLY_LIMIT: parseInt(process.env.GEMINI_MONTHLY_LIMIT || '200', 10),
  
  // Global daily limits (across all users)
  OPENAI_GLOBAL_DAILY_LIMIT: parseInt(process.env.OPENAI_GLOBAL_DAILY_LIMIT || '50', 10),
  GEMINI_GLOBAL_DAILY_LIMIT: parseInt(process.env.GEMINI_GLOBAL_DAILY_LIMIT || '100', 10),
};

export class ApiUsageGuard {
  /**
   * Check if user can make an OpenAI request
   */
  static async canMakeOpenAIRequest(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get or create usage record
      let usage = await prisma.apiUsage.findUnique({
        where: { userId },
      });

      if (!usage) {
        usage = await prisma.apiUsage.create({
          data: { userId },
        });
      }

      // Reset daily counters if it's a new day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastReset = new Date(usage.lastResetDate);
      lastReset.setHours(0, 0, 0, 0);

      if (today.getTime() > lastReset.getTime()) {
        usage = await prisma.apiUsage.update({
          where: { userId },
          data: {
            openaiRequestsToday: 0,
            geminiRequestsToday: 0,
            lastResetDate: today,
          },
        });
      }

      // Reset monthly counter if it's a new month
      const currentMonth = today.getMonth();
      const lastResetMonth = lastReset.getMonth();
      const currentYear = today.getFullYear();
      const lastResetYear = lastReset.getFullYear();

      if (currentMonth !== lastResetMonth || currentYear !== lastResetYear) {
        usage = await prisma.apiUsage.update({
          where: { userId },
          data: {
            openaiRequestsMonth: 0,
            geminiRequestsMonth: 0,
            lastResetDate: today,
          },
        });
      }

      // Check daily limit
      if (usage.openaiRequestsToday >= API_LIMITS.OPENAI_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: `Daily OpenAI limit reached (${API_LIMITS.OPENAI_DAILY_LIMIT} requests). Please try again tomorrow.`,
        };
      }

      // Check monthly limit
      if (usage.openaiRequestsMonth >= API_LIMITS.OPENAI_MONTHLY_LIMIT) {
        return {
          allowed: false,
          reason: `Monthly OpenAI limit reached (${API_LIMITS.OPENAI_MONTHLY_LIMIT} requests). Limit resets at the start of next month.`,
        };
      }

      // Check global daily limit
      const globalUsageToday = await prisma.apiUsage.aggregate({
        _sum: {
          openaiRequestsToday: true,
        },
      });

      const totalGlobalToday = globalUsageToday._sum.openaiRequestsToday || 0;
      if (totalGlobalToday >= API_LIMITS.OPENAI_GLOBAL_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: 'Service temporarily unavailable due to high demand. Please try again later.',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking OpenAI usage:', error);
      // Fail open - allow request but log error
      return { allowed: true };
    }
  }

  /**
   * Check if user can make a Gemini request
   */
  static async canMakeGeminiRequest(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get or create usage record
      let usage = await prisma.apiUsage.findUnique({
        where: { userId },
      });

      if (!usage) {
        usage = await prisma.apiUsage.create({
          data: { userId },
        });
      }

      // Reset daily counters if it's a new day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastReset = new Date(usage.lastResetDate);
      lastReset.setHours(0, 0, 0, 0);

      if (today.getTime() > lastReset.getTime()) {
        usage = await prisma.apiUsage.update({
          where: { userId },
          data: {
            openaiRequestsToday: 0,
            geminiRequestsToday: 0,
            lastResetDate: today,
          },
        });
      }

      // Reset monthly counter if it's a new month
      const currentMonth = today.getMonth();
      const lastResetMonth = lastReset.getMonth();
      const currentYear = today.getFullYear();
      const lastResetYear = lastReset.getFullYear();

      if (currentMonth !== lastResetMonth || currentYear !== lastResetYear) {
        usage = await prisma.apiUsage.update({
          where: { userId },
          data: {
            openaiRequestsMonth: 0,
            geminiRequestsMonth: 0,
            lastResetDate: today,
          },
        });
      }

      // Check daily limit
      if (usage.geminiRequestsToday >= API_LIMITS.GEMINI_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: `Daily Gemini limit reached (${API_LIMITS.GEMINI_DAILY_LIMIT} requests). Please try again tomorrow.`,
        };
      }

      // Check monthly limit
      if (usage.geminiRequestsMonth >= API_LIMITS.GEMINI_MONTHLY_LIMIT) {
        return {
          allowed: false,
          reason: `Monthly Gemini limit reached (${API_LIMITS.GEMINI_MONTHLY_LIMIT} requests). Limit resets at the start of next month.`,
        };
      }

      // Check global daily limit
      const globalUsageToday = await prisma.apiUsage.aggregate({
        _sum: {
          geminiRequestsToday: true,
        },
      });

      const totalGlobalToday = globalUsageToday._sum.geminiRequestsToday || 0;
      if (totalGlobalToday >= API_LIMITS.GEMINI_GLOBAL_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: 'Service temporarily unavailable due to high demand. Please try again later.',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking Gemini usage:', error);
      // Fail open - allow request but log error
      return { allowed: true };
    }
  }

  /**
   * Record an OpenAI API call
   */
  static async recordOpenAIRequest(userId: string): Promise<void> {
    try {
      await prisma.apiUsage.upsert({
        where: { userId },
        create: {
          userId,
          openaiRequestsToday: 1,
          openaiRequestsMonth: 1,
        },
        update: {
          openaiRequestsToday: { increment: 1 },
          openaiRequestsMonth: { increment: 1 },
        },
      });
    } catch (error) {
      console.error('Error recording OpenAI usage:', error);
      // Don't throw - usage tracking failure shouldn't break the app
    }
  }

  /**
   * Record a Gemini API call
   */
  static async recordGeminiRequest(userId: string): Promise<void> {
    try {
      await prisma.apiUsage.upsert({
        where: { userId },
        create: {
          userId,
          geminiRequestsToday: 1,
          geminiRequestsMonth: 1,
        },
        update: {
          geminiRequestsToday: { increment: 1 },
          geminiRequestsMonth: { increment: 1 },
        },
      });
    } catch (error) {
      console.error('Error recording Gemini usage:', error);
      // Don't throw - usage tracking failure shouldn't break the app
    }
  }

  /**
   * Get user's current usage stats
   */
  static async getUserUsage(userId: string) {
    const usage = await prisma.apiUsage.findUnique({
      where: { userId },
    });

    if (!usage) {
      return {
        openai: { today: 0, month: 0, dailyLimit: API_LIMITS.OPENAI_DAILY_LIMIT, monthlyLimit: API_LIMITS.OPENAI_MONTHLY_LIMIT },
        gemini: { today: 0, month: 0, dailyLimit: API_LIMITS.GEMINI_DAILY_LIMIT, monthlyLimit: API_LIMITS.GEMINI_MONTHLY_LIMIT },
      };
    }

    return {
      openai: {
        today: usage.openaiRequestsToday,
        month: usage.openaiRequestsMonth,
        dailyLimit: API_LIMITS.OPENAI_DAILY_LIMIT,
        monthlyLimit: API_LIMITS.OPENAI_MONTHLY_LIMIT,
      },
      gemini: {
        today: usage.geminiRequestsToday,
        month: usage.geminiRequestsMonth,
        dailyLimit: API_LIMITS.GEMINI_DAILY_LIMIT,
        monthlyLimit: API_LIMITS.GEMINI_MONTHLY_LIMIT,
      },
    };
  }
}

