import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, desc, and, inArray, count, sql } from 'drizzle-orm';
import { createLogger } from '../utils/logger.js';
import { generateTelegramNewsContent, generateTelegramJobContent } from '../content/generator.js';
import { publishNewsToTelegram, publishJobToTelegram } from '../publisher/telegram/client.js';
import { config } from '../config/index.js';

const logger = createLogger('api');

export async function registerApiRoutes(app: FastifyInstance) {
  // ================================
  // Dashboard Stats
  // ================================
  app.get('/api/stats', async () => {
    const [newsStats] = await db
      .select({
        total: count(),
        pendingReview: sql<number>`count(*) filter (where ${schema.news.status} = 'pending_review')`,
        approved: sql<number>`count(*) filter (where ${schema.news.status} = 'approved')`,
        published: sql<number>`count(*) filter (where ${schema.news.status} = 'published')`,
        rejected: sql<number>`count(*) filter (where ${schema.news.status} = 'rejected')`,
      })
      .from(schema.news);
    
    const [jobStats] = await db
      .select({
        total: count(),
        pendingReview: sql<number>`count(*) filter (where ${schema.jobs.status} = 'pending_review')`,
        approved: sql<number>`count(*) filter (where ${schema.jobs.status} = 'approved')`,
        published: sql<number>`count(*) filter (where ${schema.jobs.status} = 'published')`,
        rejected: sql<number>`count(*) filter (where ${schema.jobs.status} = 'rejected')`,
      })
      .from(schema.jobs);
    
    return { news: newsStats, jobs: jobStats };
  });
  
  // ================================
  // News Endpoints
  // ================================
  app.get('/api/news', async (request) => {
    const query = request.query as { status?: string; limit?: string; offset?: string };
    const limit = parseInt(query.limit || '50', 10);
    const offset = parseInt(query.offset || '0', 10);
    
    let whereClause = undefined;
    if (query.status) {
      whereClause = eq(schema.news.status, query.status);
    }
    
    const items = await db.query.news.findMany({
      where: whereClause,
      orderBy: [desc(schema.news.discoveredAt)],
      limit,
      offset,
    });
    
    return { items, count: items.length };
  });
  
  app.get('/api/news/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const item = await db.query.news.findFirst({
      where: eq(schema.news.id, id),
    });
    
    if (!item) {
      return reply.code(404).send({ error: 'Not found' });
    }
    
    return item;
  });
  
  app.post('/api/news/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    await db
      .update(schema.news)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(schema.news.id, id));
    
    logger.info({ newsId: id }, 'News approved');
    
    return { success: true };
  });
  
  app.post('/api/news/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason?: string };
    
    await db
      .update(schema.news)
      .set({
        status: 'rejected',
        rejectionReason: body.reason || 'Rejected by admin',
        updatedAt: new Date(),
      })
      .where(eq(schema.news.id, id));
    
    logger.info({ newsId: id, reason: body.reason }, 'News rejected');
    
    return { success: true };
  });
  
  app.post('/api/news/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const newsItem = await db.query.news.findFirst({
      where: eq(schema.news.id, id),
    });
    
    if (!newsItem) {
      return reply.code(404).send({ error: 'Not found' });
    }
    
    if (newsItem.status !== 'approved') {
      return reply.code(400).send({ error: 'News must be approved before publishing' });
    }
    
    // Generate content if not already generated
    let content = newsItem.telegramContent;
    if (!content) {
      content = generateTelegramNewsContent(newsItem);
    }
    
    // Publish to Telegram
    const result = await publishNewsToTelegram(content as any);
    
    if (result.success) {
      await db
        .update(schema.news)
        .set({
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(schema.news.id, id));
      
      // Record publication
      await db.insert(schema.publications).values({
        contentType: 'news',
        contentId: id,
        platform: 'telegram',
        platformPostId: result.messageId?.toString(),
        status: 'published',
        publishedAt: new Date(),
      });
      
      logger.info({ newsId: id, messageId: result.messageId }, 'News published to Telegram');
    }
    
    return result;
  });
  
  // ================================
  // Jobs Endpoints
  // ================================
  app.get('/api/jobs', async (request) => {
    const query = request.query as { status?: string; limit?: string; offset?: string };
    const limit = parseInt(query.limit || '50', 10);
    const offset = parseInt(query.offset || '0', 10);
    
    let whereClause = undefined;
    if (query.status) {
      whereClause = eq(schema.jobs.status, query.status);
    }
    
    const items = await db.query.jobs.findMany({
      where: whereClause,
      orderBy: [desc(schema.jobs.discoveredAt)],
      limit,
      offset,
    });
    
    return { items, count: items.length };
  });
  
  app.get('/api/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const item = await db.query.jobs.findFirst({
      where: eq(schema.jobs.id, id),
    });
    
    if (!item) {
      return reply.code(404).send({ error: 'Not found' });
    }
    
    return item;
  });
  
  app.post('/api/jobs/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    await db
      .update(schema.jobs)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(schema.jobs.id, id));
    
    logger.info({ jobId: id }, 'Job approved');
    
    return { success: true };
  });
  
  app.post('/api/jobs/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason?: string };
    
    await db
      .update(schema.jobs)
      .set({
        status: 'rejected',
        rejectionReason: body.reason || 'Rejected by admin',
        updatedAt: new Date(),
      })
      .where(eq(schema.jobs.id, id));
    
    logger.info({ jobId: id, reason: body.reason }, 'Job rejected');
    
    return { success: true };
  });
  
  app.post('/api/jobs/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const jobItem = await db.query.jobs.findFirst({
      where: eq(schema.jobs.id, id),
    });
    
    if (!jobItem) {
      return reply.code(404).send({ error: 'Not found' });
    }
    
    if (jobItem.status !== 'approved') {
      return reply.code(400).send({ error: 'Job must be approved before publishing' });
    }
    
    // Generate content if not already generated
    let content = jobItem.telegramContent;
    if (!content) {
      content = generateTelegramJobContent(jobItem);
    }
    
    // Publish to Telegram
    const result = await publishJobToTelegram(content as any);
    
    if (result.success) {
      await db
        .update(schema.jobs)
        .set({
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(schema.jobs.id, id));
      
      // Record publication
      await db.insert(schema.publications).values({
        contentType: 'job',
        contentId: id,
        platform: 'telegram',
        platformPostId: result.messageId?.toString(),
        status: 'published',
        publishedAt: new Date(),
      });
      
      logger.info({ jobId: id, messageId: result.messageId }, 'Job published to Telegram');
    }
    
    return result;
  });
  
  // ================================
  // Review Queue
  // ================================
  app.get('/api/review/queue', async () => {
    const pendingNews = await db.query.news.findMany({
      where: eq(schema.news.status, 'pending_review'),
      orderBy: [desc(schema.news.priority), desc(schema.news.discoveredAt)],
      limit: 20,
    });
    
    const pendingJobs = await db.query.jobs.findMany({
      where: eq(schema.jobs.status, 'pending_review'),
      orderBy: [desc(schema.jobs.priority), desc(schema.jobs.discoveredAt)],
      limit: 20,
    });
    
    return {
      news: pendingNews,
      jobs: pendingJobs,
      totalPending: pendingNews.length + pendingJobs.length,
    };
  });
  
  // Bulk actions
  app.post('/api/review/bulk', async (request, reply) => {
    const body = request.body as {
      action: 'approve' | 'reject';
      type: 'news' | 'job';
      ids: string[];
      reason?: string;
    };
    
    if (!body.ids || body.ids.length === 0) {
      return reply.code(400).send({ error: 'No IDs provided' });
    }
    
    const table = body.type === 'news' ? schema.news : schema.jobs;
    const updateData = body.action === 'approve'
      ? {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: 'admin',
          updatedAt: new Date(),
        }
      : {
          status: 'rejected',
          rejectionReason: body.reason || 'Bulk rejected',
          updatedAt: new Date(),
        };
    
    await db
      .update(table)
      .set(updateData as any)
      .where(inArray(table.id, body.ids));
    
    logger.info({
      action: body.action,
      type: body.type,
      count: body.ids.length,
    }, 'Bulk action completed');
    
    return { success: true, count: body.ids.length };
  });
  
  // ================================
  // Publications
  // ================================
  app.get('/api/publications', async (request) => {
    const query = request.query as { platform?: string; limit?: string };
    const limit = parseInt(query.limit || '50', 10);
    
    const items = await db.query.publications.findMany({
      orderBy: [desc(schema.publications.createdAt)],
      limit,
    });
    
    return { items };
  });
}
