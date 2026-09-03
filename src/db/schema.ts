import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ================================
// Sources Table
// ================================
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  type: text('type').notNull(), // rss, api, scraper
  url: text('url').notNull(),
  category: text('category').notNull(), // news, jobs
  
  // Reliability scoring
  reliabilityScore: integer('reliability_score').default(50),
  isPrimarySource: integer('is_primary_source', { mode: 'boolean' }).default(false),
  
  // Configuration (JSON stored as text)
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
  checkIntervalMinutes: integer('check_interval_minutes').default(30),
  lastCheckedAt: text('last_checked_at'),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  errorCount: integer('error_count').default(0),
  lastError: text('last_error'),
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ================================
// News Table
// ================================
export const news = sqliteTable('news', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),
  
  // Source information
  sourceId: text('source_id').references(() => sources.id),
  sourceUrl: text('source_url').notNull(),
  sourceName: text('source_name'),
  originalPublishedAt: text('original_published_at'),
  discoveredAt: text('discovered_at').$defaultFn(() => new Date().toISOString()),
  
  // Categorization
  category: text('category').notNull(), // ai, security, cloud, devops, webdev, mobile, startup
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  
  // Verification
  verificationScore: integer('verification_score'),
  verificationStatus: text('verification_status').default('pending'), // pending, verified, rejected
  verificationNotes: text('verification_notes'),
  verifiedAt: text('verified_at'),
  
  // Review and Publishing
  status: text('status').default('discovered'), // discovered, pending_review, approved, rejected, published
  approvedAt: text('approved_at'),
  approvedBy: text('approved_by'),
  rejectionReason: text('rejection_reason'),
  
  // Deduplication
  fingerprint: text('fingerprint').unique(),
  urlHash: text('url_hash'),
  
  // Generated content (cached)
  telegramContent: text('telegram_content', { mode: 'json' }).$type<{
    text: string;
    parseMode: string;
    generatedAt: string;
  }>(),
  instagramContent: text('instagram_content', { mode: 'json' }).$type<{
    caption: string;
    slides: Array<{ title: string; content: string }>;
    generatedAt: string;
  }>(),
  
  // Priority for publishing
  priority: integer('priority').default(50), // 0-100, higher = more important
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ================================
// Jobs Table
// ================================
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  
  // Company information
  companyName: text('company_name').notNull(),
  companyUrl: text('company_url'),
  companyLocation: text('company_location'),
  companyDescription: text('company_description'),
  
  // Job details
  description: text('description'),
  requiredSkills: text('required_skills', { mode: 'json' }).$type<string[]>(),
  experienceLevel: text('experience_level'), // fresher, junior, mid, senior
  jobType: text('job_type'), // full-time, part-time, contract, freelance, internship
  
  // Remote/Global availability
  isRemote: integer('is_remote', { mode: 'boolean' }),
  acceptsWorldwide: integer('accepts_worldwide', { mode: 'boolean' }),
  locationRestrictions: text('location_restrictions', { mode: 'json' }).$type<string[]>(),
  timezone: text('timezone'),
  
  // Compensation
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency').default('USD'),
  salaryPeriod: text('salary_period'), // hourly, monthly, yearly
  
  // Application
  applicationUrl: text('application_url').notNull(),
  applicationDeadline: text('application_deadline'),
  
  // Source
  sourceId: text('source_id').references(() => sources.id),
  sourceUrl: text('source_url').notNull(),
  sourceName: text('source_name'),
  discoveredAt: text('discovered_at').$defaultFn(() => new Date().toISOString()),
  
  // Verification
  verificationScore: integer('verification_score'),
  verificationStatus: text('verification_status').default('pending'),
  verificationNotes: text('verification_notes'),
  companyVerified: integer('company_verified', { mode: 'boolean' }).default(false),
  urlVerified: integer('url_verified', { mode: 'boolean' }).default(false),
  verifiedAt: text('verified_at'),
  
  // Review and Publishing
  status: text('status').default('discovered'),
  approvedAt: text('approved_at'),
  approvedBy: text('approved_by'),
  rejectionReason: text('rejection_reason'),
  
  // Deduplication
  fingerprint: text('fingerprint').unique(),
  
  // Generated content
  telegramContent: text('telegram_content', { mode: 'json' }).$type<{
    text: string;
    parseMode: string;
    generatedAt: string;
  }>(),
  instagramContent: text('instagram_content', { mode: 'json' }).$type<{
    caption: string;
    cardData: Record<string, unknown>;
    generatedAt: string;
  }>(),
  
  // Priority
  priority: integer('priority').default(50),
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ================================
// Publications Table
// ================================
export const publications = sqliteTable('publications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  contentType: text('content_type').notNull(), // news, job
  contentId: text('content_id').notNull(),
  platform: text('platform').notNull(), // telegram, instagram
  
  // Platform-specific data
  platformPostId: text('platform_post_id'),
  platformUrl: text('platform_url'),
  
  // Media
  mediaUrls: text('media_urls', { mode: 'json' }).$type<string[]>(),
  
  // Status
  status: text('status').default('pending'), // pending, scheduled, publishing, published, failed
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Scheduling
  scheduledFor: text('scheduled_for'),
  publishedAt: text('published_at'),
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ================================
// Fingerprints Table (Deduplication)
// ================================
export const fingerprints = sqliteTable('fingerprints', {
  fingerprint: text('fingerprint').primaryKey(),
  contentType: text('content_type').notNull(),
  contentId: text('content_id').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ================================
// Audit Log Table
// ================================
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  adminUser: text('admin_user'),
  details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ================================
// Settings Table (Key-Value)
// ================================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).$type<unknown>(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ================================
// Relations
// ================================
export const sourcesRelations = relations(sources, ({ many }) => ({
  news: many(news),
  jobs: many(jobs),
}));

export const newsRelations = relations(news, ({ one, many }) => ({
  source: one(sources, {
    fields: [news.sourceId],
    references: [sources.id],
  }),
  publications: many(publications),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  source: one(sources, {
    fields: [jobs.sourceId],
    references: [sources.id],
  }),
  publications: many(publications),
}));

// ================================
// Types
// ================================
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Publication = typeof publications.$inferSelect;
export type NewPublication = typeof publications.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

// Status enums (for type safety in code)
export const NewsStatus = {
  DISCOVERED: 'discovered',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
} as const;

export const JobStatus = {
  DISCOVERED: 'discovered',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  EXPIRED: 'expired',
} as const;

export const VerificationStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export const PublicationStatus = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const;

export const NewsCategory = {
  AI: 'ai',
  SECURITY: 'security',
  CLOUD: 'cloud',
  DEVOPS: 'devops',
  WEBDEV: 'webdev',
  MOBILE: 'mobile',
  STARTUP: 'startup',
  PROGRAMMING: 'programming',
  GENERAL: 'general',
} as const;

export const ExperienceLevel = {
  FRESHER: 'fresher',
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
  LEAD: 'lead',
} as const;

export const JobType = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  FREELANCE: 'freelance',
  INTERNSHIP: 'internship',
} as const;
