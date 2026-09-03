// Combined Server: Dashboard + Auto-Discovery + Auto-Publish
// This runs both the web dashboard and the auto-discovery system
import { startDashboard } from './dashboard/server.js';
import { createLogger } from './utils/logger.js';
import { runNewsPipeline, runJobsPipeline } from './pipeline/index.js';
import { db, schema } from './db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { initTelegramBot, publishNewsToTelegram, publishJobToTelegram } from './publisher/telegram/client.js';
import { config } from './config/index.js';

const logger = createLogger('server-auto');

// Track published items
const publishedFingerprints = new Set<string>();

async function publishPendingNews() {
  try {
    const pendingNews = await db.select()
      .from(schema.news)
      .where(eq(schema.news.status, 'pending_review'))
      .orderBy(desc(schema.news.priority), desc(schema.news.verificationScore))
      .limit(3);

    let published = 0;
    for (const news of pendingNews) {
      // Skip already published
      if (news.telegramPublished || publishedFingerprints.has(news.fingerprint)) continue;

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

        await db.update(schema.news)
          .set({ 
            status: 'published',
            telegramPublished: true,
            publishedAt: new Date().toISOString(),
          })
          .where(eq(schema.news.id, news.id));

        publishedFingerprints.add(news.fingerprint);
        published++;
        logger.info({ title: news.title }, '✅ News auto-published');
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
    const pendingJobs = await db.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.status, 'pending_review'))
      .orderBy(desc(schema.jobs.priority))
      .limit(2);

    let published = 0;
    for (const job of pendingJobs) {
      // Skip already published
      if (job.telegramPublished || publishedFingerprints.has(job.fingerprint)) continue;

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
        logger.info({ title: job.title }, '✅ Job auto-published');
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

async function runCycle() {
  const start = Date.now();
  logger.info('🔄 Starting discovery cycle...');

  try {
    // Discover
    const newsResult = await runNewsPipeline();
    const jobsResult = await runJobsPipeline();
    
    logger.info({ 
      newsDiscovered: newsResult.stats.discovered, 
      jobsDiscovered: jobsResult.stats.discovered 
    }, 'Discovery complete');

    // Auto-publish
    if (config.features.autoPublish) {
      const newsPublished = await publishPendingNews();
      const jobsPublished = await publishPendingJobs();
      logger.info({ newsPublished, jobsPublished }, 'Auto-publish complete');
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    logger.info({ duration: duration + 's' }, '✅ Cycle complete');
  } catch (err) {
    logger.error({ error: err }, '❌ Cycle failed');
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🤖 TECHGIG RADAR - PRODUCTION SERVER 🤖         ║
║       Dashboard + Auto-Discovery + Auto-Publish           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Start the dashboard server
  const port = config.server.port || 3000;
  startDashboard(port);

  // Wait for server to start
  await new Promise(r => setTimeout(r, 2000));

  // Run initial cycle
  logger.info('Running initial discovery cycle...');
  await runCycle();

  // Schedule recurring cycles
  const intervalMs = (config.discovery.newsCheckInterval || 15) * 60 * 1000;
  logger.info({ intervalMinutes: config.discovery.newsCheckInterval || 15 }, 'Scheduling recurring cycles');

  setInterval(async () => {
    await runCycle();
  }, intervalMs);

  logger.info('🚀 Server running in autonomous mode!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
