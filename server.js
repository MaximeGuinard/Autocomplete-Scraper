import express from 'express';
import cors from 'cors';
import { KeywordService } from './services/KeywordService.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3000;
const keywordService = new KeywordService();

// Middleware de gestion d'erreurs
const errorHandler = (err, req, res, next) => {
  logger.error('Application error:', err);
  res.status(500).json({ error: 'Une erreur est survenue' });
};

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/api/keyword/analyze', async (req, res, next) => {
  try {
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ error: 'Mot-clé invalide' });
    }

    const analysis = await keywordService.getKeywordAnalysis(keyword);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

app.post('/api/bulk/analyze', async (req, res, next) => {
  try {
    const { keywords } = req.body;
    if (!Array.isArray(keywords) || keywords.length > 100) {
      return res.status(400).json({ error: 'Entrée invalide ou trop de mots-clés' });
    }

    const results = await Promise.all(
      keywords.map(async keyword => {
        try {
          const analysis = await keywordService.getKeywordAnalysis(keyword);
          return { keyword, analysis };
        } catch (error) {
          return { keyword, error: true };
        }
      })
    );

    res.json({ results: results.filter(r => !r.error) });
  } catch (error) {
    next(error);
  }
});

// Middleware d'erreur
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  console.log(`Serveur démarré sur http://localhost:${port}`);
});