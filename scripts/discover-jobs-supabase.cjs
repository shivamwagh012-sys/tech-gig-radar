// Discover jobs and save to Supabase
// Runs on GitHub Actions every 12 hours - STRICT TECH ONLY

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

// WHITELIST: Job title MUST contain one of these to be included
const TECH_TITLE_MUST_HAVE = [
  // Engineering roles
  'developer', 'engineer', 'programmer', 'architect',
  'frontend', 'backend', 'fullstack', 'full-stack', 'full stack',
  // Specific tech roles
  'devops', 'sre', 'site reliability', 'platform',
  'data scientist', 'data engineer', 'machine learning', 'ml ', 'ai engineer',
  'software', 'swe', 'sde',
  'ios developer', 'android developer', 'mobile developer',
  'qa engineer', 'quality assurance', 'test engineer', 'sdet', 'automation engineer',
  'security engineer', 'cybersecurity', 'infosec', 'penetration',
  'cloud engineer', 'aws', 'azure', 'gcp',
  'database', 'dba',
  'linux', 'system administrator', 'sysadmin', 'network engineer',
  'tech lead', 'engineering manager', 'cto', 'vp of engineering',
  'ux designer', 'ui designer', 'product designer',
  // HR/Recruiting (tech focused)
  'technical recruiter', 'tech recruiter', 'engineering recruiter',
  'talent acquisition', 'talent sourcer', 'recruiter',
  'hr manager', 'people operations', 'hrbp'
];

// Check if job title is valid tech/HR role
function isValidTechJob(title) {
  const titleLower = title.toLowerCase();
  
  for (const required of TECH_TITLE_MUST_HAVE) {
    if (titleLower.includes(required)) {
      return true;
    }
  }
  
  return false;
}

// Categorize the job
function categorizeJob(title) {
  const t = title.toLowerCase();
  
  // HR & Recruitment
  if (t.match(/\b(recruiter|recruiting|talent|hr |human resource|people ops|hrbp)\b/)) {
    return 'HR & Recruitment';
  }
  // DevOps & Cloud
  if (t.match(/\b(devops|sre|cloud|platform|infrastructure|kubernetes|docker)\b/)) {
    return 'DevOps & Cloud';
  }
  // AI/ML
  if (t.match(/\b(ai|ml|machine learning|data scien|deep learning|nlp)\b/)) {
    return 'AI & ML';
  }
  // Mobile
  if (t.match(/\b(ios|android|mobile|react native|flutter)\b/)) {
    return 'Mobile';
  }
  // Frontend
  if (t.match(/\b(frontend|front-end|front end|ui |ux |designer)\b/) && !t.match(/full.?stack/)) {
    return 'Frontend';
  }
  // Backend
  if (t.match(/\b(backend|back-end|back end)\b/) && !t.match(/full.?stack/)) {
    return 'Backend';
  }
  // Full-stack
  if (t.match(/\b(full.?stack|fullstack)\b/)) {
    return 'Full-stack';
  }
  // Security
  if (t.match(/\b(security|infosec|penetration|cyber)\b/)) {
    return 'Security';
  }
  // QA
  if (t.match(/\b(qa|test|quality|sdet)\b/)) {
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
    let skipped = 0;
    
    for (const job of data.slice(1, 150)) {
      const title = job.position || '';
      
      if (!isValidTechJob(title)) {
        skipped++;
        continue;
      }
      
      jobs.push({
        id: 'job_remoteok_' + job.id,
        title: title,
        company: job.company || 'Company',
        location: job.location || 'Remote Worldwide',
        salary: job.salary_min && job.salary_max 
          ? `$${Math.round(job.salary_min/1000)}K - $${Math.round(job.salary_max/1000)}K`
          : 'Competitive',
        job_type: 'Full-time',
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
    
    console.log(`  Found ${jobs.length} tech jobs (skipped ${skipped} non-tech)`);
    return jobs;
  } catch (e) {
    console.log('  RemoteOK error:', e.message);
    return [];
  }
}

async function fetchRemotiveSoftware() {
  try {
    console.log('Fetching: Remotive Software Dev...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=50');
    const data = JSON.parse(json);
    
    const jobs = [];
    for (const job of (data.jobs || [])) {
      const title = job.title || '';
      
      if (!isValidTechJob(title)) continue;
      
      jobs.push({
        id: 'job_remotive_' + job.id,
        title: title,
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        job_type: job.job_type || 'Full-time',
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
    
    console.log(`  Found ${jobs.length} software dev jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive error:', e.message);
    return [];
  }
}

async function fetchRemotiveDevOps() {
  try {
    console.log('Fetching: Remotive DevOps/SysAdmin...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=devops&limit=30');
    const data = JSON.parse(json);
    
    const jobs = (data.jobs || []).filter(j => isValidTechJob(j.title || '')).map(job => ({
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

async function fetchRemotiveQA() {
  try {
    console.log('Fetching: Remotive QA...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=qa&limit=20');
    const data = JSON.parse(json);
    
    const jobs = (data.jobs || []).filter(j => isValidTechJob(j.title || '')).map(job => ({
      id: 'job_remotive_qa_' + job.id,
      title: job.title || 'Unknown',
      company: job.company_name || 'Company',
      location: job.candidate_required_location || 'Remote',
      salary: job.salary || 'Competitive',
      job_type: job.job_type || 'Full-time',
      category: 'QA & Testing',
      experience: 'Mid-level',
      skills: (job.tags || []).slice(0, 6),
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
      apply_url: job.url,
      source: 'Remotive',
      posted_at: job.publication_date || new Date().toISOString(),
      is_verified: true
    }));
    
    console.log(`  Found ${jobs.length} QA jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive QA error:', e.message);
    return [];
  }
}

async function fetchRemotiveHR() {
  try {
    console.log('Fetching: Remotive HR (Tech Recruiters only)...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=hr&limit=30');
    const data = JSON.parse(json);
    
    const jobs = [];
    for (const job of (data.jobs || [])) {
      const title = (job.title || '').toLowerCase();
      
      // Only include actual tech recruiting/HR roles
      if (!title.match(/recruiter|recruiting|talent|hr manager|people ops|hrbp/)) {
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
    
    console.log(`  Found ${jobs.length} HR/Recruiter jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive HR error:', e.message);
    return [];
  }
}

async function clearOldJobs() {
  console.log('\nClearing old non-tech jobs from database...');
  
  // Delete jobs that don't match our categories
  const { error } = await supabase
    .from('jobs')
    .delete()
    .not('category', 'in', '("Software Engineering","DevOps & Cloud","AI & ML","Mobile","Frontend","Backend","Full-stack","Security","QA & Testing","HR & Recruitment")');
  
  if (error) {
    console.log('  Clear error:', error.message);
  } else {
    console.log('  Cleared old jobs');
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - STRICT Tech Jobs Discovery');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  console.log('');
  console.log('ALLOWED: Developer, Engineer, DevOps, QA, AI/ML,');
  console.log('         Security, Tech Recruiter, HR Manager');
  console.log('BLOCKED: Everything else (sales, writers, etc.)');
  console.log('');
  
  // Clear old bad jobs first
  await clearOldJobs();
  
  // Fetch from multiple sources
  const remoteOKJobs = await fetchRemoteOK();
  const softwareJobs = await fetchRemotiveSoftware();
  const devopsJobs = await fetchRemotiveDevOps();
  const qaJobs = await fetchRemotiveQA();
  const hrJobs = await fetchRemotiveHR();
  
  const allJobs = [...remoteOKJobs, ...softwareJobs, ...devopsJobs, ...qaJobs, ...hrJobs];
  
  // Dedupe
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
      console.log(`  Skip: ${job.title.slice(0, 30)}...`);
    } else {
      successCount++;
    }
  }
  
  // Count by category
  const categories = {};
  uniqueJobs.forEach(j => {
    categories[j.category] = (categories[j.category] || 0) + 1;
  });
  
  const techCount = uniqueJobs.filter(j => j.category !== 'HR & Recruitment').length;
  const hrCount = uniqueJobs.filter(j => j.category === 'HR & Recruitment').length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Saved ${successCount} jobs to Supabase`);
  console.log('\n📊 By Category:');
  Object.entries(categories).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
  console.log('\n📊 Summary:');
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
