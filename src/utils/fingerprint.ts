import crypto from 'crypto';
import { stringSimilarity } from 'string-similarity-js';

/**
 * Generate a fingerprint for content deduplication
 */
export function generateFingerprint(content: string): string {
  // Normalize: lowercase, remove extra whitespace, remove punctuation
  const normalized = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Generate URL hash for quick lookup
 */
export function generateUrlHash(url: string): string {
  const normalized = normalizeUrl(url);
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Normalize URL for comparison
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'fbclid', 'gclid', 'msclkid',
    ];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    
    // Remove trailing slash
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    
    // Remove www
    parsed.hostname = parsed.hostname.replace(/^www\./, '');
    
    // Lowercase
    return parsed.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Check if two strings are similar
 */
export function areSimilar(a: string, b: string, threshold = 0.85): boolean {
  const similarity = stringSimilarity(a.toLowerCase(), b.toLowerCase());
  return similarity >= threshold;
}

/**
 * Calculate text similarity score
 */
export function calculateSimilarity(a: string, b: string): number {
  return stringSimilarity(a.toLowerCase(), b.toLowerCase());
}

/**
 * Generate a job fingerprint from key fields
 */
export function generateJobFingerprint(
  companyName: string,
  title: string,
  location?: string
): string {
  const normalized = [
    companyName.toLowerCase().trim(),
    title.toLowerCase().trim(),
    location?.toLowerCase().trim() || '',
  ].join('|');
  
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Generate a news fingerprint from title and source
 */
export function generateNewsFingerprint(
  title: string,
  sourceUrl: string
): string {
  const urlHash = generateUrlHash(sourceUrl);
  const titleNorm = title.toLowerCase().replace(/[^\w\s]/g, '').trim();
  
  return crypto
    .createHash('sha256')
    .update(`${titleNorm}|${urlHash}`)
    .digest('hex')
    .slice(0, 32);
}
