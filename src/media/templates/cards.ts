import { colors, typography, brand, dimensions, experienceLevelLabels, jobTypeLabels } from '../brand/identity.js';
import type { News, Job } from '../../db/schema.js';

// ================================
// News Card Template
// ================================
export function generateNewsCardHTML(news: News): string {
  const categoryColor = colors.categories[news.category as keyof typeof colors.categories] || colors.categories.general;
  const emoji = brand.categoryEmojis[news.category] || '📰';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${dimensions.instagram.square.width}px;
      height: ${dimensions.instagram.square.height}px;
      font-family: ${typography.fontFamily.primary};
      background: ${colors.bgDark};
      color: ${colors.textPrimary};
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
    
    .category {
      background: ${categoryColor};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .brand {
      color: ${colors.textSecondary};
      font-size: 20px;
      font-weight: 500;
    }
    
    .emoji {
      font-size: 64px;
      margin-bottom: 24px;
    }
    
    .title {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 32px;
      flex-grow: 1;
      display: flex;
      align-items: center;
    }
    
    .summary {
      font-size: 24px;
      color: ${colors.textSecondary};
      line-height: 1.5;
      margin-bottom: 40px;
    }
    
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 24px;
      border-top: 2px solid ${colors.bgLight};
    }
    
    .source {
      color: ${colors.textMuted};
      font-size: 18px;
    }
    
    .handle {
      color: ${colors.primary};
      font-size: 20px;
      font-weight: 600;
    }
    
    .gradient-accent {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: ${colors.gradients.accent};
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="category">${emoji} ${news.category}</div>
    <div class="brand">🎯 TechGig Radar</div>
  </div>
  
  <div class="title">${escapeHtml(news.title)}</div>
  
  ${news.summary ? `<div class="summary">${escapeHtml(news.summary.slice(0, 200))}...</div>` : ''}
  
  <div class="footer">
    <div class="source">Source: ${escapeHtml(news.sourceName || 'Tech News')}</div>
    <div class="handle">${brand.handle}</div>
  </div>
  
  <div class="gradient-accent"></div>
</body>
</html>`;
}

// ================================
// Job Card Template
// ================================
export function generateJobCardHTML(job: Job): string {
  const levelInfo = experienceLevelLabels[job.experienceLevel || ''] || { label: 'Any Level', emoji: '📊', color: colors.primary };
  const typeInfo = jobTypeLabels[job.jobType || ''] || { label: 'Job', emoji: '💼' };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${dimensions.instagram.square.width}px;
      height: ${dimensions.instagram.square.height}px;
      font-family: ${typography.fontFamily.primary};
      background: ${colors.bgDark};
      color: ${colors.textPrimary};
      padding: 60px;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    
    .badge {
      background: ${job.acceptsWorldwide ? colors.success : colors.primary};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .brand {
      color: ${colors.textSecondary};
      font-size: 20px;
      font-weight: 500;
    }
    
    .company {
      font-size: 28px;
      color: ${colors.primary};
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .title {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 32px;
    }
    
    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .detail-item {
      background: ${colors.bgCard};
      padding: 20px;
      border-radius: 12px;
    }
    
    .detail-label {
      color: ${colors.textMuted};
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .detail-value {
      font-size: 20px;
      font-weight: 600;
    }
    
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 32px;
    }
    
    .skill {
      background: ${colors.bgLight};
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 16px;
      color: ${colors.textSecondary};
    }
    
    .cta {
      background: ${colors.gradients.primary};
      color: white;
      padding: 20px 32px;
      border-radius: 12px;
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      margin-top: auto;
    }
    
    .footer {
      display: flex;
      justify-content: center;
      margin-top: 24px;
    }
    
    .handle {
      color: ${colors.textMuted};
      font-size: 18px;
    }
    
    .gradient-accent {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: ${colors.gradients.accent};
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">${job.acceptsWorldwide ? '🌍 WORLDWIDE' : (job.isRemote ? '🏠 REMOTE' : '🏢 ON-SITE')}</div>
    <div class="brand">🎯 TechGig Radar</div>
  </div>
  
  <div class="company">🏢 ${escapeHtml(job.companyName)}</div>
  <div class="title">${escapeHtml(job.title)}</div>
  
  <div class="details">
    <div class="detail-item">
      <div class="detail-label">Experience</div>
      <div class="detail-value">${levelInfo.emoji} ${levelInfo.label}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Type</div>
      <div class="detail-value">${typeInfo.emoji} ${typeInfo.label}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Location</div>
      <div class="detail-value">📍 ${escapeHtml(job.companyLocation || 'Remote')}</div>
    </div>
    ${job.salaryMin ? `
    <div class="detail-item">
      <div class="detail-label">Salary</div>
      <div class="detail-value">💰 ${formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</div>
    </div>
    ` : ''}
  </div>
  
  ${job.requiredSkills && job.requiredSkills.length > 0 ? `
  <div class="skills">
    ${job.requiredSkills.slice(0, 6).map((skill: string) => `<div class="skill">${escapeHtml(skill)}</div>`).join('')}
  </div>
  ` : ''}
  
  <div class="cta">📲 Apply Now - Link in Bio</div>
  
  <div class="footer">
    <div class="handle">${brand.handle} • Real Global Opportunities</div>
  </div>
  
  <div class="gradient-accent"></div>
</body>
</html>`;
}

// ================================
// Carousel Slide Template
// ================================
export function generateCarouselSlideHTML(
  slideNumber: number,
  totalSlides: number,
  title: string,
  content: string,
  options: {
    category?: string;
    isFirst?: boolean;
    isLast?: boolean;
  } = {}
): string {
  const categoryColor = options.category 
    ? colors.categories[options.category as keyof typeof colors.categories] || colors.categories.general
    : colors.primary;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      width: ${dimensions.instagram.square.width}px;
      height: ${dimensions.instagram.square.height}px;
      font-family: ${typography.fontFamily.primary};
      background: ${colors.bgDark};
      color: ${colors.textPrimary};
      padding: 60px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    
    .slide-number {
      position: absolute;
      top: 30px;
      right: 30px;
      background: ${colors.bgCard};
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 16px;
      color: ${colors.textMuted};
    }
    
    .title {
      font-size: ${options.isFirst ? '56px' : '36px'};
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 40px;
      ${options.isFirst ? `background: ${colors.gradients.accent}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : ''}
    }
    
    .content {
      font-size: 28px;
      line-height: 1.6;
      color: ${colors.textSecondary};
      flex-grow: 1;
    }
    
    .brand-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-top: 24px;
      border-top: 2px solid ${colors.bgLight};
      color: ${colors.textMuted};
      font-size: 18px;
    }
    
    .swipe-hint {
      position: absolute;
      bottom: 40px;
      right: 60px;
      color: ${colors.primary};
      font-size: 18px;
      font-weight: 600;
    }
    
    .accent-bar {
      position: absolute;
      left: 0;
      top: 100px;
      bottom: 100px;
      width: 6px;
      background: ${categoryColor};
      border-radius: 0 3px 3px 0;
    }
  </style>
</head>
<body>
  <div class="slide-number">${slideNumber}/${totalSlides}</div>
  <div class="accent-bar"></div>
  
  <div class="title">${escapeHtml(title)}</div>
  <div class="content">${escapeHtml(content)}</div>
  
  ${options.isLast ? `
  <div class="brand-footer">
    🎯 ${brand.handle} • ${brand.tagline}
  </div>
  ` : `
  <div class="swipe-hint">Swipe →</div>
  `}
</body>
</html>`;
}

// ================================
// Helper Functions
// ================================
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null): string {
  const curr = currency || 'USD';
  if (min && max) {
    return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k ${curr}`;
  } else if (min) {
    return `$${(min / 1000).toFixed(0)}k+ ${curr}`;
  }
  return 'Competitive';
}
