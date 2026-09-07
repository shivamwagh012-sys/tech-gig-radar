// TechGig Radar - AI-Powered Tech News Discovery
// Deep research from multiple worldwide sources

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
        'Accept': 'application/json,text/html,application/xhtml+xml',
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
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Parse RSS/XML feeds
function parseRSS(xml) {
  const items = [];
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  
  for (const item of itemMatches) {
    const title = (item.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
    const link = (item.match(/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i) || [])[1] || '';
    const desc = (item.match(/<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is) || [])[1] || '';
    const pubDate = (item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i) || [])[1] || '';
    
    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').trim(),
        url: link.trim(),
        summary: desc.replace(/<[^>]+>/g, '').slice(0, 300).trim(),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
      });
    }
  }
  return items;
}

// Categorize news
function categorizeNews(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  
  if (text.match(/\b(ai|artificial intelligence|machine learning|ml|gpt|llm|neural|deep learning|chatgpt|claude|gemini|openai)\b/)) return 'AI';
  if (text.match(/\b(security|hack|breach|vulnerability|cyber|malware|ransomware|privacy)\b/)) return 'Security';
  if (text.match(/\b(cloud|aws|azure|gcp|kubernetes|docker|serverless)\b/)) return 'Cloud';
  if (text.match(/\b(startup|funding|raised|valuation|vc|venture|acquisition|ipo)\b/)) return 'Startups';
  if (text.match(/\b(google|apple|microsoft|meta|amazon|nvidia|tesla)\b/)) return 'Big Tech';
  if (text.match(/\b(developer|programming|code|github|open source|framework|library|api)\b/)) return 'Dev Tools';
  if (text.match(/\b(mobile|ios|android|app store|smartphone)\b/)) return 'Mobile';
  if (text.match(/\b(crypto|bitcoin|ethereum|blockchain|web3|nft)\b/)) return 'Crypto';
  
  return 'Tech';
}

// Check if article is tech-related
function isTechNews(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  
  const techKeywords = [
    'software', 'developer', 'programming', 'code', 'api', 'tech', 'digital',
    'ai', 'machine learning', 'data', 'cloud', 'server', 'computer', 'app',
    'startup', 'silicon valley', 'google', 'apple', 'microsoft', 'amazon', 'meta',
    'nvidia', 'openai', 'github', 'linux', 'open source', 'security', 'hack',
    'cyber', 'privacy', 'algorithm', 'robot', 'automation', 'internet', 'web',
    'mobile', 'smartphone', 'ios', 'android', 'browser', 'cpu', 'gpu', 'chip',
    'semiconductor', 'quantum', 'blockchain', 'database', 'network', 'wifi',
    '5g', 'electric vehicle', 'tesla', 'spacex', 'nasa', 'satellite'
  ];
  
  return techKeywords.some(kw => text.includes(kw));
}

// Source 1: Hacker News (Top Stories)
async function fetchHackerNews() {
  console.log('📰 Fetching: Hacker News Top Stories...');
  const news = [];
  
  try {
    const { data } = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const ids = JSON.parse(data).slice(0, 50);
    
    for (const id of ids.slice(0, 30)) {
      try {
        const { data: itemData } = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const item = JSON.parse(itemData);
        
        if (item && item.title && item.url && item.score > 30) {
          news.push({
            id: `news_hn_${item.id}`,
            title: item.title,
            summary: `Points: ${item.score} | Comments: ${item.descendants || 0}`,
            source: 'Hacker News',
            url: item.url,
            category: categorizeNews(item.title, ''),
            published_at: new Date(item.time * 1000).toISOString(),
            is_verified: true
          });
        }
      } catch (e) {}
    }
    
    console.log(`   Found ${news.length} stories`);
  } catch (e) {
    console.log('   HN error:', e.message);
  }
  
  return news;
}

// Source 2: TechCrunch RSS
async function fetchTechCrunch() {
  console.log('📰 Fetching: TechCrunch...');
  const news = [];
  
  try {
    const { data } = await fetch('https://techcrunch.com/feed/');
    const items = parseRSS(data);
    
    for (const item of items.slice(0, 20)) {
      if (isTechNews(item.title, item.summary)) {
        news.push({
          id: `news_tc_${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
          title: item.title,
          summary: item.summary,
          source: 'TechCrunch',
          url: item.url,
          category: categorizeNews(item.title, item.summary),
          published_at: item.publishedAt,
          is_verified: true
        });
      }
    }
    
    console.log(`   Found ${news.length} articles`);
  } catch (e) {
    console.log('   TechCrunch error:', e.message);
  }
  
  return news;
}

// Source 3: Ars Technica RSS
async function fetchArsTechnica() {
  console.log('📰 Fetching: Ars Technica...');
  const news = [];
  
  try {
    const { data } = await fetch('https://feeds.arstechnica.com/arstechnica/technology-lab');
    const items = parseRSS(data);
    
    for (const item of items.slice(0, 15)) {
      news.push({
        id: `news_ars_${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
        title: item.title,
        summary: item.summary,
        source: 'Ars Technica',
        url: item.url,
        category: categorizeNews(item.title, item.summary),
        published_at: item.publishedAt,
        is_verified: true
      });
    }
    
    console.log(`   Found ${news.length} articles`);
  } catch (e) {
    console.log('   Ars Technica error:', e.message);
  }
  
  return news;
}

// Source 4: The Verge Tech RSS
async function fetchTheVerge() {
  console.log('📰 Fetching: The Verge...');
  const news = [];
  
  try {
    const { data } = await fetch('https://www.theverge.com/rss/tech/index.xml');
    const items = parseRSS(data);
    
    for (const item of items.slice(0, 15)) {
      if (isTechNews(item.title, item.summary)) {
        news.push({
          id: `news_verge_${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
          title: item.title,
          summary: item.summary,
          source: 'The Verge',
          url: item.url,
          category: categorizeNews(item.title, item.summary),
          published_at: item.publishedAt,
          is_verified: true
        });
      }
    }
    
    console.log(`   Found ${news.length} articles`);
  } catch (e) {
    console.log('   The Verge error:', e.message);
  }
  
  return news;
}

// Source 5: Wired RSS
async function fetchWired() {
  console.log('📰 Fetching: Wired...');
  const news = [];
  
  try {
    const { data } = await fetch('https://www.wired.com/feed/rss');
    const items = parseRSS(data);
    
    for (const item of items.slice(0, 15)) {
      if (isTechNews(item.title, item.summary)) {
        news.push({
          id: `news_wired_${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
          title: item.title,
          summary: item.summary,
          source: 'Wired',
          url: item.url,
          category: categorizeNews(item.title, item.summary),
          published_at: item.publishedAt,
          is_verified: true
        });
      }
    }
    
    console.log(`   Found ${news.length} articles`);
  } catch (e) {
    console.log('   Wired error:', e.message);
  }
  
  return news;
}

// Source 6: MIT Technology Review RSS
async function fetchMITTechReview() {
  console.log('📰 Fetching: MIT Technology Review...');
  const news = [];
  
  try {
    const { data } = await fetch('https://www.technologyreview.com/feed/');
    const items = parseRSS(data);
    
    for (const item of items.slice(0, 10)) {
      news.push({
        id: `news_mit_${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
        title: item.title,
        summary: item.summary,
        source: 'MIT Tech Review',
        url: item.url,
        category: categorizeNews(item.title, item.summary),
        published_at: item.publishedAt,
        is_verified: true
      });
    }
    
    console.log(`   Found ${news.length} articles`);
  } catch (e) {
    console.log('   MIT Tech Review error:', e.message);
  }
  
  return news;
}

// Source 7: VentureBeat RSS
async function fetchVentureBeat() {
  console.log('📰 Fetching: VentureBeat (AI Focus)...');
  const news = [];
  
  try {
    const { data } = await fetch('https://venturebeat.com/feed/');
    const items = parseRSS(data);
    
    for (const item of items.slice(0, 15)) {
      if (isTechNews(item.title, item.summary)) {
        news.push({
          id: `news_vb_${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
          title: item.title,
          summary: item.summary,
          source: 'VentureBeat',
          url: item.url,
          category: categorizeNews(item.title, item.summary),
          published_at: item.publishedAt,
          is_verified: true
        });
      }
    }
    
    console.log(`   Found ${news.length} articles`);
  } catch (e) {
    console.log('   VentureBeat error:', e.message);
  }
  
  return news;
}

// Source 8: Dev.to (Developer Community)
async function fetchDevTo() {
  console.log('📰 Fetching: Dev.to (Developer Articles)...');
  const news = [];
  
  try {
    const { data } = await fetch('https://dev.to/api/articles?top=7&per_page=15');
    const articles = JSON.parse(data);
    
    for (const article of articles) {
      news.push({
        id: `news_devto_${article.id}`,
        title: article.title,
        summary: article.description || `By ${article.user?.name || 'Developer'} | ${article.positive_reactions_count} reactions`,
        source: 'Dev.to',
        url: article.url,
        category: 'Dev Tools',
        published_at: article.published_at || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${news.length} articles`);
  } catch (e) {
    console.log('   Dev.to error:', e.message);
  }
  
  return news;
}

// Source 9: GitHub Trending (This week)
async function fetchGitHubTrending() {
  console.log('📰 Fetching: GitHub Trending Repos...');
  const news = [];
  
  try {
    // Use GitHub API for trending-like data
    const { data } = await fetch('https://api.github.com/search/repositories?q=stars:>1000+pushed:>2026-09-01&sort=stars&order=desc&per_page=10', {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    const repos = JSON.parse(data);
    
    for (const repo of (repos.items || []).slice(0, 8)) {
      news.push({
        id: `news_gh_${repo.id}`,
        title: `🔥 Trending: ${repo.full_name}`,
        summary: repo.description || `${repo.stargazers_count.toLocaleString()} stars | ${repo.language || 'Multiple languages'}`,
        source: 'GitHub',
        url: repo.html_url,
        category: 'Dev Tools',
        published_at: repo.pushed_at || new Date().toISOString(),
        is_verified: true
      });
    }
    
    console.log(`   Found ${news.length} trending repos`);
  } catch (e) {
    console.log('   GitHub error:', e.message);
  }
  
  return news;
}

// Source 10: Product Hunt (Tech Products)
async function fetchProductHunt() {
  console.log('📰 Fetching: Product Hunt (New Tech Products)...');
  const news = [];
  
  // Product Hunt requires OAuth, so we'll use their RSS-like endpoint
  try {
    const { data } = await fetch('https://www.producthunt.com/feed');
    const items = parseRSS(data);
    
    for (const item of items.slice(0, 10)) {
      if (isTechNews(item.title, item.summary)) {
        news.push({
          id: `news_ph_${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
          title: `🚀 ${item.title}`,
          summary: item.summary,
          source: 'Product Hunt',
          url: item.url,
          category: 'Startups',
          published_at: item.publishedAt,
          is_verified: true
        });
      }
    }
    
    console.log(`   Found ${news.length} products`);
  } catch (e) {
    console.log('   Product Hunt error:', e.message);
  }
  
  return news;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 TechGig Radar - AI-Powered DEEP Tech News Research');
  console.log('═'.repeat(60));
  console.log('Time:', new Date().toISOString());
  console.log('');
  console.log('Searching 10+ worldwide tech sources...');
  console.log('');
  
  // Fetch from all sources in parallel
  const results = await Promise.allSettled([
    fetchHackerNews(),
    fetchTechCrunch(),
    fetchArsTechnica(),
    fetchTheVerge(),
    fetchWired(),
    fetchMITTechReview(),
    fetchVentureBeat(),
    fetchDevTo(),
    fetchGitHubTrending(),
    fetchProductHunt()
  ]);
  
  // Combine all news
  let allNews = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allNews = allNews.concat(result.value);
    }
  }
  
  console.log(`\n📊 Total raw articles: ${allNews.length}`);
  
  // Dedupe by URL and title similarity
  const seenUrls = new Set();
  const seenTitles = new Set();
  const uniqueNews = allNews.filter(n => {
    const urlKey = n.url.replace(/https?:\/\/(www\.)?/, '').toLowerCase();
    const titleKey = n.title.toLowerCase().slice(0, 50);
    
    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) return false;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    return true;
  });
  
  console.log(`📊 After deduplication: ${uniqueNews.length}`);
  
  // Sort by recency
  uniqueNews.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  
  // Take top 50
  const topNews = uniqueNews.slice(0, 50);
  
  // Upsert to Supabase
  console.log(`\n💾 Saving ${topNews.length} articles to Supabase...`);
  
  let saved = 0;
  for (const news of topNews) {
    const { error } = await supabase
      .from('news')
      .upsert(news, { onConflict: 'id' });
    
    if (!error) saved++;
  }
  
  // Count by category
  const categories = {};
  topNews.forEach(n => {
    categories[n.category] = (categories[n.category] || 0) + 1;
  });
  
  // Count by source
  const sources = {};
  topNews.forEach(n => {
    sources[n.source] = (sources[n.source] || 0) + 1;
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Saved ${saved} tech news articles`);
  console.log('\n📊 By Category:');
  Object.entries(categories).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
  console.log('\n📰 By Source:');
  Object.entries(sources).sort((a,b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`   ${src}: ${count}`);
  });
  console.log('═'.repeat(60));
  
  // Output for GitHub Actions
  console.log(`\n::set-output name=news_count::${saved}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
