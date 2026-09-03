// Continuous Auto-Runner for TechGig Radar
// Discovers news/jobs and auto-publishes to Telegram instantly
import { createLogger } from './utils/logger.js';
import { runNewsPipeline, runJobsPipeline } from './pipeline/index.js';
import { db, schema } from './db/index.js';
import { eq, and, desc, isNull, or } from 'drizzle-orm';
import { initTelegramBot, publishNewsToTelegram, publishJobToTelegram } from './publisher/telegram/client.js';
import { config } from './config/index.js';

const logger = createLogger('auto-runner');

// Track published items to avoid duplicates
const publishedFingerprints = new Set<string>();

async function publishPendingNews() {
  try {
    // Get unpublished news with high verification scores
    const pendingNews = await db.select()
      .from(schema.news)
      .where(
        and(
          eq(schema.news.status, 'pending_review'),
          or(
            isNull(schema.news.telegramPublished),
            eq(schema.news.telegramPublished, false)
          )
        )
      )
      .orderBy(desc(schema.news.priority), desc(schema.news.verificationScore))
      .limit(5);

    if (pendingNews.length === 0) {
      logger.info('No pending news to publish');
      return 0;
    }

    let published = 0;
    for (const news of pendingNews) {
      // Skip if already published (fingerprint check)
      if (publishedFingerprints.has(news.fingerprint)) {
        continue;
      }

      try {
        initTelegramBot();
        await publishNewsToTelegram({
          id: news.id,
          title: news.title,
          summary: news.summary || news.title,
          category: news.category || 'tech',
          sourceUrl: news.sourceUrl,
          sourceName: news.sourceName,
          importance: news.importance || 'medium',
        });

        // Mark as published
        await db.update(schema.news)
          .set({ 
            status: 'published',
            telegramPublished: true,
            publishedAt: new Date().toISOString(),
          })
          .where(eq(schema.news.id, news.id));

        publishedFingerprints.add(news.fingerprint);
        published++;
        logger.info({ title: news.title }, '✅ News auto-published to Telegram');
        
        // Small delay between posts
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        logger.error({ error: err, title: news.title }, 'Failed to publish news');
      }
    }

    return published;
  } catch (err) {
    logger.error({ error: err }, 'Error in publishPendingNews');
    return 0;
  }
}

async function publishPendingJobs() {
  try {
    // Get unpublished jobs
    const pendingJobs = await db.select()
      .from(schema.jobs)
      .where(
        and(
          eq(schema.jobs.status, 'pending_review'),
          or(
            isNull(schema.jobs.telegramPublished),
            eq(schema.jobs.telegramPublished, false)
          )
        )
      )
      .orderBy(desc(schema.jobs.priority))
      .limit(3);

    if (pendingJobs.length === 0) {
      logger.info('No pending jobs to publish');
      return 0;
    }

    let published = 0;
    for (const job of pendingJobs) {
      if (publishedFingerprints.has(job.fingerprint)) {
        continue;
      }

      try {
        initTelegramBot();
        await publishJobToTelegram({
          id: job.id,
          title: job.title,
          companyName: job.companyName,
          companyLocation: job.companyLocation || 'Remote',
          description: job.description?.slice(0, 500),
          requiredSkills: job.requiredSkills as string[] || [],
          experienceLevel: job.experienceLevel || 'any',
          jobType: job.jobType || 'remote',
          isRemote: job.isRemote ?? true,
          acceptsWorldwide: job.acceptsWorldwide ?? true,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency || 'USD',
          applicationUrl: job.applicationUrl,
        });

        await db.update(schema.jobs)
          .set({ 
            status: 'published',
            telegramPublished: true,
            publishedAt: new Date().toISOString(),
          })
          .where(eq(schema.jobs.id, job.id));

        publishedFingerprints.add(job.fingerprint);
        published++;
        logger.info({ title: job.title, company: job.companyName }, '✅ Job auto-published to Telegram');
        
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        logger.error({ error: err, title: job.title }, 'Failed to publish job');
      }
    }

    return published;
  } catch (err) {
    logger.error({ error: err }, 'Error in publishPendingJobs');
    return 0;
  }
}

async function runDiscoveryAndPublish() {
  const startTime = Date.now();
  
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 TechGig Radar - Auto Discovery & Publish Cycle');
  console.log('═'.repeat(60));
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);

  try {
    // Run news discovery
    console.log('📰 Discovering news...');
    const newsResult = await runNewsPipeline();
    console.log(`   Found: ${newsResult.stats.discovered} | Unique: ${newsResult.stats.unique}`);

    // Run job discovery
    console.log('💼 Discovering jobs...');
    const jobsResult = await runJobsPipeline();
    console.log(`   Found: ${jobsResult.stats.discovered} | Unique: ${jobsResult.stats.unique}`);

    // Auto-publish
    console.log('\n📤 Auto-publishing to Telegram...');
    const newsPublished = await publishPendingNews();
    const jobsPublished = await publishPendingJobs();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '─'.repeat(60));
    console.log('✅ Cycle Complete');
    console.log(`   News published: ${newsPublished}`);
    console.log(`   Jobs published: ${jobsPublished}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Next cycle in: ${config.discovery.newsCheckInterval} minutes`);
    console.log('─'.repeat(60) + '\n');

    return { newsPublished, jobsPublished };
  } catch (err) {
    logger.error({ error: err }, 'Discovery cycle failed');
    return { newsPublished: 0, jobsPublished: 0 };
  }
}

// Main continuous loop
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    TechGig Radar                          ║
║           🤖 AUTONOMOUS MODE ACTIVATED 🤖                 ║
║       Real Tech News. Real Global Opportunities.          ║
╚═══════════════════════════════════════════════════════════╝
  `);

  console.log('🔧 Configuration:');
  console.log(`   Auto-publish: ${config.features.autoPublish ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`   Human approval: ${config.features.requireHumanApproval ? '✅ REQUIRED' : '❌ NOT REQUIRED'}`);
  console.log(`   News interval: ${config.discovery.newsCheckInterval} minutes`);
  console.log(`   Jobs interval: ${config.discovery.jobsCheckInterval} minutes`);
  console.log(`   Telegram: ${config.telegram.enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log('');

  // Run immediately on start
  await runDiscoveryAndPublish();

  // Then run on interval
  const intervalMs = config.discovery.newsCheckInterval * 60 * 1000;
  
  setInterval(async () => {
    await runDiscoveryAndPublish();
  }, intervalMs);

  // Keep process alive
  console.log('🔄 Continuous mode active. Press Ctrl+C to stop.\n');
}

main().catch(console.error);
