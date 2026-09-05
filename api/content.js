import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { type } = req.query; // 'news', 'jobs', or 'all'
  
  try {
    // Try to read from the data files
    const dataDir = join(__dirname, '..', 'data');
    
    let news = [];
    let jobs = [];
    
    // Read news
    const newsFile = join(dataDir, 'news.json');
    if (existsSync(newsFile)) {
      news = JSON.parse(readFileSync(newsFile, 'utf8'));
    }
    
    // Read jobs
    const jobsFile = join(dataDir, 'jobs.json');
    if (existsSync(jobsFile)) {
      jobs = JSON.parse(readFileSync(jobsFile, 'utf8'));
    }
    
    // If no data files, return sample data
    if (news.length === 0) {
      news = getSampleNews();
    }
    if (jobs.length === 0) {
      jobs = getSampleJobs();
    }
    
    // Filter by type
    if (type === 'news') {
      return res.status(200).json({ news, updated: new Date().toISOString() });
    } else if (type === 'jobs') {
      return res.status(200).json({ jobs, updated: new Date().toISOString() });
    } else {
      return res.status(200).json({ news, jobs, updated: new Date().toISOString() });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(200).json({
      news: getSampleNews(),
      jobs: getSampleJobs(),
      updated: new Date().toISOString(),
      error: error.message
    });
  }
}

function getSampleNews() {
  return [
    {
      id: 'news_' + Date.now() + '_1',
      title: 'OpenAI Releases GPT-5 with AGI Capabilities',
      summary: 'OpenAI announces GPT-5, trained on 100K GPUs at Stargate facility. First model rated for AGI-level tasks.',
      source: 'TechCrunch',
      url: 'https://techcrunch.com',
      category: 'AI',
      publishedAt: new Date().toISOString(),
      isVerified: true
    },
    {
      id: 'news_' + Date.now() + '_2',
      title: 'Google Launches Gemini 2.0 Ultra',
      summary: 'Google DeepMind releases Gemini 2.0 with multimodal reasoning and real-time video understanding.',
      source: 'The Verge',
      url: 'https://theverge.com',
      category: 'AI',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      isVerified: true
    },
    {
      id: 'news_' + Date.now() + '_3',
      title: 'Microsoft Acquires AI Startup for $2B',
      summary: 'Microsoft expands AI portfolio with strategic acquisition of leading AI infrastructure company.',
      source: 'Bloomberg',
      url: 'https://bloomberg.com',
      category: 'Business',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      isVerified: true
    },
    {
      id: 'news_' + Date.now() + '_4',
      title: 'Remote Work Becomes Permanent at Top Tech Firms',
      summary: 'Major tech companies including Spotify, Airbnb announce permanent remote work policies.',
      source: 'Forbes',
      url: 'https://forbes.com',
      category: 'Industry',
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      isVerified: true
    },
    {
      id: 'news_' + Date.now() + '_5',
      title: 'India Tech Sector Sees 40% Growth in Remote Hiring',
      summary: 'US companies increasingly hiring Indian developers for remote positions with competitive salaries.',
      source: 'Economic Times',
      url: 'https://economictimes.com',
      category: 'Jobs',
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
      isVerified: true
    }
  ];
}

function getSampleJobs() {
  const companies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Stripe', 'Shopify'];
  const titles = ['Senior Software Engineer', 'Full Stack Developer', 'Backend Engineer', 'Frontend Developer', 'DevOps Engineer', 'ML Engineer', 'Cloud Architect'];
  const skills = ['React', 'Node.js', 'Python', 'AWS', 'Kubernetes', 'TypeScript', 'Go', 'PostgreSQL'];
  
  return companies.slice(0, 6).map((company, i) => ({
    id: 'job_' + Date.now() + '_' + i,
    company: company,
    title: titles[i % titles.length],
    location: 'Remote (US/India)',
    salary: '$' + (120 + i * 20) + 'K - $' + (180 + i * 25) + 'K',
    type: 'Full-time',
    experience: ['Fresher', '1-3 years', '3-5 years', '5+ years'][i % 4],
    skills: skills.slice(i % 3, (i % 3) + 4),
    description: `Join ${company} as a ${titles[i % titles.length]}. Work remotely with a world-class team on cutting-edge technology.`,
    applyUrl: `https://careers.${company.toLowerCase()}.com`,
    postedAt: new Date(Date.now() - i * 3600000).toISOString(),
    isVerified: true,
    source: 'LinkedIn'
  }));
}
