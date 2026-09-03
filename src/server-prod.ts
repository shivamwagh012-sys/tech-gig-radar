// Standalone production server - no dependencies on other project files
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/techgig.db';
let db: Database.Database;

try {
  db = new Database(dbPath);
  console.log('✅ Database connected:', dbPath);
} catch (err) {
  console.log('⚠️ Database not found, starting without data');
  db = null as any;
}

// API endpoints
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

// Dashboard HTML
app.get('/', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>TechGig Radar</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
      min-height: 100vh; color: #fff; padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { 
      font-size: 2.5rem; margin-bottom: 2rem; 
      background: linear-gradient(90deg, #00f5ff, #00ff88);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(0,245,255,0.2);
      border-radius: 12px; padding: 1.5rem;
      box-shadow: 0 0 20px rgba(0,245,255,0.1);
    }
    .card h3 { color: #00f5ff; margin-bottom: 0.5rem; }
    .card .value { font-size: 2.5rem; font-weight: bold; }
    .status { 
      display: inline-block; padding: 0.5rem 1rem; border-radius: 20px;
      background: rgba(0,255,136,0.2); color: #00ff88; margin-top: 1rem;
    }
    .links { margin-top: 2rem; }
    .links a { color: #00f5ff; margin-right: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ TechGig Radar</h1>
    <p style="color: #888; margin-bottom: 2rem;">Real Tech News. Real Global Opportunities.</p>
    <div class="stats">
      <div class="card">
        <h3>📰 News Articles</h3>
        <div class="value" id="newsTotal">-</div>
        <small id="newsPublished">- published</small>
      </div>
      <div class="card">
        <h3>💼 Job Listings</h3>
        <div class="value" id="jobsTotal">-</div>
        <small id="jobsPublished">- published</small>
      </div>
      <div class="card">
        <h3>🤖 System Status</h3>
        <div class="status">✓ Online</div>
      </div>
    </div>
    <div class="links">
      <a href="https://t.me/TechGigRadar" target="_blank">📱 Telegram Channel</a>
      <a href="/api/stats">📊 API Stats</a>
      <a href="/api/health">❤️ Health Check</a>
    </div>
  </div>
  <script>
    fetch('/api/stats').then(r => r.json()).then(data => {
      document.getElementById('newsTotal').textContent = data.news.total;
      document.getElementById('newsPublished').textContent = data.news.published + ' published';
      document.getElementById('jobsTotal').textContent = data.jobs.total;
      document.getElementById('jobsPublished').textContent = data.jobs.published + ' published';
    }).catch(() => {});
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('🚀 TechGig Radar running on port ' + PORT);
});
