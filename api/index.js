const crypto = require('crypto');

// ================================
// Simple JWT Implementation
// ================================
const JWT_SECRET = process.env.JWT_SECRET || 'techgig-radar-secret-key-2026';

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

function createToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`).digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(base64urlDecode(body));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

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
  { id: '1', type: 'news', title: 'OpenAI opens fine-tuning to o-series models', description: 'Reasoning models can now be tuned on domain data.', category: 'AI', score: 94, source: 'OpenAI Blog', timeAgo: '18m ago', status: 'published', views: 214 },
  { id: '2', type: 'job', title: 'Senior Platform Engineer', description: 'Kubernetes-heavy platform team, async-first.', category: 'REMOTE', source: 'RemoteOK', timeAgo: '42m ago', status: 'scheduled', views: 87 },
  { id: '3', type: 'news', title: 'CISA flags active exploitation in CI runner', description: 'Self-hosted runners need patching today.', category: 'SECURITY', score: 91, source: 'CISA', timeAgo: '2h ago', status: 'published', views: 96 },
];

const mockJobs = [
  { id: '1', title: 'Senior Platform Engineer', companyName: 'Grafana Labs', experienceLevel: 'senior', jobType: 'full-time', isRemote: true, salaryMin: 150000, requiredSkills: ['Kubernetes', 'Go', 'AWS'], applicationUrl: 'https://grafana.com/careers', email: 'careers@grafana.com' },
  { id: '2', title: 'Data Scientist', companyName: 'Airbnb', experienceLevel: 'senior', jobType: 'full-time', isRemote: true, salaryMin: 180000, requiredSkills: ['Python', 'ML', 'SQL'], applicationUrl: 'https://airbnb.com/careers', email: 'talent@airbnb.com' },
];

// ================================
// Serverless Handler
// ================================
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url;
  const method = req.method;

  try {
    // ===== AUTH ENDPOINTS =====
    
    // Register
    if (url === '/api/auth/register' && method === 'POST') {
      const { email, password, name } = req.body || {};
      
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
        id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        email: normalizedEmail,
        password: hashPassword(password),
        name: name.trim(),
        role: 'user',
        createdAt: new Date().toISOString()
      };
      
      users.set(normalizedEmail, user);
      
      const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      
      return res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token 
      });
    }
    
    // Login
    if (url === '/api/auth/login' && method === 'POST') {
      const { email, password } = req.body || {};
      
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
      
      const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      
      return res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token 
      });
    }
    
    // Verify token
    if (url === '/api/auth/verify' && method === 'POST') {
      const { token } = req.body || {};
      const payload = verifyToken(token);
      return res.json({ valid: !!payload, user: payload });
    }
    
    // Get current user
    if (url === '/api/auth/me' && method === 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.json({ user: payload });
    }
    
    // ===== DATA ENDPOINTS =====
    
    if (url === '/api/health') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    if (url === '/api/stats') {
      return res.json(mockStats);
    }
    
    if (url === '/api/feed') {
      return res.json({ items: mockFeed });
    }
    
    if (url === '/api/jobs') {
      return res.json({ jobs: mockJobs });
    }
    
    if (url === '/api/news') {
      const news = mockFeed.filter(item => item.type === 'news');
      return res.json({ news });
    }
    
    if (url === '/api/queue') {
      const queue = mockFeed.filter(item => item.status === 'review' || item.status === 'scheduled');
      return res.json({ queue });
    }
    
    // API info
    if (url === '/api' || url === '/api/') {
      return res.json({
        name: 'TechGig Radar API',
        version: '1.0.0',
        endpoints: ['/api/auth/login', '/api/auth/register', '/api/health', '/api/feed', '/api/jobs'],
        demo: { email: 'demo@techgig.com', password: 'demo123' }
      });
    }
    
    // 404
    return res.status(404).json({ error: 'Not found', url });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
