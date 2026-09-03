// Ultra-minimal production server - no native dependencies
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
      display: flex; align-items: center; justify-content: center;
    }
    .container { max-width: 600px; text-align: center; }
    h1 { 
      font-size: 3rem; margin-bottom: 1rem; 
      background: linear-gradient(90deg, #00f5ff, #00ff88);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    p { color: #888; margin-bottom: 2rem; font-size: 1.2rem; }
    .btn {
      display: inline-block; padding: 1rem 2rem; margin: 0.5rem;
      background: linear-gradient(135deg, #00f5ff 0%, #00ff88 100%);
      color: #000; text-decoration: none; border-radius: 30px;
      font-weight: bold; font-size: 1.1rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,245,255,0.3); }
    .status { margin-top: 2rem; padding: 1rem; background: rgba(0,255,136,0.1); border-radius: 10px; }
    .status span { color: #00ff88; }
  </style>
</head>
<body>
  <div class="container">
    <h1>TechGig Radar</h1>
    <p>Real Tech News. Real Global Opportunities.</p>
    <a href="https://t.me/TechGigRadar" class="btn" target="_blank">Join Telegram Channel</a>
    <div class="status">
      <span>System Online</span> - Auto-publishing tech news and remote jobs
    </div>
  </div>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('TechGig Radar running on port ' + PORT);
});
