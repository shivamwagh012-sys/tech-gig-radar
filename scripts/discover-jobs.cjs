// Discover remote jobs from free APIs
// Runs on GitHub Actions every 4 hours

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Free job APIs
const JOB_SOURCES = [
  { 
    name: 'Remotive', 
    url: 'https://remotive.com/api/remote-jobs?limit=20',
    parser: 'remotive'
  },
  {
    name: 'RemoteOK',
    url: 'https://remoteok.com/api',
    parser: 'remoteok'
  }
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 
        'User-Agent': 'TechGigRadar/1.0',
        'Accept': 'application/json'
      }, 
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

function parseRemotive(json) {
  try {
    const data = JSON.parse(json);
    return (data.jobs || []).map(job => ({
      id: 'job_remotive_' + job.id,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || 'Remote',
      salary: job.salary || 'Competitive',
      type: job.job_type || 'Full-time',
      experience: 'Mid-level',
      skills: (job.tags || []).slice(0, 5),
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      applyUrl: job.url,
      source: 'Remotive',
      postedAt: job.publication_date || new Date().toISOString(),
      isVerified: true
    }));
  } catch (e) {
    console.log('Remotive parse error:', e.message);
    return [];
  }
}

function parseRemoteOK(json) {
  try {
    const data = JSON.parse(json);
    // First item is metadata, skip it
    return data.slice(1, 21).map(job => ({
      id: 'job_remoteok_' + job.id,
      title: job.position,
      company: job.company,
      location: job.location || 'Remote Worldwide',
      salary: job.salary_min && job.salary_max 
        ? `$${Math.round(job.salary_min/1000)}K - $${Math.round(job.salary_max/1000)}K`
        : 'Competitive',
      type: 'Full-time',
      experience: job.tags?.includes('senior') ? '5+ years' : 
                  job.tags?.includes('junior') ? '1-3 years' : 'Mid-level',
      skills: (job.tags || []).filter(t => !['senior', 'junior', 'remote'].includes(t)).slice(0, 5),
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      applyUrl: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
      source: 'RemoteOK',
      postedAt: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
      isVerified: true
    }));
  } catch (e) {
    console.log('RemoteOK parse error:', e.message);
    return [];
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - Jobs Discovery');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  
  const allJobs = [];
  
  for (const source of JOB_SOURCES) {
    try {
      console.log(`\nFetching: ${source.name}...`);
      const json = await fetch(source.url);
      
      let jobs = [];
      if (source.parser === 'remotive') {
        jobs = parseRemotive(json);
      } else if (source.parser === 'remoteok') {
        jobs = parseRemoteOK(json);
      }
      
      console.log(`  Found ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
  
  // Sort by date and dedupe
  const seen = new Set();
  const uniqueJobs = allJobs
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
    .filter(job => {
      const key = `${job.company}_${job.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 50);
  
  // Save to JSON
  const outputFile = path.join(OUTPUT_DIR, 'jobs.json');
  fs.writeFileSync(outputFile, JSON.stringify(uniqueJobs, null, 2));
  
  // Update manifest
  const manifestFile = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify({
    exportedAt: new Date().toISOString(),
    newsCount: 50,
    jobsCount: uniqueJobs.length
  }, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log(`Saved ${uniqueJobs.length} jobs to ${outputFile}`);
  console.log('Latest:', uniqueJobs[0]?.title, 'at', uniqueJobs[0]?.company);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
