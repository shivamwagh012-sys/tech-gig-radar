const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'techgig-radar-secret-2026';

function b64encode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(data) {
  return crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(payload) {
  const h = b64encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64encode(JSON.stringify({ ...payload, exp: Date.now() + 604800000 }));
  return h + '.' + p + '.' + sign(h + '.' + p);
}

function hash(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// In-memory store (resets on cold start - demo only)
const registeredUsers = {};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email, password, name } = req.body || {};
  
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: 'All fields required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be 6+ characters' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  if (normalizedEmail === 'demo@techgig.com' || registeredUsers[normalizedEmail]) {
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }
  
  const id = 'user-' + Date.now();
  registeredUsers[normalizedEmail] = { id, email: normalizedEmail, name: name.trim() };
  
  const token = createToken({ id, email: normalizedEmail, name: name.trim() });
  return res.json({ 
    success: true, 
    user: { id, email: normalizedEmail, name: name.trim() },
    token 
  });
};
