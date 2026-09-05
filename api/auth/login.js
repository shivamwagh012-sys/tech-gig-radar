import { createHmac, createHash } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'techgig-radar-secret-2026';

function b64encode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(data) {
  return createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(payload) {
  const h = b64encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64encode(JSON.stringify({ ...payload, exp: Date.now() + 604800000 }));
  return h + '.' + p + '.' + sign(h + '.' + p);
}

function hash(password) {
  return createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Demo user
const DEMO_USER = {
  id: 'demo-001',
  email: 'demo@techgig.com',
  password: hash('demo123'),
  name: 'Demo User'
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check demo user
  if (normalizedEmail === DEMO_USER.email && hash(password) === DEMO_USER.password) {
    const token = createToken({ id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name });
    return res.json({ 
      success: true, 
      user: { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name },
      token 
    });
  }
  
  return res.status(401).json({ success: false, error: 'Invalid email or password' });
}
