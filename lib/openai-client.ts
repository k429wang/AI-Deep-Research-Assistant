import OpenAI from 'openai';
import { DeepResearchResponse, RefinementQuestion } from './types';

const USE_MOCK = process.env.USE_MOCK_APIS === 'true';

/**
 * Mock OpenAI client for local development
 */
class MockOpenAIClient {
  async startDeepResearch(prompt: string): Promise<DeepResearchResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock: Return refinement questions for first call
    if (!prompt.includes('[REFINED]')) {
      return {
        requiresRefinement: true,
        refinementQuestions: [
          { question: 'What specific aspect of this topic interests you most?', index: 0 },
          { question: 'What is your target audience or use case?', index: 1 },
          { question: 'What depth of detail are you looking for?', index: 2 },
        ],
      };
    }

    // Mock: Return result after refinements
    return {
      requiresRefinement: false,
      result: `# Research Results for: ${prompt}\n\n## Executive Summary\n\nThis is a mock research result generated for testing purposes. In production, this would contain comprehensive research findings from OpenAI's Deep Research capabilities.\n\n## Key Findings\n\n1. **Finding One**: Detailed analysis of the first key point.\n2. **Finding Two**: Comprehensive examination of the second important aspect.\n3. **Finding Three**: In-depth exploration of the third critical element.\n\n## Detailed Analysis\n\n### Section 1\n\nDetailed content for section one with thorough analysis and insights.\n\n### Section 2\n\nComprehensive information for section two covering all relevant aspects.\n\n### Section 3\n\nIn-depth exploration of section three with supporting evidence and examples.\n\n## Conclusion\n\nSummary of findings and recommendations based on the research conducted.`,
    };
  }
}

/**
 * Real OpenAI client
 */
class RealOpenAIClient {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  async startDeepResearch(prompt: string): Promise<DeepResearchResponse> {
    try {
      // Use OpenAI's chat completion API for deep research
      // Note: OpenAI doesn't have a specific "Deep Research" API endpoint,
      // so we'll use a structured prompt with the chat completion API
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a deep research assistant. When given a research prompt, you should:
1. First, identify if the prompt needs clarification through refinement questions
2. If clarification is needed, return 2-4 specific, focused questions
3. If the prompt is clear, conduct comprehensive research and return detailed findings

Format your response as JSON with this structure:
{
  "requiresRefinement": boolean,
  "refinementQuestions": [{"question": string, "index": number}] (if requiresRefinement is true),
  "result": string (if requiresRefinement is false)
}`,
          },
          {
            role: 'user',
            content: `Research prompt: ${prompt}\n\nPlease analyze this prompt and either provide refinement questions or conduct the research.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(content);
        return {
          requiresRefinement: parsed.requiresRefinement || false,
          refinementQuestions: parsed.refinementQuestions || [],
          result: parsed.result,
        };
      } catch {
        // If not JSON, check if it looks like refinement questions or a result
        if (content.includes('?') && content.split('?').length > 2) {
          // Likely refinement questions
          const questions = content
            .split(/\d+[\.\)]/)
            .filter((q) => q.trim().length > 0)
            .map((q, idx) => ({
              question: q.trim().replace(/\?.*$/, '?').trim(),
              index: idx,
            }))
            .filter((q) => q.question.endsWith('?'))
            .slice(0, 4);

          return {
            requiresRefinement: questions.length > 0,
            refinementQuestions: questions,
          };
        }

        // Otherwise, treat as result
        return {
          requiresRefinement: false,
          result: content,
        };
      }
    } catch (error: any) {
      // Handle specific API errors
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a few minutes.');
      }
      if (error.status === 401) {
        throw new Error('OpenAI API key is invalid. Please check your configuration.');
      }
      if (error.status === 402 || error.status === 403) {
        throw new Error('OpenAI account has insufficient credits or quota exceeded. Please add credits to your OpenAI account.');
      }
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI account quota has been exceeded. Please add credits to your OpenAI account.');
      }
      if (error.message?.includes('quota') || error.message?.includes('billing')) {
        throw new Error('OpenAI account billing issue. Please check your OpenAI account billing settings.');
      }
      throw new Error(`OpenAI API error: ${error.message || 'Unknown error occurred'}`);
    }
  }
}

// Export the appropriate client
export const openaiClient = USE_MOCK ? new MockOpenAIClient() : new RealOpenAIClient();

