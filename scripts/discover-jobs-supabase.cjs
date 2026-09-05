// Discover jobs and save to Supabase
// Runs on GitHub Actions every 4 hours

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
      timeout: 20000 
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

// Categorize job by title/tags
function categorizeJob(title, tags = []) {
  const titleLower = title.toLowerCase();
  const allTags = tags.map(t => t.toLowerCase()).join(' ');
  const combined = titleLower + ' ' + allTags;
  
  // HR & Recruitment
  if (combined.match(/\b(hr|human resource|recruiter|recruiting|talent|people ops|people operation|hiring|staffing)\b/)) {
    return 'HR & Recruitment';
  }
  // DevOps & Cloud
  if (combined.match(/\b(devops|sre|cloud|aws|azure|gcp|kubernetes|docker|infrastructure)\b/)) {
    return 'DevOps & Cloud';
  }
  // AI/ML
  if (combined.match(/\b(ai|ml|machine learning|data scien|deep learning|nlp|computer vision)\b/)) {
    return 'AI & ML';
  }
  // Mobile
  if (combined.match(/\b(ios|android|mobile|react native|flutter|swift|kotlin)\b/)) {
    return 'Mobile';
  }
  // Frontend
  if (combined.match(/\b(frontend|front-end|react|vue|angular|ui|ux|css|javascript)\b/) && !combined.match(/full.?stack/)) {
    return 'Frontend';
  }
  // Backend
  if (combined.match(/\b(backend|back-end|node|python|java|golang|ruby|php|api)\b/) && !combined.match(/full.?stack/)) {
    return 'Backend';
  }
  // Full-stack
  if (combined.match(/\b(full.?stack|fullstack)\b/)) {
    return 'Full-stack';
  }
  
  return 'Software Engineering';
}

async function fetchRemoteOK() {
  try {
    console.log('Fetching: RemoteOK...');
    const json = await fetch('https://remoteok.com/api');
    const data = JSON.parse(json);
    
    const jobs = data.slice(1, 30).map(job => {
      const category = categorizeJob(job.position || '', job.tags || []);
      return {
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
      };
    });
    
    console.log(`  Found ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    console.log('  RemoteOK error:', e.message);
    return [];
  }
}

async function fetchRemotive() {
  try {
    console.log('Fetching: Remotive...');
    const json = await fetch('https://remotive.com/api/remote-jobs?limit=30');
    const data = JSON.parse(json);
    
    const jobs = (data.jobs || []).map(job => {
      const category = categorizeJob(job.title || '', job.tags || []);
      return {
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
      };
    });
    
    console.log(`  Found ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive error:', e.message);
    return [];
  }
}

// Fetch HR-specific jobs from Remotive
async function fetchRemotiveHR() {
  try {
    console.log('Fetching: Remotive HR/Recruitment...');
    const json = await fetch('https://remotive.com/api/remote-jobs?category=hr&limit=15');
    const data = JSON.parse(json);
    
    const jobs = (data.jobs || []).map(job => ({
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
    }));
    
    console.log(`  Found ${jobs.length} HR jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive HR error:', e.message);
    return [];
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - Jobs Discovery (Supabase)');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  
  const remoteOKJobs = await fetchRemoteOK();
  const remotiveJobs = await fetchRemotive();
  const hrJobs = await fetchRemotiveHR();
  
  const allJobs = [...remoteOKJobs, ...remotiveJobs, ...hrJobs];
  
  // Dedupe by ID
  const seenIds = new Set();
  const seenKeys = new Set();
  const uniqueJobs = allJobs.filter(job => {
    if (seenIds.has(job.id)) return false;
    const key = `${job.company}_${job.title}`.toLowerCase();
    if (seenKeys.has(key)) return false;
    seenIds.add(job.id);
    seenKeys.add(key);
    return true;
  }).slice(0, 60);
  
  // Upsert to Supabase one by one
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
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Saved ${successCount} jobs to Supabase`);
  console.log('Latest:', uniqueJobs[0]?.title, 'at', uniqueJobs[0]?.company);
  
  // Count by category
  const techCount = uniqueJobs.filter(j => j.category !== 'HR & Recruitment').length;
  const hrCount = uniqueJobs.filter(j => j.category === 'HR & Recruitment').length;
  
  console.log(`\n📊 Breakdown:`);
  console.log(`   💻 Technical Jobs: ${techCount}`);
  console.log(`   👔 HR/Recruitment: ${hrCount}`);
  
  // Output for GitHub Actions
  console.log(`\n::set-output name=jobs_count::${successCount}`);
  console.log(`::set-output name=tech_jobs::${techCount}`);
  console.log(`::set-output name=hr_jobs::${hrCount}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
