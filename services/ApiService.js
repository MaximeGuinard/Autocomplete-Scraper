import axios from 'axios';
import NodeCache from 'node-cache';
import googleTrends from 'google-trends-api';

const cache = new NodeCache({ stdTTL: 3600 });

export class ApiService {
  constructor() {
    this.DATAMUSE_API = 'https://api.datamuse.com/words';
    this.GOOGLE_TRENDS_API = 'https://trends.google.com/trends/api';
  }

  async getAutoSuggestions(query) {
    try {
      const cacheKey = `suggestions-${query}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const [datamuseResults, trendsResults] = await Promise.all([
        this.getDatamuseSuggestions(query),
        this.getGoogleTrendsSuggestions(query)
      ]);

      const suggestions = [...datamuseResults, ...trendsResults]
        .filter((item, index, self) => 
          index === self.findIndex(t => t.keyword === item.keyword)
        )
        .slice(0, 10);

      cache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Auto-suggestions error:', error);
      return [];
    }
  }

  async getDatamuseSuggestions(query) {
    try {
      const [related, means] = await Promise.all([
        axios.get(`${this.DATAMUSE_API}?rel_trg=${encodeURIComponent(query)}&max=10`),
        axios.get(`${this.DATAMUSE_API}?ml=${encodeURIComponent(query)}&max=10`)
      ]);

      return Array.from(new Set([...related.data, ...means.data]))
        .filter(item => item.word && item.score)
        .map(item => ({
          keyword: item.word,
          score: Math.min(100, Math.max(20, Math.round((item.score / 1000) * 100)))
        }));
    } catch (error) {
      return [];
    }
  }

  async getGoogleTrendsSuggestions(query) {
    try {
      const results = await googleTrends.relatedQueries({
        keyword: query,
        geo: 'FR',
        hl: 'fr'
      });

      const data = JSON.parse(results);
      if (data.default.rankedList && data.default.rankedList[0]?.rankedKeyword) {
        return data.default.rankedList[0].rankedKeyword
          .slice(0, 5)
          .map(item => ({
            keyword: item.query,
            score: Math.min(100, Math.max(20, Math.round(item.value)))
          }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getQuestions(query) {
    try {
      const cacheKey = `questions-${query}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const [qaResults, trendsQuestions] = await Promise.all([
        this.getQAResults(query),
        this.getTrendsQuestions(query)
      ]);

      const questions = [...qaResults, ...trendsQuestions]
        .filter((item, index, self) => 
          index === self.findIndex(t => t.question === item.question)
        )
        .slice(0, 8);

      cache.set(cacheKey, questions);
      return questions;
    } catch (error) {
      console.error('Questions error:', error);
      return [];
    }
  }

  async getQAResults(query) {
    try {
      const response = await axios.get(`${this.DATAMUSE_API}?rel_trg=${encodeURIComponent(query)}&max=15`);
      
      return response.data
        .filter(item => item.score > 1000)
        .map(item => ({
          question: `Comment utiliser ${query} avec ${item.word} ?`,
          score: Math.min(100, Math.max(20, Math.round((item.score / 5000) * 100)))
        }));
    } catch (error) {
      return [];
    }
  }

  async getTrendsQuestions(query) {
    try {
      const results = await googleTrends.relatedQueries({
        keyword: `pourquoi ${query}`,
        geo: 'FR',
        hl: 'fr'
      });

      const data = JSON.parse(results);
      if (data.default.rankedList && data.default.rankedList[0]?.rankedKeyword) {
        return data.default.rankedList[0].rankedKeyword
          .slice(0, 5)
          .map(item => ({
            question: `${item.query} ?`,
            score: Math.min(100, Math.max(20, Math.round(item.value)))
          }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getKeywordDifficulty(keyword) {
    try {
      const cacheKey = `difficulty-${keyword}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const [frequency, competition] = await Promise.all([
        this.getKeywordFrequency(keyword),
        this.getCompetitionScore(keyword)
      ]);

      const difficulty = Math.round((frequency + competition) / 2);
      cache.set(cacheKey, difficulty);
      return difficulty;
    } catch (error) {
      console.error('Keyword difficulty error:', error);
      return 50;
    }
  }

  async getKeywordFrequency(keyword) {
    try {
      const response = await axios.get(`${this.DATAMUSE_API}?sp=${encodeURIComponent(keyword)}&md=f&max=1`);
      
      if (response.data.length > 0 && response.data[0].tags) {
        const freqTag = response.data[0].tags.find(tag => tag.startsWith('f:'));
        if (freqTag) {
          const frequency = parseInt(freqTag.split(':')[1]);
          return Math.min(100, Math.max(20, Math.round((frequency / 50000) * 100)));
        }
      }
      return 50;
    } catch (error) {
      return 50;
    }
  }

  async getCompetitionScore(keyword) {
    try {
      const results = await googleTrends.interestOverTime({
        keyword: keyword,
        geo: 'FR',
        hl: 'fr',
        timezone: 0
      });

      const data = JSON.parse(results);
      if (data.default.timelineData) {
        const values = data.default.timelineData.map(point => point.value[0]);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.min(100, Math.max(20, Math.round((avg / 100) * 80 + 20)));
      }
      return 50;
    } catch (error) {
      return 50;
    }
  }
}