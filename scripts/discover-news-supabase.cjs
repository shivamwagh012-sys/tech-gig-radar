// Discover news and save to Supabase
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

// News sources (RSS feeds)
const NEWS_SOURCES = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage?count=20' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Dev.to', url: 'https://dev.to/feed' }
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TechGigRadar/1.0' }, timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

function parseRSS(xml, sourceName) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
    const link = (item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) || [])[1] || '';
    const desc = (item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1] || '';
    const pubDate = (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
    
    if (title && link) {
      items.push({
        id: 'news_' + Buffer.from(link).toString('base64').slice(0, 20).replace(/[^a-zA-Z0-9]/g, ''),
        title: title.replace(/<[^>]+>/g, '').trim().slice(0, 200),
        summary: desc.replace(/<[^>]+>/g, '').trim().slice(0, 500) || title,
        source: sourceName,
        url: link.trim(),
        category: detectCategory(title),
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        is_verified: true
      });
    }
  }
  return items;
}

function detectCategory(title) {
  const lower = title.toLowerCase();
  if (lower.includes('ai') || lower.includes('gpt') || lower.includes('llm') || lower.includes('machine learning')) return 'AI';
  if (lower.includes('security') || lower.includes('hack') || lower.includes('vulnerability')) return 'Security';
  if (lower.includes('cloud') || lower.includes('aws') || lower.includes('azure') || lower.includes('gcp')) return 'Cloud';
  if (lower.includes('remote') || lower.includes('job') || lower.includes('hiring')) return 'Jobs';
  if (lower.includes('startup') || lower.includes('funding') || lower.includes('acquisition')) return 'Business';
  return 'Tech';
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - News Discovery (Supabase)');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  
  const allNews = [];
  
  for (const source of NEWS_SOURCES) {
    try {
      console.log(`\nFetching: ${source.name}...`);
      const xml = await fetch(source.url);
      const items = parseRSS(xml, source.name);
      console.log(`  Found ${items.length} items`);
      allNews.push(...items);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
  
  // Dedupe by ID (must be unique for upsert)
  const seenIds = new Set();
  const seenTitles = new Set();
  const uniqueNews = allNews.filter(item => {
    if (seenIds.has(item.id)) return false;
    const titleKey = item.title.toLowerCase().slice(0, 50);
    if (seenTitles.has(titleKey)) return false;
    seenIds.add(item.id);
    seenTitles.add(titleKey);
    return true;
  }).slice(0, 50);
  
  // Upsert to Supabase one by one to avoid conflicts
  console.log(`\nUpserting ${uniqueNews.length} news items to Supabase...`);
  
  let successCount = 0;
  for (const news of uniqueNews) {
    const { error } = await supabase
      .from('news')
      .upsert(news, { onConflict: 'id' });
    
    if (error) {
      console.log(`  Skip: ${news.title.slice(0, 40)}... (${error.message})`);
    } else {
      successCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Saved ${successCount} news items to Supabase`);
  console.log('Latest:', uniqueNews[0]?.title);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
