import axios from 'axios';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export class EnhancedScraper {
  constructor() {
    this.baseUrl = 'https://duckduckgo.com/ac/';
    this.searchUrl = 'https://duckduckgo.com/';
  }

  async getSuggestions(query) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          q: query,
          kl: 'fr-fr'
        },
        headers: {
          'Accept': 'application/json'
        }
      });

      return response.data.map(item => ({
        phrase: item.phrase,
        category: item.category || 'général',
        score: Math.random() * 100 // Score de pertinence simulé
      }));
    } catch (error) {
      console.error('Erreur suggestions:', error.message);
      return [];
    }
  }

  async getRelatedSearches(query) {
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
      });
      const page = await browser.newPage();
      await page.goto(`${this.searchUrl}?q=${encodeURIComponent(query)}`);
      
      // Attendre le chargement des résultats
      await page.waitForSelector('.results', { timeout: 5000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      const relatedSearches = [];
      
      // Extraire les recherches connexes
      $('.related-searches a').each((_, element) => {
        relatedSearches.push($(element).text().trim());
      });

      await browser.close();
      return relatedSearches;
    } catch (error) {
      console.error('Erreur recherches connexes:', error.message);
      return [];
    }
  }

  async getSearchVolume(query) {
    // Simulation de volume de recherche
    return Math.floor(Math.random() * 10000);
  }

  async getFullAnalysis(query) {
    const [suggestions, relatedSearches] = await Promise.all([
      this.getSuggestions(query),
      this.getRelatedSearches(query)
    ]);

    const searchVolume = await this.getSearchVolume(query);

    return {
      keyword: query,
      suggestions,
      relatedSearches,
      searchVolume,
      timestamp: new Date().toISOString(),
      metrics: {
        totalSuggestions: suggestions.length,
        totalRelated: relatedSearches.length,
        averageScore: suggestions.reduce((acc, curr) => acc + curr.score, 0) / suggestions.length || 0
      }
    };
  }
}