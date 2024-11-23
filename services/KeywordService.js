import { ApiService } from './ApiService.js';
import NodeCache from 'node-cache';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const cache = new NodeCache({ stdTTL: 3600 });
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60
});

export class KeywordService {
  constructor() {
    this.apiService = new ApiService();
  }

  async getKeywordAnalysis(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid keyword');
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      throw new Error('Empty keyword');
    }

    const cacheKey = `analysis-${normalizedQuery}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      await rateLimiter.consume('analysis');

      const [suggestions, questions, difficulty] = await Promise.all([
        this.apiService.getAutoSuggestions(normalizedQuery),
        this.apiService.getQuestions(normalizedQuery),
        this.apiService.getKeywordDifficulty(normalizedQuery)
      ]);

      const analysis = {
        keyword: normalizedQuery,
        difficulty,
        suggestions: suggestions || [],
        questions: questions || [],
        timestamp: new Date().toISOString()
      };

      cache.set(cacheKey, analysis);
      return analysis;
    } catch (error) {
      console.error('Keyword analysis error:', error);
      throw new Error('Analysis failed');
    }
  }
}