// Instagram Image Generator for TechGig Radar
// Creates visually appealing cards for news and job posts
import { createLogger } from '../../utils/logger.js';
import type { News, Job } from '../../db/schema.js';
import path from 'path';
import fs from 'fs';

const logger = createLogger('instagram-image-gen');

// ================================
// Types
// ================================
export interface GeneratedImage {
  path: string;           // Local file path
  url?: string;           // Public URL (after upload)
  width: number;
  height: number;
}

// ================================
// Color Schemes
// ================================
const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  ai: { bg: '#1a1a2e', accent: '#00d4ff' },
  security: { bg: '#1a1a2e', accent: '#ff4757' },
  cloud: { bg: '#1a1a2e', accent: '#00d4ff' },
  devops: { bg: '#1a1a2e', accent: '#ffa502' },
  webdev: { bg: '#1a1a2e', accent: '#2ed573' },
  mobile: { bg: '#1a1a2e', accent: '#ff6b81' },
  startup: { bg: '#1a1a2e', accent: '#eccc68' },
  programming: { bg: '#1a1a2e', accent: '#7bed9f' },
  general: { bg: '#1a1a2e', accent: '#00d4ff' },
};

// ================================
// HTML Templates
// ================================

function generateNewsCardHtml(news: News): string {
  const colors = CATEGORY_COLORS[news.category] || CATEGORY_COLORS.general;
  const categoryEmoji = {
    ai: '🤖', security: '🔐', cloud: '☁️', devops: '⚙️',
    webdev: '🌐', mobile: '📱', startup: '🚀', programming: '💻', general: '📰'
  }[news.category] || '📰';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1080px;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, ${colors.bg} 0%, #0f0f1a 100%);
      color: white;
      padding: 60px;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: ${colors.accent};
    }
    .category {
      background: ${colors.accent}20;
      color: ${colors.accent};
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 24px;
      font-weight: 600;
    }
    .emoji {
      font-size: 80px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 52px;
      font-weight: bold;
      line-height: 1.2;
      margin-bottom: 30px;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .summary {
      font-size: 28px;
      color: #b0b0b0;
      line-height: 1.5;
      flex-grow: 1;
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #333;
    }
    .source {
      font-size: 24px;
      color: #888;
    }
    .cta {
      background: linear-gradient(90deg, ${colors.accent}, ${colors.accent}aa);
      color: white;
      padding: 16px 32px;
      border-radius: 30px;
      font-size: 24px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="logo">⚡ TechGig Radar</span>
    <span class="category">${categoryEmoji} ${news.category.toUpperCase()}</span>
  </div>
  <div class="emoji">${categoryEmoji}</div>
  <h1 class="title">${escapeHtml(news.title)}</h1>
  <p class="summary">${escapeHtml(news.summary || '')}</p>
  <div class="footer">
    <span class="source">📍 ${escapeHtml(news.sourceName || 'Tech News')}</span>
    <span class="cta">Swipe for more →</span>
  </div>
</body>
</html>`;
}

function generateJobCardHtml(job: Job): string {
  const isRemote = job.isRemote;
  const isFresher = job.experienceLevel === 'fresher' || job.experienceLevel === 'junior';
  const accentColor = isFresher ? '#2ed573' : '#00d4ff';
  
  const levelBadge = {
    fresher: '🌱 FRESHER WELCOME',
    junior: '📗 JUNIOR',
    mid: '📘 MID-LEVEL',
    senior: '📕 SENIOR',
    lead: '⭐ LEAD',
  }[job.experienceLevel || ''] || '';
  
  const skills = (job.requiredSkills as string[] || []).slice(0, 6);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1080px;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
      color: white;
      padding: 60px;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: ${accentColor};
    }
    .badge {
      background: ${accentColor}20;
      color: ${accentColor};
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 20px;
      font-weight: 600;
    }
    .hiring-banner {
      background: linear-gradient(90deg, ${accentColor}, ${accentColor}88);
      color: white;
      padding: 20px;
      border-radius: 15px;
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 30px;
    }
    .company {
      font-size: 36px;
      color: #888;
      margin-bottom: 10px;
    }
    .title {
      font-size: 48px;
      font-weight: bold;
      line-height: 1.2;
      margin-bottom: 25px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .details {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 25px;
    }
    .detail {
      background: #ffffff10;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 22px;
    }
    .skills-title {
      font-size: 24px;
      color: ${accentColor};
      margin-bottom: 15px;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 30px;
    }
    .skill {
      background: #ffffff15;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 20px;
    }
    .footer {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 25px;
      border-top: 2px solid #333;
    }
    .remote-badge {
      background: ${isRemote ? '#2ed573' : '#ff6b81'}20;
      color: ${isRemote ? '#2ed573' : '#ff6b81'};
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 22px;
      font-weight: 600;
    }
    .cta {
      background: linear-gradient(90deg, ${accentColor}, ${accentColor}aa);
      color: white;
      padding: 16px 32px;
      border-radius: 30px;
      font-size: 24px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="logo">⚡ TechGig Radar</span>
    ${levelBadge ? `<span class="badge">${levelBadge}</span>` : ''}
  </div>
  <div class="hiring-banner">💼 WE'RE HIRING!</div>
  <p class="company">🏢 ${escapeHtml(job.companyName)}</p>
  <h1 class="title">${escapeHtml(job.title)}</h1>
  <div class="details">
    ${job.companyLocation ? `<span class="detail">📍 ${escapeHtml(job.companyLocation)}</span>` : ''}
    ${job.jobType ? `<span class="detail">💼 ${job.jobType}</span>` : ''}
    ${job.salaryMin ? `<span class="detail">💰 $${Math.round(job.salaryMin/1000)}k+</span>` : ''}
  </div>
  ${skills.length > 0 ? `
    <p class="skills-title">🛠 Required Skills</p>
    <div class="skills">
      ${skills.map(s => `<span class="skill">${escapeHtml(s)}</span>`).join('')}
    </div>
  ` : ''}
  <div class="footer">
    <span class="remote-badge">${isRemote ? '🌍 Remote Available' : '🏢 On-site'}</span>
    <span class="cta">Apply Now →</span>
  </div>
</body>
</html>`;
}

// ================================
// Image Generation
// ================================

/**
 * Generate image from HTML using node-html-to-image
 * Images are saved locally, then need to be uploaded to a public URL
 */
export async function generateNewsImage(news: News): Promise<GeneratedImage | null> {
  try {
    const nodeHtmlToImage = (await import('node-html-to-image')).default;
    
    const html = generateNewsCardHtml(news);
    const outputDir = path.join(process.cwd(), 'data', 'images', 'news');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `news_${news.id}_${Date.now()}.png`;
    const outputPath = path.join(outputDir, filename);
    
    await nodeHtmlToImage({
      output: outputPath,
      html,
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
    
    logger.info({ path: outputPath }, 'News image generated');
    
    return {
      path: outputPath,
      width: 1080,
      height: 1080,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to generate news image');
    return null;
  }
}

export async function generateJobImage(job: Job): Promise<GeneratedImage | null> {
  try {
    const nodeHtmlToImage = (await import('node-html-to-image')).default;
    
    const html = generateJobCardHtml(job);
    const outputDir = path.join(process.cwd(), 'data', 'images', 'jobs');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `job_${job.id}_${Date.now()}.png`;
    const outputPath = path.join(outputDir, filename);
    
    await nodeHtmlToImage({
      output: outputPath,
      html,
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
    
    logger.info({ path: outputPath }, 'Job image generated');
    
    return {
      path: outputPath,
      width: 1080,
      height: 1080,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to generate job image');
    return null;
  }
}

// ================================
// Helpers
// ================================
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
