// Production Dashboard Server with API
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/techgig.db';
let db: Database.Database | null = null;

try {
  db = new Database(dbPath);
  console.log('✅ Database connected:', dbPath);
} catch (err) {
  console.log('⚠️ Database not found, using mock data');
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (_req, res) => {
  try {
    if (!db) {
      return res.json({ news: { total: 0, published: 0 }, jobs: { total: 0, published: 0 } });
    }
    
    const newsTotal = db.prepare('SELECT COUNT(*) as count FROM news').get() as { count: number };
    const newsPublished = db.prepare("SELECT COUNT(*) as count FROM news WHERE status = 'published'").get() as { count: number };
    const jobsTotal = db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number };
    const jobsPublished = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'published'").get() as { count: number };
    
    res.json({
      news: { total: newsTotal.count, published: newsPublished.count },
      jobs: { total: jobsTotal.count, published: jobsPublished.count }
    });
  } catch (error) {
    res.json({ news: { total: 0, published: 0 }, jobs: { total: 0, published: 0 } });
  }
});

app.get('/api/feed', (_req, res) => {
  try {
    if (!db) {
      return res.json({ items: [] });
    }
    
    // Get news
    const news = db.prepare(`
      SELECT id, title, summary as description, category, verification_score as score, 
             source_name as source, status, created_at, source_url
      FROM news 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all() as any[];
    
    // Get jobs  
    const jobs = db.prepare(`
      SELECT id, title, company_name as companyName, company_location as companyLocation,
             experience_level as experienceLevel, job_type as jobType, is_remote as isRemote,
             source_name as source, status, created_at, application_url as applicationUrl
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as any[];
    
    // Combine and format
    const items = [
      ...news.map(n => ({
        id: n.id,
        type: 'news',
        title: n.title,
        description: n.description,
        category: n.category?.toUpperCase(),
        score: n.score,
        source: n.source || 'Unknown',
        status: n.status || 'published',
        timeAgo: getTimeAgo(n.created_at),
        views: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 10),
        url: n.source_url
      })),
      ...jobs.map(j => ({
        id: j.id,
        type: 'job',
        title: j.title,
        description: `${j.companyName} - ${j.experienceLevel || 'Any level'}, ${j.isRemote ? 'Remote' : 'On-site'}`,
        category: j.isRemote ? 'REMOTE' : 'ON-SITE',
        source: j.source || 'Job Board',
        status: j.status || 'published',
        timeAgo: getTimeAgo(j.created_at),
        views: Math.floor(Math.random() * 200),
        comments: Math.floor(Math.random() * 5),
        url: j.applicationUrl
      }))
    ].sort((a, b) => new Date(b.timeAgo).getTime() - new Date(a.timeAgo).getTime());
    
    res.json({ items });
  } catch (error) {
    console.error('Feed error:', error);
    res.json({ items: [] });
  }
});

app.get('/api/jobs', (_req, res) => {
  try {
    if (!db) {
      return res.json({ jobs: [] });
    }
    
    const jobs = db.prepare(`
      SELECT id, title, company_name as companyName, company_location as companyLocation,
             experience_level as experienceLevel, job_type as jobType, is_remote as isRemote,
             salary_min as salaryMin, salary_max as salaryMax, salary_currency as salaryCurrency,
             required_skills as requiredSkills, description, application_url as applicationUrl,
             source_name as source, status, created_at
      FROM jobs
      WHERE status IN ('published', 'approved', 'pending_review')
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];
    
    const formattedJobs = jobs.map(j => ({
      ...j,
      requiredSkills: j.requiredSkills ? JSON.parse(j.requiredSkills) : [],
      isRemote: !!j.isRemote
    }));
    
    res.json({ jobs: formattedJobs });
  } catch (error) {
    console.error('Jobs error:', error);
    res.json({ jobs: [] });
  }
});

app.get('/api/news', (_req, res) => {
  try {
    if (!db) {
      return res.json({ news: [] });
    }
    
    const news = db.prepare(`
      SELECT id, title, summary, content, category, tags, 
             verification_score as verificationScore, source_name as sourceName,
             source_url as sourceUrl, status, created_at
      FROM news
      WHERE status IN ('published', 'approved', 'pending_review')
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];
    
    const formattedNews = news.map(n => ({
      ...n,
      tags: n.tags ? JSON.parse(n.tags) : []
    }));
    
    res.json({ news: formattedNews });
  } catch (error) {
    console.error('News error:', error);
    res.json({ news: [] });
  }
});

// Queue - scheduled posts
app.get('/api/queue', (_req, res) => {
  try {
    if (!db) {
      return res.json({ queue: [] });
    }
    
    const newsQueue = db.prepare(`
      SELECT id, 'news' as type, title, status, created_at
      FROM news WHERE status = 'pending_review'
      ORDER BY priority DESC, created_at DESC LIMIT 20
    `).all();
    
    const jobsQueue = db.prepare(`
      SELECT id, 'job' as type, title, status, created_at  
      FROM jobs WHERE status = 'pending_review'
      ORDER BY priority DESC, created_at DESC LIMIT 20
    `).all();
    
    res.json({ queue: [...newsQueue, ...jobsQueue] });
  } catch (error) {
    res.json({ queue: [] });
  }
});

// Serve dashboard for all other routes (Express 5 syntax)
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Helper
function getTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Just now';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              TechGig Radar Dashboard                      ║
║                   🚀 Running!                             ║
╚═══════════════════════════════════════════════════════════╝

📍 Dashboard: http://localhost:${PORT}
📊 API Stats: http://localhost:${PORT}/api/stats
📰 Feed API:  http://localhost:${PORT}/api/feed
💼 Jobs API:  http://localhost:${PORT}/api/jobs
  `);
});
