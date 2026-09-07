// Publish top news/jobs to Telegram from Supabase
// Runs on GitHub Actions every 12 hours

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@TechGigRadar';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!BOT_TOKEN) {
  console.log('No TELEGRAM_BOT_TOKEN set, skipping publish');
  process.exit(0);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('No SUPABASE credentials set, skipping publish');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const summary = (news.summary || '').replace(/<[^>]+>/g, '').slice(0, 200);
  return `📰 <b>${escapeHtml(news.title)}</b>

${escapeHtml(summary)}...

📍 Source: ${news.source}
🔗 <a href="${news.url}">Read more</a>

#TechNews #${(news.category || 'Tech').replace(/\s/g, '')} #TechGigRadar`;
}

function formatJobPost(job) {
  const skills = (job.skills || []).slice(0, 4).join(' • ');
  const category = (job.category || 'Tech').replace(/[\s&]/g, '');
  return `💼 <b>${escapeHtml(job.title)}</b>

🏢 ${escapeHtml(job.company)}
📍 ${job.location}
💰 ${job.salary || 'Competitive'}
🛠 ${skills || 'Various'}

🔗 <a href="${job.apply_url}">Apply Now</a>

#RemoteJobs #${category} #TechGigRadar`;
}

function escapeHtml(text) {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - Telegram Publisher');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  console.log('Channel:', CHANNEL_ID);
  
  // Fetch latest news from Supabase
  const { data: news, error: newsError } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(5);
  
  if (newsError) {
    console.log('Error fetching news:', newsError.message);
  }
  
  // Fetch latest tech jobs from Supabase
  const { data: techJobs, error: techError } = await supabase
    .from('jobs')
    .select('*')
    .neq('category', 'HR & Recruitment')
    .order('posted_at', { ascending: false })
    .limit(5);
  
  if (techError) {
    console.log('Error fetching tech jobs:', techError.message);
  }
  
  // Fetch latest HR jobs from Supabase
  const { data: hrJobs, error: hrError } = await supabase
    .from('jobs')
    .select('*')
    .eq('category', 'HR & Recruitment')
    .order('posted_at', { ascending: false })
    .limit(2);
  
  if (hrError) {
    console.log('Error fetching HR jobs:', hrError.message);
  }
  
  console.log(`Found ${(news || []).length} news, ${(techJobs || []).length} tech jobs, ${(hrJobs || []).length} HR jobs`);
  
  let posted = 0;
  
  // Post top 3 news
  for (let i = 0; i < Math.min(3, (news || []).length); i++) {
    try {
      console.log(`\nPosting news: ${news[i].title.slice(0, 50)}...`);
      await sendMessage(formatNewsPost(news[i]));
      console.log('✓ Posted!');
      posted++;
      await new Promise(r => setTimeout(r, 3000)); // Rate limit
    } catch (e) {
      console.log('✗ Error:', e.message);
    }
  }
  
  // Post top 3 tech jobs
  for (let i = 0; i < Math.min(3, (techJobs || []).length); i++) {
    try {
      console.log(`\nPosting tech job: ${techJobs[i].title} at ${techJobs[i].company}...`);
      await sendMessage(formatJobPost(techJobs[i]));
      console.log('✓ Posted!');
      posted++;
      await new Promise(r => setTimeout(r, 3000)); // Rate limit
    } catch (e) {
      console.log('✗ Error:', e.message);
    }
  }
  
  // Post 1 HR job
  for (let i = 0; i < Math.min(1, (hrJobs || []).length); i++) {
    try {
      console.log(`\nPosting HR job: ${hrJobs[i].title} at ${hrJobs[i].company}...`);
      await sendMessage(formatJobPost(hrJobs[i]));
      console.log('✓ Posted!');
      posted++;
      await new Promise(r => setTimeout(r, 3000)); // Rate limit
    } catch (e) {
      console.log('✗ Error:', e.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Published ${posted} items to Telegram`);
  console.log('='.repeat(50));
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
