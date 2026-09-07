// TechGig Radar - Worldwide Tech Jobs Discovery
// Deep research from multiple global job boards

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fetch helper
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: 30000
    };
    
    const req = https.request(reqOptions, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location, options).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

// STRICT WHITELIST: Job title MUST contain one of these
const TECH_KEYWORDS = [
  // Engineering
  'developer', 'engineer', 'programmer', 'architect', 'coder',
  'frontend', 'backend', 'fullstack', 'full-stack', 'full stack',
  'software', 'swe', 'sde',
  // Specific roles
  'devops', 'sre', 'site reliability', 'platform engineer',
  'data scientist', 'data engineer', 'data analyst',
  'machine learning', 'ml engineer', 'ai engineer', 'ai researcher',
  'ios', 'android', 'mobile developer', 'react native', 'flutter',
  'qa engineer', 'quality assurance', 'test engineer', 'sdet', 'automation',
  'security engineer', 'cybersecurity', 'infosec', 'penetration tester',
  'cloud engineer', 'aws', 'azure', 'gcp', 'infrastructure',
  'database', 'dba', 'sql', 'mongodb',
  'linux', 'sysadmin', 'system administrator', 'network engineer',
  'tech lead', 'engineering manager', 'vp engineering', 'cto',
  'ux designer', 'ui designer', 'product designer', 'ux/ui',
  // Web
  'web developer', 'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'python', 'golang', 'rust', 'java developer',
  // HR/Recruiting
  'technical recruiter', 'tech recruiter', 'engineering recruiter',
  'talent acquisition', 'recruiter', 'hr manager', 'people operations'
];

// Check if valid tech job
function isValidTechJob(title) {
  const t = title.toLowerCase();
  return TECH_KEYWORDS.some(kw => t.includes(kw));
}

// Categorize job
function categorizeJob(title) {
  const t = title.toLowerCase();
  
  if (t.match(/recruiter|recruiting|talent|hr |human resource|people ops/)) return 'HR & Recruitment';
  if (t.match(/devops|sre|cloud|platform|infrastructure|kubernetes|docker/)) return 'DevOps & Cloud';
  if (t.match(/\bai\b|ml|machine learning|data scien|deep learning|nlp/)) return 'AI & ML';
  if (t.match(/ios|android|mobile|react native|flutter/)) return 'Mobile';
  if (t.match(/frontend|front-end|front end|ui |ux |designer/) && !t.match(/full.?stack/)) return 'Frontend';
  if (t.match(/backend|back-end|back end/) && !t.match(/full.?stack/)) return 'Backend';
  if (t.match(/full.?stack|fullstack/)) return 'Full-stack';
  if (t.match(/security|infosec|penetration|cyber/)) return 'Security';
  if (t.match(/qa|test|quality|sdet/)) return 'QA & Testing';
  if (t.match(/data engineer|data analyst|database|sql|dba/)) return 'Data Engineering';
  
  return 'Software Engineering';
}

// Source 1: RemoteOK (Global Remote Jobs)
async function fetchRemoteOK() {
  console.log('💼 Fetching: RemoteOK (Global Remote)...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://remoteok.com/api');
    const items = JSON.parse(data);
    
    let skipped = 0;
    for (const job of items.slice(1, 100)) {
      const title = job.position || '';
      
      if (!isValidTechJob(title)) {
        skipped++;
        continue;
      }
      
      jobs.push({
        id: `job_remoteok_${job.id}`,
        title: title,
        company: job.company || 'Company',
        location: job.location || 'Remote Worldwide',
        salary: job.salary_min && job.salary_max 
          ? `$${Math.round(job.salary_min/1000)}K - $${Math.round(job.salary_max/1000)}K`
          : 'Competitive',
        job_type: 'Full-time Remote',
        category: categorizeJob(title),
        experience: job.tags?.includes('senior') ? '5+ years' : 
                    job.tags?.includes('junior') ? '1-3 years' : 'Mid-level',
        skills: (job.tags || []).filter(t => !['senior', 'junior', 'remote'].includes(t)).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
        source: 'RemoteOK',
        posted_at: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} tech jobs (skipped ${skipped} non-tech)`);
  } catch (e) {
    console.log('   RemoteOK error:', e.message);
  }
  
  return jobs;
}

// Source 2: Remotive - Software Dev
async function fetchRemotiveSoftware() {
  console.log('💼 Fetching: Remotive Software Dev...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=50');
    const items = JSON.parse(data);
    
    for (const job of (items.jobs || [])) {
      const title = job.title || '';
      if (!isValidTechJob(title)) continue;
      
      jobs.push({
        id: `job_remotive_${job.id}`,
        title: title,
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote Worldwide',
        salary: job.salary || 'Competitive',
        job_type: job.job_type || 'Full-time Remote',
        category: categorizeJob(title),
        experience: 'Mid-level',
        skills: (job.tags || []).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url,
        source: 'Remotive',
        posted_at: job.publication_date || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} software jobs`);
  } catch (e) {
    console.log('   Remotive Software error:', e.message);
  }
  
  return jobs;
}

// Source 3: Remotive - DevOps
async function fetchRemotiveDevOps() {
  console.log('💼 Fetching: Remotive DevOps/SysAdmin...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://remotive.com/api/remote-jobs?category=devops&limit=30');
    const items = JSON.parse(data);
    
    for (const job of (items.jobs || [])) {
      const title = job.title || '';
      if (!isValidTechJob(title)) continue;
      
      jobs.push({
        id: `job_remotive_devops_${job.id}`,
        title: title,
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        job_type: 'Full-time Remote',
        category: 'DevOps & Cloud',
        experience: 'Mid-level',
        skills: (job.tags || []).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url,
        source: 'Remotive',
        posted_at: job.publication_date || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} DevOps jobs`);
  } catch (e) {
    console.log('   Remotive DevOps error:', e.message);
  }
  
  return jobs;
}

// Source 4: Remotive - Data
async function fetchRemotiveData() {
  console.log('💼 Fetching: Remotive Data Science/AI...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://remotive.com/api/remote-jobs?category=data&limit=30');
    const items = JSON.parse(data);
    
    for (const job of (items.jobs || [])) {
      const title = job.title || '';
      if (!isValidTechJob(title)) continue;
      
      jobs.push({
        id: `job_remotive_data_${job.id}`,
        title: title,
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        job_type: 'Full-time Remote',
        category: categorizeJob(title),
        experience: 'Mid-level',
        skills: (job.tags || []).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url,
        source: 'Remotive',
        posted_at: job.publication_date || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} Data/AI jobs`);
  } catch (e) {
    console.log('   Remotive Data error:', e.message);
  }
  
  return jobs;
}

// Source 5: Remotive - QA
async function fetchRemotiveQA() {
  console.log('💼 Fetching: Remotive QA...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://remotive.com/api/remote-jobs?category=qa&limit=20');
    const items = JSON.parse(data);
    
    for (const job of (items.jobs || [])) {
      const title = job.title || '';
      if (!isValidTechJob(title)) continue;
      
      jobs.push({
        id: `job_remotive_qa_${job.id}`,
        title: title,
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        job_type: 'Full-time Remote',
        category: 'QA & Testing',
        experience: 'Mid-level',
        skills: (job.tags || []).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url,
        source: 'Remotive',
        posted_at: job.publication_date || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} QA jobs`);
  } catch (e) {
    console.log('   Remotive QA error:', e.message);
  }
  
  return jobs;
}

// Source 6: Remotive - HR (Tech Recruiters only)
async function fetchRemotiveHR() {
  console.log('💼 Fetching: Remotive HR (Tech Recruiters)...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://remotive.com/api/remote-jobs?category=hr&limit=30');
    const items = JSON.parse(data);
    
    for (const job of (items.jobs || [])) {
      const title = (job.title || '').toLowerCase();
      
      // Only include actual recruiting/HR roles
      if (!title.match(/recruiter|recruiting|talent|hr manager|people ops|hrbp/)) {
        continue;
      }
      
      jobs.push({
        id: `job_remotive_hr_${job.id}`,
        title: job.title,
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        job_type: 'Full-time Remote',
        category: 'HR & Recruitment',
        experience: 'Mid-level',
        skills: (job.tags || []).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url,
        source: 'Remotive',
        posted_at: job.publication_date || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} HR/Recruiter jobs`);
  } catch (e) {
    console.log('   Remotive HR error:', e.message);
  }
  
  return jobs;
}

// Source 7: Arbeitnow (EU Tech Jobs)
async function fetchArbeitnow() {
  console.log('💼 Fetching: Arbeitnow (EU Tech Jobs)...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://www.arbeitnow.com/api/job-board-api');
    const items = JSON.parse(data);
    
    for (const job of (items.data || []).slice(0, 50)) {
      const title = job.title || '';
      if (!isValidTechJob(title)) continue;
      
      jobs.push({
        id: `job_arbeitnow_${job.slug}`,
        title: title,
        company: job.company_name || 'Company',
        location: job.location || 'Europe Remote',
        salary: 'Competitive',
        job_type: job.remote ? 'Remote' : 'On-site',
        category: categorizeJob(title),
        experience: 'Mid-level',
        skills: (job.tags || []).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url,
        source: 'Arbeitnow',
        posted_at: job.created_at || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} EU tech jobs`);
  } catch (e) {
    console.log('   Arbeitnow error:', e.message);
  }
  
  return jobs;
}

// Source 8: Jobicy (Global Remote)
async function fetchJobicy() {
  console.log('💼 Fetching: Jobicy (Global Remote)...');
  const jobs = [];
  
  try {
    const { data } = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50&industry=tech');
    const items = JSON.parse(data);
    
    for (const job of (items.jobs || [])) {
      const title = job.jobTitle || '';
      if (!isValidTechJob(title)) continue;
      
      jobs.push({
        id: `job_jobicy_${job.id}`,
        title: title,
        company: job.companyName || 'Company',
        location: job.jobGeo || 'Remote Worldwide',
        salary: job.annualSalaryMin && job.annualSalaryMax 
          ? `$${Math.round(job.annualSalaryMin/1000)}K - $${Math.round(job.annualSalaryMax/1000)}K`
          : 'Competitive',
        job_type: job.jobType || 'Full-time Remote',
        category: categorizeJob(title),
        experience: job.jobLevel || 'Mid-level',
        skills: [],
        description: (job.jobExcerpt || '').slice(0, 500),
        apply_url: job.url,
        source: 'Jobicy',
        posted_at: job.pubDate || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${jobs.length} global remote jobs`);
  } catch (e) {
    console.log('   Jobicy error:', e.message);
  }
  
  return jobs;
}

// Clear old non-tech jobs
async function clearOldJobs() {
  console.log('\n🧹 Clearing old non-tech jobs...');
  
  const validCategories = [
    'Software Engineering', 'DevOps & Cloud', 'AI & ML', 'Mobile', 
    'Frontend', 'Backend', 'Full-stack', 'Security', 'QA & Testing', 
    'Data Engineering', 'HR & Recruitment'
  ];
  
  const { error } = await supabase
    .from('jobs')
    .delete()
    .not('category', 'in', `(${validCategories.map(c => `"${c}"`).join(',')})`);
  
  if (error) {
    console.log('   Clear error:', error.message);
  } else {
    console.log('   Cleared old jobs');
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('💼 TechGig Radar - Worldwide Tech Jobs Discovery');
  console.log('═'.repeat(60));
  console.log('Time:', new Date().toISOString());
  console.log('');
  console.log('ALLOWED: Developer, Engineer, DevOps, QA, AI/ML, Security,');
  console.log('         Data Engineer, Tech Recruiter, HR Manager');
  console.log('BLOCKED: Sales, Marketing, Writers, Support, etc.');
  console.log('');
  
  // Clear old bad jobs
  await clearOldJobs();
  
  // Fetch from all sources in parallel
  const results = await Promise.allSettled([
    fetchRemoteOK(),
    fetchRemotiveSoftware(),
    fetchRemotiveDevOps(),
    fetchRemotiveData(),
    fetchRemotiveQA(),
    fetchRemotiveHR(),
    fetchArbeitnow(),
    fetchJobicy()
  ]);
  
  // Combine all jobs
  let allJobs = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs = allJobs.concat(result.value);
    }
  }
  
  console.log(`\n📊 Total raw jobs: ${allJobs.length}`);
  
  // Dedupe by company+title
  const seenKeys = new Set();
  const uniqueJobs = allJobs.filter(j => {
    const key = `${j.company}_${j.title}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  
  console.log(`📊 After deduplication: ${uniqueJobs.length}`);
  
  // Sort by recency
  uniqueJobs.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
  
  // Upsert to Supabase
  console.log(`\n💾 Saving ${uniqueJobs.length} jobs to Supabase...`);
  
  let saved = 0;
  for (const job of uniqueJobs) {
    const { error } = await supabase
      .from('jobs')
      .upsert(job, { onConflict: 'id' });
    
    if (!error) saved++;
  }
  
  // Count by category
  const categories = {};
  uniqueJobs.forEach(j => {
    categories[j.category] = (categories[j.category] || 0) + 1;
  });
  
  // Count by source
  const sources = {};
  uniqueJobs.forEach(j => {
    sources[j.source] = (sources[j.source] || 0) + 1;
  });
  
  const techCount = uniqueJobs.filter(j => j.category !== 'HR & Recruitment').length;
  const hrCount = uniqueJobs.filter(j => j.category === 'HR & Recruitment').length;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Saved ${saved} tech jobs worldwide`);
  console.log('\n📊 By Category:');
  Object.entries(categories).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
  console.log('\n🌍 By Source:');
  Object.entries(sources).sort((a,b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`   ${src}: ${count}`);
  });
  console.log('\n📈 Summary:');
  console.log(`   💻 Technical Jobs: ${techCount}`);
  console.log(`   👔 HR/Recruitment: ${hrCount}`);
  console.log('═'.repeat(60));
  
  // Output for GitHub Actions
  console.log(`\n::set-output name=jobs_count::${saved}`);
  console.log(`::set-output name=tech_jobs::${techCount}`);
  console.log(`::set-output name=hr_jobs::${hrCount}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
