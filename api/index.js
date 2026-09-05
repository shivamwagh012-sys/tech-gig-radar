const express = require('express');
const crypto = require('crypto');
const app = express();

// Parse JSON body
app.use(express.json());

// ================================
// Simple JWT Implementation
// ================================
const JWT_SECRET = process.env.JWT_SECRET || 'techgig-radar-secret-key-2026';

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Simple password hashing (for demo - use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// ================================
// In-Memory User Store (Demo)
// ================================
const users = new Map();

// Add demo user
users.set('demo@techgig.com', {
  id: 'demo-user-001',
  email: 'demo@techgig.com',
  password: hashPassword('demo123'),
  name: 'Demo User',
  role: 'user',
  createdAt: new Date().toISOString()
});

// ================================
// Mock Data
// ================================
const mockStats = {
  news: { total: 1450, published: 45 },
  jobs: { total: 85, published: 22 }
};

const mockFeed = [
  { id: '1', type: 'news', title: 'OpenAI opens fine-tuning to o-series models', description: 'Reasoning models can now be tuned on domain data — first-party pricing published alongside.', category: 'AI', score: 94, source: 'OpenAI Blog', timeAgo: '18m ago', status: 'published', views: 214, comments: 2 },
  { id: '2', type: 'job', title: 'Senior Platform Engineer', description: 'Kubernetes-heavy platform team, async-first, hiring from India and LATAM.', category: 'REMOTE', source: 'RemoteOK', timeAgo: '42m ago', status: 'scheduled', views: 87, comments: 1 },
  { id: '3', type: 'carousel', title: 'Five remote-first companies hiring freshers', description: 'Swipe-through carousel built from this week\'s verified entry-level listings.', category: '5 slides', source: 'Radar original', timeAgo: '1h ago', status: 'published', views: 431, comments: 1 },
  { id: '4', type: 'news', title: 'CISA flags active exploitation in a popular CI runner', description: 'Self-hosted runners on the affected minor versions need patching today.', category: 'SECURITY', score: 91, source: 'CISA', timeAgo: '2h ago', status: 'published', views: 96, comments: 0 },
  { id: '5', type: 'job', title: 'Frontend Engineer (React)', description: 'Design-systems team at a Series B fintech, contract-to-hire.', category: 'INDIA OK', source: 'We Work Remotely', timeAgo: '4h ago', status: 'review', views: 63, comments: 0 },
];

const mockJobs = [
  { id: '1', title: 'Senior Platform Engineer', companyName: 'Grafana Labs', experienceLevel: 'senior', jobType: 'full-time', isRemote: true, salaryMin: 150000, companyLocation: 'Ireland', requiredSkills: ['Kubernetes', 'Go', 'AWS', 'Terraform', 'Prometheus'], applicationUrl: 'https://grafana.com/careers', email: 'careers@grafana.com' },
  { id: '2', title: 'Data Scientist - Inference', companyName: 'Airbnb', experienceLevel: 'senior', jobType: 'full-time', isRemote: true, salaryMin: 180000, companyLocation: 'Remote', requiredSkills: ['Python', 'ML', 'SQL', 'Statistics', 'TensorFlow'], applicationUrl: 'https://airbnb.com/careers', email: 'talent@airbnb.com' },
  { id: '3', title: 'Frontend Engineer (React)', companyName: 'Series B Fintech', experienceLevel: 'mid', jobType: 'contract', isRemote: true, salaryMin: 80000, companyLocation: 'India OK', requiredSkills: ['React', 'TypeScript', 'CSS', 'Testing', 'GraphQL'], applicationUrl: '#', email: 'hr@fintech.io' },
  { id: '4', title: 'Associate Data Engineer', companyName: 'Data Startup', experienceLevel: 'fresher', jobType: 'full-time', isRemote: true, salaryMin: 60000, companyLocation: 'Worldwide', requiredSkills: ['Python', 'SQL', 'dbt', 'AWS', 'Airflow'], applicationUrl: '#', email: 'jobs@datastartup.io' },
  { id: '5', title: 'Senior AI Engineer', companyName: 'Lemon.io', experienceLevel: 'senior', jobType: 'contract', isRemote: true, salaryMin: 140000, companyLocation: 'Worldwide', requiredSkills: ['Python', 'PyTorch', 'LLMs', 'MLOps', 'AWS'], applicationUrl: 'https://lemon.io', email: 'developers@lemon.io' },
];

// ================================
// CORS Middleware
// ================================
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ================================
// Auth Middleware
// ================================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = payload;
  next();
}

// ================================
// Auth Endpoints
// ================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  if (users.has(normalizedEmail)) {
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }
  
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password: hashPassword(password),
    name: name.trim(),
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  users.set(normalizedEmail, user);
  
  const { password: _, ...userWithoutPassword } = user;
  const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  
  res.json({ success: true, user: userWithoutPassword, token });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.get(normalizedEmail);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }
  
  if (user.password !== hashPassword(password)) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  
  res.json({ success: true, user: userWithoutPassword, token });
});

// Get current user (protected)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.get(req.user.email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// Verify token
app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;
  const payload = verifyToken(token);
  if (payload) {
    res.json({ valid: true, user: payload });
  } else {
    res.json({ valid: false });
  }
});

// ================================
// Data Endpoints
// ================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  res.json(mockStats);
});

app.get('/api/feed', (req, res) => {
  res.json({ items: mockFeed });
});

app.get('/api/jobs', (req, res) => {
  res.json({ jobs: mockJobs });
});

app.get('/api/news', (req, res) => {
  const news = mockFeed.filter(item => item.type === 'news');
  res.json({ news });
});

app.get('/api/queue', (req, res) => {
  const queue = mockFeed.filter(item => item.status === 'review' || item.status === 'scheduled');
  res.json({ queue });
});

// Root - API info
app.get('/', (req, res) => {
  res.json({
    name: 'TechGig Radar API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      feed: '/api/feed',
      jobs: '/api/jobs',
      news: '/api/news',
      queue: '/api/queue',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (protected)',
        verify: 'POST /api/auth/verify'
      }
    },
    telegram: 'https://t.me/TechGigRadar',
    demo: {
      email: 'demo@techgig.com',
      password: 'demo123'
    }
  });
});

module.exports = app;
