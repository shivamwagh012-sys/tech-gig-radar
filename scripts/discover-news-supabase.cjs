// Discover TECH news and save to Supabase
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

function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'TechGigRadar/1.0', ...headers },
      timeout: 30000
    };
    
    https.get(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// Tech keywords - news must contain at least one
const TECH_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'anthropic', 'claude',
  'programming', 'developer', 'software', 'code', 'coding', 'github', 'git',
  'javascript', 'python', 'rust', 'golang', 'typescript', 'react', 'node',
  'cloud', 'aws', 'azure', 'google cloud', 'kubernetes', 'docker', 'devops',
  'startup', 'tech company', 'silicon valley', 'vc', 'funding', 'series a', 'series b',
  'apple', 'google', 'microsoft', 'meta', 'amazon', 'nvidia', 'tesla',
  'cybersecurity', 'security', 'hack', 'breach', 'vulnerability',
  'api', 'database', 'server', 'infrastructure', 'saas', 'paas',
  'mobile', 'ios', 'android', 'app store', 'play store',
  'web', 'browser', 'chrome', 'firefox', 'safari',
  'linux', 'windows', 'macos', 'ubuntu', 'open source',
  'blockchain', 'crypto', 'bitcoin', 'ethereum', 'web3',
  'vr', 'ar', 'metaverse', 'virtual reality', 'augmented reality',
  'robotics', 'automation', 'iot', 'smart home',
  'data science', 'analytics', 'big data'
];

// Blocked keywords - filter out non-tech news
const BLOCKED_KEYWORDS = [
  'sports', 'football', 'basketball', 'soccer', 'nfl', 'nba', 'mlb',
  'politics', 'election', 'president', 'congress', 'senate', 'democrat', 'republican',
  'celebrity', 'kardashian', 'hollywood', 'movie star', 'gossip',
  'weather', 'forecast', 'storm', 'hurricane',
  'recipe', 'cooking', 'restaurant', 'food review',
  'fashion', 'beauty', 'makeup', 'clothing',
  'real estate', 'housing market', 'mortgage rates',
  'stock market', 'dow jones', 'nasdaq' // Unless it's tech stocks
];

function isTechNews(title, summary) {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  
  // Check if blocked
  for (const blocked of BLOCKED_KEYWORDS) {
    if (text.includes(blocked) && !text.includes('tech') && !text.includes('ai')) {
      return false;
    }
  }
  
  // Must contain tech keyword
  for (const tech of TECH_KEYWORDS) {
    if (text.includes(tech)) {
      return true;
    }
  }
  
  return false;
}

function categorizeNews(title, summary) {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  
  if (text.match(/\b(ai|artificial intelligence|machine learning|chatgpt|openai|anthropic|claude|llm|gpt)\b/)) {
    return 'AI';
  }
  if (text.match(/\b(security|hack|breach|vulnerability|cyber|malware|ransomware)\b/)) {
    return 'Security';
  }
  if (text.match(/\b(cloud|aws|azure|gcp|kubernetes|docker|devops|infrastructure)\b/)) {
    return 'Cloud';
  }
  if (text.match(/\b(startup|funding|series [abc]|acquisition|ipo|valuation)\b/)) {
    return 'Startups';
  }
  if (text.match(/\b(apple|google|microsoft|meta|amazon|nvidia|tesla)\b/)) {
    return 'Big Tech';
  }
  if (text.match(/\b(programming|developer|code|github|open source)\b/)) {
    return 'Dev Tools';
  }
  
  return 'Tech';
}

async function fetchHackerNews() {
  try {
    console.log('Fetching: Hacker News (top stories)...');
    const topStoriesJson = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const topStoryIds = JSON.parse(topStoriesJson).slice(0, 50);
    
    const news = [];
    for (const id of topStoryIds) {
      try {
        const storyJson = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const story = JSON.parse(storyJson);
        
        if (!story || story.type !== 'story' || !story.url) continue;
        
        const title = story.title || '';
        const summary = `Points: ${story.score} | Comments: ${story.descendants || 0}`;
        
        // Only include tech-related stories with good engagement
        if (!isTechNews(title, '') || story.score < 20) continue;
        
        news.push({
          id: 'news_hn_' + story.id,
          title: title,
          summary: summary,
          source: 'Hacker News',
          url: story.url,
          category: categorizeNews(title, ''),
          published_at: new Date(story.time * 1000).toISOString(),
          is_verified: true
        });
        
        if (news.length >= 20) break;
      } catch (e) {
        continue;
      }
    }
    
    console.log(`  Found ${news.length} tech stories`);
    return news;
  } catch (e) {
    console.log('  HN error:', e.message);
    return [];
  }
}

async function fetchTechCrunch() {
  try {
    console.log('Fetching: TechCrunch RSS...');
    const rss = await fetch('https://techcrunch.com/feed/');
    
    const news = [];
    const itemMatches = rss.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                    item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      
      if (!title || !link) continue;
      
      const summary = desc.replace(/<[^>]+>/g, '').slice(0, 300);
      
      // TechCrunch is already tech focused, but still filter
      if (!isTechNews(title, summary)) continue;
      
      news.push({
        id: 'news_tc_' + Buffer.from(link).toString('base64').slice(0, 20),
        title: title,
        summary: summary,
        source: 'TechCrunch',
        url: link,
        category: categorizeNews(title, summary),
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        is_verified: true
      });
      
      if (news.length >= 15) break;
    }
    
    console.log(`  Found ${news.length} articles`);
    return news;
  } catch (e) {
    console.log('  TechCrunch error:', e.message);
    return [];
  }
}

async function fetchArsTechnica() {
  try {
    console.log('Fetching: Ars Technica RSS...');
    const rss = await fetch('https://feeds.arstechnica.com/arstechnica/technology-lab');
    
    const news = [];
    const itemMatches = rss.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                    item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      
      if (!title || !link) continue;
      
      const summary = desc.replace(/<[^>]+>/g, '').slice(0, 300);
      
      news.push({
        id: 'news_ars_' + Buffer.from(link).toString('base64').slice(0, 20),
        title: title,
        summary: summary,
        source: 'Ars Technica',
        url: link,
        category: categorizeNews(title, summary),
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        is_verified: true
      });
      
      if (news.length >= 10) break;
    }
    
    console.log(`  Found ${news.length} articles`);
    return news;
  } catch (e) {
    console.log('  Ars Technica error:', e.message);
    return [];
  }
}

async function fetchTheVerge() {
  try {
    console.log('Fetching: The Verge RSS...');
    const rss = await fetch('https://www.theverge.com/rss/index.xml');
    
    const news = [];
    const itemMatches = rss.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const title = item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = item.match(/<id>(.*?)<\/id>/)?.[1] || '';
      const summary = item.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] || '';
      const pubDate = item.match(/<published>(.*?)<\/published>/)?.[1] || '';
      
      if (!title || !link) continue;
      
      const cleanSummary = summary.replace(/<[^>]+>/g, '').slice(0, 300);
      
      // Filter tech-only from The Verge (they also cover entertainment)
      if (!isTechNews(title, cleanSummary)) continue;
      
      news.push({
        id: 'news_verge_' + Buffer.from(link).toString('base64').slice(0, 20),
        title: title,
        summary: cleanSummary,
        source: 'The Verge',
        url: link,
        category: categorizeNews(title, cleanSummary),
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        is_verified: true
      });
      
      if (news.length >= 10) break;
    }
    
    console.log(`  Found ${news.length} tech articles`);
    return news;
  } catch (e) {
    console.log('  The Verge error:', e.message);
    return [];
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - DEEP News Discovery');
  console.log('='.repeat(50));
  console.log('Time:', new Date().toISOString());
  console.log('Mode: TECH NEWS ONLY (strict filtering)');
  console.log('');
  
  // Fetch from multiple tech sources
  const hnNews = await fetchHackerNews();
  const tcNews = await fetchTechCrunch();
  const arsNews = await fetchArsTechnica();
  const vergeNews = await fetchTheVerge();
  
  const allNews = [...hnNews, ...tcNews, ...arsNews, ...vergeNews];
  
  // Dedupe by title similarity
  const seenTitles = new Set();
  const uniqueNews = allNews.filter(item => {
    const titleKey = item.title.toLowerCase().slice(0, 50);
    if (seenTitles.has(titleKey)) return false;
    seenTitles.add(titleKey);
    return true;
  });
  
  // Upsert to Supabase
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
  
  // Category breakdown
  const categories = {};
  uniqueNews.forEach(n => {
    categories[n.category] = (categories[n.category] || 0) + 1;
  });
  console.log('\n📊 Categories:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
  console.log('='.repeat(50));
  
  // Output for GitHub Actions
  console.log(`\n::set-output name=news_count::${successCount}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
