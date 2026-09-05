import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { type, limit = 20 } = req.query;
  
  try {
    // Read from static JSON files (exported from SQLite)
    const dataDir = join(__dirname, '..', 'public', 'data');
    
    let news = [];
    let jobs = [];
    
    // Read news
    const newsFile = join(dataDir, 'news.json');
    if (existsSync(newsFile)) {
      const allNews = JSON.parse(readFileSync(newsFile, 'utf8'));
      news = allNews.slice(0, parseInt(limit) || 20);
    }
    
    // Read jobs
    const jobsFile = join(dataDir, 'jobs.json');
    if (existsSync(jobsFile)) {
      const allJobs = JSON.parse(readFileSync(jobsFile, 'utf8'));
      jobs = allJobs.slice(0, parseInt(limit) || 20);
    }
    
    // Read manifest for last update time
    let updated = new Date().toISOString();
    const manifestFile = join(dataDir, 'manifest.json');
    if (existsSync(manifestFile)) {
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
      updated = manifest.exportedAt || updated;
    }
    
    if (type === 'news') {
      return res.status(200).json({ news, updated });
    } else if (type === 'jobs') {
      return res.status(200).json({ jobs, updated });
    } else {
      return res.status(200).json({ news, jobs, updated });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
