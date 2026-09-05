/**
 * Professional Video Reel Generator
 * 
 * Creates Instagram/TikTok style reels with:
 * - Stock video backgrounds (from Pexels/Pixabay)
 * - Kinetic typography animations
 * - AI voice narration
 * - Background music
 * 
 * Requires: FFmpeg, edge-tts (for voice)
 */

import { execSync, exec } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import https from 'https';

// Video specs
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Brand colors
const COLORS = {
  primary: '#00d4ff',      // Cyan
  secondary: '#a855f7',    // Purple
  accent: '#00ff88',       // Green
  warning: '#ff4444',      // Red
  dark: '#0a0a1a',
  light: '#ffffff'
};

// Free stock video sources (API-based)
const STOCK_SOURCES = {
  pexels: 'https://api.pexels.com/videos/search',
  pixabay: 'https://pixabay.com/api/videos/'
};

// Background music library (royalty-free)
const MUSIC_LIBRARY = [
  {
    name: 'tech-upbeat',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
    mood: 'energetic'
  },
  {
    name: 'corporate-tech',
    url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c5.mp3',
    mood: 'professional'
  },
  {
    name: 'cinematic-tech',
    url: 'https://cdn.pixabay.com/download/audio/2023/07/30/audio_e85f6e8923.mp3',
    mood: 'dramatic'
  }
];

interface ReelScene {
  text: string;
  subtext?: string;
  duration: number;
  effect: 'fade' | 'typewriter' | 'scale' | 'slide';
  position: 'center' | 'top' | 'bottom';
}

interface ReelConfig {
  id: string;
  title: string;
  scenes: ReelScene[];
  voiceScript: string;
  backgroundQuery: string;  // Search term for stock video
  musicMood: 'energetic' | 'professional' | 'dramatic';
  outputDir: string;
}

/**
 * Download a file from URL
 */
function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location!, (res) => {
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', reject);
  });
}

/**
 * Generate voice narration using Edge TTS
 */
async function generateVoice(text: string, outputPath: string): Promise<void> {
  // Use edge-tts via Python (comes with edge-tts package)
  const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
  
  try {
    execSync(
      `edge-tts --voice "en-US-AriaNeural" --rate="+10%" --pitch="+5Hz" --text "${escapedText}" --write-media "${outputPath}"`,
      { stdio: 'pipe' }
    );
  } catch (e) {
    // Fallback: try with Python
    execSync(
      `python -m edge_tts --voice "en-US-AriaNeural" --rate="+10%" --text "${escapedText}" --write-media "${outputPath}"`,
      { stdio: 'pipe' }
    );
  }
}

/**
 * Create text overlay with kinetic effect
 */
function createTextOverlay(
  text: string,
  effect: string,
  position: string,
  duration: number,
  accentColor: string
): string {
  const fontPath = '/Windows/Fonts/arialbd.ttf';
  const escapedText = text.replace(/:/g, '\\:').replace(/'/g, '');
  
  // Position calculations
  let yPos = 'h/2';
  if (position === 'top') yPos = 'h/4';
  if (position === 'bottom') yPos = '3*h/4';
  
  // Effect-specific animations
  let alphaExpr = '1';
  let fontSizeExpr = '80';
  
  switch (effect) {
    case 'fade':
      alphaExpr = `if(lt(t,0.5),t*2,if(gt(t,${duration - 0.5}),${duration}-t,1))`;
      break;
    case 'typewriter':
      // Simulate typewriter by revealing characters
      alphaExpr = `if(lt(t,${duration * 0.7}),1,0)`;
      break;
    case 'scale':
      // Scale from small to large
      fontSizeExpr = `80+20*min(1,t*2)`;
      break;
    case 'slide':
      // Slide in from bottom
      yPos = `${yPos}+100*max(0,1-t*3)`;
      break;
  }
  
  return `drawtext=text='${escapedText}':fontsize=${fontSizeExpr}:fontcolor=white:` +
         `x=(w-text_w)/2:y=${yPos}:fontfile=${fontPath}:` +
         `alpha='${alphaExpr}':borderw=3:bordercolor=black`;
}

/**
 * Generate FFmpeg filter for all scenes
 */
function generateSceneFilters(scenes: ReelScene[], totalDuration: number): string {
  const filters: string[] = [];
  let currentTime = 0;
  
  scenes.forEach((scene, i) => {
    const startTime = currentTime;
    const endTime = currentTime + scene.duration;
    
    // Main text
    const textFilter = createTextOverlay(
      scene.text,
      scene.effect,
      scene.position,
      scene.duration,
      COLORS.primary
    );
    
    // Add enable condition for scene timing
    filters.push(`${textFilter}:enable='between(t,${startTime},${endTime})'`);
    
    // Subtext if present
    if (scene.subtext) {
      const subtextFilter = `drawtext=text='${scene.subtext.replace(/:/g, '\\:')}':` +
                           `fontsize=44:fontcolor=${COLORS.primary}:` +
                           `x=(w-text_w)/2:y=h/2+80:fontfile=/Windows/Fonts/arial.ttf:` +
                           `enable='between(t,${startTime + 0.5},${endTime})'`;
      filters.push(subtextFilter);
    }
    
    currentTime = endTime;
  });
  
  // Progress bar
  filters.push(
    `drawbox=x=0:y=ih-20:w=iw*t/${totalDuration}:h=20:c=${COLORS.primary.replace('#', '0x')}:t=fill`
  );
  
  // Watermark
  filters.push(
    `drawtext=text='@TechGigRadar':fontsize=32:fontcolor=${COLORS.light}@0.7:` +
    `x=w-text_w-40:y=h-80:fontfile=/Windows/Fonts/arial.ttf`
  );
  
  return filters.join(',');
}

/**
 * Create a professional reel with stock backgrounds
 */
export async function createProfessionalReel(config: ReelConfig): Promise<string> {
  const { id, scenes, voiceScript, backgroundQuery, musicMood, outputDir } = config;
  const reelDir = join(outputDir, id);
  
  if (!existsSync(reelDir)) {
    mkdirSync(reelDir, { recursive: true });
  }
  
  console.log(`[Reel ${id}] Starting professional reel generation...`);
  
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  
  // Step 1: Generate voice narration
  console.log('[1/4] Generating voice narration...');
  const voicePath = join(reelDir, 'voice.mp3');
  await generateVoice(voiceScript, voicePath);
  
  // Step 2: Download background music
  console.log('[2/4] Getting background music...');
  const musicTrack = MUSIC_LIBRARY.find(m => m.mood === musicMood) || MUSIC_LIBRARY[0];
  const musicPath = join(reelDir, 'music.mp3');
  await downloadFile(musicTrack.url, musicPath);
  
  // Step 3: Create video with solid background (no stock video API key)
  console.log('[3/4] Creating video with animations...');
  const videoPath = join(reelDir, 'video_base.mp4');
  const filters = generateSceneFilters(scenes, totalDuration);
  
  // Create gradient background video
  execSync(`ffmpeg -y -f lavfi -i "gradients=s=${WIDTH}x${HEIGHT}:c0=${COLORS.dark.replace('#', '')}:c1=1a1a3a:speed=0.5:type=radial:d=${totalDuration}" -vf "${filters}" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${totalDuration} "${videoPath}"`, { stdio: 'pipe' });
  
  // Step 4: Mix audio and video
  console.log('[4/4] Mixing audio tracks...');
  const finalPath = join(reelDir, `${id}_final.mp4`);
  
  // Mix voice (loud) with music (quiet background)
  execSync(`ffmpeg -y -i "${videoPath}" -i "${voicePath}" -i "${musicPath}" -filter_complex "[1:a]volume=1.0[voice];[2:a]volume=0.15[music];[voice][music]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${finalPath}"`, { stdio: 'pipe' });
  
  console.log(`[Reel ${id}] Complete! Output: ${finalPath}`);
  return finalPath;
}

/**
 * Create news reel configuration
 */
export function createNewsConfig(
  headline: string,
  keyPoints: string[],
  outputDir: string
): ReelConfig {
  const scenes: ReelScene[] = [
    {
      text: 'BREAKING NEWS',
      subtext: headline,
      duration: 4,
      effect: 'scale',
      position: 'center'
    },
    ...keyPoints.slice(0, 3).map((point, i) => ({
      text: point,
      duration: 5,
      effect: 'slide' as const,
      position: 'center' as const
    })),
    {
      text: 'Follow @TechGigRadar',
      subtext: 'Daily Tech News & Jobs',
      duration: 4,
      effect: 'fade',
      position: 'center'
    }
  ];
  
  const voiceScript = `
    Breaking news! ${headline}.
    ${keyPoints.map((p, i) => `Point ${i + 1}: ${p}.`).join(' ')}
    Follow TechGig Radar for daily tech updates!
  `.trim();
  
  return {
    id: `news-${Date.now()}`,
    title: headline,
    scenes,
    voiceScript,
    backgroundQuery: 'technology abstract',
    musicMood: 'energetic',
    outputDir
  };
}

/**
 * Create job reel configuration
 */
export function createJobConfig(
  company: string,
  title: string,
  salary: string,
  skills: string[],
  outputDir: string
): ReelConfig {
  const scenes: ReelScene[] = [
    {
      text: `${company} is HIRING!`,
      subtext: title,
      duration: 4,
      effect: 'scale',
      position: 'center'
    },
    {
      text: salary,
      subtext: 'Remote / Hybrid',
      duration: 4,
      effect: 'slide',
      position: 'center'
    },
    {
      text: 'Required Skills',
      subtext: skills.slice(0, 3).join(' • '),
      duration: 5,
      effect: 'fade',
      position: 'center'
    },
    {
      text: 'APPLY NOW',
      subtext: 'Link in Bio | @TechGigRadar',
      duration: 4,
      effect: 'scale',
      position: 'center'
    }
  ];
  
  const voiceScript = `
    Hot job alert! ${company} is hiring a ${title}!
    The salary range is ${salary}, with remote work options.
    You'll need skills in ${skills.slice(0, 3).join(', ')}.
    Apply now! Link in bio. Follow TechGig Radar for more opportunities!
  `.trim();
  
  return {
    id: `job-${Date.now()}`,
    title: `${company} - ${title}`,
    scenes,
    voiceScript,
    backgroundQuery: 'office technology',
    musicMood: 'professional',
    outputDir
  };
}

// CLI
if (require.main === module) {
  const outputDir = process.argv[2] || './output/reels';
  
  const config = createNewsConfig(
    'OpenAI Launches GPT-5 Astra',
    [
      'Trained on 100,000 GPUs',
      'First model rated CRITICAL',
      '36x faster than humans'
    ],
    outputDir
  );
  
  createProfessionalReel(config)
    .then(path => console.log(`\n✅ Reel saved: ${path}`))
    .catch(err => console.error('Error:', err));
}
