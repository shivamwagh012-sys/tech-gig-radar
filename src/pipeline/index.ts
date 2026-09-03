import { createLogger } from '../utils/logger.js';
import { db, schema } from '../db/index.js';
import { discoverNews, toNewsRecord, type DiscoveredNews } from '../discovery/news/discoverer.js';
import { discoverJobs, toJobRecord, type DiscoveredJob } from '../discovery/jobs/discoverer.js';
import { verifyNews, type VerificationResult } from '../verification/news/verifier.js';
import { verifyJob, type JobVerificationResult } from '../verification/jobs/verifier.js';
import { deduplicateNewsBatch, deduplicateJobsBatch, type DedupResult } from '../dedup/index.js';
import { generateTelegramNewsContent, generateTelegramJobContent } from '../content/generator.js';
import { config } from '../config/index.js';

const logger = createLogger('pipeline');

// ================================
// Types
// ================================
export interface PipelineResult {
  phase: string;
  success: boolean;
  stats: {
    discovered: number;
    unique: number;
    verified: number;
    pendingReview: number;
    rejected: number;
    errors: number;
  };
  errors: Array<{ source: string; error: string }>;
  duration: number;
}

// ================================
// News Pipeline
// ================================
export async function runNewsPipeline(): Promise<PipelineResult> {
  const startTime = Date.now();
  const stats = {
    discovered: 0,
    unique: 0,
    verified: 0,
    pendingReview: 0,
    rejected: 0,
    errors: 0,
  };
  const allErrors: Array<{ source: string; error: string }> = [];
  
  logger.info('Starting news discovery pipeline');
  
  try {
    // Phase 1: Discovery
    logger.info('Phase 1: Discovering news from sources');
    const discoveryResult = await discoverNews();
    stats.discovered = discoveryResult.news.length;
    allErrors.push(...discoveryResult.errors);
    
    if (discoveryResult.news.length === 0) {
      logger.info('No news discovered, pipeline complete');
      return {
        phase: 'discovery',
        success: true,
        stats,
        errors: allErrors,
        duration: Date.now() - startTime,
      };
    }
    
    // Phase 2: Deduplication
    logger.info({ count: stats.discovered }, 'Phase 2: Deduplicating news');
    const dedupResults = await deduplicateNewsBatch(discoveryResult.news);
    const uniqueNews = dedupResults.filter(r => !r.dedupResult.isDuplicate);
    stats.unique = uniqueNews.length;
    
    if (uniqueNews.length === 0) {
      logger.info('All news were duplicates, pipeline complete');
      return {
        phase: 'deduplication',
        success: true,
        stats,
        errors: allErrors,
        duration: Date.now() - startTime,
      };
    }
    
    // Phase 3: Verification
    logger.info({ count: stats.unique }, 'Phase 3: Verifying news');
    const verificationResults = uniqueNews.map(({ news }) => ({
      news,
      verification: verifyNews(news),
    }));
    
    // Phase 4: Store in database
    logger.info('Phase 4: Storing verified news');
    
    for (const { news, verification } of verificationResults) {
      try {
        const record = toNewsRecord(news);
        record.verificationScore = verification.score;
        record.verificationStatus = verification.isValid ? 'verified' : 'rejected';
        record.verificationNotes = verification.notes.join('; ');
        
        if (verification.isValid) {
          // Check if auto-approve threshold met
          if (verification.score >= config.verification.autoApproveThreshold && !config.features.requireHumanApproval) {
            record.status = 'approved';
            stats.verified++;
          } else {
            record.status = 'pending_review';
            stats.pendingReview++;
          }
        } else {
          record.status = 'rejected';
          record.rejectionReason = verification.rejectionReason;
          stats.rejected++;
        }
        
        // Generate content for verified items
        if (record.status !== 'rejected') {
          // We need to cast since the record doesn't have all News fields yet
          const telegramContent = generateTelegramNewsContent({
            ...record,
            id: 'temp',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any);
          record.telegramContent = telegramContent;
        }
        
        await db.insert(schema.news).values(record).onConflictDoNothing();
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Database error';
        logger.error({ error: message, title: news.title.slice(0, 50) }, 'Failed to store news');
        stats.errors++;
      }
    }
    
    logger.info({
      ...stats,
      duration: Date.now() - startTime,
    }, 'News pipeline completed');
    
    return {
      phase: 'complete',
      success: true,
      stats,
      errors: allErrors,
      duration: Date.now() - startTime,
    };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'News pipeline failed');
    
    return {
      phase: 'error',
      success: false,
      stats,
      errors: [...allErrors, { source: 'pipeline', error: message }],
      duration: Date.now() - startTime,
    };
  }
}

// ================================
// Jobs Pipeline
// ================================
export async function runJobsPipeline(): Promise<PipelineResult> {
  const startTime = Date.now();
  const stats = {
    discovered: 0,
    unique: 0,
    verified: 0,
    pendingReview: 0,
    rejected: 0,
    errors: 0,
  };
  const allErrors: Array<{ source: string; error: string }> = [];
  
  logger.info('Starting jobs discovery pipeline');
  
  try {
    // Phase 1: Discovery
    logger.info('Phase 1: Discovering jobs from sources');
    const discoveryResult = await discoverJobs();
    stats.discovered = discoveryResult.jobs.length;
    allErrors.push(...discoveryResult.errors);
    
    if (discoveryResult.jobs.length === 0) {
      logger.info('No jobs discovered, pipeline complete');
      return {
        phase: 'discovery',
        success: true,
        stats,
        errors: allErrors,
        duration: Date.now() - startTime,
      };
    }
    
    // Phase 2: Deduplication
    logger.info({ count: stats.discovered }, 'Phase 2: Deduplicating jobs');
    const dedupResults = await deduplicateJobsBatch(discoveryResult.jobs);
    const uniqueJobs = dedupResults.filter(r => !r.dedupResult.isDuplicate);
    stats.unique = uniqueJobs.length;
    
    if (uniqueJobs.length === 0) {
      logger.info('All jobs were duplicates, pipeline complete');
      return {
        phase: 'deduplication',
        success: true,
        stats,
        errors: allErrors,
        duration: Date.now() - startTime,
      };
    }
    
    // Phase 3: Verification
    logger.info({ count: stats.unique }, 'Phase 3: Verifying jobs');
    const verificationResults = uniqueJobs.map(({ job }) => ({
      job,
      verification: verifyJob(job),
    }));
    
    // Phase 4: Store in database
    logger.info('Phase 4: Storing verified jobs');
    
    for (const { job, verification } of verificationResults) {
      try {
        const record = toJobRecord(job);
        record.verificationScore = verification.score;
        record.verificationStatus = verification.isValid ? 'verified' : 'rejected';
        record.verificationNotes = verification.notes.join('; ');
        
        if (verification.isValid) {
          if (verification.score >= config.verification.autoApproveThreshold && !config.features.requireHumanApproval) {
            record.status = 'approved';
            stats.verified++;
          } else {
            record.status = 'pending_review';
            stats.pendingReview++;
          }
        } else {
          record.status = 'rejected';
          record.rejectionReason = verification.rejectionReason;
          stats.rejected++;
        }
        
        // Generate content for verified items
        if (record.status !== 'rejected') {
          const telegramContent = generateTelegramJobContent({
            ...record,
            id: 'temp',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any);
          record.telegramContent = telegramContent;
        }
        
        await db.insert(schema.jobs).values(record).onConflictDoNothing();
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Database error';
        logger.error({ error: message, title: job.title.slice(0, 50) }, 'Failed to store job');
        stats.errors++;
      }
    }
    
    logger.info({
      ...stats,
      duration: Date.now() - startTime,
    }, 'Jobs pipeline completed');
    
    return {
      phase: 'complete',
      success: true,
      stats,
      errors: allErrors,
      duration: Date.now() - startTime,
    };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Jobs pipeline failed');
    
    return {
      phase: 'error',
      success: false,
      stats,
      errors: [...allErrors, { source: 'pipeline', error: message }],
      duration: Date.now() - startTime,
    };
  }
}

// ================================
// Full Pipeline
// ================================
export async function runFullPipeline(): Promise<{
  news: PipelineResult;
  jobs: PipelineResult;
}> {
  logger.info('Starting full discovery pipeline');
  
  const [newsResult, jobsResult] = await Promise.all([
    runNewsPipeline(),
    runJobsPipeline(),
  ]);
  
  logger.info({
    news: newsResult.stats,
    jobs: jobsResult.stats,
  }, 'Full pipeline completed');
  
  return { news: newsResult, jobs: jobsResult };
}
