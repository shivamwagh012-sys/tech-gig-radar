// TechGig Radar - Video Reel Generator
// Ultra-simple version that works on GitHub Actions

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Directories
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'reels');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Create dirs
try {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (e) {
  console.log('Dirs already exist');
}

console.log('='.repeat(50));
console.log('TechGig Radar - Video Generator');
console.log('='.repeat(50));
console.log('Output dir:', OUTPUT_DIR);
console.log('Temp dir:', TEMP_DIR);

// Sample content
const CONTENT = [
  {
    title: 'AI News Update',
    voice: 'Breaking tech news from TechGig Radar. The AI revolution continues in 2026. Major companies are releasing powerful new AI models. Follow TechGig Radar for daily updates on tech news and remote jobs.'
  }
];

// Simple file download
function downloadFile(url, dest) {
  return new Promise(function(resolve, reject) {
    console.log('Downloading:', url.substring(0, 60) + '...');
    var file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res) {
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
      file.on('finish', function() {
        file.close();
        resolve(dest);
      });
    }).on('error', function(e) {
      file.close();
      try { fs.unlinkSync(dest); } catch(x) {}
      reject(e);
    });
  });
}

// Generate voice
function generateVoice(text, outputPath) {
  // Remove problematic characters
  var clean = text.replace(/['"\\$`!]/g, '').replace(/\n/g, ' ');
  
  console.log('Generating voice...');
  var cmd = 'edge-tts --voice en-US-AriaNeural --text "' + clean + '" --write-media "' + outputPath + '"';
  
  try {
    execSync(cmd, { stdio: 'inherit', timeout: 120000 });
    if (fs.existsSync(outputPath)) {
      console.log('Voice OK:', outputPath);
      return true;
    }
  } catch (e) {
    console.log('edge-tts failed, trying python -m...');
    cmd = 'python3 -m edge_tts --voice en-US-AriaNeural --text "' + clean + '" --write-media "' + outputPath + '"';
    try {
      execSync(cmd, { stdio: 'inherit', timeout: 120000 });
      if (fs.existsSync(outputPath)) {
        console.log('Voice OK:', outputPath);
        return true;
      }
    } catch (e2) {
      console.error('Voice failed:', e2.message);
    }
  }
  return false;
}

// Get audio duration
function getDuration(file) {
  try {
    var out = execSync('ffprobe -v error -show_entries format=duration -of csv=p=0 "' + file + '"', { encoding: 'utf8' });
    return Math.ceil(parseFloat(out.trim())) + 2;
  } catch (e) {
    return 15;
  }
}

// Create video
async function createVideo(content, index) {
  var id = 'reel_' + Date.now() + '_' + index;
  var tempDir = path.join(TEMP_DIR, id);
  fs.mkdirSync(tempDir, { recursive: true });
  
  console.log('\n--- Creating reel:', content.title, '---');
  
  // 1. Generate voice
  var voicePath = path.join(tempDir, 'voice.mp3');
  if (!generateVoice(content.voice, voicePath)) {
    throw new Error('Voice generation failed');
  }
  
  var duration = getDuration(voicePath);
  console.log('Duration:', duration, 'seconds');
  
  // 2. Download background (or use color)
  var bgPath = path.join(tempDir, 'bg.mp4');
  var hasBg = false;
  
  var bgUrls = [
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4'
  ];
  
  for (var i = 0; i < bgUrls.length; i++) {
    try {
      await downloadFile(bgUrls[i], bgPath);
      var stats = fs.statSync(bgPath);
      if (stats.size > 10000) {
        hasBg = true;
        console.log('Background OK');
        break;
      }
    } catch (e) {
      console.log('Background download failed:', e.message);
    }
  }
  
  // 3. Create output video
  var outputPath = path.join(OUTPUT_DIR, id + '.mp4');
  var title = content.title.replace(/[^a-zA-Z0-9 ]/g, '');
  
  console.log('Creating video with FFmpeg...');
  
  var ffmpegCmd;
  if (hasBg) {
    // With background video
    ffmpegCmd = 'ffmpeg -y -stream_loop -1 -i "' + bgPath + '" -i "' + voicePath + '" ' +
      '-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,drawbox=x=0:y=0:w=iw:h=ih:c=black@0.5:t=fill,drawtext=text=' + "'" + title + "'" + ':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=h/3,drawtext=text=' + "'@TechGigRadar'" + ':fontsize=30:fontcolor=white:x=w-text_w-40:y=h-80[v]" ' +
      '-map "[v]" -map 1:a -c:v libx264 -preset fast -c:a aac -t ' + duration + ' -pix_fmt yuv420p "' + outputPath + '"';
  } else {
    // Solid background
    ffmpegCmd = 'ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=' + duration + '" -i "' + voicePath + '" ' +
      '-filter_complex "[0:v]drawtext=text=' + "'" + title + "'" + ':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=h/3,drawtext=text=' + "'@TechGigRadar'" + ':fontsize=30:fontcolor=white:x=w-text_w-40:y=h-80[v]" ' +
      '-map "[v]" -map 1:a -c:v libx264 -preset fast -c:a aac -t ' + duration + ' -pix_fmt yuv420p "' + outputPath + '"';
  }
  
  try {
    execSync(ffmpegCmd, { stdio: 'inherit', timeout: 300000 });
  } catch (e) {
    console.log('Complex FFmpeg failed, trying simple...');
    // Simplest fallback - just voice over solid color
    ffmpegCmd = 'ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=' + duration + '" -i "' + voicePath + '" ' +
      '-c:v libx264 -c:a aac -t ' + duration + ' -pix_fmt yuv420p "' + outputPath + '"';
    execSync(ffmpegCmd, { stdio: 'inherit', timeout: 300000 });
  }
  
  if (fs.existsSync(outputPath)) {
    var size = fs.statSync(outputPath).size;
    console.log('Video created:', outputPath, '(' + Math.round(size/1024) + 'KB)');
  } else {
    throw new Error('Video file not created');
  }
  
  // Cleanup
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
  
  return { path: outputPath, title: content.title };
}

// Main
async function main() {
  var results = [];
  
  for (var i = 0; i < CONTENT.length; i++) {
    try {
      var reel = await createVideo(CONTENT[i], i);
      results.push(reel);
    } catch (e) {
      console.error('Reel', i, 'failed:', e.message);
    }
  }
  
  // Save manifest
  var manifest = {
    time: new Date().toISOString(),
    reels: results
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log('\n='.repeat(50));
  console.log('Done! Generated', results.length, 'of', CONTENT.length, 'reels');
  console.log('='.repeat(50));
  
  // List files
  console.log('\nOutput files:');
  fs.readdirSync(OUTPUT_DIR).forEach(function(f) {
    var s = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(' -', f, '(' + Math.round(s.size/1024) + 'KB)');
  });
}

main().catch(function(e) {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
