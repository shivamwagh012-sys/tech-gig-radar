// Publish top news/jobs to Telegram
// Runs on GitHub Actions every 4 hours

const https = require('https');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@TechGigRadar';

if (!BOT_TOKEN) {
  console.log('No TELEGRAM_BOT_TOKEN set, skipping publish');
  process.exit(0);
}

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

function sendMessage(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: CHANNEL_ID,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Telegram API error: ${res.statusCode} ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function formatNewsPost(news) {
  return `📰 <b>${escapeHtml(news.title)}</b>

${escapeHtml(news.summary.slice(0, 200))}...

📍 Source: ${news.source}
🔗 <a href="${news.url}">Read more</a>

#TechNews #${news.category.replace(/\s/g, '')} #TechGigRadar`;
}

function formatJobPost(job) {
  const skills = (job.skills || []).slice(0, 4).join(' • ');
  return `💼 <b>${escapeHtml(job.title)}</b>

🏢 ${escapeHtml(job.company)}
📍 ${job.location}
💰 ${job.salary}
🛠 ${skills}

🔗 <a href="${job.applyUrl}">Apply Now</a>

#RemoteJobs #${job.experience.replace(/[\s\-\+]/g, '')} #TechGigRadar`;
}

function escapeHtml(text) {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - Telegram Publisher');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  
  // Read news
  const newsFile = path.join(DATA_DIR, 'news.json');
  let news = [];
  if (fs.existsSync(newsFile)) {
    news = JSON.parse(fs.readFileSync(newsFile, 'utf8'));
  }
  
  // Read jobs
  const jobsFile = path.join(DATA_DIR, 'jobs.json');
  let jobs = [];
  if (fs.existsSync(jobsFile)) {
    jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
  }
  
  console.log(`Found ${news.length} news, ${jobs.length} jobs`);
  
  // Post top 2 news
  for (let i = 0; i < Math.min(2, news.length); i++) {
    try {
      console.log(`\nPosting news: ${news[i].title.slice(0, 50)}...`);
      await sendMessage(formatNewsPost(news[i]));
      console.log('✓ Posted!');
      await new Promise(r => setTimeout(r, 2000)); // Rate limit
    } catch (e) {
      console.log('✗ Error:', e.message);
    }
  }
  
  // Post top 2 jobs
  for (let i = 0; i < Math.min(2, jobs.length); i++) {
    try {
      console.log(`\nPosting job: ${jobs[i].title} at ${jobs[i].company}...`);
      await sendMessage(formatJobPost(jobs[i]));
      console.log('✓ Posted!');
      await new Promise(r => setTimeout(r, 2000)); // Rate limit
    } catch (e) {
      console.log('✗ Error:', e.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Publishing complete!');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
