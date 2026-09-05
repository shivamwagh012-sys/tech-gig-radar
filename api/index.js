const express = require('express');
const app = express();

// Mock data for serverless deployment (no SQLite on Vercel)
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
  { id: '6', type: 'reel', title: 'Three fake job posts, spotted in 30 seconds', description: 'Learn how to identify scam job postings', category: 'VERIFICATION', duration: '0:34', source: 'Radar', timeAgo: '1d ago', status: 'published', views: 18200, comments: 45 },
  { id: '7', type: 'reel', title: 'AWS just made your backups cheaper', description: 'Quick breakdown of the new pricing', category: 'CLOUD', duration: '0:21', source: 'Radar', timeAgo: '2d ago', status: 'published', views: 11700, comments: 23 },
  { id: '8', type: 'reel', title: 'A fresher-friendly job, read line by line', description: 'How to evaluate entry-level job postings', category: 'FRESHERS', duration: '0:48', source: 'Radar', timeAgo: '3d ago', status: 'published', views: 26400, comments: 89 },
  { id: '9', type: 'news', title: 'AWS drops egress fees for cross-region replication', description: 'Applies to S3 replication in all commercial regions from next billing cycle.', category: 'CLOUD', score: 88, source: 'AWS News', timeAgo: '7h ago', status: 'published', views: 132, comments: 0 },
  { id: '10', type: 'job', title: 'Associate Data Engineer', description: 'Zero-to-two years, structured mentoring, dbt shop.', category: 'FRESHER', source: 'HN Who\'s Hiring', timeAgo: '9h ago', status: 'review', views: 74, comments: 0 },
  { id: '11', type: 'news', title: 'GitHub Actions gains native OIDC for third-party registries', description: 'Long-lived registry tokens can come out of your secrets today.', category: 'DEV TOOLS', score: 90, source: 'GitHub Changelog', timeAgo: '11h ago', status: 'published', views: 158, comments: 0 },
  { id: '12', type: 'carousel', title: 'The week in AI, in four cards', description: 'Every verified AI story from the last seven days, one card each.', category: '4 slides', source: 'Radar original', timeAgo: '13h ago', status: 'published', views: 289, comments: 0 },
];

const mockJobs = [
  { id: '1', title: 'Senior Platform Engineer', companyName: 'Grafana Labs', experienceLevel: 'senior', jobType: 'full-time', isRemote: true, salaryMin: 150000, companyLocation: 'Ireland', requiredSkills: ['Kubernetes', 'Go', 'AWS', 'Terraform', 'Prometheus'], applicationUrl: 'https://grafana.com/careers' },
  { id: '2', title: 'Data Scientist - Inference', companyName: 'Airbnb', experienceLevel: 'senior', jobType: 'full-time', isRemote: true, salaryMin: 180000, companyLocation: 'Remote', requiredSkills: ['Python', 'ML', 'SQL', 'Statistics', 'TensorFlow'], applicationUrl: 'https://airbnb.com/careers' },
  { id: '3', title: 'Frontend Engineer (React)', companyName: 'Series B Fintech', experienceLevel: 'mid', jobType: 'contract', isRemote: true, salaryMin: 80000, companyLocation: 'India OK', requiredSkills: ['React', 'TypeScript', 'CSS', 'Testing', 'GraphQL'], applicationUrl: '#' },
  { id: '4', title: 'Associate Data Engineer', companyName: 'Data Startup', experienceLevel: 'fresher', jobType: 'full-time', isRemote: true, salaryMin: 60000, companyLocation: 'Worldwide', requiredSkills: ['Python', 'SQL', 'dbt', 'AWS', 'Airflow'], applicationUrl: '#' },
  { id: '5', title: 'DevOps Consultant (6 months)', companyName: 'Consulting Inc', experienceLevel: 'senior', jobType: 'contract', isRemote: true, salaryMin: 120000, companyLocation: 'Europe overlap', requiredSkills: ['Jenkins', 'AWS', 'Docker', 'CI/CD', 'Kubernetes'], applicationUrl: '#' },
  { id: '6', title: 'Senior AI Engineer', companyName: 'Lemon.io', experienceLevel: 'senior', jobType: 'contract', isRemote: true, salaryMin: 140000, companyLocation: 'Worldwide', requiredSkills: ['Python', 'PyTorch', 'LLMs', 'MLOps', 'AWS'], applicationUrl: 'https://lemon.io' },
  { id: '7', title: 'Backend Engineer - Platform', companyName: 'CircleCI', experienceLevel: 'senior', jobType: 'full-time', isRemote: true, salaryMin: 160000, companyLocation: 'Remote', requiredSkills: ['Go', 'Kubernetes', 'PostgreSQL', 'gRPC', 'AWS'], applicationUrl: 'https://circleci.com/careers' },
  { id: '8', title: 'Junior Software Engineer', companyName: 'Tech Startup', experienceLevel: 'junior', jobType: 'full-time', isRemote: true, salaryMin: 50000, companyLocation: 'India', requiredSkills: ['JavaScript', 'React', 'Node.js', 'Git'], applicationUrl: '#' },
];

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// API Endpoints
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

// Root - serve info
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
      queue: '/api/queue'
    },
    telegram: 'https://t.me/TechGigRadar',
    dashboard: 'Coming soon'
  });
});

module.exports = app;
