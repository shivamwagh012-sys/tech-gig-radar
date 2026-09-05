/**
 * Multi-Platform Job Scraper
 * Scrapes jobs from LinkedIn, Indeed, Naukri, Glassdoor, and other platforms
 * Targets: Tech roles, HR/Recruitment, Freshers to Senior level
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('multi-platform-scraper');

// ================================
// Job Categories
// ================================
export const JOB_CATEGORIES = {
  tech: [
    'software developer', 'software engineer', 'frontend developer', 'backend developer',
    'fullstack developer', 'full stack developer', 'web developer', 'mobile developer',
    'react developer', 'node developer', 'python developer', 'java developer',
    'devops engineer', 'cloud engineer', 'data engineer', 'data scientist',
    'machine learning engineer', 'ai engineer', 'qa engineer', 'sdet',
    'ios developer', 'android developer', 'flutter developer', 'react native developer',
    'blockchain developer', 'security engineer', 'platform engineer'
  ],
  hr_recruitment: [
    'hr recruiter', 'technical recruiter', 'talent acquisition', 'hr manager',
    'human resources', 'hr business partner', 'recruitment specialist',
    'hr coordinator', 'hr executive', 'hr analyst', 'people operations',
    'talent sourcer', 'recruitment consultant', 'hr generalist'
  ],
  fresher: [
    'fresher', 'entry level', 'junior developer', 'trainee', 'graduate engineer',
    'associate software engineer', 'intern', 'junior engineer', '0-2 years',
    'new grad', 'campus hire', 'freshers'
  ],
  experienced: [
    'senior developer', 'senior engineer', 'tech lead', 'engineering manager',
    'principal engineer', 'staff engineer', 'architect', '5+ years', '10+ years',
    'senior software engineer', 'lead developer'
  ]
};

// ================================
// Platform Configurations
// ================================
interface PlatformConfig {
  name: string;
  baseUrl: string;
  searchUrl: (query: string, location: string, page: number) => string;
  rssUrl?: string;
  apiUrl?: string;
  selectors?: {
    jobCard: string;
    title: string;
    company: string;
    location: string;
    salary?: string;
    link: string;
    description?: string;
  };
  headers?: Record<string, string>;
  rateLimit: number; // ms between requests
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  linkedin: {
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    searchUrl: (query, location, page) => 
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&start=${page * 25}&f_TPR=r86400&f_WT=2`, // Remote, last 24h
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml'
    },
    rateLimit: 2000
  },
  indeed: {
    name: 'Indeed',
    baseUrl: 'https://www.indeed.com',
    searchUrl: (query, location, page) =>
      `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11&start=${page * 10}&fromage=1`, // Remote, last day
    rssUrl: 'https://www.indeed.com/rss',
    rateLimit: 1500
  },
  naukri: {
    name: 'Naukri',
    baseUrl: 'https://www.naukri.com',
    searchUrl: (query, location, page) =>
      `https://www.naukri.com/${query.replace(/\s+/g, '-')}-jobs-in-${location.replace(/\s+/g, '-')}?wfhType=2&experience=0`, // Remote
    rateLimit: 2000
  },
  glassdoor: {
    name: 'Glassdoor',
    baseUrl: 'https://www.glassdoor.com',
    searchUrl: (query, location, page) =>
      `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=N&locId=115&remoteWorkType=1`, // Remote
    rateLimit: 2500
  },
  wellfound: {
    name: 'Wellfound (AngelList)',
    baseUrl: 'https://wellfound.com',
    searchUrl: (query, location, page) =>
      `https://wellfound.com/role/${query.replace(/\s+/g, '-')}?remote=true`,
    rateLimit: 2000
  },
  weworkremotely: {
    name: 'We Work Remotely',
    baseUrl: 'https://weworkremotely.com',
    searchUrl: (query, location, page) =>
      `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(query)}`,
    rssUrl: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    rateLimit: 1000
  },
  remoteok: {
    name: 'RemoteOK',
    baseUrl: 'https://remoteok.com',
    apiUrl: 'https://remoteok.com/api',
    searchUrl: (query, location, page) =>
      `https://remoteok.com/remote-${query.replace(/\s+/g, '-')}-jobs`,
    rateLimit: 1500
  },
  flexjobs: {
    name: 'FlexJobs',
    baseUrl: 'https://www.flexjobs.com',
    searchUrl: (query, location, page) =>
      `https://www.flexjobs.com/search?search=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
    rateLimit: 2000
  },
  toptal: {
    name: 'Toptal',
    baseUrl: 'https://www.toptal.com',
    searchUrl: (query, location, page) =>
      `https://www.toptal.com/careers`,
    rateLimit: 3000
  },
  turing: {
    name: 'Turing',
    baseUrl: 'https://www.turing.com',
    searchUrl: (query, location, page) =>
      `https://www.turing.com/remote-developer-jobs`,
    rateLimit: 2000
  },
  arc: {
    name: 'Arc.dev',
    baseUrl: 'https://arc.dev',
    searchUrl: (query, location, page) =>
      `https://arc.dev/remote-jobs/${query.replace(/\s+/g, '-')}`,
    rateLimit: 1500
  },
  himalayas: {
    name: 'Himalayas',
    baseUrl: 'https://himalayas.app',
    searchUrl: (query, location, page) =>
      `https://himalayas.app/jobs?q=${encodeURIComponent(query)}`,
    apiUrl: 'https://himalayas.app/jobs/api',
    rateLimit: 1500
  },
  jobspresso: {
    name: 'Jobspresso',
    baseUrl: 'https://jobspresso.co',
    searchUrl: (query, location, page) =>
      `https://jobspresso.co/remote-jobs/?search=${encodeURIComponent(query)}`,
    rateLimit: 1500
  },
  remotive: {
    name: 'Remotive',
    baseUrl: 'https://remotive.com',
    apiUrl: 'https://remotive.com/api/remote-jobs',
    searchUrl: (query, location, page) =>
      `https://remotive.com/remote-jobs/software-dev`,
    rateLimit: 1500
  }
};

// ================================
// Search Queries Generator
// ================================
export interface SearchQuery {
  query: string;
  category: string;
  level: string;
  location: string;
}

export function generateSearchQueries(): SearchQuery[] {
  const queries: SearchQuery[] = [];
  const locations = ['remote', 'worldwide', 'india', 'work from home'];
  
  // Tech jobs - all levels
  for (const techRole of JOB_CATEGORIES.tech) {
    // Fresher/Entry level
    queries.push({ query: `${techRole} fresher`, category: 'tech', level: 'fresher', location: 'remote' });
    queries.push({ query: `junior ${techRole}`, category: 'tech', level: 'junior', location: 'remote' });
    queries.push({ query: `entry level ${techRole}`, category: 'tech', level: 'fresher', location: 'remote' });
    
    // Mid level
    queries.push({ query: techRole, category: 'tech', level: 'mid', location: 'remote' });
    
    // Senior level
    queries.push({ query: `senior ${techRole}`, category: 'tech', level: 'senior', location: 'remote' });
    queries.push({ query: `lead ${techRole}`, category: 'tech', level: 'senior', location: 'remote' });
  }
  
  // HR/Recruitment jobs
  for (const hrRole of JOB_CATEGORIES.hr_recruitment) {
    queries.push({ query: `${hrRole} remote`, category: 'hr', level: 'any', location: 'remote' });
    queries.push({ query: `${hrRole} work from home`, category: 'hr', level: 'any', location: 'remote' });
  }
  
  // Generic fresher searches
  for (const fresherKeyword of JOB_CATEGORIES.fresher) {
    queries.push({ query: `${fresherKeyword} developer remote`, category: 'tech', level: 'fresher', location: 'remote' });
    queries.push({ query: `${fresherKeyword} engineer remote`, category: 'tech', level: 'fresher', location: 'remote' });
  }
  
  return queries;
}

// ================================
// Job Data Structure
// ================================
export interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  requirements?: string[];
  skills: string[];
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior' | 'any';
  jobType: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  category: 'tech' | 'hr' | 'other';
  isRemote: boolean;
  applyUrl: string;
  applyEmail?: string;
  sourceUrl: string;
  sourcePlatform: string;
  postedDate?: Date;
  scrapedAt: Date;
  fingerprint: string;
}

// ================================
// RSS Feed URLs for Job Boards
// ================================
export const RSS_FEEDS = [
  // We Work Remotely
  { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', platform: 'weworkremotely', category: 'tech' },
  { url: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss', platform: 'weworkremotely', category: 'tech' },
  { url: 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss', platform: 'weworkremotely', category: 'tech' },
  { url: 'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss', platform: 'weworkremotely', category: 'tech' },
  { url: 'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss', platform: 'weworkremotely', category: 'tech' },
  
  // Jobspresso
  { url: 'https://jobspresso.co/remote-jobs/feed/', platform: 'jobspresso', category: 'tech' },
  
  // Indeed RSS (various searches)
  { url: 'https://www.indeed.com/rss?q=remote+software+developer&l=&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11', platform: 'indeed', category: 'tech' },
  { url: 'https://www.indeed.com/rss?q=remote+data+engineer&l=&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11', platform: 'indeed', category: 'tech' },
  { url: 'https://www.indeed.com/rss?q=remote+hr+recruiter&l=&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11', platform: 'indeed', category: 'hr' },
  
  // Stack Overflow (now merged but RSS might work)
  { url: 'https://stackoverflow.com/jobs/feed', platform: 'stackoverflow', category: 'tech' },
  
  // GitHub Jobs (Archive)
  { url: 'https://jobs.github.com/positions.atom', platform: 'github', category: 'tech' },
  
  // Authentic Jobs
  { url: 'https://authenticjobs.com/rss/index.xml', platform: 'authenticjobs', category: 'tech' },
  
  // Dribbble Jobs
  { url: 'https://dribbble.com/jobs.rss', platform: 'dribbble', category: 'tech' },
];

// ================================
// API Endpoints for Job Boards
// ================================
export const API_ENDPOINTS = [
  {
    name: 'RemoteOK',
    url: 'https://remoteok.com/api',
    method: 'GET',
    headers: { 'User-Agent': 'TechGigRadar/1.0' }
  },
  {
    name: 'Remotive',
    url: 'https://remotive.com/api/remote-jobs?category=software-dev',
    method: 'GET',
    headers: {}
  },
  {
    name: 'Remotive HR',
    url: 'https://remotive.com/api/remote-jobs?category=hr',
    method: 'GET',
    headers: {}
  },
  {
    name: 'Himalayas',
    url: 'https://himalayas.app/jobs/api?limit=100',
    method: 'GET',
    headers: {}
  },
  {
    name: 'Arbeitnow',
    url: 'https://www.arbeitnow.com/api/job-board-api',
    method: 'GET',
    headers: {}
  },
  {
    name: 'Findwork',
    url: 'https://findwork.dev/api/jobs/?search=remote&location=remote',
    method: 'GET',
    headers: {}
  },
  {
    name: 'JSearch (RapidAPI)',
    url: 'https://jsearch.p.rapidapi.com/search',
    method: 'GET',
    headers: { 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
    requiresKey: true
  }
];

// ================================
// Skills Extraction
// ================================
const TECH_SKILLS_LIST = [
  // Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby',
  'php', 'swift', 'kotlin', 'scala', 'r', 'sql', 'perl', 'haskell', 'elixir',
  // Frontend
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'gatsby', 'html', 'css', 'sass', 'tailwind',
  // Backend
  'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'spring boot', '.net', 'rails', 'laravel',
  // Cloud
  'aws', 'azure', 'gcp', 'google cloud', 'kubernetes', 'docker', 'terraform', 'ansible',
  // Databases
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
  // Mobile
  'react native', 'flutter', 'ios', 'android', 'swiftui',
  // AI/ML
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'llm', 'nlp', 'computer vision',
  // DevOps
  'ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'circleci', 'devops', 'sre',
  // Tools
  'git', 'jira', 'figma', 'graphql', 'rest api', 'microservices',
  // HR specific
  'talent acquisition', 'recruitment', 'ats', 'workday', 'bamboohr', 'greenhouse', 'lever'
];

export function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  
  for (const skill of TECH_SKILLS_LIST) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower) && !found.includes(skill)) {
      found.push(skill);
    }
  }
  
  return found.slice(0, 15);
}

// ================================
// Experience Level Detection
// ================================
export function detectExperienceLevel(title: string, description: string): ScrapedJob['experienceLevel'] {
  const text = `${title} ${description}`.toLowerCase();
  
  if (/\b(intern|internship|trainee|fresher|entry[- ]?level|graduate|0-1|0-2|new grad)\b/.test(text)) {
    return 'fresher';
  }
  if (/\b(junior|jr\.?|1-2|1-3|associate)\b/.test(text)) {
    return 'junior';
  }
  if (/\b(senior|sr\.?|5\+|5-10|lead|principal|staff|architect)\b/.test(text)) {
    return 'senior';
  }
  if (/\b(mid[- ]?level|2-5|3-5|intermediate)\b/.test(text)) {
    return 'mid';
  }
  
  return 'any';
}

// ================================
// Job Type Detection
// ================================
export function detectJobType(title: string, description: string): ScrapedJob['jobType'] {
  const text = `${title} ${description}`.toLowerCase();
  
  if (/\b(freelance|freelancer)\b/.test(text)) return 'freelance';
  if (/\b(contract|contractor|c2c)\b/.test(text)) return 'contract';
  if (/\b(part[- ]?time)\b/.test(text)) return 'part-time';
  if (/\b(internship|intern)\b/.test(text)) return 'internship';
  
  return 'full-time';
}

// ================================
// Category Detection
// ================================
export function detectCategory(title: string, description: string): ScrapedJob['category'] {
  const text = `${title} ${description}`.toLowerCase();
  
  if (/\b(hr|human resources|recruiter|recruiting|talent acquisition|people operations)\b/.test(text)) {
    return 'hr';
  }
  if (/\b(developer|engineer|devops|data|software|frontend|backend|fullstack|cloud|security|qa|sdet|ml|ai)\b/.test(text)) {
    return 'tech';
  }
  
  return 'other';
}

// ================================
// Salary Parsing
// ================================
export function parseSalary(text: string): { min?: number; max?: number; currency?: string; display?: string } {
  // Indian salary formats (LPA)
  const lpaMatch = text.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?\s*(?:lpa|lakhs?|lac)/i);
  if (lpaMatch) {
    const min = parseFloat(lpaMatch[1]) * 100000;
    const max = lpaMatch[2] ? parseFloat(lpaMatch[2]) * 100000 : undefined;
    return { min, max, currency: 'INR', display: `₹${lpaMatch[1]}${lpaMatch[2] ? '-' + lpaMatch[2] : ''} LPA` };
  }
  
  // USD formats
  const usdMatch = text.match(/\$?\s*(\d{2,3})k?\s*[-–to]+\s*\$?\s*(\d{2,3})k?/i);
  if (usdMatch) {
    const min = parseInt(usdMatch[1]) * (parseInt(usdMatch[1]) < 1000 ? 1000 : 1);
    const max = parseInt(usdMatch[2]) * (parseInt(usdMatch[2]) < 1000 ? 1000 : 1);
    return { min, max, currency: 'USD', display: `$${usdMatch[1]}K - $${usdMatch[2]}K` };
  }
  
  return {};
}

// ================================
// Fingerprint Generation
// ================================
export function generateJobFingerprint(company: string, title: string, location?: string): string {
  const normalized = `${company}|${title}|${location || ''}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `job_${Math.abs(hash).toString(36)}`;
}

// ================================
// Export all for use in discoverer
// ================================
export const multiPlatformConfig = {
  platforms: PLATFORMS,
  rssFeeds: RSS_FEEDS,
  apiEndpoints: API_ENDPOINTS,
  jobCategories: JOB_CATEGORIES,
  generateSearchQueries,
  extractSkillsFromText,
  detectExperienceLevel,
  detectJobType,
  detectCategory,
  parseSalary,
  generateJobFingerprint
};

export default multiPlatformConfig;
