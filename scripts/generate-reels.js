/**
 * Automated Video Reel Generator
 * 
 * Generates professional video reels using:
 * - Mixkit for stock video backgrounds (free, unlimited)
 * - Edge TTS for AI voice narration (free)
 * - FFmpeg for video composition (free)
 * 
 * Runs automatically via GitHub Actions every 4 hours
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'reels');
const TEMP_DIR = path.join(process.cwd(), 'temp');
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Brand colors (hex without #)
const COLORS = {
  primary: '00d4ff',
  secondary: 'a855f7', 
  accent: '00ff88',
  dark: '0a0a1a',
  white: 'ffffff'
};

// Free stock video sources from Mixkit (these are direct MP4 links)
const STOCK_VIDEOS = {
  tech: [
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-animation-of-futuristic-devices-99788-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-typing-on-a-laptop-34824-large.mp4'
  ],
  abstract: [
    'https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-3173-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-glowing-neon-lights-1172-large.mp4'
  ],
  business: [
    'https://assets.mixkit.co/videos/preview/mixkit-woman-typing-on-a-laptop-in-an-office-4990-large.mp4'
  ]
};

// Sample content for reels (in production, fetch from database)
const SAMPLE_CONTENT = [
  {
    type: 'news',
    title: 'AI Revolution 2026',
    points: ['GPT-5 Released', 'AGI Capabilities', '10x Faster', 'Available Now'],
    voiceScript: 'Breaking news from TechGig Radar! The AI revolution continues in 2026. Major companies are releasing groundbreaking AI models with AGI capabilities. Stay tuned for more updates. Follow TechGig Radar for the latest tech news and remote job opportunities!'
  },
  {
    type: 'job',
    title: 'Remote Jobs Alert',
    company: 'Top Tech Companies',
    position: 'Software Engineers',
    salary: '$100K-$300K',
    skills: ['React', 'Node.js', 'Python', 'AWS'],
    voiceScript: 'Hot job alert from TechGig Radar! Top tech companies are hiring software engineers remotely. Salaries range from 100K to 300K dollars. Skills needed include React, Node.js, Python, and AWS. Apply now through the links in our channel. Follow TechGig Radar for daily remote job updates!'
  }
];

/**
 * Download a file from URL with retry logic
 */
function downloadFile(url, outputPath, retries = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const attemptDownload = (attempt) => {
      console.log(`     Downloading (attempt ${attempt}/${retries}): ${url.substring(0, 80)}...`);
      
      const file = fs.createWriteStream(outputPath);
      
      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(outputPath);
          downloadFile(response.headers.location, outputPath, retries)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(outputPath);
          if (attempt < retries) {
            setTimeout(() => attemptDownload(attempt + 1), 1000);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
          return;
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(outputPath);
          if (stats.size > 1000) {
            resolve(outputPath);
          } else {
            fs.unlinkSync(outputPath);
            if (attempt < retries) {
              setTimeout(() => attemptDownload(attempt + 1), 1000);
            } else {
              reject(new Error('Downloaded file too small'));
            }
          }
        });
      });
      
      request.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(outputPath); } catch(e) {}
        if (attempt < retries) {
          setTimeout(() => attemptDownload(attempt + 1), 1000);
        } else {
          reject(err);
        }
      });
      
      request.setTimeout(60000, () => {
        request.destroy();
        file.close();
        try { fs.unlinkSync(outputPath); } catch(e) {}
        if (attempt < retries) {
          setTimeout(() => attemptDownload(attempt + 1), 1000);
        } else {
          reject(new Error('Download timeout'));
        }
      });
    };
    
    attemptDownload(1);
  });
}

/**
 * Generate voice narration using Edge TTS (Python)
 */
async function generateVoice(text, outputPath) {
  // Escape text for shell
  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
  
  // Try using python -m edge_tts (more reliable than edge-tts command)
  const cmd = `python3 -m edge_tts --voice "en-US-AriaNeural" --rate="+5%" --text "${escapedText}" --write-media "${outputPath}"`;
  
  try {
    console.log('     Running edge-tts...');
    execSync(cmd, { stdio: 'pipe', timeout: 120000 });
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1000) {
        console.log(`     ✅ Voice generated: ${(stats.size / 1024).toFixed(1)}KB`);
        return outputPath;
      }
    }
    throw new Error('Voice file too small or missing');
  } catch (error) {
    console.error('     ❌ Voice generation error:', error.message);
    throw error;
  }
}

/**
 * Get duration of a media file
 */
function getMediaDuration(filePath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf8', timeout: 30000 }
    );
    return parseFloat(result.trim());
  } catch (error) {
    console.log('     Could not get duration, using default');
    return 30;
  }
}

/**
 * Create solid color background video
 */
function createSolidBackground(outputPath, duration) {
  const cmd = `ffmpeg -y -f lavfi -i "color=c=0x${COLORS.dark}:s=${WIDTH}x${HEIGHT}:d=${duration}" -c:v libx264 -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
  execSync(cmd, { stdio: 'pipe', timeout: 60000 });
  return outputPath;
}

/**
 * Create a single reel video
 */
async function createReel(content, index) {
  const reelId = `reel_${Date.now()}_${index}`;
  const reelDir = path.join(TEMP_DIR, reelId);
  
  fs.mkdirSync(reelDir, { recursive: true });
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Reel ${index + 1}] ${content.title || content.company}`);
  console.log('='.repeat(50));
  
  // Step 1: Generate voice narration
  console.log('\n[1/3] Generating voice narration...');
  const voicePath = path.join(reelDir, 'voice.mp3');
  await generateVoice(content.voiceScript, voicePath);
  const voiceDuration = getMediaDuration(voicePath);
  console.log(`     Duration: ${voiceDuration.toFixed(1)} seconds`);
  
  // Step 2: Get background video
  console.log('\n[2/3] Preparing background video...');
  const bgPath = path.join(reelDir, 'background.mp4');
  const totalDuration = Math.ceil(voiceDuration) + 2;
  
  // Try downloading stock video, fall back to solid color
  const bgCategory = content.type === 'job' ? 'business' : 'tech';
  const bgOptions = STOCK_VIDEOS[bgCategory];
  let bgReady = false;
  
  for (const bgUrl of bgOptions) {
    try {
      await downloadFile(bgUrl, bgPath);
      bgReady = true;
      console.log('     ✅ Stock video downloaded');
      break;
    } catch (error) {
      console.log(`     ⚠️ Failed: ${error.message}`);
    }
  }
  
  if (!bgReady) {
    console.log('     Creating solid color background...');
    createSolidBackground(bgPath, totalDuration);
    console.log('     ✅ Solid background created');
  }
  
  // Step 3: Compose final video
  console.log('\n[3/3] Composing final video...');
  const outputPath = path.join(OUTPUT_DIR, `${reelId}.mp4`);
  
  // Build title and subtitle
  const title = content.type === 'job' 
    ? `${content.company || 'Company'} is HIRING!`
    : (content.title || 'Breaking News');
  const subtitle = content.type === 'job'
    ? (content.position || 'Remote Position')
    : 'TechGig Radar';
  
  // Escape for FFmpeg drawtext
  const escapeText = (text) => text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, '')
    .replace(/"/g, '');
  
  // FFmpeg command with text overlays
  const ffmpegCmd = [
    'ffmpeg', '-y',
    '-stream_loop', '-1', '-i', `"${bgPath}"`,  // Loop background
    '-i', `"${voicePath}"`,
    '-filter_complex',
    `"[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS}[scaled];` +
    `[scaled]drawbox=x=0:y=0:w=iw:h=ih:c=black@0.5:t=fill[dark];` +
    `[dark]drawtext=text='${escapeText(title)}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=h/3:font=DejaVu Sans Bold[t1];` +
    `[t1]drawtext=text='${escapeText(subtitle)}':fontsize=42:fontcolor=0x${COLORS.primary}:x=(w-text_w)/2:y=h/3+90:font=DejaVu Sans[t2];` +
    `[t2]drawtext=text='@TechGigRadar':fontsize=28:fontcolor=white@0.8:x=w-text_w-30:y=h-60:font=DejaVu Sans[out]"`,
    '-map', '"[out]"',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', String(totalDuration),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    `"${outputPath}"`
  ].join(' ');
  
  try {
    execSync(ffmpegCmd, { 
      stdio: 'pipe', 
      timeout: 300000,
      shell: true 
    });
    
    const stats = fs.statSync(outputPath);
    console.log(`     ✅ Video created: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Cleanup temp files
    fs.rmSync(reelDir, { recursive: true, force: true });
    
    return outputPath;
  } catch (error) {
    console.error('     ❌ FFmpeg error:', error.message);
    
    // Try simpler fallback
    console.log('     Trying simplified encoding...');
    const simpleFfmpeg = [
      'ffmpeg', '-y',
      '-f', 'lavfi', '-i', `"color=c=0x0a0a1a:s=${WIDTH}x${HEIGHT}:d=${totalDuration}"`,
      '-i', `"${voicePath}"`,
      '-filter_complex',
      `"[0:v]drawtext=text='${escapeText(title)}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=h/3[t1];` +
      `[t1]drawtext=text='@TechGigRadar':fontsize=28:fontcolor=white:x=w-text_w-30:y=h-60[out]"`,
      '-map', '"[out]"',
      '-map', '1:a',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-t', String(totalDuration),
      '-pix_fmt', 'yuv420p',
      `"${outputPath}"`
    ].join(' ');
    
    execSync(simpleFfmpeg, { stdio: 'pipe', timeout: 300000, shell: true });
    
    const stats = fs.statSync(outputPath);
    console.log(`     ✅ Video created (simple): ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    
    fs.rmSync(reelDir, { recursive: true, force: true });
    return outputPath;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('   TechGig Radar - Automated Video Reel Generator');
  console.log('   FREE: FFmpeg + Edge TTS + Mixkit');
  console.log('='.repeat(60));
  console.log(`\nStarted: ${new Date().toISOString()}`);
  
  // Create directories
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  
  // Use sample content (in production, fetch from database)
  const content = SAMPLE_CONTENT;
  console.log(`\nWill generate ${content.length} reels...`);
  
  const generatedReels = [];
  
  for (let i = 0; i < content.length; i++) {
    try {
      const reelPath = await createReel(content[i], i);
      generatedReels.push({
        path: reelPath,
        title: content[i].title || `${content[i].company} - ${content[i].position}`,
        type: content[i].type
      });
    } catch (error) {
      console.error(`\n❌ Failed to generate reel ${i + 1}:`, error.message);
    }
  }
  
  // Save manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    count: generatedReels.length,
    reels: generatedReels
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('\n' + '='.repeat(60));
  console.log(`   COMPLETED: ${generatedReels.length}/${content.length} reels`);
  console.log('='.repeat(60));
  
  // List output
  console.log('\nGenerated files:');
  const files = fs.readdirSync(OUTPUT_DIR);
  files.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  - ${f} (${(stats.size / 1024).toFixed(1)}KB)`);
  });
  
  return generatedReels;
}

// Run
main().catch(err => {
  console.error('\n❌ FATAL ERROR:', err.message);
  process.exit(1);
});
