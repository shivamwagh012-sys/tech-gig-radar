// Discover jobs and save to Supabase
// Runs on GitHub Actions every 12 hours - DEEP RESEARCH

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 'User-Agent': 'TechGigRadar/1.0', 'Accept': 'application/json' }, 
      timeout: 30000 
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// STRICT Tech job keywords - must match at least one
const TECH_KEYWORDS = [
  'developer', 'engineer', 'programmer', 'software', 'frontend', 'backend', 'fullstack', 'full-stack',
  'devops', 'sre', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker',
  'data scientist', 'data engineer', 'machine learning', 'ml engineer', 'ai engineer', 'deep learning',
  'python', 'javascript', 'typescript', 'react', 'node', 'java', 'golang', 'rust', 'c++',
  'ios', 'android', 'mobile developer', 'flutter', 'react native', 'swift', 'kotlin',
  'qa engineer', 'test engineer', 'automation engineer', 'sdet',
  'security engineer', 'cybersecurity', 'infosec', 'penetration tester',
  'database', 'dba', 'sql', 'mongodb', 'postgresql',
  'system administrator', 'sysadmin', 'linux', 'network engineer',
  'tech lead', 'engineering manager', 'cto', 'vp engineering',
  'ui/ux', 'ux designer', 'ui designer', 'product designer'
];

// HR/Recruitment keywords
const HR_KEYWORDS = [
  'recruiter', 'recruiting', 'talent acquisition', 'talent sourcer', 'technical recruiter',
  'hr manager', 'human resources', 'people operations', 'people ops', 'hrbp',
  'staffing', 'hiring manager', 'recruitment coordinator'
];

// BLOCKED keywords - jobs containing these are excluded
const BLOCKED_KEYWORDS = [
  'sales', 'salesperson', 'account executive', 'business development', 'bdr', 'sdr',
  'writer', 'copywriter', 'content writer', 'freelance writer', 'blog writer',
  'marketing', 'social media', 'seo specialist', 'growth hacker',
  'customer support', 'customer service', 'support specialist', 'help desk',
  'driver', 'delivery', 'warehouse', 'cleaner', 'maid', 'janitor',
  'cook', 'chef', 'waiter', 'bartender', 'cashier', 'retail',
  'nurse', 'doctor', 'medical', 'healthcare', 'dental',
  'teacher', 'tutor', 'instructor', 'professor',
  'accountant', 'bookkeeper', 'financial analyst',
  'lawyer', 'legal', 'paralegal', 'attorney',
  'real estate', 'property', 'mortgage',
  'insurance', 'claims', 'underwriter',
  'administrative assistant', 'receptionist', 'office manager',
  'data entry', 'virtual assistant', 'executive assistant',
  'construction', 'electrician', 'plumber', 'mechanic', 'technician',
  'crypto', 'trader', 'forex', 'bitcoin', 'blockchain' // Often scams
];

// Check if job is valid tech or HR job
function isValidJob(title, tags = []) {
  const titleLower = title.toLowerCase();
  const allTags = tags.map(t => t.toLowerCase()).join(' ');
  const combined = titleLower + ' ' + allTags;
  
  // First check if blocked
  for (const blocked of BLOCKED_KEYWORDS) {
    if (combined.includes(blocked)) {
      return { valid: false, category: null };
    }
  }
  
  // Check if HR job
  for (const hr of HR_KEYWORDS) {
    if (combined.includes(hr)) {
      return { valid: true, category: 'HR & Recruitment' };
    }
  }
  
  // Check if tech job
  for (const tech of TECH_KEYWORDS) {
    if (combined.includes(tech)) {
      return { valid: true, category: categorizeJob(titleLower, allTags) };
    }
  }
  
  return { valid: false, category: null };
}

// Categorize tech job
function categorizeJob(title, tags) {
  const combined = title + ' ' + tags;
  
  if (combined.match(/\b(devops|sre|cloud|aws|azure|gcp|kubernetes|docker|infrastructure)\b/)) {
    return 'DevOps & Cloud';
  }
  if (combined.match(/\b(ai|ml|machine learning|data scien|deep learning|nlp|computer vision)\b/)) {
    return 'AI & ML';
  }
  if (combined.match(/\b(ios|android|mobile|react native|flutter|swift|kotlin)\b/)) {
    return 'Mobile';
  }
  if (combined.match(/\b(frontend|front-end|react|vue|angular|ui|ux|css)\b/) && !combined.match(/full.?stack/)) {
    return 'Frontend';
  }
  if (combined.match(/\b(backend|back-end|node|python|java|golang|ruby|php|api)\b/) && !combined.match(/full.?stack/)) {
    return 'Backend';
  }
  if (combined.match(/\b(full.?stack|fullstack)\b/)) {
    return 'Full-stack';
  }
  if (combined.match(/\b(security|infosec|penetration|cybersecurity)\b/)) {
    return 'Security';
  }
  if (combined.match(/\b(qa|test|quality|sdet|automation)\b/)) {
    return 'QA & Testing';
  }
  
  return 'Software Engineering';
}

async function fetchRemoteOK() {
  try {
    console.log('Fetching: RemoteOK...');
    const json = await fetch('https://remoteok.com/api');
    const data = JSON.parse(json);
    
    const jobs = [];
    for (const job of data.slice(1, 100)) { // Check more jobs for better filtering
      const { valid, category } = isValidJob(job.position || '', job.tags || []);
      if (!valid) continue;
      
      jobs.push({
        id: 'job_remoteok_' + job.id,
        title: job.position || 'Unknown',
        company: job.company || 'Company',
        location: job.location || 'Remote Worldwide',
        salary: job.salary_min && job.salary_max 
          ? `$${Math.round(job.salary_min/1000)}K - $${Math.round(job.salary_max/1000)}K`
          : 'Competitive',
        job_type: 'Full-time',
        category: category,
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
    
    console.log(`  Found ${jobs.length} valid tech/HR jobs (filtered from ${data.length - 1})`);
    return jobs;
  } catch (e) {
    console.log('  RemoteOK error:', e.message);
    return [];
  }
}

async function fetchRemotive() {
  try {
    console.log('Fetching: Remotive Software Dev...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=50');
    const data = JSON.parse(json);
    
    const jobs = [];
    for (const job of (data.jobs || [])) {
      const { valid, category } = isValidJob(job.title || '', job.tags || []);
      if (!valid) continue;
      
      jobs.push({
        id: 'job_remotive_' + job.id,
        title: job.title || 'Unknown',
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        job_type: job.job_type || 'Full-time',
        category: category,
        experience: 'Mid-level',
        skills: (job.tags || []).slice(0, 6),
        description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
        apply_url: job.url,
        source: 'Remotive',
        posted_at: job.publication_date || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`  Found ${jobs.length} valid jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive error:', e.message);
    return [];
  }
}

async function fetchRemotiveDevOps() {
  try {
    console.log('Fetching: Remotive DevOps...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=devops&limit=30');
    const data = JSON.parse(json);
    
    const jobs = (data.jobs || []).map(job => ({
      id: 'job_remotive_devops_' + job.id,
      title: job.title || 'Unknown',
      company: job.company_name || 'Company',
      location: job.candidate_required_location || 'Remote',
      salary: job.salary || 'Competitive',
      job_type: job.job_type || 'Full-time',
      category: 'DevOps & Cloud',
      experience: 'Mid-level',
      skills: (job.tags || []).slice(0, 6),
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
      apply_url: job.url,
      source: 'Remotive',
      posted_at: job.publication_date || new Date().toISOString(),
      is_verified: true
    }));
    
    console.log(`  Found ${jobs.length} DevOps jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive DevOps error:', e.message);
    return [];
  }
}

async function fetchRemotiveData() {
  try {
    console.log('Fetching: Remotive Data/AI...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=data&limit=30');
    const data = JSON.parse(json);
    
    const jobs = (data.jobs || []).map(job => ({
      id: 'job_remotive_data_' + job.id,
      title: job.title || 'Unknown',
      company: job.company_name || 'Company',
      location: job.candidate_required_location || 'Remote',
      salary: job.salary || 'Competitive',
      job_type: job.job_type || 'Full-time',
      category: 'AI & ML',
      experience: 'Mid-level',
      skills: (job.tags || []).slice(0, 6),
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
      apply_url: job.url,
      source: 'Remotive',
      posted_at: job.publication_date || new Date().toISOString(),
      is_verified: true
    }));
    
    console.log(`  Found ${jobs.length} Data/AI jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive Data error:', e.message);
    return [];
  }
}

async function fetchRemotiveHR() {
  try {
    console.log('Fetching: Remotive HR/Recruitment...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=hr&limit=20');
    const data = JSON.parse(json);
    
    const jobs = [];
    for (const job of (data.jobs || [])) {
      // Only include actual recruiting/HR roles, not random HR-adjacent roles
      const titleLower = (job.title || '').toLowerCase();
      if (!titleLower.match(/recruiter|recruiting|talent|hr |human resource|people ops/)) {
        continue;
      }
      
      jobs.push({
        id: 'job_remotive_hr_' + job.id,
        title: job.title || 'Unknown',
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        job_type: job.job_type || 'Full-time',
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
    
    console.log(`  Found ${jobs.length} HR/Recruitment jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive HR error:', e.message);
    return [];
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - DEEP Jobs Discovery');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  console.log('Mode: Tech & HR Recruitment ONLY (strict filtering)');
  console.log('');
  
  // Fetch from multiple sources
  const remoteOKJobs = await fetchRemoteOK();
  const remotiveJobs = await fetchRemotive();
  const devopsJobs = await fetchRemotiveDevOps();
  const dataJobs = await fetchRemotiveData();
  const hrJobs = await fetchRemotiveHR();
  
  const allJobs = [...remoteOKJobs, ...remotiveJobs, ...devopsJobs, ...dataJobs, ...hrJobs];
  
  // Dedupe by ID and company+title
  const seenIds = new Set();
  const seenKeys = new Set();
  const uniqueJobs = allJobs.filter(job => {
    if (seenIds.has(job.id)) return false;
    const key = `${job.company}_${job.title}`.toLowerCase();
    if (seenKeys.has(key)) return false;
    seenIds.add(job.id);
    seenKeys.add(key);
    return true;
  });
  
  // Upsert to Supabase
  console.log(`\nUpserting ${uniqueJobs.length} jobs to Supabase...`);
  
  let successCount = 0;
  for (const job of uniqueJobs) {
    const { error } = await supabase
      .from('jobs')
      .upsert(job, { onConflict: 'id' });
    
    if (error) {
      console.log(`  Skip: ${job.title.slice(0, 30)}... (${error.message})`);
    } else {
      successCount++;
    }
  }
  
  // Count by category
  const techCount = uniqueJobs.filter(j => j.category !== 'HR & Recruitment').length;
  const hrCount = uniqueJobs.filter(j => j.category === 'HR & Recruitment').length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Saved ${successCount} jobs to Supabase`);
  console.log(`\n📊 Breakdown:`);
  console.log(`   💻 Technical Jobs: ${techCount}`);
  console.log(`   👔 HR/Recruitment: ${hrCount}`);
  console.log('='.repeat(50));
  
  // Output for GitHub Actions
  console.log(`\n::set-output name=jobs_count::${successCount}`);
  console.log(`::set-output name=tech_jobs::${techCount}`);
  console.log(`::set-output name=hr_jobs::${hrCount}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
