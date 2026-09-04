// Quick publish script - publishes pending items with enhanced format
import { db, schema } from './db/index.js';
import { eq, or, desc } from 'drizzle-orm';
import { initTelegramBot, publishNewsToTelegram, publishJobToTelegram } from './publisher/telegram/client.js';
import { generateTelegramNewsContent, generateTelegramJobContent } from './content/generator.js';

async function main() {
  console.log('🚀 Quick Publish Script\n');

  // Get pending news
  const pendingNews = await db.select()
    .from(schema.news)
    .where(or(eq(schema.news.status, 'discovered'), eq(schema.news.status, 'pending_review')))
    .orderBy(desc(schema.news.priority))
    .limit(3);
  console.log(`📰 Pending news: ${pendingNews.length}`);

  // Get pending jobs
  const pendingJobs = await db.select()
    .from(schema.jobs)
    .where(or(eq(schema.jobs.status, 'discovered'), eq(schema.jobs.status, 'pending_review')))
    .orderBy(desc(schema.jobs.priority))
    .limit(5);
  console.log(`💼 Pending jobs: ${pendingJobs.length}\n`);

  // Publish news
  for (const news of pendingNews) {
    console.log(`📤 Publishing news: ${news.title.slice(0, 50)}...`);
    try {
      initTelegramBot();
      const content = generateTelegramNewsContent(news as any);
      const result = await publishNewsToTelegram(content);
      
      if (result.success) {
        await db.update(schema.news)
          .set({ status: 'published', approvedAt: new Date().toISOString() })
          .where(eq(schema.news.id, news.id));
        console.log(`   ✅ Published (msg ${result.messageId})`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  // Publish jobs
  for (const job of pendingJobs) {
    console.log(`📤 Publishing job: ${job.title} @ ${job.companyName}`);
    try {
      initTelegramBot();
      const content = generateTelegramJobContent(job as any);
      const result = await publishJobToTelegram(content);
      
      if (result.success) {
        await db.update(schema.jobs)
          .set({ status: 'published', approvedAt: new Date().toISOString() })
          .where(eq(schema.jobs.id, job.id));
        console.log(`   ✅ Published (msg ${result.messageId})`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
