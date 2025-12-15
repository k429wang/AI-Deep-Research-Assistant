import { openaiClient } from '@/lib/openai-client';

// Mock environment variable
const originalEnv = process.env.USE_MOCK_APIS;

describe('OpenAI Client', () => {
  beforeEach(() => {
    process.env.USE_MOCK_APIS = 'true';
  });

  afterEach(() => {
    process.env.USE_MOCK_APIS = originalEnv;
  });

  it('should return refinement questions for initial prompt', async () => {
    const response = await openaiClient.startDeepResearch('Test research topic');
    expect(response.requiresRefinement).toBe(true);
    expect(response.refinementQuestions).toBeDefined();
    expect(response.refinementQuestions?.length).toBeGreaterThan(0);
  });

  it('should return result for refined prompt', async () => {
    const response = await openaiClient.startDeepResearch(
      'Test research topic [REFINED]'
    );
    expect(response.requiresRefinement).toBe(false);
    expect(response.result).toBeDefined();
    expect(response.result?.length).toBeGreaterThan(0);
  });
});

