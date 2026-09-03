#!/usr/bin/env node
import { createLogger } from '../utils/logger.js';
import { runNewsPipeline, runJobsPipeline, runFullPipeline } from '../pipeline/index.js';
import { testTelegramConnection, initTelegramBot, publishNewsToTelegram, publishJobToTelegram } from '../publisher/telegram/client.js';
import { getActiveSources } from '../discovery/sources/registry.js';
import { config } from '../config/index.js';
import { db, schema } from '../db/index.js';
import { count, desc, eq, and, or } from 'drizzle-orm';

const logger = createLogger('cli');

// ================================
// CLI Commands
// ================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subCommand = args[1];
  const flags = args.slice(2);
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    TechGig Radar                          ║
║           Real Tech News. Real Global Opportunities.      ║
╚═══════════════════════════════════════════════════════════╝
`);
  
  switch (command) {
    case 'discover':
      await handleDiscover(subCommand);
      break;
      
    case 'publish':
      await handlePublish(subCommand, flags);
      break;
      
    case 'review':
      await handleReview(subCommand, flags);
      break;
      
    case 'stats':
      await handleStats();
      break;
      
    case 'sources':
      await handleSources();
      break;
      
    case 'test':
      await handleTest(subCommand);
      break;
      
    case 'dashboard':
      await handleDashboard();
      break;
      
    case 'config':
      handleConfig();
      break;
      
    case 'help':
    default:
      showHelp();
  }
}

// ================================
// Discover Command
// ================================
async function handleDiscover(type?: string) {
  console.log('🔍 Starting discovery...\n');
  
  switch (type) {
    case 'news':
      console.log('📰 Discovering news from all sources...\n');
      const newsResult = await runNewsPipeline();
      printPipelineResult('News', newsResult);
      break;
      
    case 'jobs':
      console.log('💼 Discovering jobs from all sources...\n');
      const jobsResult = await runJobsPipeline();
      printPipelineResult('Jobs', jobsResult);
      break;
      
    case 'all':
    default:
      console.log('📰💼 Discovering news and jobs from all sources...\n');
      const fullResult = await runFullPipeline();
      printPipelineResult('News', fullResult.news);
      console.log('');
      printPipelineResult('Jobs', fullResult.jobs);
  }
}

function printPipelineResult(type: string, result: any) {
  const status = result.success ? '✅' : '❌';
  console.log(`${status} ${type} Pipeline ${result.success ? 'Complete' : 'Failed'}`);
  console.log(`   Phase: ${result.phase}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log('   Stats:');
  console.log(`   ├─ Discovered: ${result.stats.discovered}`);
  console.log(`   ├─ Unique: ${result.stats.unique}`);
  console.log(`   ├─ Verified: ${result.stats.verified}`);
  console.log(`   ├─ Pending Review: ${result.stats.pendingReview}`);
  console.log(`   ├─ Rejected: ${result.stats.rejected}`);
  console.log(`   └─ Errors: ${result.stats.errors}`);
  
  if (result.errors.length > 0) {
    console.log('   Errors:');
    for (const err of result.errors.slice(0, 5)) {
      console.log(`   ⚠️  ${err.source}: ${err.error}`);
    }
    if (result.errors.length > 5) {
      console.log(`   ... and ${result.errors.length - 5} more errors`);
    }
  }
}

// ================================
// Publish Command
// ================================
async function handlePublish(type?: string, flags?: string[]) {
  const limit = parseInt(flags?.find(f => f.startsWith('--limit='))?.split('=')[1] || '1');
  const preview = flags?.includes('--preview');
  
  console.log(`📤 Publishing ${type || 'content'}...\n`);
  
  // Initialize Telegram
  initTelegramBot();
  const connected = await testTelegramConnection();
  if (!connected.success) {
    console.error('❌ Cannot connect to Telegram:', connected.error);
    return;
  }
  
  switch (type) {
    case 'news':
      await publishNews(limit, preview);
      break;
      
    case 'job':
    case 'jobs':
      await publishJobs(limit, preview);
      break;
      
    default:
      console.log('Specify what to publish: news or jobs');
      console.log('Usage: npm run cli publish news --limit=3');
  }
}

async function publishNews(limit: number, preview: boolean) {
  // Get approved or high-confidence pending news
  const newsItems = await db.select()
    .from(schema.news)
    .where(
      or(
        eq(schema.news.status, 'approved'),
        and(
          eq(schema.news.status, 'pending_review'),
          // Only auto-publish high verification score items
        )
      )
    )
    .orderBy(desc(schema.news.priority), desc(schema.news.verificationScore))
    .limit(limit);
  
  if (newsItems.length === 0) {
    console.log('No news items ready to publish');
    console.log('Run: npm run cli review news --approve to approve pending items');
    return;
  }
  
  console.log(`Found ${newsItems.length} news items to publish\n`);
  
  for (const news of newsItems) {
    console.log('─'.repeat(60));
    console.log(`📰 ${news.title}`);
    console.log(`   Category: ${news.category} | Score: ${news.verificationScore}`);
    console.log(`   Source: ${news.sourceName}`);
    
    if (preview) {
      console.log('\n   Preview:');
      console.log(news.telegramContent?.text?.slice(0, 200) + '...');
      console.log('\n   [Preview mode - not publishing]');
      continue;
    }
    
    if (!news.telegramContent) {
      console.log('   ⚠️ No Telegram content generated');
      continue;
    }
    
    const result = await publishNewsToTelegram(news.telegramContent);
    
    if (result.success) {
      console.log(`   ✅ Published! Message ID: ${result.messageId}`);
      
      // Update status
      await db.update(schema.news)
        .set({ 
          status: 'published', 
          approvedAt: new Date().toISOString() 
        })
        .where(eq(schema.news.id, news.id));
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    // Small delay between posts
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n─'.repeat(60));
  console.log(`✅ Publishing complete`);
}

async function publishJobs(limit: number, preview: boolean) {
  const jobItems = await db.select()
    .from(schema.jobs)
    .where(
      or(
        eq(schema.jobs.status, 'approved'),
        eq(schema.jobs.status, 'pending_review')
      )
    )
    .orderBy(desc(schema.jobs.priority), desc(schema.jobs.verificationScore))
    .limit(limit);
  
  if (jobItems.length === 0) {
    console.log('No job items ready to publish');
    return;
  }
  
  console.log(`Found ${jobItems.length} jobs to publish\n`);
  
  for (const job of jobItems) {
    console.log('─'.repeat(60));
    console.log(`💼 ${job.title} @ ${job.companyName}`);
    console.log(`   Remote: ${job.isRemote ? 'Yes' : 'No'} | Worldwide: ${job.acceptsWorldwide ? 'Yes' : 'No'}`);
    console.log(`   Experience: ${job.experienceLevel || 'Not specified'}`);
    
    if (preview) {
      console.log('\n   Preview:');
      console.log(job.telegramContent?.text?.slice(0, 200) + '...');
      console.log('\n   [Preview mode - not publishing]');
      continue;
    }
    
    if (!job.telegramContent) {
      console.log('   ⚠️ No Telegram content generated');
      continue;
    }
    
    const result = await publishJobToTelegram(job.telegramContent);
    
    if (result.success) {
      console.log(`   ✅ Published! Message ID: ${result.messageId}`);
      
      await db.update(schema.jobs)
        .set({ 
          status: 'published', 
          approvedAt: new Date().toISOString() 
        })
        .where(eq(schema.jobs.id, job.id));
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n─'.repeat(60));
  console.log(`✅ Publishing complete`);
}

// ================================
// Review Command
// ================================
async function handleReview(type?: string, flags?: string[]) {
  const limit = parseInt(flags?.find(f => f.startsWith('--limit='))?.split('=')[1] || '10');
  const approve = flags?.includes('--approve');
  const reject = flags?.includes('--reject');
  const id = flags?.find(f => f.startsWith('--id='))?.split('=')[1];
  
  console.log(`📋 Review ${type || 'content'}...\n`);
  
  switch (type) {
    case 'news':
      if (id && approve) {
        await approveNewsById(id);
      } else if (id && reject) {
        await rejectNewsById(id);
      } else {
        await listPendingNews(limit);
      }
      break;
      
    case 'jobs':
      if (id && approve) {
        await approveJobById(id);
      } else if (id && reject) {
        await rejectJobById(id);
      } else {
        await listPendingJobs(limit);
      }
      break;
      
    default:
      console.log('Specify what to review: news or jobs');
      console.log('Usage:');
      console.log('  npm run cli review news              # List pending news');
      console.log('  npm run cli review news --approve --id=xxx  # Approve specific');
      console.log('  npm run cli review jobs --limit=20   # List 20 pending jobs');
  }
}

async function listPendingNews(limit: number) {
  const items = await db.select()
    .from(schema.news)
    .where(eq(schema.news.status, 'pending_review'))
    .orderBy(desc(schema.news.priority), desc(schema.news.verificationScore))
    .limit(limit);
  
  console.log(`📰 Pending News (${items.length} shown)\n`);
  console.log('─'.repeat(80));
  
  for (const n of items) {
    const scoreBar = '█'.repeat(Math.floor((n.verificationScore || 0) / 10)) + 
                    '░'.repeat(10 - Math.floor((n.verificationScore || 0) / 10));
    console.log(`ID: ${n.id.slice(0, 8)}...`);
    console.log(`📰 ${n.title.slice(0, 70)}${n.title.length > 70 ? '...' : ''}`);
    console.log(`   Category: ${n.category.padEnd(12)} Score: [${scoreBar}] ${n.verificationScore}%`);
    console.log(`   Source: ${n.sourceName}`);
    console.log(`   URL: ${n.sourceUrl}`);
    console.log('─'.repeat(80));
  }
  
  console.log(`\nTo approve: npm run cli review news --approve --id=<id>`);
  console.log(`To reject:  npm run cli review news --reject --id=<id>`);
}

async function listPendingJobs(limit: number) {
  const items = await db.select()
    .from(schema.jobs)
    .where(eq(schema.jobs.status, 'pending_review'))
    .orderBy(desc(schema.jobs.priority), desc(schema.jobs.verificationScore))
    .limit(limit);
  
  console.log(`💼 Pending Jobs (${items.length} shown)\n`);
  console.log('─'.repeat(80));
  
  for (const j of items) {
    const scoreBar = '█'.repeat(Math.floor((j.verificationScore || 0) / 10)) + 
                    '░'.repeat(10 - Math.floor((j.verificationScore || 0) / 10));
    console.log(`ID: ${j.id.slice(0, 8)}...`);
    console.log(`💼 ${j.title.slice(0, 50)} @ ${j.companyName}`);
    console.log(`   Remote: ${j.isRemote ? '✓' : '✗'} | Worldwide: ${j.acceptsWorldwide ? '✓' : '✗'} | Level: ${j.experienceLevel || 'N/A'}`);
    console.log(`   Score: [${scoreBar}] ${j.verificationScore}%`);
    console.log(`   Skills: ${j.requiredSkills?.slice(0, 5).join(', ') || 'N/A'}`);
    console.log('─'.repeat(80));
  }
  
  console.log(`\nTo approve: npm run cli review jobs --approve --id=<id>`);
}

async function approveNewsById(id: string) {
  const fullId = await findFullId(schema.news, id);
  if (!fullId) {
    console.log(`❌ News with ID starting with "${id}" not found`);
    return;
  }
  
  await db.update(schema.news)
    .set({ status: 'approved', approvedAt: new Date().toISOString() })
    .where(eq(schema.news.id, fullId));
  
  console.log(`✅ News ${id}... approved`);
}

async function rejectNewsById(id: string) {
  const fullId = await findFullId(schema.news, id);
  if (!fullId) {
    console.log(`❌ News with ID starting with "${id}" not found`);
    return;
  }
  
  await db.update(schema.news)
    .set({ status: 'rejected', rejectionReason: 'Manual rejection' })
    .where(eq(schema.news.id, fullId));
  
  console.log(`✅ News ${id}... rejected`);
}

async function approveJobById(id: string) {
  const fullId = await findFullId(schema.jobs, id);
  if (!fullId) {
    console.log(`❌ Job with ID starting with "${id}" not found`);
    return;
  }
  
  await db.update(schema.jobs)
    .set({ status: 'approved', approvedAt: new Date().toISOString() })
    .where(eq(schema.jobs.id, fullId));
  
  console.log(`✅ Job ${id}... approved`);
}

async function rejectJobById(id: string) {
  const fullId = await findFullId(schema.jobs, id);
  if (!fullId) {
    console.log(`❌ Job with ID starting with "${id}" not found`);
    return;
  }
  
  await db.update(schema.jobs)
    .set({ status: 'rejected', rejectionReason: 'Manual rejection' })
    .where(eq(schema.jobs.id, fullId));
  
  console.log(`✅ Job ${id}... rejected`);
}

async function findFullId(table: any, partialId: string): Promise<string | null> {
  const items = await db.select({ id: table.id }).from(table).limit(1000);
  const match = items.find(i => i.id.startsWith(partialId));
  return match?.id || null;
}

// ================================
// Stats Command
// ================================
async function handleStats() {
  console.log('📊 TechGig Radar Statistics\n');
  
  // News stats
  const newsTotal = await db.select({ count: count() }).from(schema.news);
  const newsPending = await db.select({ count: count() }).from(schema.news).where(eq(schema.news.status, 'pending_review'));
  const newsApproved = await db.select({ count: count() }).from(schema.news).where(eq(schema.news.status, 'approved'));
  const newsPublished = await db.select({ count: count() }).from(schema.news).where(eq(schema.news.status, 'published'));
  const newsRejected = await db.select({ count: count() }).from(schema.news).where(eq(schema.news.status, 'rejected'));
  
  console.log('📰 News');
  console.log('─'.repeat(40));
  console.log(`   Total:          ${newsTotal[0].count}`);
  console.log(`   Pending Review: ${newsPending[0].count}`);
  console.log(`   Approved:       ${newsApproved[0].count}`);
  console.log(`   Published:      ${newsPublished[0].count}`);
  console.log(`   Rejected:       ${newsRejected[0].count}`);
  
  // Jobs stats
  const jobsTotal = await db.select({ count: count() }).from(schema.jobs);
  const jobsPending = await db.select({ count: count() }).from(schema.jobs).where(eq(schema.jobs.status, 'pending_review'));
  const jobsApproved = await db.select({ count: count() }).from(schema.jobs).where(eq(schema.jobs.status, 'approved'));
  const jobsPublished = await db.select({ count: count() }).from(schema.jobs).where(eq(schema.jobs.status, 'published'));
  
  console.log('\n💼 Jobs');
  console.log('─'.repeat(40));
  console.log(`   Total:          ${jobsTotal[0].count}`);
  console.log(`   Pending Review: ${jobsPending[0].count}`);
  console.log(`   Approved:       ${jobsApproved[0].count}`);
  console.log(`   Published:      ${jobsPublished[0].count}`);
  
  // Category breakdown for news
  const categories = await db.select({
    category: schema.news.category,
    count: count(),
  }).from(schema.news).groupBy(schema.news.category);
  
  console.log('\n📊 News by Category');
  console.log('─'.repeat(40));
  for (const cat of categories.sort((a, b) => b.count - a.count)) {
    const bar = '█'.repeat(Math.min(20, Math.floor(cat.count / 50)));
    console.log(`   ${cat.category.padEnd(12)} ${bar} ${cat.count}`);
  }
  
  // Top sources
  const sources = await db.select({
    source: schema.news.sourceName,
    count: count(),
  }).from(schema.news).groupBy(schema.news.sourceName).limit(10);
  
  console.log('\n📰 Top News Sources');
  console.log('─'.repeat(40));
  for (const src of sources.sort((a, b) => b.count - a.count).slice(0, 5)) {
    console.log(`   ${(src.source || 'Unknown').slice(0, 25).padEnd(25)} ${src.count}`);
  }
}

// ================================
// Sources Command
// ================================
async function handleSources() {
  console.log('📋 Configured Sources\n');
  
  const newsSources = getActiveSources('news');
  const jobSources = getActiveSources('jobs');
  
  console.log('📰 News Sources:');
  console.log('─'.repeat(60));
  for (const source of newsSources) {
    const reliability = '█'.repeat(Math.floor(source.reliabilityScore / 10)) + 
                       '░'.repeat(10 - Math.floor(source.reliabilityScore / 10));
    console.log(`  ${source.isPrimarySource ? '⭐' : '  '} ${source.name.padEnd(25)} [${reliability}] ${source.reliabilityScore}%`);
  }
  
  console.log('\n💼 Job Sources:');
  console.log('─'.repeat(60));
  for (const source of jobSources) {
    const reliability = '█'.repeat(Math.floor(source.reliabilityScore / 10)) + 
                       '░'.repeat(10 - Math.floor(source.reliabilityScore / 10));
    console.log(`  ${source.isPrimarySource ? '⭐' : '  '} ${source.name.padEnd(25)} [${reliability}] ${source.reliabilityScore}%`);
  }
  
  console.log(`\n📊 Total: ${newsSources.length} news sources, ${jobSources.length} job sources`);
}

// ================================
// Test Command
// ================================
async function handleTest(service?: string) {
  console.log('🧪 Running tests...\n');
  
  switch (service) {
    case 'telegram':
      console.log('Testing Telegram connection...');
      initTelegramBot();
      const telegramResult = await testTelegramConnection();
      if (telegramResult.success) {
        console.log(`✅ Telegram connected!`);
        console.log(`   Bot: @${telegramResult.botInfo?.username}`);
        console.log(`   ID: ${telegramResult.botInfo?.id}`);
      } else {
        console.log(`❌ Telegram connection failed: ${telegramResult.error}`);
      }
      break;
      
    case 'db':
      console.log('Testing database connection...');
      try {
        const result = await db.select({ count: count() }).from(schema.news);
        console.log(`✅ Database connected! (${result[0].count} news items)`);
      } catch (error) {
        console.log(`❌ Database connection failed: ${error}`);
      }
      break;
      
    default:
      console.log('Available tests: telegram, db');
      console.log('Usage: npm run cli test telegram');
  }
}

// ================================
// Dashboard Command
// ================================
async function handleDashboard() {
  console.log('🎯 Starting Admin Dashboard...\n');
  const { startDashboard } = await import('../dashboard/server.js');
  startDashboard(config.server.port);
  // Keep process alive
  await new Promise(() => {});
}

// ================================
// Config Command
// ================================
function handleConfig() {
  console.log('⚙️  Current Configuration\n');
  
  console.log('Server:');
  console.log(`  Port: ${config.server.port}`);
  console.log(`  Environment: ${config.env}`);
  
  console.log('\nDiscovery:');
  console.log(`  News check interval: ${config.discovery.newsCheckInterval} minutes`);
  console.log(`  Jobs check interval: ${config.discovery.jobsCheckInterval} minutes`);
  console.log(`  Max news per day: ${config.discovery.maxNewsPerDay}`);
  console.log(`  Max jobs per day: ${config.discovery.maxJobsPerDay}`);
  
  console.log('\nVerification:');
  console.log(`  Minimum score: ${config.verification.minScore}`);
  console.log(`  Auto-approve threshold: ${config.verification.autoApproveThreshold}`);
  
  console.log('\nFeatures:');
  console.log(`  Auto-publish: ${config.features.autoPublish ? 'Enabled' : 'Disabled'}`);
  console.log(`  Require human approval: ${config.features.requireHumanApproval ? 'Yes' : 'No'}`);
  
  console.log('\nPlatforms:');
  console.log(`  Telegram: ${config.telegram.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Instagram: ${config.instagram.enabled ? 'Enabled' : 'Disabled'}`);
  
  console.log('\nAPI Keys:');
  console.log(`  OpenAI: ${config.ai.openaiKey ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Anthropic: ${config.ai.anthropicKey ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Telegram Bot: ${config.telegram.botToken ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Instagram: ${config.instagram.accessToken ? '✓ Configured' : '✗ Not set'}`);
}

// ================================
// Help
// ================================
function showHelp() {
  console.log(`
Commands:
  discover [type]         Run discovery pipeline
                          - news: Discover tech news only
                          - jobs: Discover jobs only  
                          - all:  Discover both (default)

  publish [type] [flags]  Publish content to Telegram
                          - news: Publish approved/pending news
                          - jobs: Publish approved/pending jobs
                          Flags:
                          --limit=N    Publish up to N items (default: 1)
                          --preview    Preview without publishing

  review [type] [flags]   Review and approve/reject content
                          - news: Review pending news
                          - jobs: Review pending jobs
                          Flags:
                          --limit=N    Show N items (default: 10)
                          --approve --id=xxx  Approve item by ID
                          --reject --id=xxx   Reject item by ID

  stats                   Show database statistics

  dashboard               Start the admin web dashboard

  sources                 List all configured sources

  test [service]          Test connections
                          - telegram: Test Telegram bot
                          - db: Test database connection

  config                  Show current configuration

  help                    Show this help message

Examples:
  npm run cli discover news
  npm run cli publish news --limit=3
  npm run cli publish news --preview
  npm run cli review news
  npm run cli review news --approve --id=abc123
  npm run cli stats
`);
}

// ================================
// Run
// ================================
main().catch((error) => {
  logger.error({ error }, 'CLI error');
  console.error('Fatal error:', error);
  process.exit(1);
});
