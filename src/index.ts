import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger } from './utils/logger.js';
import { config } from './config/index.js';
import { db } from './db/index.js';
import { runNewsPipeline, runJobsPipeline } from './pipeline/index.js';

const logger = createLogger('server');

async function main() {
  const app = Fastify({
    logger: false, // We use our own logger
  });
  
  // Register plugins
  await app.register(cors, {
    origin: config.isDev ? true : ['https://techgigradar.com'],
  });
  
  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  // API routes
  app.get('/api/stats', async () => {
    // TODO: Implement real stats from database
    return {
      news: {
        total: 0,
        pendingReview: 0,
        published: 0,
      },
      jobs: {
        total: 0,
        pendingReview: 0,
        published: 0,
      },
    };
  });
  
  // Manual trigger endpoints (protected in production)
  app.post('/api/discover/news', async (request, reply) => {
    if (config.isProd && !validateAdminAuth(request)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    const result = await runNewsPipeline();
    return result;
  });
  
  app.post('/api/discover/jobs', async (request, reply) => {
    if (config.isProd && !validateAdminAuth(request)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    const result = await runJobsPipeline();
    return result;
  });
  
  // Start server
  try {
    await app.listen({ port: config.server.port, host: '0.0.0.0' });
    logger.info({ port: config.server.port }, 'Server started');
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    TechGig Radar                          ║
║           Real Tech News. Real Global Opportunities.      ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at http://localhost:${config.server.port}                  ║
║  Environment: ${config.env.padEnd(42)}║
╚═══════════════════════════════════════════════════════════╝
`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

function validateAdminAuth(request: any): boolean {
  const authHeader = request.headers.authorization;
  if (!authHeader || !config.auth.adminSecret) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === config.auth.adminSecret;
}

main();
