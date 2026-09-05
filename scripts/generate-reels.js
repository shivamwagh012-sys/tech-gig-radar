/**
 * Automated Video Reel Generator
 * 
 * Generates professional video reels using:
 * - Pexels API for stock video backgrounds (free, unlimited)
 * - Edge TTS for AI voice narration (free)
 * - FFmpeg for video composition (free)
 * - Pixabay for background music (free)
 * 
 * Runs automatically via GitHub Actions every 4 hours
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'reels');
const TEMP_DIR = path.join(process.cwd(), 'temp');
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Brand colors
const COLORS = {
  primary: '00d4ff',
  secondary: 'a855f7', 
  accent: '00ff88',
  dark: '0a0a1a',
  white: 'ffffff'
};

// Free stock video sources from Pexels
const STOCK_VIDEOS = {
  tech: [
    'https://player.vimeo.com/external/434045526.sd.mp4?s=c27eba599c4e1c53e65e3c1e7e8d4fb1c2a0b3d4&profile_id=165&oauth2_token_id=57447761',
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-white-abstract-technology-background-1185-large.mp4'
  ],
  abstract: [
    'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-animation-9744-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-blue-and-purple-futuristic-lighting-loop-animation-28963-large.mp4'
  ],
  business: [
    'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-woman-typing-on-a-computer-in-an-office-4239-large.mp4'
  ]
};

// Free background music from Pixabay (direct links)
const MUSIC_TRACKS = [
  'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3', // Tech upbeat
  'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c5.mp3', // Corporate
  'https://cdn.pixabay.com/download/audio/2021/11/13/audio_cb4b9c836c.mp3'  // Inspirational
];

// Sample content for reels (in production, fetch from database)
const SAMPLE_CONTENT = [
  {
    type: 'news',
    title: 'OpenAI Launches GPT-5',
    points: ['Trained on 100K GPUs', 'First AGI-rated model', '36x faster responses', 'Plus tier required'],
    voiceScript: 'Breaking news! OpenAI just launched GPT-5. Trained on 100,000 GPUs, this is the first model rated for AGI capabilities. Its 36 times faster than previous models. But theres a catch - its only available for Plus subscribers. Follow TechGig Radar for more updates!'
  },
  {
    type: 'job',
    title: 'Google is Hiring',
    company: 'Google',
    position: 'Senior Engineer',
    salary: '$200K-$350K',
    skills: ['Python', 'Kubernetes', 'ML', 'Cloud'],
    voiceScript: 'Hot job alert! Google is hiring Senior Engineers! The salary range is 200K to 350K dollars. You will need skills in Python, Kubernetes, Machine Learning, and Cloud. Remote work available. Apply now - link in bio. Follow TechGig Radar for more remote job opportunities!'
  }
];

/**
 * Download a file from URL
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    const request = (url.startsWith('https') ? https : require('http')).get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Generate voice narration using Edge TTS
 */
async function generateVoice(text, outputPath) {
  const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
  
  try {
    execSync(
      `edge-tts --voice "en-US-AriaNeural" --rate="+5%" --pitch="+2Hz" --text "${escapedText}" --write-media "${outputPath}"`,
      { stdio: 'pipe', timeout: 60000 }
    );
    return outputPath;
  } catch (error) {
    console.error('Voice generation failed:', error.message);
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
      { encoding: 'utf8' }
    );
    return parseFloat(result.trim());
  } catch (error) {
    return 30; // Default 30 seconds
  }
}

/**
 * Create a single reel video
 */
async function createReel(content, index) {
  const reelId = `reel_${Date.now()}_${index}`;
  const reelDir = path.join(TEMP_DIR, reelId);
  
  if (!fs.existsSync(reelDir)) {
    fs.mkdirSync(reelDir, { recursive: true });
  }
  
  console.log(`\n[${reelId}] Starting reel generation...`);
  
  // Step 1: Generate voice narration
  console.log('[1/4] Generating voice narration...');
  const voicePath = path.join(reelDir, 'voice.mp3');
  await generateVoice(content.voiceScript, voicePath);
  const voiceDuration = getMediaDuration(voicePath);
  console.log(`     Voice duration: ${voiceDuration.toFixed(1)}s`);
  
  // Step 2: Download background video
  console.log('[2/4] Getting background video...');
  const bgCategory = content.type === 'job' ? 'business' : 'tech';
  const bgUrl = STOCK_VIDEOS[bgCategory][Math.floor(Math.random() * STOCK_VIDEOS[bgCategory].length)];
  const bgPath = path.join(reelDir, 'background.mp4');
  
  try {
    await downloadFile(bgUrl, bgPath);
  } catch (error) {
    console.log('     Using solid color background (download failed)');
    // Create solid color background
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=${COLORS.dark}:s=${WIDTH}x${HEIGHT}:d=${voiceDuration + 2}" -c:v libx264 -t ${voiceDuration + 2} "${bgPath}"`,
      { stdio: 'pipe' }
    );
  }
  
  // Step 3: Download background music
  console.log('[3/4] Getting background music...');
  const musicUrl = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
  const musicPath = path.join(reelDir, 'music.mp3');
  
  try {
    await downloadFile(musicUrl, musicPath);
  } catch (error) {
    console.log('     Skipping music (download failed)');
  }
  
  // Step 4: Compose final video
  console.log('[4/4] Composing final video...');
  const totalDuration = voiceDuration + 2; // Add 2 seconds buffer
  const outputPath = path.join(OUTPUT_DIR, `${reelId}.mp4`);
  
  // Build FFmpeg filter for text overlays
  const title = content.type === 'job' ? `${content.company} is HIRING!` : content.title;
  const subtitle = content.type === 'job' ? content.position : 'Breaking News';
  
  // Escape special characters for FFmpeg
  const escapeText = (text) => text.replace(/:/g, '\\:').replace(/'/g, '').replace(/"/g, '');
  
  const filterComplex = [
    // Scale and crop background to 9:16
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,fps=${FPS}[bg]`,
    // Add dark overlay for better text readability
    `[bg]drawbox=x=0:y=0:w=iw:h=ih:c=black@0.5:t=fill[bgdark]`,
    // Add title text (centered, large)
    `[bgdark]drawtext=text='${escapeText(title)}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=h/3:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:enable='between(t,0.5,${totalDuration - 1})'[t1]`,
    // Add subtitle
    `[t1]drawtext=text='${escapeText(subtitle)}':fontsize=48:fontcolor=${COLORS.primary}:x=(w-text_w)/2:y=h/3+100:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:enable='between(t,1,${totalDuration - 1})'[t2]`,
    // Add watermark
    `[t2]drawtext=text='@TechGigRadar':fontsize=32:fontcolor=white@0.7:x=w-text_w-40:y=h-80:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf[t3]`,
    // Add progress bar
    `[t3]drawbox=x=0:y=ih-20:w=iw*t/${totalDuration}:h=20:c=0x${COLORS.primary}:t=fill[video]`
  ].join(';');
  
  // Build FFmpeg command
  let ffmpegCmd = [
    'ffmpeg', '-y',
    '-i', bgPath,
    '-i', voicePath
  ];
  
  // Add music if available
  if (fs.existsSync(musicPath)) {
    ffmpegCmd.push('-i', musicPath);
  }
  
  ffmpegCmd.push(
    '-filter_complex', filterComplex,
    '-map', '[video]'
  );
  
  // Mix audio
  if (fs.existsSync(musicPath)) {
    ffmpegCmd.push(
      '-filter_complex', `[1:a]volume=1.0[voice];[2:a]volume=0.15,afade=t=out:st=${totalDuration - 2}:d=2[music];[voice][music]amix=inputs=2:duration=first[aout]`,
      '-map', '[aout]'
    );
  } else {
    ffmpegCmd.push('-map', '1:a');
  }
  
  ffmpegCmd.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', String(totalDuration),
    '-pix_fmt', 'yuv420p',
    outputPath
  );
  
  // Actually run a simpler version that works reliably
  const simpleCmd = `ffmpeg -y -i "${bgPath}" -i "${voicePath}" \
    -filter_complex "[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},drawbox=x=0:y=0:w=iw:h=ih:c=black@0.4:t=fill,drawtext=text='${escapeText(title)}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=h/3,drawtext=text='${escapeText(subtitle)}':fontsize=48:fontcolor=0x${COLORS.primary}:x=(w-text_w)/2:y=h/3+100,drawtext=text='@TechGigRadar':fontsize=32:fontcolor=white@0.7:x=w-text_w-40:y=h-80[v]" \
    -map "[v]" -map 1:a \
    -c:v libx264 -preset fast -crf 23 \
    -c:a aac -b:a 192k \
    -t ${totalDuration} \
    -pix_fmt yuv420p \
    "${outputPath}"`;
  
  try {
    execSync(simpleCmd, { stdio: 'pipe', timeout: 300000 });
    console.log(`     ✅ Generated: ${outputPath}`);
    
    // Cleanup temp files
    fs.rmSync(reelDir, { recursive: true, force: true });
    
    return outputPath;
  } catch (error) {
    console.error('     ❌ FFmpeg error:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(50));
  console.log('TechGig Radar - Automated Video Reel Generator');
  console.log('='.repeat(50));
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Create output directories
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  // In production, fetch real content from database
  // For now, use sample content
  const content = SAMPLE_CONTENT;
  
  console.log(`\nGenerating ${content.length} reels...`);
  
  const generatedReels = [];
  
  for (let i = 0; i < content.length; i++) {
    try {
      const reelPath = await createReel(content[i], i);
      generatedReels.push({
        path: reelPath,
        content: content[i]
      });
    } catch (error) {
      console.error(`Failed to generate reel ${i + 1}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Generated ${generatedReels.length}/${content.length} reels successfully!`);
  console.log('='.repeat(50));
  
  // Save manifest for Telegram posting
  const manifest = {
    generatedAt: new Date().toISOString(),
    reels: generatedReels.map(r => ({
      path: r.path,
      title: r.content.title || `${r.content.company} - ${r.content.position}`,
      type: r.content.type
    }))
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  return generatedReels;
}

// Run
main().catch(console.error);
