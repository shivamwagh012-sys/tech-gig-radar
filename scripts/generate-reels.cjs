// TechGig Radar - Video Reel Generator
// Fetches real news/jobs from Supabase and creates video reels

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Directories
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'reels');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Create dirs
try {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (e) {}

console.log('='.repeat(50));
console.log('TechGig Radar - Video Generator');
console.log('='.repeat(50));

// Fetch JSON from URL
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'TechGigRadar/1.0', ...headers }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse error: ' + data.slice(0, 100)));
        }
      });
    }).on('error', reject);
  });
}

// Fetch latest news from Supabase
async function fetchLatestNews() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('Supabase not configured, using fallback content');
    return [];
  }
  
  try {
    const url = `${SUPABASE_URL}/rest/v1/news?select=*&order=published_at.desc&limit=3`;
    const data = await fetchJSON(url, {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    });
    console.log(`Fetched ${data.length} news from Supabase`);
    return data;
  } catch (e) {
    console.log('Failed to fetch news:', e.message);
    return [];
  }
}

// Fetch latest jobs from Supabase
async function fetchLatestJobs() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return [];
  }
  
  try {
    const url = `${SUPABASE_URL}/rest/v1/jobs?select=*&order=posted_at.desc&limit=5`;
    const data = await fetchJSON(url, {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    });
    console.log(`Fetched ${data.length} jobs from Supabase`);
    return data;
  } catch (e) {
    console.log('Failed to fetch jobs:', e.message);
    return [];
  }
}

// Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log('Downloading:', url.substring(0, 60) + '...');
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(dest); } catch(e) {}
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch(e) {}
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (e) => {
      file.close();
      try { fs.unlinkSync(dest); } catch(x) {}
      reject(e);
    });
  });
}

// Generate voice
function generateVoice(text, outputPath) {
  const clean = text.replace(/['\"\\$`!]/g, '').replace(/\n/g, ' ').slice(0, 800);
  
  console.log('Generating voice...');
  let cmd = `python3 -m edge_tts --voice en-US-AriaNeural --text "${clean}" --write-media "${outputPath}"`;
  
  try {
    execSync(cmd, { stdio: 'inherit', timeout: 120000 });
    if (fs.existsSync(outputPath)) {
      console.log('Voice OK');
      return true;
    }
  } catch (e) {
    console.log('Voice failed:', e.message);
  }
  return false;
}

// Get audio duration
function getDuration(file) {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, { encoding: 'utf8' });
    return Math.ceil(parseFloat(out.trim())) + 2;
  } catch (e) {
    return 20;
  }
}

// Create video reel
async function createVideo(content, index) {
  const id = 'reel_' + Date.now() + '_' + index;
  const tempDir = path.join(TEMP_DIR, id);
  fs.mkdirSync(tempDir, { recursive: true });
  
  console.log('\n--- Creating reel:', content.title.slice(0, 40), '---');
  
  // 1. Generate voice
  const voicePath = path.join(tempDir, 'voice.mp3');
  if (!generateVoice(content.voice, voicePath)) {
    throw new Error('Voice generation failed');
  }
  
  const duration = getDuration(voicePath);
  console.log('Duration:', duration, 'seconds');
  
  // 2. Download background
  const bgPath = path.join(tempDir, 'bg.mp4');
  let hasBg = false;
  
  const bgUrls = [
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-typing-on-a-laptop-in-a-coffee-shop-4782-large.mp4'
  ];
  
  for (const url of bgUrls) {
    try {
      await downloadFile(url, bgPath);
      if (fs.statSync(bgPath).size > 10000) {
        hasBg = true;
        console.log('Background OK');
        break;
      }
    } catch (e) {
      console.log('Background failed:', e.message);
    }
  }
  
  // 3. Create video
  const outputPath = path.join(OUTPUT_DIR, id + '.mp4');
  const title = content.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 30);
  
  console.log('Creating video with FFmpeg...');
  
  let ffmpegCmd;
  if (hasBg) {
    ffmpegCmd = `ffmpeg -y -stream_loop -1 -i "${bgPath}" -i "${voicePath}" ` +
      `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,drawbox=x=0:y=0:w=iw:h=ih:c=black@0.5:t=fill,drawtext=text='${title}':fontsize=50:fontcolor=white:x=(w-text_w)/2:y=h/3,drawtext=text='@TechGigRadar':fontsize=30:fontcolor=white:x=w-text_w-40:y=h-80[v]" ` +
      `-map "[v]" -map 1:a -c:v libx264 -preset fast -c:a aac -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
  } else {
    ffmpegCmd = `ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${duration}" -i "${voicePath}" ` +
      `-filter_complex "[0:v]drawtext=text='${title}':fontsize=50:fontcolor=white:x=(w-text_w)/2:y=h/3,drawtext=text='@TechGigRadar':fontsize=30:fontcolor=white:x=w-text_w-40:y=h-80[v]" ` +
      `-map "[v]" -map 1:a -c:v libx264 -preset fast -c:a aac -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
  }
  
  try {
    execSync(ffmpegCmd, { stdio: 'inherit', timeout: 300000 });
  } catch (e) {
    ffmpegCmd = `ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${duration}" -i "${voicePath}" ` +
      `-c:v libx264 -c:a aac -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
    execSync(ffmpegCmd, { stdio: 'inherit', timeout: 300000 });
  }
  
  if (fs.existsSync(outputPath)) {
    const size = fs.statSync(outputPath).size;
    console.log('Video created:', outputPath, '(' + Math.round(size/1024) + 'KB)');
  } else {
    throw new Error('Video file not created');
  }
  
  // Cleanup
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
  
  return { path: outputPath, title: content.title, type: content.type };
}

// Main
async function main() {
  // Fetch real content from Supabase
  const news = await fetchLatestNews();
  const jobs = await fetchLatestJobs();
  
  const CONTENT = [];
  
  // Add news reel
  if (news.length > 0) {
    const topNews = news.slice(0, 3);
    const newsVoice = `Tech News Update from TechGig Radar! ${topNews.map((n, i) => 
      `Number ${i+1}: ${n.title}. ${n.summary || ''}`
    ).join(' ')}. Follow at TechGig Radar for more tech updates!`;
    
    CONTENT.push({
      title: 'Tech News Today',
      voice: newsVoice,
      type: 'news'
    });
  }
  
  // Add jobs reel
  if (jobs.length > 0) {
    const techJobs = jobs.filter(j => j.category !== 'HR & Recruitment').slice(0, 3);
    const hrJobs = jobs.filter(j => j.category === 'HR & Recruitment').slice(0, 2);
    
    let jobsVoice = `Remote Jobs Alert from TechGig Radar! `;
    
    if (techJobs.length > 0) {
      jobsVoice += `Tech roles: ${techJobs.map(j => `${j.title} at ${j.company}`).join('. ')}. `;
    }
    
    if (hrJobs.length > 0) {
      jobsVoice += `HR positions: ${hrJobs.map(j => `${j.title} at ${j.company}`).join('. ')}. `;
    }
    
    jobsVoice += `Apply now at tech gig radar dot vercel dot app!`;
    
    CONTENT.push({
      title: 'Remote Jobs Alert',
      voice: jobsVoice,
      type: 'jobs'
    });
  }
  
  // Fallback if no data - skip generation
  if (CONTENT.length === 0) {
    console.log('\n⚠️ No news or jobs data available in Supabase');
    console.log('Please run the discovery workflow first to populate data.');
    console.log('Skipping reel generation.');
    
    // Output for workflow
    console.log(`::set-output name=reels_count::0`);
    return;
  }
  
  console.log(`\nGenerating ${CONTENT.length} reels...`);
  
  const results = [];
  for (let i = 0; i < CONTENT.length; i++) {
    try {
      const reel = await createVideo(CONTENT[i], i);
      results.push(reel);
    } catch (e) {
      console.error('Reel', i, 'failed:', e.message);
    }
  }
  
  // Save manifest
  const manifest = {
    time: new Date().toISOString(),
    news_count: news.length,
    jobs_count: jobs.length,
    reels: results
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Generated ${results.length} reels`);
  console.log('='.repeat(50));
  
  // Output for workflow
  console.log(`::set-output name=reels_count::${results.length}`);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
