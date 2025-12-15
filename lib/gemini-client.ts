import { GoogleGenerativeAI } from '@google/generative-ai';

const USE_MOCK = process.env.USE_MOCK_APIS === 'true';

/**
 * Mock Gemini client for local development
 */
class MockGeminiClient {
  async research(prompt: string): Promise<string> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return `# Gemini Research Results: ${prompt}\n\n## Overview\n\nThis is a mock research result from Google Gemini. In production, this would contain comprehensive research findings using Gemini's advanced capabilities.\n\n## Analysis\n\n### Primary Insights\n\n1. **Insight One**: Detailed analysis from Gemini's perspective on the first key point.\n2. **Insight Two**: Comprehensive examination of the second important aspect using Gemini's unique approach.\n3. **Insight Three**: In-depth exploration of the third critical element with Gemini's analytical framework.\n\n### Comparative Perspective\n\nGemini provides a different analytical lens compared to other research tools, offering unique perspectives and complementary insights.\n\n### Recommendations\n\nBased on Gemini's analysis, here are key recommendations:\n\n- Recommendation 1: Actionable insight based on the research\n- Recommendation 2: Strategic guidance for implementation\n- Recommendation 3: Long-term considerations and best practices\n\n## Conclusion\n\nSummary of Gemini's research findings and how they complement other research sources.`;
  }
}

/**
 * Real Gemini client
 */
class RealGeminiClient {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async research(prompt: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const result = await model.generateContent(
        `Please conduct comprehensive research on the following topic and provide detailed findings:\n\n${prompt}\n\nProvide a well-structured research report with:\n1. Executive summary\n2. Key findings\n3. Detailed analysis\n4. Conclusions and recommendations`
      );

      const response = await result.response;
      return response.text();
    } catch (error: any) {
      // Handle specific API errors
      if (error.status === 429) {
        throw new Error('Gemini rate limit exceeded. Please try again in a few minutes.');
      }
      if (error.status === 401 || error.status === 403) {
        throw new Error('Gemini API key is invalid or quota exceeded. Please check your API key and quota limits.');
      }
      if (error.message?.includes('quota') || error.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini API quota has been exceeded. Please check your quota limits in Google Cloud Console.');
      }
      if (error.message?.includes('billing') || error.message?.includes('BILLING')) {
        throw new Error('Gemini API billing issue. Please check your Google Cloud billing settings.');
      }
      throw new Error(`Gemini API error: ${error.message || 'Unknown error occurred'}`);
    }
  }
}

// Export the appropriate client
export const geminiClient = USE_MOCK ? new MockGeminiClient() : new RealGeminiClient();

