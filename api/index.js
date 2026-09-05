const crypto = require('crypto');

// ================================
// JWT Helpers
// ================================
const JWT_SECRET = process.env.JWT_SECRET || 'techgig-radar-secret-2026';

function b64encode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64decode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

function sign(data) {
  return crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(payload) {
  const h = b64encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64encode(JSON.stringify({ ...payload, exp: Date.now() + 604800000 }));
  return h + '.' + p + '.' + sign(h + '.' + p);
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    if (sign(parts[0] + '.' + parts[1]) !== parts[2]) return null;
    const payload = JSON.parse(b64decode(parts[1]));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) { return null; }
}

function hash(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// ================================
// Users Store
// ================================
const users = {};
users['demo@techgig.com'] = {
  id: 'demo-001',
  email: 'demo@techgig.com',
  password: hash('demo123'),
  name: 'Demo User'
};

// ================================
// Handler
// ================================
module.exports = function(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  var url = req.url || '';
  var method = req.method || 'GET';
  var body = req.body || {};

  // Health
  if (url === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // Login
  if (url === '/api/auth/login' && method === 'POST') {
    var email = (body.email || '').toLowerCase().trim();
    var password = body.password || '';
    
    if (!email || !password) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Email and password required' }));
      return;
    }
    
    var user = users[email];
    if (!user || user.password !== hash(password)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
      return;
    }
    
    var token = createToken({ id: user.id, email: user.email, name: user.name });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name },
      token: token
    }));
    return;
  }

  // Register
  if (url === '/api/auth/register' && method === 'POST') {
    var email = (body.email || '').toLowerCase().trim();
    var password = body.password || '';
    var name = (body.name || '').trim();
    
    if (!email || !password || !name) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'All fields required' }));
      return;
    }
    
    if (password.length < 6) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Password must be 6+ characters' }));
      return;
    }
    
    if (users[email]) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Email already registered' }));
      return;
    }
    
    var id = 'user-' + Date.now();
    users[email] = { id: id, email: email, password: hash(password), name: name };
    
    var token = createToken({ id: id, email: email, name: name });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      success: true, 
      user: { id: id, email: email, name: name },
      token: token
    }));
    return;
  }

  // Verify
  if (url === '/api/auth/verify' && method === 'POST') {
    var payload = verifyToken(body.token || '');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ valid: !!payload, user: payload }));
    return;
  }

  // Stats
  if (url === '/api/stats') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ news: { total: 1450, published: 45 }, jobs: { total: 85, published: 22 } }));
    return;
  }

  // Feed
  if (url === '/api/feed') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ items: [
      { id: '1', type: 'news', title: 'OpenAI o-series fine-tuning', category: 'AI', timeAgo: '18m ago' },
      { id: '2', type: 'job', title: 'Senior Platform Engineer', category: 'REMOTE', timeAgo: '42m ago' }
    ]}));
    return;
  }

  // Jobs
  if (url === '/api/jobs') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ jobs: [
      { id: '1', title: 'Senior Platform Engineer', companyName: 'Grafana Labs', salaryMin: 150000 }
    ]}));
    return;
  }

  // Default
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ 
    name: 'TechGig Radar API',
    demo: { email: 'demo@techgig.com', password: 'demo123' }
  }));
};
