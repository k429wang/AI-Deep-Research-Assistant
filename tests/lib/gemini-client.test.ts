import { geminiClient } from '@/lib/gemini-client';

const originalEnv = process.env.USE_MOCK_APIS;

describe('Gemini Client', () => {
  beforeEach(() => {
    process.env.USE_MOCK_APIS = 'true';
  });

  afterEach(() => {
    process.env.USE_MOCK_APIS = originalEnv;
  });

  it('should return research results', async () => {
    const result = await geminiClient.research('Test research topic');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('Gemini');
  });
});

