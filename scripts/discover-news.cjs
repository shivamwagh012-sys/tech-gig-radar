// Discover news from RSS feeds and APIs
// Runs on GitHub Actions every 4 hours

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// News sources (RSS feeds)
const NEWS_SOURCES = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage?count=20' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Dev.to', url: 'https://dev.to/feed' }
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, { headers: { 'User-Agent': 'TechGigRadar/1.0' }, timeout: 15000 }, (res) => {
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
        id: 'news_' + Buffer.from(link).toString('base64').slice(0, 16),
        title: title.replace(/<[^>]+>/g, '').trim().slice(0, 200),
        summary: desc.replace(/<[^>]+>/g, '').trim().slice(0, 300) || title,
        source: sourceName,
        url: link.trim(),
        category: detectCategory(title),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        isVerified: true
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
  console.log('TechGig Radar - News Discovery');
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
  
  // Sort by date and dedupe
  const seen = new Set();
  const uniqueNews = allNews
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .filter(item => {
      const key = item.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 50);
  
  // Save to JSON
  const outputFile = path.join(OUTPUT_DIR, 'news.json');
  fs.writeFileSync(outputFile, JSON.stringify(uniqueNews, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log(`Saved ${uniqueNews.length} news items to ${outputFile}`);
  console.log('Latest:', uniqueNews[0]?.title);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
