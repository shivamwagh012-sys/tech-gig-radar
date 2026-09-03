import { createLogger } from '../utils/logger.js';
import { 
  generateFingerprint, 
  generateNewsFingerprint, 
  generateJobFingerprint,
  calculateSimilarity,
  normalizeUrl 
} from '../utils/fingerprint.js';
import { db, schema } from '../db/index.js';
import { eq, or } from 'drizzle-orm';
import type { DiscoveredNews } from '../discovery/news/discoverer.js';
import type { DiscoveredJob } from '../discovery/jobs/discoverer.js';

const logger = createLogger('deduplication');

// ================================
// In-Memory Cache for Session
// ================================
const sessionFingerprints = new Set<string>();
const sessionUrls = new Set<string>();

// ================================
// Types
// ================================
export interface DedupResult {
  isDuplicate: boolean;
  reason?: string;
  existingId?: string;
  similarity?: number;
}

// ================================
// Check News Duplicate
// ================================
export async function checkNewsDuplicate(news: DiscoveredNews): Promise<DedupResult> {
  // Check session cache first (fast path)
  if (sessionFingerprints.has(news.fingerprint)) {
    return { isDuplicate: true, reason: 'Duplicate in current session' };
  }
  
  const urlHash = normalizeUrl(news.sourceUrl);
  if (sessionUrls.has(urlHash)) {
    return { isDuplicate: true, reason: 'URL already processed in session' };
  }
  
  // Check database
  try {
    // Check by fingerprint
    const existingByFingerprint = await db.query.news.findFirst({
      where: eq(schema.news.fingerprint, news.fingerprint),
      columns: { id: true, title: true },
    });
    
    if (existingByFingerprint) {
      sessionFingerprints.add(news.fingerprint);
      return { 
        isDuplicate: true, 
        reason: 'Fingerprint match in database',
        existingId: existingByFingerprint.id,
      };
    }
    
    // Check by URL (different tracking params might have same content)
    const existingByUrl = await db.query.news.findFirst({
      where: eq(schema.news.sourceUrl, news.sourceUrl),
      columns: { id: true, title: true },
    });
    
    if (existingByUrl) {
      sessionUrls.add(urlHash);
      return {
        isDuplicate: true,
        reason: 'Same URL in database',
        existingId: existingByUrl.id,
      };
    }
    
    // Check title similarity for recent news (last 7 days)
    // This catches same story from different sources
    const recentNews = await db.query.news.findMany({
      where: eq(schema.news.category, news.category),
      columns: { id: true, title: true },
      limit: 100,
      orderBy: (news, { desc }) => [desc(news.discoveredAt)],
    });
    
    for (const existing of recentNews) {
      const similarity = calculateSimilarity(news.title, existing.title);
      if (similarity > 0.85) {
        return {
          isDuplicate: true,
          reason: `Similar title exists: "${existing.title.slice(0, 50)}..."`,
          existingId: existing.id,
          similarity,
        };
      }
    }
    
    // Not a duplicate - add to session cache
    sessionFingerprints.add(news.fingerprint);
    sessionUrls.add(urlHash);
    
    return { isDuplicate: false };
  } catch (error) {
    logger.error({ error }, 'Database error during deduplication');
    // On error, be conservative and don't mark as duplicate
    return { isDuplicate: false };
  }
}

// ================================
// Check Job Duplicate
// ================================
export async function checkJobDuplicate(job: DiscoveredJob): Promise<DedupResult> {
  // Check session cache first
  if (sessionFingerprints.has(job.fingerprint)) {
    return { isDuplicate: true, reason: 'Duplicate in current session' };
  }
  
  // Check database
  try {
    // Check by fingerprint
    const existingByFingerprint = await db.query.jobs.findFirst({
      where: eq(schema.jobs.fingerprint, job.fingerprint),
      columns: { id: true, title: true, companyName: true },
    });
    
    if (existingByFingerprint) {
      sessionFingerprints.add(job.fingerprint);
      return {
        isDuplicate: true,
        reason: 'Same job fingerprint exists',
        existingId: existingByFingerprint.id,
      };
    }
    
    // Check by application URL
    const existingByUrl = await db.query.jobs.findFirst({
      where: eq(schema.jobs.applicationUrl, job.applicationUrl),
      columns: { id: true, title: true, companyName: true },
    });
    
    if (existingByUrl) {
      return {
        isDuplicate: true,
        reason: 'Same application URL exists',
        existingId: existingByUrl.id,
      };
    }
    
    // Check for similar job at same company
    const sameCompanyJobs = await db.query.jobs.findMany({
      where: eq(schema.jobs.companyName, job.companyName),
      columns: { id: true, title: true },
      limit: 50,
    });
    
    for (const existing of sameCompanyJobs) {
      const similarity = calculateSimilarity(job.title, existing.title);
      if (similarity > 0.80) {
        return {
          isDuplicate: true,
          reason: `Similar job at ${job.companyName}: "${existing.title}"`,
          existingId: existing.id,
          similarity,
        };
      }
    }
    
    // Not a duplicate
    sessionFingerprints.add(job.fingerprint);
    
    return { isDuplicate: false };
  } catch (error) {
    logger.error({ error }, 'Database error during job deduplication');
    return { isDuplicate: false };
  }
}

// ================================
// Batch Deduplication
// ================================
export async function deduplicateNewsBatch(
  newsItems: DiscoveredNews[]
): Promise<Array<{ news: DiscoveredNews; dedupResult: DedupResult }>> {
  const results: Array<{ news: DiscoveredNews; dedupResult: DedupResult }> = [];
  
  // First pass: remove duplicates within the batch itself
  const seenFingerprints = new Set<string>();
  const seenUrls = new Set<string>();
  
  for (const news of newsItems) {
    // Check within batch
    if (seenFingerprints.has(news.fingerprint)) {
      results.push({ 
        news, 
        dedupResult: { isDuplicate: true, reason: 'Duplicate within batch' } 
      });
      continue;
    }
    
    const urlHash = normalizeUrl(news.sourceUrl);
    if (seenUrls.has(urlHash)) {
      results.push({ 
        news, 
        dedupResult: { isDuplicate: true, reason: 'URL duplicate within batch' } 
      });
      continue;
    }
    
    // Check database
    const dedupResult = await checkNewsDuplicate(news);
    results.push({ news, dedupResult });
    
    if (!dedupResult.isDuplicate) {
      seenFingerprints.add(news.fingerprint);
      seenUrls.add(urlHash);
    }
  }
  
  const uniqueCount = results.filter(r => !r.dedupResult.isDuplicate).length;
  const dupCount = results.length - uniqueCount;
  
  logger.info({ 
    total: newsItems.length, 
    unique: uniqueCount, 
    duplicates: dupCount 
  }, 'News batch deduplication complete');
  
  return results;
}

export async function deduplicateJobsBatch(
  jobs: DiscoveredJob[]
): Promise<Array<{ job: DiscoveredJob; dedupResult: DedupResult }>> {
  const results: Array<{ job: DiscoveredJob; dedupResult: DedupResult }> = [];
  
  // First pass: remove duplicates within the batch
  const seenFingerprints = new Set<string>();
  
  for (const job of jobs) {
    if (seenFingerprints.has(job.fingerprint)) {
      results.push({ 
        job, 
        dedupResult: { isDuplicate: true, reason: 'Duplicate within batch' } 
      });
      continue;
    }
    
    const dedupResult = await checkJobDuplicate(job);
    results.push({ job, dedupResult });
    
    if (!dedupResult.isDuplicate) {
      seenFingerprints.add(job.fingerprint);
    }
  }
  
  const uniqueCount = results.filter(r => !r.dedupResult.isDuplicate).length;
  const dupCount = results.length - uniqueCount;
  
  logger.info({ 
    total: jobs.length, 
    unique: uniqueCount, 
    duplicates: dupCount 
  }, 'Jobs batch deduplication complete');
  
  return results;
}

// ================================
// Clear Session Cache
// ================================
export function clearSessionCache(): void {
  sessionFingerprints.clear();
  sessionUrls.clear();
  logger.debug('Session deduplication cache cleared');
}
