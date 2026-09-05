/**
 * Production-Quality Video Reel Generator
 * 
 * Creates Instagram/TikTok style reels with:
 * - Animated text overlays
 * - AI voice narration (Edge TTS)
 * - News ticker / breaking news style
 * - Animated infographic elements
 * - 30-60 second duration
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';

// Video specs for vertical reels
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Color palette (TechGig Radar brand)
const COLORS = {
  bgDark: '#0a0a1a',
  bgCard: '#12122a',
  accentCyan: '#00d4ff',
  accentPurple: '#a855f7',
  accentGreen: '#00ff88',
  accentRed: '#ff4444',
  textWhite: '#ffffff',
  textMuted: '#888899'
};

// Scene types for infographic style
interface Scene {
  type: 'hook' | 'stat' | 'list' | 'quote' | 'cta';
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string }[];
  items?: string[];
  duration: number;
  accent: string;
}

interface ReelConfig {
  id: string;
  title: string;
  category: 'news' | 'job' | 'tip';
  scenes: Scene[];
  script: string; // Voice narration text
  outputDir: string;
}

/**
 * Escape text for FFmpeg drawtext filter
 */
function escapeFFmpegText(text: string): string {
  return text
    .replace(/'/g, '')
    .replace(/:/g, '\\:')
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Create a hook scene (attention-grabber)
 */
function createHookScene(scene: Scene, outputPath: string): void {
  const titleEsc = escapeFFmpegText(scene.title);
  const subtitleEsc = scene.subtitle ? escapeFFmpegText(scene.subtitle) : '';
  
  const filters = [
    // Background with gradient
    `color=c=${COLORS.bgDark}:s=${WIDTH}x${HEIGHT}:d=${scene.duration}:r=${FPS}`,
    // Accent stripe at top
    `drawbox=x=0:y=0:w=iw:h=8:c=${scene.accent}:t=fill`,
    // Breaking news badge (animated)
    `drawbox=x=40:y=200:w=300:h=60:c=${COLORS.accentRed}:t=fill`,
    `drawtext=text='BREAKING':fontsize=36:fontcolor=white:x=100:y=215:fontfile=/Windows/Fonts/arialbd.ttf`,
    // Main title (fade in)
    `drawtext=text='${titleEsc}':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-100:fontfile=/Windows/Fonts/arialbd.ttf:alpha='if(lt(t,0.5),t*2,1)'`,
    // Subtitle
    subtitleEsc ? `drawtext=text='${subtitleEsc}':fontsize=44:fontcolor=${scene.accent}:x=(w-text_w)/2:y=(h-text_h)/2+50:fontfile=/Windows/Fonts/arial.ttf:alpha='if(lt(t,0.8),0,min(1,(t-0.8)*2))'` : '',
    // Progress bar at bottom
    `drawbox=x=0:y=ih-20:w=iw*t/${scene.duration}:h=20:c=${scene.accent}:t=fill`,
    // Logo watermark
    `drawtext=text='@TechGigRadar':fontsize=28:fontcolor=${COLORS.textMuted}:x=w-text_w-40:y=h-80:fontfile=/Windows/Fonts/arial.ttf`
  ].filter(Boolean).join(',');

  const cmd = [
    'ffmpeg', '-y',
    '-f', 'lavfi',
    '-i', `color=c=${COLORS.bgDark}:s=${WIDTH}x${HEIGHT}:d=${scene.duration}:r=${FPS}`,
    '-vf', filters,
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-t', String(scene.duration),
    outputPath
  ];

  execSync(cmd.join(' '), { stdio: 'pipe' });
}

/**
 * Create a stat scene (big number + context)
 */
function createStatScene(scene: Scene, outputPath: string): void {
  const titleEsc = escapeFFmpegText(scene.title);
  const stats = scene.stats || [];
  
  let filters = [
    // Dark background
    `drawbox=x=0:y=0:w=iw:h=ih:c=${COLORS.bgCard}:t=fill`,
    // Accent line
    `drawbox=x=0:y=0:w=8:h=ih:c=${scene.accent}:t=fill`,
    // Title
    `drawtext=text='${titleEsc}':fontsize=48:fontcolor=${COLORS.textMuted}:x=60:y=300:fontfile=/Windows/Fonts/arial.ttf`
  ];

  // Add stats with staggered animation
  stats.forEach((stat, i) => {
    const y = 450 + (i * 250);
    const delay = 0.3 + (i * 0.3);
    filters.push(
      `drawtext=text='${escapeFFmpegText(stat.value)}':fontsize=120:fontcolor=${scene.accent}:x=60:y=${y}:fontfile=/Windows/Fonts/arialbd.ttf:alpha='if(lt(t,${delay}),0,min(1,(t-${delay})*3))'`,
      `drawtext=text='${escapeFFmpegText(stat.label)}':fontsize=36:fontcolor=white:x=60:y=${y + 130}:fontfile=/Windows/Fonts/arial.ttf:alpha='if(lt(t,${delay + 0.2}),0,min(1,(t-${delay + 0.2})*3))'`
    );
  });

  // Progress bar
  filters.push(`drawbox=x=0:y=ih-20:w=iw*t/${scene.duration}:h=20:c=${scene.accent}:t=fill`);
  filters.push(`drawtext=text='@TechGigRadar':fontsize=28:fontcolor=${COLORS.textMuted}:x=w-text_w-40:y=h-80:fontfile=/Windows/Fonts/arial.ttf`);

  const cmd = [
    'ffmpeg', '-y',
    '-f', 'lavfi',
    '-i', `color=c=${COLORS.bgDark}:s=${WIDTH}x${HEIGHT}:d=${scene.duration}:r=${FPS}`,
    '-vf', filters.join(','),
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-t', String(scene.duration),
    outputPath
  ];

  execSync(cmd.join(' '), { stdio: 'pipe' });
}

/**
 * Create a list scene (bullet points appearing)
 */
function createListScene(scene: Scene, outputPath: string): void {
  const titleEsc = escapeFFmpegText(scene.title);
  const items = scene.items || [];
  
  let filters = [
    `drawbox=x=0:y=0:w=iw:h=ih:c=${COLORS.bgDark}:t=fill`,
    // Title bar
    `drawbox=x=0:y=200:w=iw:h=100:c=${COLORS.bgCard}:t=fill`,
    `drawtext=text='${titleEsc}':fontsize=52:fontcolor=white:x=60:y=225:fontfile=/Windows/Fonts/arialbd.ttf`
  ];

  // Add list items with staggered reveal
  items.forEach((item, i) => {
    const y = 400 + (i * 180);
    const delay = 0.5 + (i * 0.5);
    filters.push(
      // Bullet point
      `drawbox=x=60:y=${y + 15}:w=20:h=20:c=${scene.accent}:t=fill:enable='gte(t,${delay})'`,
      // Item text
      `drawtext=text='${escapeFFmpegText(item)}':fontsize=42:fontcolor=white:x=110:y=${y}:fontfile=/Windows/Fonts/arial.ttf:alpha='if(lt(t,${delay}),0,min(1,(t-${delay})*3))'`
    );
  });

  filters.push(`drawbox=x=0:y=ih-20:w=iw*t/${scene.duration}:h=20:c=${scene.accent}:t=fill`);
  filters.push(`drawtext=text='@TechGigRadar':fontsize=28:fontcolor=${COLORS.textMuted}:x=w-text_w-40:y=h-80:fontfile=/Windows/Fonts/arial.ttf`);

  const cmd = [
    'ffmpeg', '-y',
    '-f', 'lavfi',
    '-i', `color=c=${COLORS.bgDark}:s=${WIDTH}x${HEIGHT}:d=${scene.duration}:r=${FPS}`,
    '-vf', filters.join(','),
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-t', String(scene.duration),
    outputPath
  ];

  execSync(cmd.join(' '), { stdio: 'pipe' });
}

/**
 * Create a CTA scene (call to action)
 */
function createCTAScene(scene: Scene, outputPath: string): void {
  const titleEsc = escapeFFmpegText(scene.title);
  const subtitleEsc = scene.subtitle ? escapeFFmpegText(scene.subtitle) : '';
  
  const filters = [
    `drawbox=x=0:y=0:w=iw:h=ih:c=${COLORS.bgDark}:t=fill`,
    // Pulsing accent circle (simulated with growing box)
    `drawbox=x=(iw-400)/2:y=(ih-400)/2-200:w=400:h=400:c=${scene.accent}@0.2:t=fill`,
    // Logo text
    `drawtext=text='TechGig':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-250:fontfile=/Windows/Fonts/arialbd.ttf`,
    `drawtext=text='Radar':fontsize=80:fontcolor=${scene.accent}:x=(w-text_w)/2:y=(h-text_h)/2-150:fontfile=/Windows/Fonts/arialbd.ttf`,
    // CTA text
    `drawtext=text='${titleEsc}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+100:fontfile=/Windows/Fonts/arialbd.ttf:alpha='if(lt(t,0.5),t*2,1)'`,
    `drawtext=text='${subtitleEsc}':fontsize=36:fontcolor=${COLORS.textMuted}:x=(w-text_w)/2:y=(h-text_h)/2+180:fontfile=/Windows/Fonts/arial.ttf`,
    // Social handle
    `drawtext=text='@TechGigRadar':fontsize=44:fontcolor=${scene.accent}:x=(w-text_w)/2:y=(h-text_h)/2+300:fontfile=/Windows/Fonts/arialbd.ttf`,
    // Progress bar
    `drawbox=x=0:y=ih-20:w=iw*t/${scene.duration}:h=20:c=${scene.accent}:t=fill`
  ];

  const cmd = [
    'ffmpeg', '-y',
    '-f', 'lavfi',
    '-i', `color=c=${COLORS.bgDark}:s=${WIDTH}x${HEIGHT}:d=${scene.duration}:r=${FPS}`,
    '-vf', filters.join(','),
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-t', String(scene.duration),
    outputPath
  ];

  execSync(cmd.join(' '), { stdio: 'pipe' });
}

/**
 * Create a scene based on type
 */
function createScene(scene: Scene, outputPath: string): void {
  switch (scene.type) {
    case 'hook':
      createHookScene(scene, outputPath);
      break;
    case 'stat':
      createStatScene(scene, outputPath);
      break;
    case 'list':
      createListScene(scene, outputPath);
      break;
    case 'cta':
      createCTAScene(scene, outputPath);
      break;
    default:
      createHookScene(scene, outputPath);
  }
}

/**
 * Concatenate multiple scene videos
 */
function concatenateScenes(scenePaths: string[], outputPath: string): void {
  const listFile = outputPath.replace('.mp4', '_concat.txt');
  const content = scenePaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  writeFileSync(listFile, content);
  
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`, { stdio: 'pipe' });
  unlinkSync(listFile);
}

/**
 * Add audio to video
 */
function addAudio(videoPath: string, audioPath: string, outputPath: string): void {
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

/**
 * Generate a complete reel
 */
export async function generateReel(config: ReelConfig): Promise<string> {
  const { id, scenes, script, outputDir } = config;
  
  // Create output directory
  const reelDir = join(outputDir, id);
  if (!existsSync(reelDir)) {
    mkdirSync(reelDir, { recursive: true });
  }

  console.log(`[Reel ${id}] Generating ${scenes.length} scenes...`);

  // Generate each scene
  const scenePaths: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scenePath = join(reelDir, `scene_${i.toString().padStart(2, '0')}.mp4`);
    console.log(`  Scene ${i + 1}/${scenes.length}: ${scenes[i].type}`);
    createScene(scenes[i], scenePath);
    scenePaths.push(scenePath);
  }

  // Concatenate scenes
  const silentVideo = join(reelDir, 'video_silent.mp4');
  console.log(`[Reel ${id}] Concatenating scenes...`);
  concatenateScenes(scenePaths, silentVideo);

  // Audio will be generated by Hermes TTS and added separately
  // Return path for audio addition
  return silentVideo;
}

/**
 * Template: Tech News Reel
 */
export function createNewsReelConfig(
  id: string,
  headline: string,
  keyPoints: string[],
  stats: { label: string; value: string }[],
  outputDir: string
): ReelConfig {
  const script = `
    Breaking tech news. ${headline}.
    ${keyPoints.map((p, i) => `Point ${i + 1}. ${p}.`).join(' ')}
    ${stats.length > 0 ? `The numbers. ${stats.map(s => `${s.value} ${s.label}.`).join(' ')}` : ''}
    Follow TechGig Radar for daily tech updates.
  `.trim().replace(/\s+/g, ' ');

  return {
    id,
    title: headline,
    category: 'news',
    outputDir,
    script,
    scenes: [
      {
        type: 'hook',
        title: headline.length > 40 ? headline.substring(0, 37) + '...' : headline,
        subtitle: 'Tap for details',
        duration: 4,
        accent: COLORS.accentCyan
      },
      ...(keyPoints.length > 0 ? [{
        type: 'list' as const,
        title: 'Key Points',
        items: keyPoints.slice(0, 4),
        duration: 6,
        accent: COLORS.accentPurple
      }] : []),
      ...(stats.length > 0 ? [{
        type: 'stat' as const,
        title: 'By the Numbers',
        stats: stats.slice(0, 3),
        duration: 5,
        accent: COLORS.accentGreen
      }] : []),
      {
        type: 'cta',
        title: 'Follow for More',
        subtitle: 'Daily Tech News & Jobs',
        duration: 4,
        accent: COLORS.accentCyan
      }
    ]
  };
}

/**
 * Template: Job Opening Reel
 */
export function createJobReelConfig(
  id: string,
  title: string,
  company: string,
  salary: string,
  skills: string[],
  outputDir: string
): ReelConfig {
  const script = `
    Hot job alert. ${company} is hiring a ${title}.
    Salary range. ${salary}.
    Skills needed. ${skills.slice(0, 3).join(', ')}.
    Apply now. Link in bio. Follow TechGig Radar for more remote jobs.
  `.trim().replace(/\s+/g, ' ');

  return {
    id,
    title: `${company} hiring ${title}`,
    category: 'job',
    outputDir,
    script,
    scenes: [
      {
        type: 'hook',
        title: `${company} is Hiring!`,
        subtitle: title,
        duration: 4,
        accent: COLORS.accentGreen
      },
      {
        type: 'stat',
        title: 'The Offer',
        stats: [
          { label: 'Salary Range', value: salary },
          { label: 'Work Type', value: 'Remote' }
        ],
        duration: 5,
        accent: COLORS.accentCyan
      },
      {
        type: 'list',
        title: 'Required Skills',
        items: skills.slice(0, 4),
        duration: 5,
        accent: COLORS.accentPurple
      },
      {
        type: 'cta',
        title: 'Apply Now!',
        subtitle: 'Link in Bio',
        duration: 4,
        accent: COLORS.accentGreen
      }
    ]
  };
}

// CLI usage
if (require.main === module) {
  const outputDir = process.argv[2] || './output/reels';
  
  // Demo: Generate a sample news reel
  const config = createNewsReelConfig(
    'demo-reel-001',
    'GPT-5 Launches Today',
    [
      'Trained on 100K GPUs',
      'First model rated CRITICAL',
      '36x faster than humans',
      'Plus tier only - no free access'
    ],
    [
      { label: 'Training GPUs', value: '100K+' },
      { label: 'Speed Improvement', value: '36x' }
    ],
    outputDir
  );

  generateReel(config)
    .then(path => console.log(`\nSilent video generated: ${path}`))
    .catch(err => console.error('Error:', err));
}
