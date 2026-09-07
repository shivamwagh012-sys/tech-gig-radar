// TechGig Radar - Video Reel Generator
// Creates real videos and uploads to Telegram for permanent hosting

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

// Directories
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'reels');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

try {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (e) {}

console.log('='.repeat(50));
console.log('TechGig Radar - Video Reel Generator');
console.log('='.repeat(50));

// Fetch JSON
function fetchJSON(url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const method = headers.method || 'GET';
    delete headers.method;
    
    const proto = urlObj.protocol === 'https:' ? https : http;
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: { 'User-Agent': 'TechGigRadar/1.0', ...headers }
    };
    
    const req = proto.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : {}); } 
          catch (e) { resolve({}); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Fetch from Supabase
async function fetchLatestNews() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const url = `${SUPABASE_URL}/rest/v1/news?select=*&order=published_at.desc&limit=5`;
    const data = await fetchJSON(url, {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    });
    console.log(`Fetched ${data.length} news from Supabase`);
    return data;
  } catch (e) {
    console.log('News fetch error:', e.message);
    return [];
  }
}

async function fetchLatestJobs() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const url = `${SUPABASE_URL}/rest/v1/jobs?select=*&order=posted_at.desc&limit=5`;
    const data = await fetchJSON(url, {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    });
    console.log(`Fetched ${data.length} jobs from Supabase`);
    return data;
  } catch (e) {
    console.log('Jobs fetch error:', e.message);
    return [];
  }
}

// Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(dest); } catch(e) {}
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', (e) => {
      file.close();
      reject(e);
    });
  });
}

// Generate voice using edge-tts
function generateVoice(text, outputPath) {
  const clean = text.replace(/['\"\\$`!]/g, '').replace(/\n/g, ' ').slice(0, 800);
  console.log('Generating voice narration...');
  
  try {
    // Try edge-tts (installed via pip)
    execSync(`edge-tts --voice en-US-AriaNeural --text "${clean}" --write-media "${outputPath}"`, 
      { stdio: 'pipe', timeout: 120000 });
    
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      console.log('  Voice OK');
      return true;
    }
  } catch (e) {
    console.log('  edge-tts failed, trying alternative...');
  }
  
  try {
    // Fallback: python -m edge_tts
    execSync(`python -m edge_tts --voice en-US-AriaNeural --text "${clean}" --write-media "${outputPath}"`, 
      { stdio: 'pipe', timeout: 120000 });
    
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      console.log('  Voice OK (python fallback)');
      return true;
    }
  } catch (e) {
    console.log('  Voice generation failed:', e.message);
  }
  
  return false;
}

// Get audio duration
function getDuration(file) {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, 
      { encoding: 'utf8', timeout: 10000 });
    return Math.ceil(parseFloat(out.trim())) + 1;
  } catch (e) {
    return 20;
  }
}

// Upload video to Telegram and get file_id
async function uploadToTelegram(videoPath, caption) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.log('  Telegram not configured, skipping upload');
    return null;
  }
  
  console.log('Uploading to Telegram...');
  
  try {
    // Use curl for multipart form upload
    const result = execSync(
      `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo" ` +
      `-F "chat_id=${TELEGRAM_CHANNEL_ID}" ` +
      `-F "video=@${videoPath}" ` +
      `-F "caption=${caption.replace(/"/g, '\\"').slice(0, 200)}" ` +
      `-F "parse_mode=HTML"`,
      { encoding: 'utf8', timeout: 300000 }
    );
    
    const data = JSON.parse(result);
    if (data.ok && data.result && data.result.video) {
      const fileId = data.result.video.file_id;
      console.log('  Uploaded! File ID:', fileId.slice(0, 30) + '...');
      
      // Get file path for direct URL
      const fileResult = execSync(
        `curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}"`,
        { encoding: 'utf8', timeout: 30000 }
      );
      const fileData = JSON.parse(fileResult);
      if (fileData.ok && fileData.result && fileData.result.file_path) {
        const videoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
        return videoUrl;
      }
    } else {
      console.log('  Upload failed:', data.description || 'Unknown error');
    }
  } catch (e) {
    console.log('  Telegram upload error:', e.message);
  }
  
  return null;
}

// Create video reel
async function createVideo(content, index) {
  const id = 'reel_' + Date.now() + '_' + index;
  const tempDir = path.join(TEMP_DIR, id);
  fs.mkdirSync(tempDir, { recursive: true });
  
  console.log(`\n--- Creating Reel #${index + 1}: ${content.title.slice(0, 35)}... ---`);
  
  // 1. Generate voice
  const voicePath = path.join(tempDir, 'voice.mp3');
  if (!generateVoice(content.voice, voicePath)) {
    throw new Error('Voice generation failed');
  }
  
  const duration = getDuration(voicePath);
  console.log('Duration:', duration, 'seconds');
  
  // 2. Download stock background video
  const bgPath = path.join(tempDir, 'bg.mp4');
  let hasBg = false;
  
  const bgUrls = [
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-typing-on-laptop-close-up-4785-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-data-server-room-4628-large.mp4'
  ];
  
  for (const url of bgUrls) {
    try {
      console.log('Downloading background video...');
      await downloadFile(url, bgPath);
      if (fs.existsSync(bgPath) && fs.statSync(bgPath).size > 50000) {
        hasBg = true;
        console.log('  Background OK');
        break;
      }
    } catch (e) {
      console.log('  Background download failed, trying next...');
    }
  }
  
  // 3. Create video with FFmpeg
  const outputPath = path.join(OUTPUT_DIR, id + '.mp4');
  const titleText = content.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 35);
  const brandText = 'TechGig Radar';
  
  console.log('Creating video with FFmpeg...');
  
  let ffmpegCmd;
  if (hasBg) {
    // With background video
    ffmpegCmd = [
      'ffmpeg -y -stream_loop -1',
      `-i "${bgPath}"`,
      `-i "${voicePath}"`,
      `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,` +
        `drawbox=x=0:y=0:w=iw:h=ih:c=black@0.4:t=fill,` +
        `drawtext=text='${titleText}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h/3:shadowx=2:shadowy=2:shadowcolor=black,` +
        `drawtext=text='${brandText}':fontsize=32:fontcolor=cyan:x=(w-text_w)/2:y=h-120[v]"`,
      `-map "[v]" -map 1:a`,
      `-c:v libx264 -preset fast -crf 23`,
      `-c:a aac -b:a 128k`,
      `-t ${duration}`,
      `-pix_fmt yuv420p`,
      `-movflags +faststart`,
      `"${outputPath}"`
    ].join(' ');
  } else {
    // Solid color background
    ffmpegCmd = [
      `ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${duration}"`,
      `-i "${voicePath}"`,
      `-filter_complex "[0:v]` +
        `drawtext=text='${titleText}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h/3,` +
        `drawtext=text='${brandText}':fontsize=32:fontcolor=cyan:x=(w-text_w)/2:y=h-120[v]"`,
      `-map "[v]" -map 1:a`,
      `-c:v libx264 -preset fast -crf 23`,
      `-c:a aac -b:a 128k`,
      `-pix_fmt yuv420p`,
      `-movflags +faststart`,
      `"${outputPath}"`
    ].join(' ');
  }
  
  try {
    execSync(ffmpegCmd, { stdio: 'pipe', timeout: 300000 });
  } catch (e) {
    // Fallback: simple video without text overlay
    console.log('  Complex FFmpeg failed, trying simple version...');
    const simpleFfmpeg = `ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${duration}" -i "${voicePath}" -c:v libx264 -c:a aac -pix_fmt yuv420p "${outputPath}"`;
    execSync(simpleFfmpeg, { stdio: 'pipe', timeout: 300000 });
  }
  
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
    throw new Error('Video file not created');
  }
  
  const fileSizeKB = Math.round(fs.statSync(outputPath).size / 1024);
  console.log(`  Video created: ${fileSizeKB}KB`);
  
  // 4. Upload to Telegram
  const caption = `🎬 <b>${content.title}</b>\n\n📢 @TechGigRadar`;
  const videoUrl = await uploadToTelegram(outputPath, caption);
  
  // Cleanup temp
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  
  return {
    id: id,
    path: outputPath,
    title: content.title,
    type: content.type,
    video_url: videoUrl,
    duration: duration
  };
}

// Save reel to Supabase
async function saveReelToSupabase(reel) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  
  const reelData = {
    id: reel.id,
    title: reel.title,
    type: reel.type || 'news',
    category: reel.type === 'jobs' ? 'jobs' : 'news',
    video_url: reel.video_url,
    thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=700&fit=crop',
    duration: `0:${reel.duration || 30}`,
    views: 0,
    badge: 'new',
    created_at: new Date().toISOString()
  };
  
  try {
    await fetchJSON(`${SUPABASE_URL}/rest/v1/reels`, {
      method: 'POST',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }, JSON.stringify(reelData));
    console.log(`  Saved to Supabase: ${reel.title}`);
    return true;
  } catch (e) {
    console.log(`  Supabase save error: ${e.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log('Time:', new Date().toISOString());
  console.log('');
  
  // Check config
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('⚠️ SUPABASE_URL/SUPABASE_KEY not set');
    process.exit(1);
  }
  
  // Fetch data
  const news = await fetchLatestNews();
  const jobs = await fetchLatestJobs();
  
  if (news.length === 0 && jobs.length === 0) {
    console.log('\n⚠️ No news or jobs in Supabase!');
    console.log('Run the discovery workflow first.');
    console.log('::set-output name=reels_count::0');
    return;
  }
  
  // Prepare content for reels
  const CONTENT = [];
  
  // News reel
  if (news.length > 0) {
    const topNews = news.slice(0, 3);
    const newsVoice = `Tech News Update from TechGig Radar! ` + 
      topNews.map((n, i) => `Number ${i+1}: ${n.title}.`).join(' ') +
      ` Follow TechGig Radar for more tech updates!`;
    
    CONTENT.push({
      title: 'Tech News Today',
      voice: newsVoice,
      type: 'news'
    });
  }
  
  // Jobs reel
  if (jobs.length > 0) {
    const topJobs = jobs.slice(0, 3);
    const jobsVoice = `Remote Jobs Alert from TechGig Radar! ` +
      topJobs.map(j => `${j.title} at ${j.company}.`).join(' ') +
      ` Apply now at tech gig radar!`;
    
    CONTENT.push({
      title: 'Remote Jobs Alert',
      voice: jobsVoice,
      type: 'jobs'
    });
  }
  
  console.log(`\nGenerating ${CONTENT.length} video reels...`);
  
  // Generate videos
  const results = [];
  for (let i = 0; i < CONTENT.length; i++) {
    try {
      const reel = await createVideo(CONTENT[i], i);
      await saveReelToSupabase(reel);
      results.push(reel);
    } catch (e) {
      console.error(`Reel ${i + 1} failed:`, e.message);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Generated ${results.length} video reels`);
  results.forEach(r => {
    console.log(`   📹 ${r.title} (${r.duration}s) ${r.video_url ? '✓ uploaded' : '✗ local only'}`);
  });
  console.log('='.repeat(50));
  
  // GitHub Actions output
  console.log(`::set-output name=reels_count::${results.length}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
