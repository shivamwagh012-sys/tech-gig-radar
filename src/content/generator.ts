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
  
  // Header
  text += `${emoji} <b>${escapeHtml(news.title)}</b>\n\n`;
  
  // Summary
  if (news.summary) {
    text += `${escapeHtml(news.summary.slice(0, 400))}${news.summary.length > 400 ? '...' : ''}\n\n`;
  }
  
  // Why it matters (if we have more content)
  if (news.content && news.content.length > 200) {
    // Extract key points or use AI-generated summary
    text += `<b>💡 Why it matters:</b>\n`;
    text += `This affects developers and tech professionals working with ${news.category} technologies.\n\n`;
  }
  
  // Tags as hashtags
  if (news.tags && news.tags.length > 0) {
    const hashtags = news.tags
      .slice(0, 5)
      .map((t: string) => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`)
      .join(' ');
    text += `${hashtags}\n\n`;
  }
  
  // Source attribution
  text += `📍 <b>Source:</b> ${escapeHtml(news.sourceName || 'Unknown')}\n`;
  
  // Link
  text += `🔗 <a href="${escapeHtml(news.sourceUrl)}">Read more</a>\n\n`;
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `🎯 @TechGigRadar | Real Tech News`;
  
  return {
    text,
    parseMode: 'HTML',
    generatedAt: new Date().toISOString(),
  };
}

// ================================
// Telegram Job Content
// ================================
export interface TelegramJobContent {
  text: string;
  parseMode: 'HTML' | 'Markdown';
  generatedAt: string;
}

export function generateTelegramJobContent(job: Job): TelegramJobContent {
  let text = '';
  
  // Header
  const remoteEmoji = job.isRemote ? '🌍' : '🏢';
  text += `💼 <b>New Opportunity</b> ${remoteEmoji}\n\n`;
  
  // Company and Role
  text += `🏢 <b>Company:</b> ${escapeHtml(job.companyName)}\n`;
  text += `👔 <b>Role:</b> ${escapeHtml(job.title)}\n`;
  
  // Experience Level
  if (job.experienceLevel) {
    const levelLabels: Record<string, string> = {
      fresher: '🌱 Entry Level / Fresher',
      junior: '📗 Junior (0-2 years)',
      mid: '📘 Mid-Level (2-5 years)',
      senior: '📕 Senior (5+ years)',
      lead: '⭐ Lead / Principal',
    };
    text += `📊 <b>Level:</b> ${levelLabels[job.experienceLevel] || job.experienceLevel}\n`;
  }
  
  // Location & Remote
  text += `📍 <b>Location:</b> ${escapeHtml(job.companyLocation || 'Not specified')}\n`;
  text += `🏠 <b>Remote:</b> ${job.isRemote ? 'Yes' : 'No'}`;
  if (job.acceptsWorldwide) {
    text += ` (Worldwide)`;
  } else if (job.locationRestrictions && job.locationRestrictions.length > 0) {
    text += ` (${job.locationRestrictions.join(', ')})`;
  }
  text += '\n';
  
  // Job Type
  if (job.jobType) {
    const typeLabels: Record<string, string> = {
      'full-time': 'Full-Time',
      'part-time': 'Part-Time',
      'contract': 'Contract',
      'freelance': 'Freelance',
      'internship': 'Internship',
    };
    text += `💼 <b>Type:</b> ${typeLabels[job.jobType] || job.jobType}\n`;
  }
  
  // Salary
  if (job.salaryMin || job.salaryMax) {
    const currency = job.salaryCurrency || 'USD';
    if (job.salaryMin && job.salaryMax) {
      text += `💰 <b>Salary:</b> ${formatSalary(job.salaryMin)} - ${formatSalary(job.salaryMax)} ${currency}\n`;
    } else if (job.salaryMin) {
      text += `💰 <b>Salary:</b> From ${formatSalary(job.salaryMin)} ${currency}\n`;
    }
  }
  
  text += '\n';
  
  // Skills
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    text += `🛠 <b>Skills:</b>\n`;
    const skillsList = job.requiredSkills.slice(0, 8).map((s: string) => `• ${escapeHtml(s)}`).join('\n');
    text += skillsList + '\n\n';
  }
  
  // Brief description
  if (job.description) {
    const shortDesc = job.description.slice(0, 300).replace(/<[^>]+>/g, '');
    text += `📝 <b>About:</b>\n${escapeHtml(shortDesc)}${job.description.length > 300 ? '...' : ''}\n\n`;
  }
  
  // Apply Link
  text += `✅ <b>Apply:</b>\n`;
  text += `<a href="${escapeHtml(job.applicationUrl)}">Click here to apply</a>\n\n`;
  
  // Source
  text += `📍 Source: ${escapeHtml(job.sourceName || 'Job Board')}\n\n`;
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `🎯 @TechGigRadar | Real Global Opportunities`;
  
  return {
    text,
    parseMode: 'HTML',
    generatedAt: new Date().toISOString(),
  };
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

// ================================
// Utility Functions
// ================================
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSalary(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount}`;
}
