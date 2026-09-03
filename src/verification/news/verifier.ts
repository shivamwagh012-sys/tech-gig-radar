import { createLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import type { DiscoveredNews } from '../../discovery/news/discoverer.js';

const logger = createLogger('news-verifier');

// ================================
// Types
// ================================
export interface VerificationResult {
  isValid: boolean;
  score: number;
  factors: VerificationFactor[];
  notes: string[];
  rejectionReason?: string;
}

export interface VerificationFactor {
  name: string;
  score: number;
  maxScore: number;
  details: string;
}

// ================================
// Source Reliability Scoring
// ================================
function scoreSourceReliability(news: DiscoveredNews): VerificationFactor {
  const maxScore = 30;
  let score = 0;
  let details = '';
  
  // Primary sources get full points
  if (news.isPrimarySource) {
    score = maxScore;
    details = `Primary source: ${news.sourceName}`;
  } else {
    // Scale based on reliability score
    score = Math.floor((news.sourceReliability / 100) * maxScore);
    details = `${news.sourceName} (reliability: ${news.sourceReliability}/100)`;
  }
  
  return { name: 'Source Reliability', score, maxScore, details };
}

// ================================
// Freshness Scoring
// ================================
function scoreFreshness(news: DiscoveredNews): VerificationFactor {
  const maxScore = 20;
  const maxAgeHours = config.discovery.maxNewsAgeHours;
  
  if (!news.publishedAt) {
    return {
      name: 'Freshness',
      score: 10, // Half points if no date
      maxScore,
      details: 'Publication date unknown',
    };
  }
  
  const ageHours = (Date.now() - news.publishedAt.getTime()) / (1000 * 60 * 60);
  
  if (ageHours < 0) {
    // Future date - suspicious
    return {
      name: 'Freshness',
      score: 0,
      maxScore,
      details: 'Publication date is in the future (suspicious)',
    };
  }
  
  if (ageHours > maxAgeHours) {
    return {
      name: 'Freshness',
      score: 0,
      maxScore,
      details: `Too old: ${Math.floor(ageHours)} hours (max: ${maxAgeHours})`,
    };
  }
  
  // Linear decay based on age
  const score = Math.floor(maxScore * (1 - ageHours / maxAgeHours));
  
  return {
    name: 'Freshness',
    score,
    maxScore,
    details: `${Math.floor(ageHours)} hours old`,
  };
}

// ================================
// Content Quality Scoring
// ================================
function scoreContentQuality(news: DiscoveredNews): VerificationFactor {
  const maxScore = 25;
  let score = 0;
  const issues: string[] = [];
  
  // Title quality
  if (news.title.length >= 10 && news.title.length <= 200) {
    score += 8;
  } else if (news.title.length < 10) {
    issues.push('Title too short');
  } else {
    issues.push('Title too long');
    score += 4;
  }
  
  // Check for clickbait patterns
  const clickbaitPatterns = [
    /you won't believe/i,
    /what happens next/i,
    /shocking/i,
    /one weird trick/i,
    /doctors hate/i,
    /\!\!\!/,
    /\?\?\?/,
    /BREAKING:.*!!!/i,
  ];
  
  const hasClickbait = clickbaitPatterns.some(p => p.test(news.title));
  if (hasClickbait) {
    issues.push('Potential clickbait detected');
  } else {
    score += 5;
  }
  
  // Has summary/content
  if (news.summary && news.summary.length > 50) {
    score += 6;
  } else if (news.content && news.content.length > 100) {
    score += 4;
  } else {
    issues.push('Missing or short content');
  }
  
  // Has valid URL
  try {
    new URL(news.sourceUrl);
    score += 6;
  } catch {
    issues.push('Invalid source URL');
  }
  
  const details = issues.length > 0 ? issues.join('; ') : 'Content quality acceptable';
  
  return { name: 'Content Quality', score, maxScore, details };
}

// ================================
// Category Relevance Scoring
// ================================
function scoreCategoryRelevance(news: DiscoveredNews): VerificationFactor {
  const maxScore = 15;
  
  // Check if category is relevant to tech/dev audience
  const highRelevanceCategories = ['ai', 'programming', 'webdev', 'mobile', 'devops', 'cloud'];
  const mediumRelevanceCategories = ['security', 'startup'];
  
  if (highRelevanceCategories.includes(news.category)) {
    return {
      name: 'Category Relevance',
      score: maxScore,
      maxScore,
      details: `High relevance category: ${news.category}`,
    };
  }
  
  if (mediumRelevanceCategories.includes(news.category)) {
    return {
      name: 'Category Relevance',
      score: Math.floor(maxScore * 0.7),
      maxScore,
      details: `Medium relevance category: ${news.category}`,
    };
  }
  
  return {
    name: 'Category Relevance',
    score: Math.floor(maxScore * 0.4),
    maxScore,
    details: `General category: ${news.category}`,
  };
}

// ================================
// Duplicate/Spam Detection
// ================================
function scoreOriginality(news: DiscoveredNews): VerificationFactor {
  const maxScore = 10;
  let score = maxScore;
  const issues: string[] = [];
  
  // Check for common spam patterns
  const spamPatterns = [
    /^ad:/i,
    /sponsored/i,
    /^pr:/i,
    /press release/i,
    /affiliate/i,
  ];
  
  const titleAndContent = `${news.title} ${news.summary || ''}`;
  
  for (const pattern of spamPatterns) {
    if (pattern.test(titleAndContent)) {
      score -= 5;
      issues.push('Potential promotional content');
      break;
    }
  }
  
  // Check for excessive promotional language
  const promotionalWords = ['exclusive', 'limited time', 'act now', 'free trial', 'discount'];
  const promoCount = promotionalWords.filter(w => 
    titleAndContent.toLowerCase().includes(w)
  ).length;
  
  if (promoCount >= 2) {
    score -= 3;
    issues.push('Heavy promotional language');
  }
  
  const details = issues.length > 0 ? issues.join('; ') : 'No spam indicators';
  
  return { name: 'Originality', score: Math.max(0, score), maxScore, details };
}

// ================================
// Main Verification Function
// ================================
export function verifyNews(news: DiscoveredNews): VerificationResult {
  const factors: VerificationFactor[] = [
    scoreSourceReliability(news),
    scoreFreshness(news),
    scoreContentQuality(news),
    scoreCategoryRelevance(news),
    scoreOriginality(news),
  ];
  
  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
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
    if (totalScore < 30) {
      rejectionReason = 'Very low quality score';
    } else {
      rejectionReason = notes.join('; ') || 'Below minimum verification threshold';
    }
  }
  
  logger.debug({
    title: news.title.slice(0, 50),
    score: totalScore,
    isValid,
  }, 'News verification completed');
  
  return {
    isValid,
    score: totalScore,
    factors,
    notes,
    rejectionReason,
  };
}

// ================================
// Batch Verification
// ================================
export function verifyNewsBatch(
  newsItems: DiscoveredNews[]
): Array<{ news: DiscoveredNews; result: VerificationResult }> {
  return newsItems.map(news => ({
    news,
    result: verifyNews(news),
  }));
}
