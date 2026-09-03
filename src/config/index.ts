import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Environment schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  
  // AI APIs
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHANNEL_ID: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
  
  // Instagram
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_PAGE_ID: z.string().optional(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),
  ADMIN_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  
  // Discovery settings
  NEWS_CHECK_INTERVAL_MINUTES: z.string().transform(Number).default('30'),
  JOBS_CHECK_INTERVAL_MINUTES: z.string().transform(Number).default('120'),
  MAX_NEWS_PER_DAY: z.string().transform(Number).default('10'),
  MAX_JOBS_PER_DAY: z.string().transform(Number).default('5'),
  
  // Verification settings
  MIN_VERIFICATION_SCORE: z.string().transform(Number).default('60'),
  AUTO_APPROVE_THRESHOLD: z.string().transform(Number).default('80'),
  
  // Feature flags
  AUTO_PUBLISH_ENABLED: z.string().transform(v => v === 'true').default('false'),
  REQUIRE_HUMAN_APPROVAL: z.string().transform(v => v === 'true').default('true'),
  TELEGRAM_ENABLED: z.string().transform(v => v === 'true').default('true'),
  INSTAGRAM_ENABLED: z.string().transform(v => v === 'true').default('false'),
  
  // Content settings
  MAX_NEWS_AGE_HOURS: z.string().transform(Number).default('72'),
  MAX_JOB_AGE_DAYS: z.string().transform(Number).default('30'),
  
  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

// Parse environment
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parseResult.error.format());
  // Don't exit in development, just warn
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const env = parseResult.success ? parseResult.data : envSchema.parse({
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/techgig_radar',
});

// Export structured config
export const config = {
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  
  server: {
    port: env.PORT,
    host: env.HOST,
  },
  
  database: {
    url: env.DATABASE_URL,
  },
  
  redis: {
    url: env.REDIS_URL,
  },
  
  ai: {
    provider: env.AI_PROVIDER,
    openaiKey: env.OPENAI_API_KEY,
    anthropicKey: env.ANTHROPIC_API_KEY,
  },
  
  telegram: {
    enabled: env.TELEGRAM_ENABLED,
    botToken: env.TELEGRAM_BOT_TOKEN,
    channelId: env.TELEGRAM_CHANNEL_ID,
    adminChatId: env.TELEGRAM_ADMIN_CHAT_ID,
  },
  
  instagram: {
    enabled: env.INSTAGRAM_ENABLED,
    businessAccountId: env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
    accessToken: env.INSTAGRAM_ACCESS_TOKEN,
    facebookPageId: env.FACEBOOK_PAGE_ID,
  },
  
  discovery: {
    newsCheckInterval: env.NEWS_CHECK_INTERVAL_MINUTES,
    jobsCheckInterval: env.JOBS_CHECK_INTERVAL_MINUTES,
    maxNewsPerDay: env.MAX_NEWS_PER_DAY,
    maxJobsPerDay: env.MAX_JOBS_PER_DAY,
    maxNewsAgeHours: env.MAX_NEWS_AGE_HOURS,
    maxJobAgeDays: env.MAX_JOB_AGE_DAYS,
  },
  
  verification: {
    minScore: env.MIN_VERIFICATION_SCORE,
    autoApproveThreshold: env.AUTO_APPROVE_THRESHOLD,
  },
  
  features: {
    autoPublish: env.AUTO_PUBLISH_ENABLED,
    requireHumanApproval: env.REQUIRE_HUMAN_APPROVAL,
  },
  
  auth: {
    adminSecret: env.ADMIN_SECRET,
    jwtSecret: env.JWT_SECRET,
  },
  
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
