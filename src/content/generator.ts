import type { News, Job } from '../db/schema.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('content-generator');

// ================================
// Telegram News Content
// ================================
export interface TelegramNewsContent {
  text: string;
  parseMode: 'HTML' | 'Markdown';
  generatedAt: string;
}

const categoryEmojis: Record<string, string> = {
  ai: '🤖',
  security: '🔐',
  cloud: '☁️',
  devops: '⚙️',
  webdev: '🌐',
  mobile: '📱',
  startup: '🚀',
  programming: '💻',
  general: '📰',
};

export function generateTelegramNewsContent(news: News): TelegramNewsContent {
  const emoji = categoryEmojis[news.category] || '📰';
  const categoryLabel = news.category.toUpperCase();
  
  // Build the message
  let text = '';
  
  // Header with category badge
  text += `${emoji} <b>${escapeHtml(news.title)}</b>\n\n`;
  
  // Category tag
  text += `🏷 <b>Category:</b> #${categoryLabel}\n\n`;
  
  // Full Summary (not truncated)
  if (news.summary) {
    text += `📋 <b>Summary:</b>\n${escapeHtml(news.summary)}\n\n`;
  }
  
  // Key details from content
  if (news.content && news.content.length > 100) {
    const keyPoints = news.content.slice(0, 800).replace(/<[^>]+>/g, '');
    text += `📝 <b>Details:</b>\n${escapeHtml(keyPoints)}${news.content.length > 800 ? '...' : ''}\n\n`;
  }
  
  // Why it matters
  text += `💡 <b>Why it matters:</b>\n`;
  text += `This is relevant for developers and tech professionals working with ${news.category} technologies.\n\n`;
  
  // Tags as hashtags
  if (news.tags && news.tags.length > 0) {
    const hashtags = news.tags
      .slice(0, 8)
      .map((t: string) => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`)
      .join(' ');
    text += `🔖 ${hashtags}\n\n`;
  }
  
  // Source attribution with date
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Source:</b> ${escapeHtml(news.sourceName || 'Tech News')}\n`;
  if (news.originalPublishedAt) {
    text += `📅 <b>Published:</b> ${formatDate(news.originalPublishedAt)}\n`;
  }
  
  // Read more link (important!)
  text += `\n🔗 <b>Read Full Article:</b>\n`;
  text += `<a href="${escapeHtml(news.sourceUrl)}">${escapeHtml(news.sourceUrl.slice(0, 50))}...</a>\n\n`;
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ @TechGigRadar\n`;
  text += `Real Tech News. Real Global Opportunities.`;
  
  return {
    text,
    parseMode: 'HTML',
    generatedAt: new Date().toISOString(),
  };
}

// ================================
// Telegram Job Content - ENHANCED
// ================================
export interface TelegramJobContent {
  text: string;
  parseMode: 'HTML' | 'Markdown';
  generatedAt: string;
}

export function generateTelegramJobContent(job: Job): TelegramJobContent {
  let text = '';
  
  // Header with attention-grabbing emoji
  const remoteEmoji = job.isRemote ? '🌍' : '🏢';
  const levelEmoji = job.experienceLevel === 'fresher' || job.experienceLevel === 'junior' ? '🌱' : '💼';
  
  text += `${levelEmoji} <b>JOB OPENING</b> ${remoteEmoji}\n`;
  text += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Company and Role (prominent)
  text += `🏢 <b>Company:</b> ${escapeHtml(job.companyName)}\n`;
  if (job.companyUrl) {
    text += `   🔗 ${escapeHtml(job.companyUrl)}\n`;
  }
  text += `\n👔 <b>Position:</b> ${escapeHtml(job.title)}\n\n`;
  
  // Experience Level (highlighted for freshers)
  if (job.experienceLevel) {
    const levelLabels: Record<string, string> = {
      fresher: '🌱 FRESHER FRIENDLY / Entry Level',
      junior: '📗 Junior (0-2 years experience)',
      mid: '📘 Mid-Level (2-5 years experience)',
      senior: '📕 Senior (5+ years experience)',
      lead: '⭐ Lead / Principal',
      any: '✅ All Experience Levels Welcome',
    };
    text += `📊 <b>Experience:</b> ${levelLabels[job.experienceLevel] || job.experienceLevel}\n`;
  }
  
  // Location & Remote status
  text += `📍 <b>Location:</b> ${escapeHtml(job.companyLocation || 'Remote / Flexible')}\n`;
  text += `🏠 <b>Work Mode:</b> ${job.isRemote ? '✅ Remote Work Available' : '🏢 On-site'}`;
  if (job.acceptsWorldwide) {
    text += ` (🌐 Worldwide - India Eligible!)`;
  }
  text += '\n';
  
  // Job Type (Contract/Freelance highlighted)
  if (job.jobType) {
    const typeLabels: Record<string, string> = {
      'full-time': '⏰ Full-Time',
      'part-time': '⏰ Part-Time',
      'contract': '📄 CONTRACT (Freelance/C2C Welcome)',
      'freelance': '🆓 FREELANCE',
      'internship': '🎓 Internship',
    };
    text += `💼 <b>Type:</b> ${typeLabels[job.jobType] || job.jobType}\n`;
  }
  
  // Salary (if available)
  if (job.salaryMin || job.salaryMax) {
    const currency = job.salaryCurrency || 'USD';
    text += `💰 <b>Compensation:</b> `;
    if (job.salaryMin && job.salaryMax) {
      text += `${formatSalary(job.salaryMin)} - ${formatSalary(job.salaryMax)} ${currency}`;
    } else if (job.salaryMin) {
      text += `From ${formatSalary(job.salaryMin)} ${currency}`;
    } else if (job.salaryMax) {
      text += `Up to ${formatSalary(job.salaryMax)} ${currency}`;
    }
    text += '\n';
  }
  
  text += '\n';
  
  // Required Skills (detailed)
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    text += `🛠 <b>Required Skills:</b>\n`;
    const skillsList = job.requiredSkills.slice(0, 10).map((s: string) => `   • ${escapeHtml(s)}`).join('\n');
    text += skillsList + '\n\n';
  }
  
  // Job Description (more detailed)
  if (job.description) {
    const cleanDesc = job.description.replace(/<[^>]+>/g, '').trim();
    const shortDesc = cleanDesc.slice(0, 500);
    text += `📝 <b>Job Description:</b>\n${escapeHtml(shortDesc)}${cleanDesc.length > 500 ? '...' : ''}\n\n`;
  }
  
  // ===== CONTACT / HOW TO APPLY =====
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `📬 <b>HOW TO APPLY:</b>\n\n`;
  
  // Application URL (primary)
  if (job.applicationUrl) {
    text += `🔗 <b>Apply Here:</b>\n`;
    text += `<a href="${escapeHtml(job.applicationUrl)}">${escapeHtml(job.applicationUrl.slice(0, 60))}${job.applicationUrl.length > 60 ? '...' : ''}</a>\n\n`;
  }
  
  // Email (if we can extract it)
  const emailMatch = (job.description || '').match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    text += `📧 <b>Send Resume To:</b>\n`;
    text += `${escapeHtml(emailMatch[0])}\n\n`;
  }
  
  // Source link
  if (job.sourceUrl && job.sourceUrl !== job.applicationUrl) {
    text += `📍 <b>Original Posting:</b>\n`;
    text += `<a href="${escapeHtml(job.sourceUrl)}">${escapeHtml(job.sourceName || 'View on Job Board')}</a>\n\n`;
  }
  
  // Tips for Indian contractors
  if (job.acceptsWorldwide || job.jobType === 'contract' || job.jobType === 'freelance') {
    text += `💡 <b>Tip for Indian Developers:</b>\n`;
    text += `This position accepts international contractors. Mention your timezone flexibility and willingness to overlap with their hours.\n\n`;
  }
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ @TechGigRadar\n`;
  text += `Real Tech News. Real Global Opportunities.\n`;
  text += `🇮🇳 Remote Jobs for Indian Developers`;
  
  return {
    text,
    parseMode: 'HTML',
    generatedAt: new Date().toISOString(),
  };
}

// ================================
// Helper Functions
// ================================
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSalary(amount: number | null): string {
  if (!amount) return '';
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount}`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

// ================================
// Instagram Caption Generation
// ================================
export interface InstagramCaption {
  caption: string;
  hashtags: string;
  generatedAt: string;
}

export function generateInstagramNewsCaption(news: News): InstagramCaption {
  const emoji = categoryEmojis[news.category] || '📰';
  
  let caption = '';
  
  // Hook line
  caption += `${emoji} ${news.title}\n\n`;
  
  // Summary
  if (news.summary) {
    caption += `${news.summary.slice(0, 200)}${news.summary.length > 200 ? '...' : ''}\n\n`;
  }
  
  // Call to action
  caption += `💬 What do you think about this?\n\n`;
  caption += `📍 Source: ${news.sourceName}\n`;
  caption += `🔗 Link in bio for more tech news!\n\n`;
  
  // Hashtags (separate for easy editing)
  const baseHashtags = ['#TechNews', '#Developer', '#Coding', '#Programming', '#Tech'];
  const categoryHashtags: Record<string, string[]> = {
    ai: ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#ChatGPT'],
    security: ['#CyberSecurity', '#InfoSec', '#Security', '#Hacking'],
    cloud: ['#Cloud', '#AWS', '#Azure', '#CloudComputing'],
    devops: ['#DevOps', '#CICD', '#Kubernetes', '#Docker'],
    webdev: ['#WebDev', '#JavaScript', '#React', '#Frontend'],
    mobile: ['#MobileDev', '#iOS', '#Android', '#Flutter'],
    startup: ['#Startup', '#Entrepreneurship', '#TechStartup', '#Funding'],
    programming: ['#Programming', '#SoftwareEngineer', '#Code', '#DevLife'],
  };
  
  const hashtags = [
    ...baseHashtags,
    ...(categoryHashtags[news.category] || []),
  ].slice(0, 15).join(' ');
  
  return {
    caption,
    hashtags,
    generatedAt: new Date().toISOString(),
  };
}

export function generateInstagramJobCaption(job: Job): InstagramCaption {
  let caption = '';
  
  // Hook
  caption += `💼 ${job.acceptsWorldwide ? 'WORLDWIDE' : 'REMOTE'} OPPORTUNITY!\n\n`;
  
  // Job details
  caption += `🏢 ${job.companyName}\n`;
  caption += `👔 ${job.title}\n`;
  
  if (job.experienceLevel) {
    const levelMap: Record<string, string> = {
      fresher: '🌱 Entry Level',
      junior: '📗 Junior',
      mid: '📘 Mid-Level',
      senior: '📕 Senior',
    };
    caption += `📊 ${levelMap[job.experienceLevel] || job.experienceLevel}\n`;
  }
  
  caption += `🌍 ${job.isRemote ? 'Remote' : job.companyLocation || 'On-site'}`;
  if (job.acceptsWorldwide) {
    caption += ' (Worldwide)';
  }
  caption += '\n';
  
  if (job.salaryMin) {
    caption += `💰 ${formatSalary(job.salaryMin)}${job.salaryMax ? ' - ' + formatSalary(job.salaryMax) : '+'} ${job.salaryCurrency || 'USD'}\n`;
  }
  
  caption += '\n';
  
  // Skills preview
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    caption += `🛠 ${job.requiredSkills.slice(0, 5).join(' • ')}\n\n`;
  }
  
  // CTA
  caption += `📲 Link in bio to apply!\n\n`;
  caption += `💾 Save this post for later!\n`;
  caption += `📤 Share with a friend who needs this!\n\n`;
  
  // Hashtags
  const hashtags = [
    '#RemoteJobs', '#TechJobs', '#Hiring', '#JobOpportunity',
    '#WorkFromHome', '#RemoteWork', '#Developer', '#SoftwareEngineer',
    '#TechCareers', '#JobSearch', '#NowHiring', '#Freelance',
    '#TechGigRadar',
  ].join(' ');
  
  return {
    caption,
    hashtags,
    generatedAt: new Date().toISOString(),
  };
}
