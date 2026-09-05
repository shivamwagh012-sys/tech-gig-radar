/**
 * TechGig Radar - Video Reel Generator
 * 100% FREE: FFmpeg + Edge TTS + Mixkit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = './output/reels';
const TEMP_DIR = './temp';

// Ensure directories exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// Content to generate (in production, fetch from DB)
const CONTENT = [
  {
    type: 'news',
    title: 'AI Revolution 2026',
    voice: 'Breaking tech news from TechGig Radar! The AI revolution continues with major breakthroughs. Top companies are releasing powerful new AI models. Stay ahead of the curve. Follow TechGig Radar for daily updates on tech news and remote jobs!'
  },
  {
    type: 'job',
    title: 'Remote Jobs Alert',
    voice: 'Hot job alert from TechGig Radar! Top tech companies are hiring remote developers. Salaries range from 100K to 300K dollars. Skills needed: React, Node, Python, AWS. Check our Telegram channel for apply links. Follow TechGig Radar!'
  }
];

/**
 * Download file with proper error handling
 */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`  Downloading: ${url.slice(0, 60)}...`);
    const file = fs.createWriteStream(dest);
    
    https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000 
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', (e) => {
      file.close();
      try { fs.unlinkSync(dest); } catch(x) {}
      reject(e);
    });
  });
}

/**
 * Generate voice using Edge TTS
 */
function generateVoice(text, outputPath) {
  // Clean text for shell
  const clean = text.replace(/['"\\$`]/g, '');
  
  console.log('  Generating voice narration...');
  try {
    execSync(
      `python3 -m edge_tts --voice "en-US-AriaNeural" --rate="+10%" --text "${clean}" --write-media "${outputPath}"`,
      { stdio: 'pipe', timeout: 120000 }
    );
    console.log('  ✓ Voice generated');
    return true;
  } catch (e) {
    console.error('  ✗ Voice failed:', e.message);
    return false;
  }
}

/**
 * Get audio duration
 */
function getDuration(file) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,
      { encoding: 'utf8' }
    );
    return Math.ceil(parseFloat(out.trim())) + 1;
  } catch (e) {
    return 30;
  }
}

/**
 * Create video reel
 */
async function createReel(content, index) {
  const id = `reel_${Date.now()}_${index}`;
  const dir = path.join(TEMP_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  
  console.log(`\n[${'='.repeat(40)}]`);
  console.log(`Reel ${index + 1}: ${content.title}`);
  console.log(`[${'='.repeat(40)}]`);
  
  // 1. Generate voice
  const voicePath = path.join(dir, 'voice.mp3');
  if (!generateVoice(content.voice, voicePath)) {
    throw new Error('Voice generation failed');
  }
  
  const duration = getDuration(voicePath);
  console.log(`  Duration: ${duration}s`);
  
  // 2. Try to download background video
  const bgPath = path.join(dir, 'bg.mp4');
  const bgUrls = [
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-typing-on-a-laptop-34824-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-woman-typing-on-laptop-1173-large.mp4'
  ];
  
  let hasBg = false;
  for (const url of bgUrls) {
    try {
      await download(url, bgPath);
      if (fs.existsSync(bgPath) && fs.statSync(bgPath).size > 10000) {
        hasBg = true;
        console.log('  ✓ Background video downloaded');
        break;
      }
    } catch (e) {
      console.log(`  ⚠ Download failed: ${e.message}`);
    }
  }
  
  // 3. Create video
  const outputPath = path.join(OUTPUT_DIR, `${id}.mp4`);
  const title = content.title.replace(/[^a-zA-Z0-9 ]/g, '');
  
  console.log('  Creating video...');
  
  let cmd;
  if (hasBg) {
    // With background video
    cmd = `ffmpeg -y -stream_loop -1 -i "${bgPath}" -i "${voicePath}" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30[v];[v]drawbox=x=0:y=0:w=iw:h=ih:c=black@0.5:t=fill[d];[d]drawtext=text='${title}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=h/3[t];[t]drawtext=text='@TechGigRadar':fontsize=30:fontcolor=white:x=w-text_w-40:y=h-80[out]" -map "[out]" -map 1:a -c:v libx264 -preset fast -c:a aac -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
  } else {
    // Solid color fallback
    cmd = `ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${duration}" -i "${voicePath}" -filter_complex "[0:v]drawtext=text='${title}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=h/3[t];[t]drawtext=text='@TechGigRadar':fontsize=30:fontcolor=white:x=w-text_w-40:y=h-80[out]" -map "[out]" -map 1:a -c:v libx264 -preset fast -c:a aac -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
  }
  
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 300000 });
    const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
    console.log(`  ✓ Video created: ${size}MB`);
  } catch (e) {
    console.error('  ✗ FFmpeg failed, trying simple version...');
    
    // Simplest possible fallback
    const simpleCmd = `ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${duration}" -i "${voicePath}" -c:v libx264 -c:a aac -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
    execSync(simpleCmd, { stdio: 'pipe', timeout: 300000 });
    console.log('  ✓ Simple video created');
  }
  
  // Cleanup
  fs.rmSync(dir, { recursive: true, force: true });
  
  return { path: outputPath, title: content.title, type: content.type };
}

/**
 * Main
 */
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('  TechGig Radar - Video Generator');
  console.log('  100% FREE: FFmpeg + Edge TTS');
  console.log('='.repeat(50));
  console.log(`Started: ${new Date().toISOString()}\n`);
  
  const results = [];
  
  for (let i = 0; i < CONTENT.length; i++) {
    try {
      const reel = await createReel(CONTENT[i], i);
      results.push(reel);
    } catch (e) {
      console.error(`\n✗ Reel ${i + 1} failed: ${e.message}`);
    }
  }
  
  // Save manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ time: new Date().toISOString(), reels: results }, null, 2)
  );
  
  console.log('\n' + '='.repeat(50));
  console.log(`  Done! Generated ${results.length}/${CONTENT.length} reels`);
  console.log('='.repeat(50) + '\n');
  
  // List files
  fs.readdirSync(OUTPUT_DIR).forEach(f => {
    const s = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} (${(s.size/1024).toFixed(0)}KB)`);
  });
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
