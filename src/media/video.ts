import { spawn } from 'child_process';
import { join } from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { createLogger } from '../utils/logger.js';
import { colors, brand, dimensions } from './brand/identity.js';
import type { News, Job } from '../db/schema.js';

const logger = createLogger('video-generator');

// Output directory for generated videos
const OUTPUT_DIR = join(process.cwd(), 'generated', 'videos');
const TEMP_DIR = join(process.cwd(), 'generated', 'temp');

// Ensure directories exist
async function ensureDirs() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(TEMP_DIR, { recursive: true });
}

// ================================
// Types
// ================================
export interface VideoGenerationResult {
  success: boolean;
  videoPath?: string;
  duration?: number;
  error?: string;
}

export interface ReelSlide {
  text: string;
  duration: number; // seconds
  style?: 'headline' | 'content' | 'cta';
}

// ================================
// Generate ASS Subtitle File
// ================================
function generateASSSubtitle(slides: ReelSlide[]): string {
  let currentTime = 0;
  let events = '';
  
  for (const slide of slides) {
    const startTime = formatASSTime(currentTime);
    const endTime = formatASSTime(currentTime + slide.duration);
    
    // Style based on slide type
    const style = slide.style === 'headline' ? 'Headline' : 
                  slide.style === 'cta' ? 'CTA' : 'Default';
    
    // Escape special characters
    const text = slide.text
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\n/g, '\\N');
    
    events += `Dialogue: 0,${startTime},${endTime},${style},,0,0,0,,${text}\n`;
    currentTime += slide.duration;
  }
  
  return `[Script Info]
Title: TechGig Radar Reel
ScriptType: v4.00+
PlayResX: ${dimensions.instagram.reel.width}
PlayResY: ${dimensions.instagram.reel.height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,5,50,50,100,1
Style: Headline,Inter,96,&H00FFFFFF,&H000000FF,&H006366F1,&H80000000,-1,0,0,0,100,100,0,0,1,4,3,5,50,50,100,1
Style: CTA,Inter,64,&H00FFFFFF,&H000000FF,&H00EC4899,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,5,50,50,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}`;
}

function formatASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// ================================
// Generate Background Video
// ================================
async function generateBackgroundVideo(
  duration: number,
  outputPath: string,
  category?: string
): Promise<boolean> {
  const categoryColor = category && colors.categories[category as keyof typeof colors.categories]
    ? colors.categories[category as keyof typeof colors.categories]
    : colors.primary;
  
  // Convert hex to FFmpeg format
  const bgColor = colors.bgDark.replace('#', '');
  const accentColor = categoryColor.replace('#', '');
  
  return new Promise((resolve) => {
    // Create animated gradient background
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=0x${bgColor}:s=${dimensions.instagram.reel.width}x${dimensions.instagram.reel.height}:d=${duration}`,
      '-vf', `
        drawbox=x=0:y=0:w=${dimensions.instagram.reel.width}:h=6:color=0x${accentColor}:t=fill,
        drawbox=x=0:y=${dimensions.instagram.reel.height - 6}:w=${dimensions.instagram.reel.width}:h=6:color=0x${accentColor}:t=fill,
        fade=t=in:st=0:d=0.5,
        fade=t=out:st=${duration - 0.5}:d=0.5
      `.replace(/\s+/g, ''),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-t', String(duration),
      outputPath,
    ]);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        logger.error({ code }, 'FFmpeg background generation failed');
        resolve(false);
      }
    });
    
    ffmpeg.on('error', (err) => {
      logger.error({ error: err.message }, 'FFmpeg spawn error');
      resolve(false);
    });
  });
}

// ================================
// Add Subtitles to Video
// ================================
async function addSubtitlesToVideo(
  inputVideo: string,
  subtitleFile: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', inputVideo,
      '-vf', `ass=${subtitleFile}`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'copy',
      outputPath,
    ]);
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

// ================================
// Generate News Reel
// ================================
export async function generateNewsReel(news: News): Promise<VideoGenerationResult> {
  await ensureDirs();
  
  const slides: ReelSlide[] = [
    // Hook (0-3s)
    {
      text: `🔥 ${news.category.toUpperCase()} NEWS`,
      duration: 2,
      style: 'headline',
    },
    // Title (3-8s)
    {
      text: news.title.length > 80 ? news.title.slice(0, 77) + '...' : news.title,
      duration: 5,
      style: 'headline',
    },
  ];
  
  // Summary (8-18s)
  if (news.summary) {
    const chunks = splitTextIntoChunks(news.summary, 100);
    for (const chunk of chunks.slice(0, 2)) {
      slides.push({
        text: chunk,
        duration: 5,
        style: 'content',
      });
    }
  }
  
  // CTA (last 4s)
  slides.push({
    text: `Follow ${brand.handle}\\nFor More Tech News`,
    duration: 4,
    style: 'cta',
  });
  
  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0);
  
  try {
    const bgVideoPath = join(TEMP_DIR, `bg-${news.id}.mp4`);
    const subtitlePath = join(TEMP_DIR, `sub-${news.id}.ass`);
    const outputPath = join(OUTPUT_DIR, `reel-news-${news.id}.mp4`);
    
    // Generate background
    const bgSuccess = await generateBackgroundVideo(totalDuration, bgVideoPath, news.category);
    if (!bgSuccess) {
      return { success: false, error: 'Failed to generate background video' };
    }
    
    // Generate subtitles
    const assContent = generateASSSubtitle(slides);
    await writeFile(subtitlePath, assContent);
    
    // Combine
    const success = await addSubtitlesToVideo(bgVideoPath, subtitlePath, outputPath);
    
    // Cleanup temp files
    await unlink(bgVideoPath).catch(() => {});
    await unlink(subtitlePath).catch(() => {});
    
    if (success) {
      logger.info({ newsId: news.id, path: outputPath, duration: totalDuration }, 'News reel generated');
      return { success: true, videoPath: outputPath, duration: totalDuration };
    } else {
      return { success: false, error: 'Failed to add subtitles' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ newsId: news.id, error: message }, 'Failed to generate news reel');
    return { success: false, error: message };
  }
}

// ================================
// Generate Job Reel
// ================================
export async function generateJobReel(job: Job): Promise<VideoGenerationResult> {
  await ensureDirs();
  
  const slides: ReelSlide[] = [
    // Hook
    {
      text: job.acceptsWorldwide ? '🌍 WORLDWIDE OPPORTUNITY' : '💼 REMOTE JOB ALERT',
      duration: 2,
      style: 'headline',
    },
    // Company & Role
    {
      text: `${job.companyName}\\n${job.title}`,
      duration: 4,
      style: 'headline',
    },
    // Details
    {
      text: [
        job.experienceLevel ? `📊 ${job.experienceLevel.toUpperCase()}` : '',
        job.isRemote ? '🏠 Remote' : '',
        job.acceptsWorldwide ? '🌍 Worldwide' : '',
      ].filter(Boolean).join(' • '),
      duration: 4,
      style: 'content',
    },
  ];
  
  // Skills
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    slides.push({
      text: `🛠 ${job.requiredSkills.slice(0, 5).join(' • ')}`,
      duration: 4,
      style: 'content',
    });
  }
  
  // Salary if available
  if (job.salaryMin) {
    const salaryText = job.salaryMax 
      ? `💰 $${(job.salaryMin/1000).toFixed(0)}k - $${(job.salaryMax/1000).toFixed(0)}k`
      : `💰 $${(job.salaryMin/1000).toFixed(0)}k+`;
    slides.push({
      text: salaryText,
      duration: 3,
      style: 'content',
    });
  }
  
  // CTA
  slides.push({
    text: `Apply Now!\\nLink in Bio\\n${brand.handle}`,
    duration: 4,
    style: 'cta',
  });
  
  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0);
  
  try {
    const bgVideoPath = join(TEMP_DIR, `bg-job-${job.id}.mp4`);
    const subtitlePath = join(TEMP_DIR, `sub-job-${job.id}.ass`);
    const outputPath = join(OUTPUT_DIR, `reel-job-${job.id}.mp4`);
    
    const bgSuccess = await generateBackgroundVideo(totalDuration, bgVideoPath);
    if (!bgSuccess) {
      return { success: false, error: 'Failed to generate background video' };
    }
    
    const assContent = generateASSSubtitle(slides);
    await writeFile(subtitlePath, assContent);
    
    const success = await addSubtitlesToVideo(bgVideoPath, subtitlePath, outputPath);
    
    await unlink(bgVideoPath).catch(() => {});
    await unlink(subtitlePath).catch(() => {});
    
    if (success) {
      logger.info({ jobId: job.id, path: outputPath, duration: totalDuration }, 'Job reel generated');
      return { success: true, videoPath: outputPath, duration: totalDuration };
    } else {
      return { success: false, error: 'Failed to add subtitles' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ jobId: job.id, error: message }, 'Failed to generate job reel');
    return { success: false, error: message };
  }
}

// ================================
// Utility Functions
// ================================
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let current = '';
  
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxLength) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  
  if (current) chunks.push(current);
  return chunks;
}

// ================================
// Check FFmpeg Available
// ================================
export async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}
