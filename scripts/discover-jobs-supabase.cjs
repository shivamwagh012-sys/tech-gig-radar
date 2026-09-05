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

async function fetchRemoteOK() {
  try {
    console.log('Fetching: RemoteOK...');
    const json = await fetch('https://remoteok.com/api');
    const data = JSON.parse(json);
    
    const jobs = data.slice(1, 30).map(job => ({
      id: 'job_remoteok_' + job.id,
      title: job.position || 'Unknown',
      company: job.company || 'Company',
      location: job.location || 'Remote Worldwide',
      salary: job.salary_min && job.salary_max 
        ? `$${Math.round(job.salary_min/1000)}K - $${Math.round(job.salary_max/1000)}K`
        : 'Competitive',
      job_type: 'Full-time',
      experience: job.tags?.includes('senior') ? '5+ years' : 
                  job.tags?.includes('junior') ? '1-3 years' : 'Mid-level',
      skills: (job.tags || []).filter(t => !['senior', 'junior', 'remote'].includes(t)).slice(0, 6),
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
      apply_url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
      source: 'RemoteOK',
      posted_at: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
      is_verified: true
    }));
    
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
    
    const jobs = (data.jobs || []).map(job => ({
      id: 'job_remotive_' + job.id,
      title: job.title || 'Unknown',
      company: job.company_name || 'Company',
      location: job.candidate_required_location || 'Remote',
      salary: job.salary || 'Competitive',
      job_type: job.job_type || 'Full-time',
      experience: 'Mid-level',
      skills: (job.tags || []).slice(0, 6),
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
      apply_url: job.url,
      source: 'Remotive',
      posted_at: job.publication_date || new Date().toISOString(),
      is_verified: true
    }));
    
    console.log(`  Found ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    console.log('  Remotive error:', e.message);
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
  
  const allJobs = [...remoteOKJobs, ...remotiveJobs];
  
  // Dedupe
  const seen = new Set();
  const uniqueJobs = allJobs.filter(job => {
    const key = `${job.company}_${job.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
  
  // Upsert to Supabase
  console.log(`\nUpserting ${uniqueJobs.length} jobs to Supabase...`);
  
  const { data, error } = await supabase
    .from('jobs')
    .upsert(uniqueJobs, { onConflict: 'id' });
  
  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Saved ${uniqueJobs.length} jobs to Supabase`);
  console.log('Latest:', uniqueJobs[0]?.title, 'at', uniqueJobs[0]?.company);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
