import { createLogger } from '../../utils/logger.js';
import { generateJobFingerprint, normalizeUrl } from '../../utils/fingerprint.js';
import { getActiveSources, type SourceConfig } from '../sources/registry.js';
import { fetchRSS, type RSSItem } from '../sources/rss.js';
import { fetchRemoteOK, fetchHNWhoIsHiring, type RemoteOKJob } from '../sources/api.js';
import type { NewJob, ExperienceLevel, JobType } from '../../db/schema.js';

const logger = createLogger('job-discoverer');

// ================================
// CRITICAL FILTER: Tech Jobs Only + India Contractor Friendly
// ================================

// Job titles MUST contain one of these tech keywords
const TECH_JOB_TITLES = [
  // Developer/Engineer titles (strict)
  'developer', 'engineer', 'programmer',
  'frontend', 'front-end', 'front end',
  'backend', 'back-end', 'back end',
  'fullstack', 'full-stack', 'full stack',
  'software', 'swe',
  'devops', 'sre', 'site reliability',
  'data engineer', 'data scientist', 'ml engineer', 'machine learning engineer',
  'cloud engineer', 'platform engineer', 'infrastructure engineer',
  'security engineer', 'secops', 'devsecops',
  'qa engineer', 'sdet', 'test engineer', 'automation engineer',
  'ios developer', 'android developer', 'mobile developer',
  'react developer', 'node developer', 'python developer', 'java developer',
  'golang developer', 'rust developer',
  'tech lead', 'engineering manager', 'solutions architect', 'technical architect',
  'database administrator', 'dba',
  'blockchain developer', 'web3 developer', 'smart contract developer',
  // Fresher/Entry-Level friendly titles
  'junior developer', 'junior engineer', 'jr developer', 'jr engineer',
  'associate developer', 'associate engineer',
  'trainee', 'intern', 'apprentice',
  'entry level', 'entry-level', 'graduate developer', 'graduate engineer',
  'fresher', 'new grad',
  // HR/Recruitment titles (now included)
  'recruiter', 'recruiting', 'talent acquisition', 'talent sourcer',
  'hr manager', 'hr executive', 'hr coordinator', 'hr analyst',
  'human resources', 'hr business partner', 'people operations',
  'recruitment specialist', 'recruitment consultant', 'hr generalist',
  'technical recruiter', 'tech recruiter', 'it recruiter',
];

// Job descriptions MUST contain multiple tech skills to qualify
const REQUIRED_TECH_SKILLS = [
  // Languages (with word boundaries to avoid false matches)
  'javascript', 'typescript', 'python', 'java ', ' java', 'c\\+\\+', 'c#', 'csharp',
  'golang', ' go ', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', ' sql',
  // Frontend
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'html', 'css', 'tailwind',
  // Backend
  'nodejs', 'node.js', 'express', 'django', 'flask', 'fastapi', 'spring boot', '.net', 'rails', 'laravel',
  // Cloud/DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'kubernetes', 'k8s', 'docker', 'terraform', 'ci/cd', 'jenkins',
  // Databases
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'database',
  // Mobile
  'react native', 'flutter', 'ios development', 'android development', 'swiftui',
  // AI/ML
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'llm', 'nlp', 'computer vision',
  // Tools
  'git', 'github', 'gitlab', 'jira', 'agile', 'scrum', 'api', 'rest', 'graphql',
];

// Count tech skills (with smarter matching)
function countTechSkills(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  
  // Check for programming languages (needs word boundaries)
  if (/\b(javascript|js)\b/.test(lower)) count++;
  if (/\b(typescript|ts)\b/.test(lower)) count++;
  if (/\bpython\b/.test(lower)) count++;
  if (/\bjava\b/.test(lower) && !/\bjavascript\b/.test(lower)) count++;
  if (/\b(c\+\+|cpp)\b/.test(lower)) count++;
  if (/\b(c#|csharp)\b/.test(lower)) count++;
  if (/\b(golang|go\s+programming|go\s+language)\b/.test(lower)) count++;
  if (/\brust\b/.test(lower)) count++;
  if (/\bruby\b/.test(lower)) count++;
  if (/\bphp\b/.test(lower)) count++;
  if (/\bswift\b/.test(lower)) count++;
  if (/\bkotlin\b/.test(lower)) count++;
  if (/\bscala\b/.test(lower)) count++;
  if (/\bsql\b/.test(lower)) count++;
  
  // Frameworks
  if (/\breact\b/.test(lower)) count++;
  if (/\bvue\b/.test(lower)) count++;
  if (/\bangular\b/.test(lower)) count++;
  if (/\b(node\.?js|nodejs)\b/.test(lower)) count++;
  if (/\b(next\.?js|nextjs)\b/.test(lower)) count++;
  if (/\bdjango\b/.test(lower)) count++;
  if (/\bflask\b/.test(lower)) count++;
  if (/\bspring\b/.test(lower)) count++;
  if (/\brails\b/.test(lower)) count++;
  if (/\blaravel\b/.test(lower)) count++;
  if (/\b\.net\b/.test(lower)) count++;
  
  // Cloud/DevOps
  if (/\baws\b/.test(lower)) count++;
  if (/\bazure\b/.test(lower)) count++;
  if (/\bgcp\b/.test(lower)) count++;
  if (/\bkubernetes\b/.test(lower) || /\bk8s\b/.test(lower)) count++;
  if (/\bdocker\b/.test(lower)) count++;
  if (/\bterraform\b/.test(lower)) count++;
  if (/\bci\/cd\b/.test(lower)) count++;
  
  // Databases
  if (/\b(postgres|postgresql)\b/.test(lower)) count++;
  if (/\bmysql\b/.test(lower)) count++;
  if (/\bmongodb\b/.test(lower)) count++;
  if (/\bredis\b/.test(lower)) count++;
  
  // ML/AI
  if (/\b(machine learning|ml)\b/.test(lower)) count++;
  if (/\b(pytorch|tensorflow)\b/.test(lower)) count++;
  if (/\bllm\b/.test(lower)) count++;
  
  // APIs
  if (/\b(rest|restful|graphql)\b/.test(lower)) count++;
  if (/\bapi\b/.test(lower)) count++;
  
  return count;
}

// Keywords that indicate job is open to international contractors
const INDIA_CONTRACTOR_FRIENDLY_PATTERNS = [
  /\b(worldwide|global|anywhere)\b/i,
  /\b(remote|wfh|work from home)\b/i,
  /\b(contractor|contract|freelance|freelancer|c2c)\b/i,
  /\b(international|overseas)\b/i,
  /\b(asia|apac|india)\b/i,
  /\bno\s+(location|geo)\s+restrictions?\b/i,
  /\b(flexible\s+)?timezone\b/i,
  /\basync(hronous)?\b/i,
];

// Keywords that EXCLUDE jobs (US-only, EU-only, etc.)
const EXCLUSION_PATTERNS = [
  /\b(us[- ]?only|united states only|usa only)\b/i,
  /\b(must be (based |located )?in (the )?us|must reside in (the )?us)\b/i,
  /\b(us (citizens?|residents?) only)\b/i,
  /\b(w-?2|w2 only|no (c2c|contractors?))\b/i,
  /\b(security clearance|clearance required)\b/i,
  /\b(on-?site|onsite|in-?office|in office)\s+(only|required)\b/i,
  /\b(eu[- ]?only|europe only|uk[- ]?only)\b/i,
  /\b(visa sponsorship not available|no visa)\b/i,
  /\bamericas?\s+only\b/i,
  /\b(est|pst|cst|mst)\s+(time\s*zone\s*)?(only|required|hours)\b/i,
];

// Non-tech jobs to explicitly exclude (but allow HR/Recruitment)
const NON_TECH_EXCLUSIONS = [
  'accountant', 'accounting',
  'sales', 'marketing', 'customer service', 'customer support', 'call center',
  'nurse', 'nursing', 'medical', 'healthcare', 'doctor', 'physician',
  'teacher', 'teaching', 'education', 'professor', 'course director', 'course writer',
  'lawyer', 'legal', 'paralegal', 'attorney',
  'driver', 'delivery', 'warehouse', 'logistics',
  'chef', 'cook', 'restaurant', 'hospitality',
  'construction', 'plumber', 'electrician', 'mechanic',
  'real estate', 'property', 'mortgage',
  'insurance', 'financial advisor', 'bank teller',
  'equity', 'general application', 'gtm leader', 'operations center',
  'content writer', 'copywriter', 'editor',
  // Note: HR/Recruitment jobs are now ALLOWED - removed from exclusions
];

/**
 * Check if a job is a valid tech job suitable for Indian contractors
 */
function isValidTechJob(title: string, description: string): { valid: boolean; reason?: string } {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const fullText = `${titleLower} ${descLower}`;
  
  // 1. Check for explicit exclusions first
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(fullText)) {
      return { valid: false, reason: `Excluded: matches "${pattern.source}"` };
    }
  }
  
  // 2. Check for non-tech job titles
  for (const nonTech of NON_TECH_EXCLUSIONS) {
    if (titleLower.includes(nonTech)) {
      return { valid: false, reason: `Non-tech job: "${nonTech}"` };
    }
  }
  
  // 3. Title MUST contain a tech keyword
  const hasTechTitle = TECH_JOB_TITLES.some(keyword => titleLower.includes(keyword));
  if (!hasTechTitle) {
    return { valid: false, reason: 'Title does not contain tech keywords' };
  }
  
  // 4. Must have at least 3 tech skills mentioned (using smart matching)
  const skillCount = countTechSkills(fullText);
  if (skillCount < 3) {
    return { valid: false, reason: `Only ${skillCount} tech skills found (need at least 3)` };
  }
  
  // 5. Must be remote/contractor friendly OR explicitly worldwide
  const isContractorFriendly = INDIA_CONTRACTOR_FRIENDLY_PATTERNS.some(pattern => pattern.test(fullText));
  if (!isContractorFriendly) {
    return { valid: false, reason: 'Not marked as remote/contractor/worldwide friendly' };
  }
  
  return { valid: true };
}

/**
 * Additional scoring for India-contractor suitability
 */
function calculateIndiaContractorScore(title: string, description: string): number {
  const fullText = `${title} ${description}`.toLowerCase();
  let score = 50; // Base score
  
  // Positive signals
  if (/\b(worldwide|global|anywhere)\b/i.test(fullText)) score += 20;
  if (/\b(contractor|contract|freelance|c2c)\b/i.test(fullText)) score += 15;
  if (/\b(async|flexible.*(time|hours|schedule))\b/i.test(fullText)) score += 10;
  if (/\b(india|asia|apac)\b/i.test(fullText)) score += 15;
  if (/\b(no location restrictions?)\b/i.test(fullText)) score += 15;
  if (/\b(remote[- ]?first|fully remote|100% remote)\b/i.test(fullText)) score += 10;
  
  // Negative signals (but not exclusions)
  if (/\b(prefer(red)?|ideally).*(us|america|europe)\b/i.test(fullText)) score -= 15;
  if (/\b(overlap|hours).*(est|pst|cst)\b/i.test(fullText)) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

// ================================
// Types
// ================================
export interface DiscoveredJob {
  title: string;
  companyName: string;
  companyUrl?: string;
  companyLocation?: string;
  description?: string;
  requiredSkills: string[];
  experienceLevel?: string;
  jobType?: string;
  isRemote: boolean;
  acceptsWorldwide: boolean;
  locationRestrictions: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  applicationUrl: string;
  sourceUrl: string;
  sourceName: string;
  sourceReliability: number;
  discoveredAt: Date;
  fingerprint: string;
}

// ================================
// Experience Level Detection
// ================================
const experiencePatterns: Array<{ pattern: RegExp; level: string }> = [
  { pattern: /\b(intern|internship)\b/i, level: 'fresher' },
  { pattern: /\b(entry[- ]?level|graduate|fresher|new grad)\b/i, level: 'fresher' },
  { pattern: /\b(junior|jr\.?|0-2 years?|1-2 years?|1-3 years?)\b/i, level: 'junior' },
  { pattern: /\b(mid[- ]?level|2-5 years?|3-5 years?|intermediate)\b/i, level: 'mid' },
  { pattern: /\b(senior|sr\.?|5\+ years?|5-10 years?|lead|principal|staff)\b/i, level: 'senior' },
];

function detectExperienceLevel(title: string, description: string): string | undefined {
  const text = `${title} ${description}`;
  
  for (const { pattern, level } of experiencePatterns) {
    if (pattern.test(text)) {
      return level;
    }
  }
  
  return undefined;
}

// ================================
// Job Type Detection
// ================================
function detectJobType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  if (/\b(freelance|freelancer|contractor)\b/.test(text)) return 'freelance';
  if (/\b(contract|contractual|c2c)\b/.test(text)) return 'contract';
  if (/\b(part[- ]?time)\b/.test(text)) return 'part-time';
  if (/\b(internship|intern)\b/.test(text)) return 'internship';
  
  return 'full-time';
}

// ================================
// Remote/Worldwide Detection
// ================================
function detectRemoteStatus(text: string): { isRemote: boolean; acceptsWorldwide: boolean; restrictions: string[] } {
  const lower = text.toLowerCase();
  const restrictions: string[] = [];
  
  const isRemote = /\b(remote|work from home|wfh|distributed|anywhere)\b/.test(lower);
  
  // Check for worldwide indicators
  const worldwidePatterns = [
    /\b(worldwide|global|anywhere in the world|any location|location[: ]?anywhere)\b/,
    /\b(remote[: ]?worldwide|remote[: ]?global)\b/,
    /\b(we hire globally|globally distributed)\b/,
  ];
  
  const acceptsWorldwide = worldwidePatterns.some(p => p.test(lower));
  
  // Check for restrictions
  const restrictionPatterns = [
    { pattern: /\b(us[- ]?only|united states only|usa only)\b/i, restriction: 'US only' },
    { pattern: /\b(eu[- ]?only|europe only|european union only)\b/i, restriction: 'EU only' },
    { pattern: /\b(uk[- ]?only|united kingdom only)\b/i, restriction: 'UK only' },
    { pattern: /\b(north america only|na only)\b/i, restriction: 'North America only' },
    { pattern: /\b(must be based in|must reside in)\s+([^.]+)/i, restriction: null },
    { pattern: /\b(timezone|time zone)[: ]?\s*([\w\s+-]+)/i, restriction: null },
  ];
  
  for (const { pattern, restriction } of restrictionPatterns) {
    const match = lower.match(pattern);
    if (match) {
      restrictions.push(restriction || match[0]);
    }
  }
  
  return { isRemote, acceptsWorldwide: acceptsWorldwide && restrictions.length === 0, restrictions };
}

// ================================
// Skills Extraction
// ================================
const techSkills = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby',
  'php', 'swift', 'kotlin', 'scala', 'r', 'sql', 'nosql', 'graphql',
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby',
  'node.js', 'nodejs', 'express', 'fastify', 'nest.js', 'nestjs', 'django', 'flask', 'fastapi',
  'spring', 'spring boot', '.net', 'asp.net', 'rails', 'laravel',
  'aws', 'azure', 'gcp', 'google cloud', 'kubernetes', 'k8s', 'docker', 'terraform',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
  'react native', 'flutter', 'ios', 'android', 'swift', 'swiftui',
  'machine learning', 'ml', 'deep learning', 'pytorch', 'tensorflow', 'ai',
  'devops', 'ci/cd', 'jenkins', 'github actions', 'gitlab',
  'linux', 'unix', 'bash', 'shell',
  'html', 'css', 'sass', 'tailwind', 'figma',
  'git', 'agile', 'scrum', 'jira',
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  
  for (const skill of techSkills) {
    if (lower.includes(skill) && !found.includes(skill)) {
      found.push(skill);
    }
  }
  
  return found.slice(0, 15); // Limit to 15 skills
}

// ================================
// Salary Parsing
// ================================
function parseSalary(text: string): { min?: number; max?: number; currency?: string } {
  // Match patterns like $100k-$150k, $100,000 - $150,000, €50k, etc.
  const patterns = [
    /\$(\d{1,3}),?(\d{3})?\s*[-–to]+\s*\$(\d{1,3}),?(\d{3})?/i,
    /\$(\d{2,3})k\s*[-–to]+\s*\$(\d{2,3})k/i,
    /(\d{2,3})k\s*[-–to]+\s*(\d{2,3})k\s*(usd|eur|gbp)?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Simplified parsing - would need more robust handling in production
      const numbers = match.slice(1).filter(m => m && /\d/.test(m)).map(n => {
        const num = parseInt(n.replace(/,/g, ''), 10);
        return num < 1000 ? num * 1000 : num; // Assume "k" if small number
      });
      
      if (numbers.length >= 2) {
        return { min: numbers[0], max: numbers[1], currency: 'USD' };
      } else if (numbers.length === 1) {
        return { min: numbers[0], currency: 'USD' };
      }
    }
  }
  
  return {};
}

// ================================
// RemoteOK Processing
// ================================
function processRemoteOKJob(job: RemoteOKJob, source: SourceConfig): DiscoveredJob | null {
  if (!job.position || !job.company) {
    return null;
  }
  
  const description = job.description || '';
  
  // CRITICAL: Apply tech job + India contractor filter
  const validation = isValidTechJob(job.position, description);
  if (!validation.valid) {
    logger.debug({ title: job.position, reason: validation.reason }, 'Job filtered out');
    return null;
  }
  
  const remoteInfo = detectRemoteStatus(`${job.position} ${description} ${job.location || ''}`);
  
  return {
    title: job.position.trim(),
    companyName: job.company.trim(),
    companyUrl: job.company_logo ? undefined : undefined, // RemoteOK doesn't provide company URL
    companyLocation: job.location || 'Remote',
    description,
    requiredSkills: job.tags || extractSkills(description),
    experienceLevel: detectExperienceLevel(job.position, description),
    jobType: detectJobType(job.position, description),
    isRemote: true, // RemoteOK is remote-only
    acceptsWorldwide: remoteInfo.acceptsWorldwide || !remoteInfo.restrictions.length,
    locationRestrictions: remoteInfo.restrictions,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    salaryCurrency: 'USD',
    applicationUrl: job.apply_url || job.url,
    sourceUrl: job.url,
    sourceName: source.name,
    sourceReliability: source.reliabilityScore,
    discoveredAt: new Date(job.epoch * 1000),
    fingerprint: generateJobFingerprint(job.company, job.position, job.location),
  };
}

// ================================
// RSS Job Processing (We Work Remotely, etc.)
// ================================
function processRSSJob(item: RSSItem, source: SourceConfig): DiscoveredJob | null {
  if (!item.title || !item.link) {
    return null;
  }
  
  const content = item.contentSnippet || item.content || '';
  
  // Try to extract company from title (often formatted as "Company: Position")
  let companyName = 'Unknown Company';
  let title = item.title;
  
  const colonMatch = item.title.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    companyName = colonMatch[1].trim();
    title = colonMatch[2].trim();
  }
  
  // CRITICAL: Apply tech job + India contractor filter
  const validation = isValidTechJob(title, content);
  if (!validation.valid) {
    logger.debug({ title, reason: validation.reason }, 'Job filtered out');
    return null;
  }
  
  const remoteInfo = detectRemoteStatus(`${title} ${content}`);
  const salary = parseSalary(`${title} ${content}`);
  
  return {
    title: title.trim(),
    companyName,
    description: content.slice(0, 2000),
    requiredSkills: extractSkills(content),
    experienceLevel: detectExperienceLevel(title, content),
    jobType: detectJobType(title, content),
    isRemote: true, // These sources are remote-focused
    acceptsWorldwide: remoteInfo.acceptsWorldwide,
    locationRestrictions: remoteInfo.restrictions,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    applicationUrl: normalizeUrl(item.link),
    sourceUrl: normalizeUrl(item.link),
    sourceName: source.name,
    sourceReliability: source.reliabilityScore,
    discoveredAt: item.isoDate ? new Date(item.isoDate) : new Date(),
    fingerprint: generateJobFingerprint(companyName, title),
  };
}

// ================================
// HN Who's Hiring Processing
// ================================
function processHNJob(comment: { text: string; by: string; time: number }): DiscoveredJob | null {
  const text = comment.text || '';
  
  // HN jobs often start with company name
  const lines = text.replace(/<[^>]+>/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length === 0) return null;
  
  // First line is often "Company Name | Location | Role"
  const firstLine = lines[0];
  const parts = firstLine.split(/\s*[|]\s*/);
  
  const companyName = parts[0]?.trim() || 'Unknown';
  const title = parts[2]?.trim() || parts[1]?.trim() || 'Software Engineer';
  const location = parts[1]?.includes('Remote') ? parts[1] : undefined;
  
  if (companyName === 'Unknown' || companyName.length < 2) {
    return null;
  }
  
  const fullText = lines.join(' ');
  
  // CRITICAL: Apply tech job + India contractor filter
  const validation = isValidTechJob(title, fullText);
  if (!validation.valid) {
    logger.debug({ title, company: companyName, reason: validation.reason }, 'HN job filtered out');
    return null;
  }
  
  const remoteInfo = detectRemoteStatus(fullText);
  const salary = parseSalary(fullText);
  
  // Look for application URL
  const urlMatch = fullText.match(/https?:\/\/[^\s<>"]+/);
  const applicationUrl = urlMatch ? urlMatch[0] : `https://news.ycombinator.com/user?id=${comment.by}`;
  
  return {
    title,
    companyName,
    companyLocation: location || (remoteInfo.isRemote ? 'Remote' : undefined),
    description: fullText.slice(0, 2000),
    requiredSkills: extractSkills(fullText),
    experienceLevel: detectExperienceLevel(title, fullText),
    jobType: detectJobType(title, fullText),
    isRemote: remoteInfo.isRemote,
    acceptsWorldwide: remoteInfo.acceptsWorldwide,
    locationRestrictions: remoteInfo.restrictions,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    applicationUrl,
    sourceUrl: `https://news.ycombinator.com/item?id=${comment.by}`, // Placeholder
    sourceName: 'HN Who Is Hiring',
    sourceReliability: 85,
    discoveredAt: new Date(comment.time * 1000),
    fingerprint: generateJobFingerprint(companyName, title),
  };
}

// ================================
// Main Discovery Function
// ================================
export interface JobDiscoveryResult {
  jobs: DiscoveredJob[];
  errors: Array<{ source: string; error: string }>;
  stats: {
    sourcesChecked: number;
    itemsFound: number;
    itemsProcessed: number;
    duration: number;
  };
}

export async function discoverJobs(): Promise<JobDiscoveryResult> {
  const startTime = Date.now();
  const errors: Array<{ source: string; error: string }> = [];
  const allJobs: DiscoveredJob[] = [];
  
  const sources = getActiveSources('jobs');
  logger.info({ sourceCount: sources.length }, 'Starting job discovery');
  
  let totalItemsFound = 0;
  
  for (const source of sources) {
    try {
      if (source.type === 'rss') {
        const result = await fetchRSS(source);
        
        if (result.error) {
          errors.push({ source: source.name, error: result.error });
          continue;
        }
        
        totalItemsFound += result.items.length;
        
        for (const item of result.items) {
          const processed = processRSSJob(item, source);
          if (processed) {
            allJobs.push(processed);
          }
        }
      } else if (source.type === 'api') {
        if (source.url.includes('remoteok')) {
          const result = await fetchRemoteOK(source);
          
          if (result.error) {
            errors.push({ source: source.name, error: result.error });
            continue;
          }
          
          totalItemsFound += result.items.length;
          
          for (const job of result.items) {
            const processed = processRemoteOKJob(job, source);
            if (processed) {
              allJobs.push(processed);
            }
          }
        } else if (source.config?.type === 'whoishiring') {
          const result = await fetchHNWhoIsHiring();
          
          if (result.error) {
            errors.push({ source: source.name, error: result.error });
            continue;
          }
          
          totalItemsFound += result.items.length;
          
          for (const comment of result.items) {
            const processed = processHNJob(comment);
            if (processed) {
              allJobs.push(processed);
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ source: source.name, error: message });
      logger.error({ source: source.name, error: message }, 'Job discovery failed');
    }
  }
  
  const duration = Date.now() - startTime;
  
  logger.info({
    sourcesChecked: sources.length,
    itemsFound: totalItemsFound,
    itemsProcessed: allJobs.length,
    errors: errors.length,
    duration,
  }, 'Job discovery completed');
  
  return {
    jobs: allJobs,
    errors,
    stats: {
      sourcesChecked: sources.length,
      itemsFound: totalItemsFound,
      itemsProcessed: allJobs.length,
      duration,
    },
  };
}

// ================================
// Convert to Database Format
// ================================
export function toJobRecord(discovered: DiscoveredJob): NewJob {
  // Calculate India contractor suitability score
  const contractorScore = calculateIndiaContractorScore(discovered.title, discovered.description || '');
  
  return {
    title: discovered.title,
    companyName: discovered.companyName,
    companyUrl: discovered.companyUrl,
    companyLocation: discovered.companyLocation,
    description: discovered.description,
    requiredSkills: discovered.requiredSkills,
    experienceLevel: discovered.experienceLevel,
    jobType: discovered.jobType,
    isRemote: discovered.isRemote,
    acceptsWorldwide: discovered.acceptsWorldwide,
    locationRestrictions: discovered.locationRestrictions,
    salaryMin: discovered.salaryMin,
    salaryMax: discovered.salaryMax,
    salaryCurrency: discovered.salaryCurrency,
    applicationUrl: discovered.applicationUrl,
    sourceUrl: discovered.sourceUrl,
    sourceName: discovered.sourceName,
    discoveredAt: discovered.discoveredAt?.toISOString() || new Date().toISOString(),
    fingerprint: discovered.fingerprint,
    verificationStatus: 'pending',
    status: 'discovered',
    // Priority based on contractor suitability score
    priority: contractorScore,
  };
}
