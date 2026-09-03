import express from 'express';
import { createLogger } from '../utils/logger.js';
import { db, schema } from '../db/index.js';
import { count, desc, eq, and, sql, gte } from 'drizzle-orm';
import { config } from '../config/index.js';
import { initTelegramBot, publishNewsToTelegram, publishJobToTelegram } from '../publisher/telegram/client.js';

const logger = createLogger('dashboard');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ================================
// JARVIS-STYLE DASHBOARD HTML
// ================================
const jarvisDashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechGig Radar | JARVIS Control Center</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #00d4ff;
      --secondary: #0099cc;
      --accent: #00ffaa;
      --warning: #ffaa00;
      --danger: #ff3366;
      --success: #00ff88;
      --bg-dark: #0a0f1a;
      --bg-card: rgba(0, 20, 40, 0.8);
      --bg-gradient: linear-gradient(135deg, #0a0f1a 0%, #0d1a2d 50%, #0a1628 100%);
      --glow: 0 0 20px rgba(0, 212, 255, 0.5);
      --text-glow: 0 0 10px rgba(0, 212, 255, 0.8);
    }

    body {
      font-family: 'Rajdhani', sans-serif;
      background: var(--bg-gradient);
      min-height: 100vh;
      color: #e0e6ed;
      overflow-x: hidden;
    }

    /* Animated Background Grid */
    .bg-grid {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      animation: gridMove 20s linear infinite;
      pointer-events: none;
      z-index: 0;
    }

    @keyframes gridMove {
      0% { transform: translate(0, 0); }
      100% { transform: translate(50px, 50px); }
    }

    /* Floating particles */
    .particles {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: var(--primary);
      border-radius: 50%;
      opacity: 0.6;
      animation: float 15s infinite ease-in-out;
    }

    @keyframes float {
      0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
      10% { opacity: 0.6; }
      90% { opacity: 0.6; }
      100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
    }

    /* Main Container */
    .container {
      position: relative;
      z-index: 10;
      max-width: 1800px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header */
    .header {
      text-align: center;
      padding: 30px 0;
      position: relative;
    }

    .logo-container {
      display: inline-block;
      position: relative;
    }

    .logo-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 180px;
      height: 180px;
      border: 2px solid var(--primary);
      border-radius: 50%;
      animation: ringPulse 3s ease-in-out infinite;
    }

    .logo-ring::before {
      content: '';
      position: absolute;
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
      border: 1px solid var(--secondary);
      border-radius: 50%;
      animation: ringRotate 10s linear infinite;
    }

    @keyframes ringPulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
    }

    @keyframes ringRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .logo {
      font-family: 'Orbitron', sans-serif;
      font-size: 3rem;
      font-weight: 900;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: var(--text-glow);
      position: relative;
      z-index: 1;
    }

    .tagline {
      font-family: 'Share Tech Mono', monospace;
      color: var(--secondary);
      font-size: 0.9rem;
      letter-spacing: 3px;
      margin-top: 10px;
      text-transform: uppercase;
    }

    .status-bar {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.85rem;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: blink 1.5s infinite;
    }

    .status-dot.online { background: var(--success); box-shadow: 0 0 10px var(--success); }
    .status-dot.processing { background: var(--warning); box-shadow: 0 0 10px var(--warning); }
    .status-dot.error { background: var(--danger); box-shadow: 0 0 10px var(--danger); }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: 15px;
      padding: 25px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--primary), transparent);
      animation: scanLine 2s linear infinite;
    }

    @keyframes scanLine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .stat-card:hover {
      transform: translateY(-5px);
      border-color: var(--primary);
      box-shadow: var(--glow);
    }

    .stat-icon {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    .stat-value {
      font-family: 'Orbitron', sans-serif;
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary);
      text-shadow: var(--text-glow);
    }

    .stat-label {
      font-size: 0.9rem;
      color: #8892a0;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 5px;
    }

    .stat-change {
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.8rem;
      margin-top: 10px;
    }

    .stat-change.positive { color: var(--success); }
    .stat-change.negative { color: var(--danger); }

    /* Main Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-top: 30px;
    }

    @media (max-width: 1200px) {
      .content-grid { grid-template-columns: 1fr; }
    }

    /* Panel Styles */
    .panel {
      background: var(--bg-card);
      border: 1px solid rgba(0, 212, 255, 0.15);
      border-radius: 20px;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    .panel-header {
      background: linear-gradient(90deg, rgba(0, 212, 255, 0.1), transparent);
      padding: 20px 25px;
      border-bottom: 1px solid rgba(0, 212, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .panel-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: var(--primary);
      border-radius: 2px;
    }

    .panel-badge {
      background: rgba(0, 212, 255, 0.2);
      color: var(--primary);
      padding: 5px 15px;
      border-radius: 20px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.85rem;
    }

    .panel-content {
      padding: 20px;
      max-height: 500px;
      overflow-y: auto;
    }

    .panel-content::-webkit-scrollbar {
      width: 6px;
    }

    .panel-content::-webkit-scrollbar-track {
      background: rgba(0, 212, 255, 0.05);
    }

    .panel-content::-webkit-scrollbar-thumb {
      background: var(--primary);
      border-radius: 3px;
    }

    /* Item Cards */
    .item-card {
      background: rgba(0, 30, 60, 0.5);
      border: 1px solid rgba(0, 212, 255, 0.1);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 15px;
      transition: all 0.3s ease;
      position: relative;
    }

    .item-card:hover {
      border-color: var(--primary);
      background: rgba(0, 40, 80, 0.6);
      transform: translateX(5px);
    }

    .item-card::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--primary);
      border-radius: 0 3px 3px 0;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .item-card:hover::after {
      opacity: 1;
    }

    .item-title {
      font-weight: 600;
      font-size: 1rem;
      color: #fff;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .item-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 0.8rem;
      color: #8892a0;
    }

    .item-tag {
      background: rgba(0, 212, 255, 0.15);
      color: var(--primary);
      padding: 3px 10px;
      border-radius: 12px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.75rem;
    }

    .item-tag.fresher { background: rgba(0, 255, 136, 0.15); color: var(--accent); }
    .item-tag.remote { background: rgba(255, 170, 0, 0.15); color: var(--warning); }
    .item-tag.published { background: rgba(0, 255, 136, 0.15); color: var(--success); }

    .item-actions {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }

    .btn {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #fff;
    }

    .btn-primary:hover {
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
      transform: translateY(-2px);
    }

    .btn-success {
      background: linear-gradient(135deg, var(--success), #00cc6a);
      color: #000;
    }

    .btn-danger {
      background: linear-gradient(135deg, var(--danger), #cc0044);
      color: #fff;
    }

    /* Activity Log */
    .activity-log {
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.85rem;
    }

    .log-entry {
      padding: 10px 15px;
      border-bottom: 1px solid rgba(0, 212, 255, 0.05);
      display: flex;
      gap: 15px;
      align-items: flex-start;
    }

    .log-time {
      color: var(--secondary);
      white-space: nowrap;
    }

    .log-message {
      color: #b0b8c4;
    }

    .log-message.success { color: var(--success); }
    .log-message.error { color: var(--danger); }
    .log-message.info { color: var(--primary); }

    /* Live Ticker */
    .ticker {
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid rgba(0, 212, 255, 0.1);
      border-radius: 10px;
      padding: 15px 20px;
      margin-top: 30px;
      overflow: hidden;
    }

    .ticker-content {
      display: flex;
      animation: tickerScroll 30s linear infinite;
    }

    @keyframes tickerScroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .ticker-item {
      white-space: nowrap;
      padding: 0 40px;
      font-family: 'Share Tech Mono', monospace;
      color: var(--primary);
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 30px;
      margin-top: 40px;
      border-top: 1px solid rgba(0, 212, 255, 0.1);
    }

    .footer-text {
      font-family: 'Share Tech Mono', monospace;
      color: #5a6270;
      font-size: 0.8rem;
    }

    /* Animations */
    .fade-in {
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Loading Spinner */
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0, 212, 255, 0.1);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  
  <div class="particles" id="particles"></div>

  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="logo-container">
        <div class="logo-ring"></div>
        <h1 class="logo">TECHGIG RADAR</h1>
      </div>
      <p class="tagline">[ AUTONOMOUS INTELLIGENCE SYSTEM ]</p>
      
      <div class="status-bar">
        <div class="status-item">
          <span class="status-dot online" id="systemStatus"></span>
          <span>SYSTEM: <span id="systemStatusText">ONLINE</span></span>
        </div>
        <div class="status-item">
          <span class="status-dot online" id="telegramStatus"></span>
          <span>TELEGRAM: CONNECTED</span>
        </div>
        <div class="status-item">
          <span class="status-dot processing" id="discoveryStatus"></span>
          <span>DISCOVERY: <span id="discoveryStatusText">ACTIVE</span></span>
        </div>
        <div class="status-item">
          <span>🕐 <span id="lastUpdate">--:--:--</span></span>
        </div>
      </div>
    </header>

    <!-- Stats Grid -->
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card fade-in">
        <div class="stat-icon">📰</div>
        <div class="stat-value" id="totalNews">0</div>
        <div class="stat-label">Total News</div>
        <div class="stat-change positive" id="newsChange">↑ Loading...</div>
      </div>
      <div class="stat-card fade-in">
        <div class="stat-icon">💼</div>
        <div class="stat-value" id="totalJobs">0</div>
        <div class="stat-label">Total Jobs</div>
        <div class="stat-change positive" id="jobsChange">↑ Loading...</div>
      </div>
      <div class="stat-card fade-in">
        <div class="stat-icon">✅</div>
        <div class="stat-value" id="publishedNews">0</div>
        <div class="stat-label">Published News</div>
      </div>
      <div class="stat-card fade-in">
        <div class="stat-icon">🚀</div>
        <div class="stat-value" id="publishedJobs">0</div>
        <div class="stat-label">Published Jobs</div>
      </div>
      <div class="stat-card fade-in">
        <div class="stat-icon">⏳</div>
        <div class="stat-value" id="pendingNews">0</div>
        <div class="stat-label">Pending News</div>
      </div>
      <div class="stat-card fade-in">
        <div class="stat-icon">🎯</div>
        <div class="stat-value" id="pendingJobs">0</div>
        <div class="stat-label">Pending Jobs</div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content-grid">
      <!-- Latest News Panel -->
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">📰 LATEST TECH NEWS</h2>
          <span class="panel-badge" id="newsBadge">0 NEW</span>
        </div>
        <div class="panel-content" id="newsPanel">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Latest Jobs Panel -->
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">💼 REMOTE TECH JOBS</h2>
          <span class="panel-badge" id="jobsBadge">0 NEW</span>
        </div>
        <div class="panel-content" id="jobsPanel">
          <div class="spinner"></div>
        </div>
      </div>
    </div>

    <!-- Activity Log -->
    <div class="panel" style="margin-top: 25px;">
      <div class="panel-header">
        <h2 class="panel-title">📊 ACTIVITY LOG</h2>
        <span class="panel-badge">LIVE</span>
      </div>
      <div class="panel-content activity-log" id="activityLog">
        <div class="log-entry">
          <span class="log-time">[INIT]</span>
          <span class="log-message info">System initializing...</span>
        </div>
      </div>
    </div>

    <!-- Live Ticker -->
    <div class="ticker">
      <div class="ticker-content" id="ticker">
        <span class="ticker-item">🚀 TechGig Radar - Real Tech News, Real Global Opportunities</span>
        <span class="ticker-item">💼 Finding remote jobs for developers worldwide</span>
        <span class="ticker-item">🌍 Fresher to Senior - Opportunities for all levels</span>
        <span class="ticker-item">🤖 Autonomous AI-powered discovery system</span>
        <span class="ticker-item">📱 Follow @TechGigRadar on Telegram</span>
        <span class="ticker-item">🚀 TechGig Radar - Real Tech News, Real Global Opportunities</span>
        <span class="ticker-item">💼 Finding remote jobs for developers worldwide</span>
        <span class="ticker-item">🌍 Fresher to Senior - Opportunities for all levels</span>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <p class="footer-text">TECHGIG RADAR v1.0 | AUTONOMOUS MODE | MADE WITH 💙 FOR DEVELOPERS WORLDWIDE</p>
    </footer>
  </div>

  <script>
    // Create floating particles
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 15 + 's';
      particle.style.animationDuration = (10 + Math.random() * 10) + 's';
      particlesContainer.appendChild(particle);
    }

    // Activity log
    const activityLog = document.getElementById('activityLog');
    function addLog(message, type = 'info') {
      const time = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'log-entry fade-in';
      entry.innerHTML = \`
        <span class="log-time">[\${time}]</span>
        <span class="log-message \${type}">\${message}</span>
      \`;
      activityLog.insertBefore(entry, activityLog.firstChild);
      if (activityLog.children.length > 50) {
        activityLog.removeChild(activityLog.lastChild);
      }
    }

    // Fetch and display data
    async function fetchData() {
      try {
        // Fetch stats
        const statsRes = await fetch('/api/stats');
        const stats = await statsRes.json();
        
        document.getElementById('totalNews').textContent = stats.news.total;
        document.getElementById('totalJobs').textContent = stats.jobs.total;
        document.getElementById('publishedNews').textContent = stats.news.published;
        document.getElementById('publishedJobs').textContent = stats.jobs.published;
        document.getElementById('pendingNews').textContent = stats.news.pending;
        document.getElementById('pendingJobs').textContent = stats.jobs.pending;
        document.getElementById('newsBadge').textContent = stats.news.pending + ' PENDING';
        document.getElementById('jobsBadge').textContent = stats.jobs.pending + ' PENDING';
        
        // Fetch latest news
        const newsRes = await fetch('/api/news?limit=10');
        const news = await newsRes.json();
        displayNews(news);

        // Fetch latest jobs
        const jobsRes = await fetch('/api/jobs?limit=10');
        const jobs = await jobsRes.json();
        displayJobs(jobs);

        // Update timestamp
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
        
        addLog('Data refreshed successfully', 'success');
      } catch (err) {
        addLog('Error fetching data: ' + err.message, 'error');
      }
    }

    function displayNews(news) {
      const panel = document.getElementById('newsPanel');
      if (!news.length) {
        panel.innerHTML = '<p style="text-align:center;color:#5a6270;">No news available</p>';
        return;
      }
      
      panel.innerHTML = news.map(item => \`
        <div class="item-card">
          <div class="item-title">\${escapeHtml(item.title)}</div>
          <div class="item-meta">
            <span class="item-tag">\${item.category || 'tech'}</span>
            <span class="item-tag \${item.status === 'published' ? 'published' : ''}">\${item.status}</span>
            <span>\${item.sourceName || 'Unknown'}</span>
          </div>
          <div class="item-actions">
            \${item.status !== 'published' ? \`
              <button class="btn btn-primary" onclick="publishNews('\${item.id}')">📤 PUBLISH</button>
            \` : '<span class="item-tag published">✓ PUBLISHED</span>'}
            <a href="\${item.sourceUrl}" target="_blank" class="btn btn-primary">🔗 SOURCE</a>
          </div>
        </div>
      \`).join('');
    }

    function displayJobs(jobs) {
      const panel = document.getElementById('jobsPanel');
      if (!jobs.length) {
        panel.innerHTML = '<p style="text-align:center;color:#5a6270;">No jobs available</p>';
        return;
      }
      
      panel.innerHTML = jobs.map(job => \`
        <div class="item-card">
          <div class="item-title">\${escapeHtml(job.title)}</div>
          <div class="item-meta">
            <span>🏢 \${escapeHtml(job.companyName)}</span>
            <span class="item-tag \${job.experienceLevel === 'fresher' || job.experienceLevel === 'junior' ? 'fresher' : ''}">\${job.experienceLevel || 'any'}</span>
            <span class="item-tag remote">\${job.isRemote ? '🌍 REMOTE' : '📍 ONSITE'}</span>
            <span class="item-tag \${job.status === 'published' ? 'published' : ''}">\${job.status}</span>
          </div>
          <div class="item-actions">
            \${job.status !== 'published' ? \`
              <button class="btn btn-success" onclick="publishJob('\${job.id}')">📤 PUBLISH</button>
            \` : '<span class="item-tag published">✓ PUBLISHED</span>'}
            <a href="\${job.applicationUrl}" target="_blank" class="btn btn-primary">📋 APPLY</a>
          </div>
        </div>
      \`).join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    async function publishNews(id) {
      try {
        addLog('Publishing news ID: ' + id, 'info');
        const res = await fetch('/api/news/' + id + '/publish', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          addLog('News published to Telegram! 🎉', 'success');
          fetchData();
        } else {
          addLog('Publish failed: ' + result.error, 'error');
        }
      } catch (err) {
        addLog('Publish error: ' + err.message, 'error');
      }
    }

    async function publishJob(id) {
      try {
        addLog('Publishing job ID: ' + id, 'info');
        const res = await fetch('/api/jobs/' + id + '/publish', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          addLog('Job published to Telegram! 🎉', 'success');
          fetchData();
        } else {
          addLog('Publish failed: ' + result.error, 'error');
        }
      } catch (err) {
        addLog('Publish error: ' + err.message, 'error');
      }
    }

    // Initial load
    addLog('JARVIS Control Center initialized', 'success');
    addLog('Connecting to TechGig Radar API...', 'info');
    fetchData();

    // Auto-refresh every 30 seconds
    setInterval(fetchData, 30000);
    
    // Random activity simulation
    setInterval(() => {
      const activities = [
        'Scanning news sources...',
        'Checking job boards...',
        'Processing incoming data...',
        'Verifying content authenticity...',
        'Optimizing discovery algorithms...',
      ];
      addLog(activities[Math.floor(Math.random() * activities.length)], 'info');
    }, 45000);
  </script>
</body>
</html>
`;

// ================================
// API Routes
// ================================

// Serve dashboard
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(jarvisDashboardHTML);
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const [newsTotal] = await db.select({ count: count() }).from(schema.news);
    const [newsPublished] = await db.select({ count: count() }).from(schema.news).where(eq(schema.news.status, 'published'));
    const [newsPending] = await db.select({ count: count() }).from(schema.news).where(eq(schema.news.status, 'pending_review'));
    
    const [jobsTotal] = await db.select({ count: count() }).from(schema.jobs);
    const [jobsPublished] = await db.select({ count: count() }).from(schema.jobs).where(eq(schema.jobs.status, 'published'));
    const [jobsPending] = await db.select({ count: count() }).from(schema.jobs).where(eq(schema.jobs.status, 'pending_review'));

    res.json({
      news: {
        total: newsTotal.count,
        published: newsPublished.count,
        pending: newsPending.count,
      },
      jobs: {
        total: jobsTotal.count,
        published: jobsPublished.count,
        pending: jobsPending.count,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get news
app.get('/api/news', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const news = await db.select()
      .from(schema.news)
      .orderBy(desc(schema.news.createdAt))
      .limit(limit);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const jobs = await db.select()
      .from(schema.jobs)
      .orderBy(desc(schema.jobs.priority), desc(schema.jobs.createdAt))
      .limit(limit);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Publish news
app.post('/api/news/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const [news] = await db.select().from(schema.news).where(eq(schema.news.id, id));
    
    if (!news) {
      return res.status(404).json({ error: 'News not found' });
    }

    initTelegramBot();
    await publishNewsToTelegram({
      id: news.id,
      title: news.title,
      summary: news.summary || news.title,
      category: news.category || 'tech',
      sourceUrl: news.sourceUrl,
      sourceName: news.sourceName,
      importance: news.importance || 'medium',
    });

    await db.update(schema.news)
      .set({ status: 'published', telegramPublished: true, publishedAt: new Date().toISOString() })
      .where(eq(schema.news.id, id));

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ error: err }, 'Failed to publish news');
    res.status(500).json({ error: err.message });
  }
});

// Publish job
app.post('/api/jobs/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id));
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    initTelegramBot();
    await publishJobToTelegram({
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      companyLocation: job.companyLocation || 'Remote',
      description: job.description?.slice(0, 500),
      requiredSkills: job.requiredSkills as string[] || [],
      experienceLevel: job.experienceLevel || 'any',
      jobType: job.jobType || 'remote',
      isRemote: job.isRemote ?? true,
      acceptsWorldwide: job.acceptsWorldwide ?? true,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency || 'USD',
      applicationUrl: job.applicationUrl,
    });

    await db.update(schema.jobs)
      .set({ status: 'published', telegramPublished: true, publishedAt: new Date().toISOString() })
      .where(eq(schema.jobs.id, id));

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ error: err }, 'Failed to publish job');
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ================================
// Start Server
// ================================
export function startDashboard(port: number = 3000) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🤖 JARVIS CONTROL CENTER ONLINE 🤖              ║
╠═══════════════════════════════════════════════════════════╣
║  Dashboard: http://localhost:${port}                       ║
║  API:       http://localhost:${port}/api                   ║
╚═══════════════════════════════════════════════════════════╝
    `);
    logger.info({ port }, 'JARVIS Dashboard server started');
  });
}

// Direct run
const isMain = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isMain) {
  startDashboard(config.server.port);
}
