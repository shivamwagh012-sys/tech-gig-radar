import { createLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import type { DiscoveredJob } from '../../discovery/jobs/discoverer.js';

const logger = createLogger('job-verifier');

// ================================
// Types
// ================================
export interface JobVerificationResult {
  isValid: boolean;
  score: number;
  factors: VerificationFactor[];
  notes: string[];
  flags: JobFlag[];
  rejectionReason?: string;
}

export interface VerificationFactor {
  name: string;
  score: number;
  maxScore: number;
  details: string;
}

export interface JobFlag {
  type: 'warning' | 'info';
  message: string;
}

// ================================
// Company Verification
// ================================
function scoreCompanyInfo(job: DiscoveredJob): VerificationFactor {
  const maxScore = 25;
  let score = 0;
  const issues: string[] = [];
  
  // Company name present and reasonable
  if (job.companyName && job.companyName.length >= 2 && job.companyName !== 'Unknown Company') {
    score += 10;
    
    // Check for suspicious company names
    const suspiciousPatterns = [
      /^[a-z]{2,3}\d+$/i, // Random alphanumeric
      /^company$/i,
      /^test$/i,
      /^hiring$/i,
    ];
    
    if (suspiciousPatterns.some(p => p.test(job.companyName))) {
      score -= 5;
      issues.push('Suspicious company name');
    }
  } else {
    issues.push('Company name missing or invalid');
  }
  
  // Company URL adds credibility
  if (job.companyUrl) {
    try {
      new URL(job.companyUrl);
      score += 8;
    } catch {
      issues.push('Invalid company URL');
    }
  } else {
    issues.push('No company URL');
  }
  
  // Company location
  if (job.companyLocation) {
    score += 7;
  } else {
    score += 3; // Some points even without location (might be fully remote)
    issues.push('Location unknown');
  }
  
  const details = issues.length > 0 ? issues.join('; ') : 'Company info complete';
  
  return { name: 'Company Info', score: Math.min(score, maxScore), maxScore, details };
}

// ================================
// Job Details Verification
// ================================
function scoreJobDetails(job: DiscoveredJob): VerificationFactor {
  const maxScore = 25;
  let score = 0;
  const issues: string[] = [];
  
  // Job title
  if (job.title && job.title.length >= 3) {
    score += 8;
    
    // Check for vague titles
    const vagueTitles = ['position', 'role', 'opportunity', 'job'];
    if (vagueTitles.includes(job.title.toLowerCase())) {
      score -= 4;
      issues.push('Vague job title');
    }
  } else {
    issues.push('Job title missing or too short');
  }
  
  // Description
  if (job.description && job.description.length >= 100) {
    score += 8;
  } else if (job.description && job.description.length >= 50) {
    score += 4;
    issues.push('Short job description');
  } else {
    issues.push('Missing or very short description');
  }
  
  // Skills listed
  if (job.requiredSkills && job.requiredSkills.length >= 2) {
    score += 5;
  } else {
    issues.push('Few or no skills listed');
    score += 2;
  }
  
  // Experience level
  if (job.experienceLevel) {
    score += 4;
  } else {
    issues.push('Experience level not specified');
    score += 1;
  }
  
  const details = issues.length > 0 ? issues.join('; ') : 'Job details complete';
  
  return { name: 'Job Details', score: Math.min(score, maxScore), maxScore, details };
}

// ================================
// Application URL Verification
// ================================
function scoreApplicationUrl(job: DiscoveredJob): VerificationFactor {
  const maxScore = 20;
  let score = 0;
  const issues: string[] = [];
  
  if (!job.applicationUrl) {
    return { name: 'Application URL', score: 0, maxScore, details: 'Missing application URL' };
  }
  
  try {
    const url = new URL(job.applicationUrl);
    score += 10;
    
    // Prefer official domains
    const trustedDomains = [
      'greenhouse.io', 'lever.co', 'workable.com', 'ashbyhq.com',
      'jobs.lever.co', 'boards.greenhouse.io', 'apply.workable.com',
      'linkedin.com', 'indeed.com', 'angel.co', 'wellfound.com',
    ];
    
    const companyDomainPattern = job.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    
    const isTrustedATS = trustedDomains.some(d => url.hostname.includes(d));
    const isCompanyDomain = url.hostname.includes(companyDomainPattern);
    
    if (isTrustedATS) {
      score += 10;
    } else if (isCompanyDomain) {
      score += 8;
    } else {
      score += 3;
      issues.push('Application URL not on company or ATS domain');
    }
    
    // Check for suspicious URL patterns
    const suspiciousPatterns = [
      /bit\.ly/i,
      /tinyurl/i,
      /t\.co/i,
      /goo\.gl/i,
    ];
    
    if (suspiciousPatterns.some(p => p.test(job.applicationUrl))) {
      score -= 5;
      issues.push('Shortened URL (suspicious)');
    }
  } catch {
    issues.push('Invalid application URL');
  }
  
  const details = issues.length > 0 ? issues.join('; ') : 'Valid application URL';
  
  return { name: 'Application URL', score: Math.max(0, score), maxScore, details };
}

// ================================
// Remote/Global Availability Verification
// ================================
function scoreRemoteAvailability(job: DiscoveredJob): VerificationFactor {
  const maxScore = 15;
  let score = 0;
  let details = '';
  
  if (job.acceptsWorldwide) {
    score = maxScore;
    details = 'Accepts worldwide applicants';
  } else if (job.isRemote) {
    score = 10;
    if (job.locationRestrictions && job.locationRestrictions.length > 0) {
      details = `Remote with restrictions: ${job.locationRestrictions.join(', ')}`;
    } else {
      details = 'Remote (restrictions unclear)';
    }
  } else {
    score = 5;
    details = 'Not explicitly remote';
  }
  
  return { name: 'Remote Availability', score, maxScore, details };
}

// ================================
// Scam Detection
// ================================
function scoreScamIndicators(job: DiscoveredJob): VerificationFactor {
  const maxScore = 15;
  let score = maxScore;
  const redFlags: string[] = [];
  
  const fullText = `${job.title} ${job.description || ''} ${job.companyName}`.toLowerCase();
  
  // Common scam patterns
  const scamPatterns = [
    { pattern: /earn \$?\d+k?\+? (per|a) (week|day)/i, flag: 'Unrealistic earnings claim' },
    { pattern: /no experience (needed|required|necessary)/i, flag: 'No experience for senior role' },
    { pattern: /work from home.*\$\d+.*hour/i, flag: 'WFH with suspicious pay' },
    { pattern: /wire transfer|western union|moneygram/i, flag: 'Wire transfer mentioned' },
    { pattern: /pay.*(upfront|advance|fee)/i, flag: 'Upfront payment mentioned' },
    { pattern: /personal.*(bank|account|ssn|social security)/i, flag: 'Asks for personal financial info' },
    { pattern: /too good to be true/i, flag: 'Self-aware scam language' },
    { pattern: /guaranteed.*(income|salary|earnings)/i, flag: 'Guaranteed income claim' },
  ];
  
  for (const { pattern, flag } of scamPatterns) {
    if (pattern.test(fullText)) {
      score -= 5;
      redFlags.push(flag);
    }
  }
  
  // Salary sanity check
  if (job.salaryMin && job.salaryMax) {
    // Entry level claiming $300k+
    if (job.experienceLevel === 'fresher' && job.salaryMin > 200000) {
      score -= 3;
      redFlags.push('Unrealistic entry-level salary');
    }
    
    // Hourly rate over $500
    if (job.salaryMin > 500 && job.salaryMax < 2000) {
      score -= 3;
      redFlags.push('Suspicious hourly rate');
    }
  }
  
  const details = redFlags.length > 0 
    ? `Red flags: ${redFlags.join('; ')}` 
    : 'No scam indicators detected';
  
  return { name: 'Scam Detection', score: Math.max(0, score), maxScore, details };
}

// ================================
// Generate Flags/Warnings
// ================================
function generateFlags(job: DiscoveredJob): JobFlag[] {
  const flags: JobFlag[] = [];
  
  // Info flags
  if (!job.salaryMin && !job.salaryMax) {
    flags.push({ type: 'info', message: 'Salary not disclosed' });
  }
  
  if (!job.experienceLevel) {
    flags.push({ type: 'info', message: 'Experience level not specified' });
  }
  
  if (job.isRemote && !job.acceptsWorldwide && (!job.locationRestrictions || job.locationRestrictions.length === 0)) {
    flags.push({ type: 'warning', message: 'Remote availability unclear - verify restrictions' });
  }
  
  // Warning flags
  if (job.locationRestrictions && job.locationRestrictions.length > 0) {
    flags.push({ type: 'warning', message: `Location restrictions: ${job.locationRestrictions.join(', ')}` });
  }
  
  if (!job.companyUrl) {
    flags.push({ type: 'warning', message: 'Company website not provided - verify legitimacy' });
  }
  
  return flags;
}

// ================================
// Main Verification Function
// ================================
export function verifyJob(job: DiscoveredJob): JobVerificationResult {
  const factors: VerificationFactor[] = [
    scoreCompanyInfo(job),
    scoreJobDetails(job),
    scoreApplicationUrl(job),
    scoreRemoteAvailability(job),
    scoreScamIndicators(job),
  ];
  
  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const flags = generateFlags(job);
  const notes: string[] = [];
  
  // Add notable factors to notes
  for (const factor of factors) {
    if (factor.score < factor.maxScore * 0.5) {
      notes.push(`Low ${factor.name}: ${factor.details}`);
    }
  }
  
  // Determine validity
  const minScore = config.verification.minScore;
  const isValid = totalScore >= minScore;
  let rejectionReason: string | undefined;
  
  if (!isValid) {
    const scamFactor = factors.find(f => f.name === 'Scam Detection');
    if (scamFactor && scamFactor.score < scamFactor.maxScore * 0.5) {
      rejectionReason = 'Potential scam indicators detected';
    } else if (totalScore < 30) {
      rejectionReason = 'Very low quality score - missing essential information';
    } else {
      rejectionReason = notes.join('; ') || 'Below minimum verification threshold';
    }
  }
  
  logger.debug({
    company: job.companyName,
    title: job.title.slice(0, 30),
    score: totalScore,
    isValid,
    flags: flags.length,
  }, 'Job verification completed');
  
  return {
    isValid,
    score: totalScore,
    factors,
    notes,
    flags,
    rejectionReason,
  };
}

// ================================
// Batch Verification
// ================================
export function verifyJobBatch(
  jobs: DiscoveredJob[]
): Array<{ job: DiscoveredJob; result: JobVerificationResult }> {
  return jobs.map(job => ({
    job,
    result: verifyJob(job),
  }));
}
