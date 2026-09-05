// Export latest news and jobs from SQLite to JSON for deployment
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'techgig.db');
const publicDataDir = path.join(__dirname, '..', 'public', 'data');

fs.mkdirSync(publicDataDir, { recursive: true });

const db = new Database(dbPath, { readonly: true });

// Export news
console.log('Exporting news...');
const news = db.prepare(`
  SELECT id, title, summary, source_name, source_url, category, created_at, verification_status
  FROM news 
  ORDER BY created_at DESC 
  LIMIT 50
`).all();

const newsData = news.map(row => ({
  id: row.id,
  title: row.title,
  summary: row.summary || row.title.substring(0, 150),
  source: row.source_name || 'TechGig Radar',
  url: row.source_url || '#',
  category: row.category || 'Tech',
  publishedAt: row.created_at,
  isVerified: row.verification_status === 'verified'
}));

fs.writeFileSync(path.join(publicDataDir, 'news.json'), JSON.stringify(newsData, null, 2));
console.log(`Exported ${newsData.length} news items`);

// Export jobs
console.log('Exporting jobs...');
const jobs = db.prepare(`
  SELECT id, title, company_name, company_location, salary_min, salary_max, salary_currency,
         job_type, experience_level, required_skills, description, application_url, 
         source_name, created_at, verification_status
  FROM jobs 
  ORDER BY created_at DESC 
  LIMIT 50
`).all();

const jobsData = jobs.map(row => {
  let salary = 'Competitive';
  if (row.salary_min && row.salary_max) {
    salary = `$${(row.salary_min/1000).toFixed(0)}K - $${(row.salary_max/1000).toFixed(0)}K`;
  } else if (row.salary_min) {
    salary = `$${(row.salary_min/1000).toFixed(0)}K+`;
  }
  
  let skills = [];
  if (row.required_skills) {
    try {
      skills = JSON.parse(row.required_skills);
    } catch (e) {
      skills = row.required_skills.split(',').map(s => s.trim());
    }
  }
  
  return {
    id: row.id,
    title: row.title,
    company: row.company_name || 'Company',
    location: row.company_location || 'Remote',
    salary: salary,
    type: row.job_type || 'Full-time',
    experience: row.experience_level || 'Mid-level',
    skills: skills,
    description: row.description,
    applyUrl: row.application_url || '#',
    source: row.source_name || 'TechGig Radar',
    postedAt: row.created_at,
    isVerified: row.verification_status === 'verified'
  };
});

fs.writeFileSync(path.join(publicDataDir, 'jobs.json'), JSON.stringify(jobsData, null, 2));
console.log(`Exported ${jobsData.length} jobs`);

// Create manifest
const manifest = {
  exportedAt: new Date().toISOString(),
  newsCount: newsData.length,
  jobsCount: jobsData.length
};

fs.writeFileSync(path.join(publicDataDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

db.close();
console.log('\n✅ Export complete!');
console.log('Latest news:', newsData[0]?.title);
console.log('Latest job:', jobsData[0]?.title);
