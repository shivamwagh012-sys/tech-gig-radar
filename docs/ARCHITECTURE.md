# TechGig Radar - Architecture Document

> **Real Tech News. Real Global Opportunities.**

## Overview

TechGig Radar is an automated technology news and global job opportunity discovery platform that:
- Discovers and verifies technology news from reliable sources
- Finds legitimate remote/freelance opportunities from US-based companies
- Generates professional content for Telegram and Instagram
- Maintains strict verification standards before publishing

## Core Principles

1. **Accuracy Over Speed**: Never publish unverified or fabricated content
2. **Human-in-the-Loop**: All content requires approval until trust is established
3. **Source Transparency**: Always attribute and link to original sources
4. **Modular Architecture**: Each component is independently deployable and testable

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TechGig Radar                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Discovery  │    │ Verification │    │   Content    │                   │
│  │    Engine    │───▶│   Pipeline   │───▶│  Generator   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │    Sources   │    │   Dedup &    │    │    Media     │                   │
│  │   Registry   │    │   Storage    │    │  Generator   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                             │                   │                            │
│                             ▼                   ▼                            │
│                      ┌──────────────┐    ┌──────────────┐                   │
│                      │   Review     │    │  Publisher   │                   │
│                      │    Queue     │───▶│   Manager    │                   │
│                      └──────────────┘    └──────────────┘                   │
│                             │                   │                            │
│                             ▼                   ▼                            │
│                      ┌──────────────┐    ┌─────────┬─────────┐              │
│                      │    Admin     │    │Telegram │Instagram│              │
│                      │  Dashboard   │    │  Bot    │  API    │              │
│                      └──────────────┘    └─────────┴─────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Fastify (high-performance HTTP server)
- **Database**: PostgreSQL 15+ with Drizzle ORM
- **Queue**: BullMQ with Redis (job processing)
- **Cache**: Redis (deduplication, rate limiting)

### Frontend (Admin Dashboard)
- **Framework**: Next.js 14+ (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query

### AI & Content
- **LLM**: OpenAI GPT-4 / Claude API (content generation, verification)
- **Image Generation**: Sharp + HTML-to-Image (branded graphics)
- **Video Generation**: FFmpeg + Remotion (Reels/video content)

### External Integrations
- **Telegram**: Bot API v7+
- **Instagram**: Meta Graph API (Instagram Publishing)
- **News Sources**: RSS feeds, official APIs, web scraping (ethical)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Deployment**: Railway / Render / Self-hosted VPS
- **Monitoring**: Pino logging + optional Sentry

---

## Module Breakdown

### 1. Discovery Engine (`/src/discovery/`)

Responsible for finding new content from registered sources.

```
discovery/
├── sources/
│   ├── rss/              # RSS feed parsers
│   ├── api/              # Direct API integrations
│   └── scrapers/         # Ethical web scrapers
├── news/
│   └── news-discoverer.ts
├── jobs/
│   └── job-discoverer.ts
└── registry.ts           # Source configuration
```

**News Sources (Initial)**:
- Hacker News API (official)
- TechCrunch RSS
- The Verge RSS
- Ars Technica RSS
- Dev.to API
- GitHub Trending
- Product Hunt API
- OpenAI Blog RSS
- Google AI Blog RSS
- AWS News RSS
- Azure Updates RSS
- GCP Updates RSS

**Job Sources (Initial)**:
- RemoteOK API
- We Work Remotely (scraper)
- Remote.co
- AngelList/Wellfound API
- LinkedIn (limited, official API)
- HN Who's Hiring threads
- GitHub Jobs (archived, alternatives)

### 2. Verification Pipeline (`/src/verification/`)

Ensures accuracy before content enters the review queue.

```
verification/
├── news/
│   ├── source-validator.ts    # Check source reliability
│   ├── date-validator.ts      # Ensure freshness
│   ├── fact-checker.ts        # AI-assisted verification
│   └── cross-reference.ts     # Multi-source validation
├── jobs/
│   ├── company-validator.ts   # Verify company exists
│   ├── listing-validator.ts   # Check job is active
│   ├── url-validator.ts       # Verify application links
│   └── scam-detector.ts       # Flag suspicious listings
└── scoring.ts                 # Confidence score calculation
```

**Verification Score Factors**:
| Factor | Weight | Description |
|--------|--------|-------------|
| Source Reliability | 30% | Known reliable vs unknown source |
| Freshness | 20% | Published within acceptable window |
| Cross-Reference | 20% | Confirmed by multiple sources |
| Company Verification | 15% | Company website, LinkedIn exists |
| Content Quality | 15% | No red flags, complete information |

**Score Thresholds**:
- **80-100**: Auto-approve (after trust established)
- **60-79**: Human review required
- **Below 60**: Auto-reject with logging

### 3. Deduplication System (`/src/dedup/`)

Prevents republishing same/similar content.

```
dedup/
├── fingerprint.ts      # Generate content fingerprints
├── similarity.ts       # Text similarity detection
├── url-normalizer.ts   # Normalize URLs for comparison
└── store.ts            # Fingerprint storage (Redis)
```

**Deduplication Strategies**:
1. **URL Normalization**: Strip tracking params, normalize domains
2. **Title Similarity**: Levenshtein distance + n-gram comparison
3. **Content Hash**: SimHash for semantic similarity
4. **Entity Matching**: Company + Job Title for jobs

### 4. Content Generator (`/src/content/`)

Creates platform-specific content from verified data.

```
content/
├── templates/
│   ├── telegram/
│   │   ├── news.ts
│   │   └── job.ts
│   └── instagram/
│       ├── news-carousel.ts
│       ├── job-post.ts
│       └── reel-script.ts
├── generator.ts         # Main content orchestrator
└── ai/
    ├── summarizer.ts    # AI summarization
    ├── formatter.ts     # Platform formatting
    └── prompts.ts       # Prompt templates
```

### 5. Media Generator (`/src/media/`)

Creates visual assets for Instagram.

```
media/
├── brand/
│   ├── colors.ts
│   ├── fonts.ts
│   └── templates/       # HTML templates for images
├── image/
│   ├── carousel.ts      # Multi-slide carousels
│   ├── job-card.ts      # Job opportunity graphics
│   └── renderer.ts      # HTML-to-image conversion
└── video/
    ├── reel.ts          # Short-form video
    ├── story.ts         # Story format
    └── compositor.ts    # FFmpeg orchestration
```

### 6. Publisher (`/src/publisher/`)

Handles authenticated publishing to platforms.

```
publisher/
├── telegram/
│   ├── client.ts        # Bot API wrapper
│   ├── news.ts          # News post formatting
│   ├── job.ts           # Job post formatting
│   └── media.ts         # Image/video sending
├── instagram/
│   ├── client.ts        # Graph API wrapper
│   ├── post.ts          # Single image posts
│   ├── carousel.ts      # Multi-image posts
│   └── reel.ts          # Video publishing
└── manager.ts           # Publishing orchestration
```

### 7. Review Queue (`/src/review/`)

Human-in-the-loop approval system.

```
review/
├── queue.ts             # Review queue management
├── actions.ts           # Approve/reject/edit actions
└── notifications.ts     # Admin notifications
```

**Review States**:
```
DISCOVERED → VERIFIED → PENDING_REVIEW → APPROVED → SCHEDULED → PUBLISHED
                ↓              ↓
             REJECTED      REJECTED
```

### 8. Admin Dashboard (`/src/dashboard/`)

Web interface for monitoring and control.

```
dashboard/
├── app/
│   ├── page.tsx              # Dashboard home
│   ├── news/
│   │   ├── page.tsx          # News management
│   │   └── [id]/page.tsx     # News detail/edit
│   ├── jobs/
│   │   ├── page.tsx          # Jobs management
│   │   └── [id]/page.tsx     # Job detail/edit
│   ├── review/
│   │   └── page.tsx          # Review queue
│   ├── publishing/
│   │   └── page.tsx          # Publishing status
│   └── settings/
│       └── page.tsx          # Configuration
└── components/
    └── ...
```

### 9. Scheduler (`/src/scheduler/`)

Manages automated discovery and publishing schedules.

```
scheduler/
├── discovery.ts         # Scheduled source checks
├── publishing.ts        # Scheduled publishing
└── maintenance.ts       # Cleanup jobs
```

**Default Schedules**:
| Job | Frequency | Description |
|-----|-----------|-------------|
| News Discovery | Every 30 min | Check all news sources |
| Job Discovery | Every 2 hours | Check all job sources |
| Publishing Queue | Every 15 min | Process approved content |
| Cleanup | Daily | Archive old content |

---

## Database Schema

### Core Tables

```sql
-- News articles
CREATE TABLE news (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source_id UUID REFERENCES sources(id),
    source_url TEXT NOT NULL,
    original_published_at TIMESTAMPTZ,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Categorization
    category TEXT NOT NULL,  -- ai, security, cloud, etc.
    tags TEXT[],
    
    -- Verification
    verification_score INTEGER,
    verification_status TEXT DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    
    -- Publishing
    status TEXT DEFAULT 'discovered',
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    
    -- Deduplication
    fingerprint TEXT UNIQUE,
    
    -- Generated content
    telegram_content JSONB,
    instagram_content JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job opportunities
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    company_url TEXT,
    company_location TEXT,
    
    -- Job details
    description TEXT,
    required_skills TEXT[],
    experience_level TEXT,  -- fresher, junior, mid, senior
    job_type TEXT,          -- full-time, contract, freelance
    
    -- Remote/Global
    is_remote BOOLEAN,
    accepts_worldwide BOOLEAN,
    location_restrictions TEXT[],
    
    -- Compensation
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT,
    
    -- Application
    application_url TEXT NOT NULL,
    application_deadline TIMESTAMPTZ,
    
    -- Source
    source_id UUID REFERENCES sources(id),
    source_url TEXT NOT NULL,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Verification
    verification_score INTEGER,
    verification_status TEXT DEFAULT 'pending',
    company_verified BOOLEAN DEFAULT FALSE,
    url_verified BOOLEAN DEFAULT FALSE,
    
    -- Publishing
    status TEXT DEFAULT 'discovered',
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    
    -- Deduplication
    fingerprint TEXT UNIQUE,
    
    -- Generated content
    telegram_content JSONB,
    instagram_content JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content sources
CREATE TABLE sources (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,        -- rss, api, scraper
    url TEXT NOT NULL,
    category TEXT NOT NULL,    -- news, jobs
    
    -- Reliability
    reliability_score INTEGER DEFAULT 50,
    is_primary_source BOOLEAN DEFAULT FALSE,
    
    -- Configuration
    config JSONB,
    check_interval_minutes INTEGER DEFAULT 30,
    last_checked_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publishing history
CREATE TABLE publications (
    id UUID PRIMARY KEY,
    content_type TEXT NOT NULL,  -- news, job
    content_id UUID NOT NULL,
    platform TEXT NOT NULL,      -- telegram, instagram
    
    -- Platform-specific
    platform_post_id TEXT,
    platform_url TEXT,
    
    -- Media
    media_urls TEXT[],
    
    -- Status
    status TEXT DEFAULT 'pending',  -- pending, published, failed
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplication fingerprints
CREATE TABLE fingerprints (
    fingerprint TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    admin_user TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### Internal API (Admin Dashboard)

```
GET    /api/news                    # List news
GET    /api/news/:id                # Get news detail
PATCH  /api/news/:id                # Update news
POST   /api/news/:id/approve        # Approve for publishing
POST   /api/news/:id/reject         # Reject with reason

GET    /api/jobs                    # List jobs
GET    /api/jobs/:id                # Get job detail
PATCH  /api/jobs/:id                # Update job
POST   /api/jobs/:id/approve        # Approve for publishing
POST   /api/jobs/:id/reject         # Reject with reason

GET    /api/review/queue            # Get review queue
POST   /api/review/bulk-action      # Bulk approve/reject

GET    /api/publishing/status       # Publishing status
POST   /api/publishing/retry/:id    # Retry failed publish
GET    /api/publishing/scheduled    # Scheduled posts

GET    /api/sources                 # List sources
POST   /api/sources                 # Add source
PATCH  /api/sources/:id             # Update source
DELETE /api/sources/:id             # Remove source

GET    /api/analytics/overview      # Dashboard stats
GET    /api/analytics/publishing    # Publishing metrics
```

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/techgig_radar
REDIS_URL=redis://localhost:6379

# AI APIs
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHANNEL_ID=@TechGigRadar
TELEGRAM_ADMIN_CHAT_ID=123456789

# Instagram (Meta Graph API)
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
INSTAGRAM_ACCESS_TOKEN=...
FACEBOOK_PAGE_ID=...

# Application
NODE_ENV=production
PORT=3000
ADMIN_SECRET=...
JWT_SECRET=...

# Scheduling
NEWS_CHECK_INTERVAL_MINUTES=30
JOBS_CHECK_INTERVAL_MINUTES=120
MAX_NEWS_PER_DAY=10
MAX_JOBS_PER_DAY=5

# Feature flags
AUTO_PUBLISH_ENABLED=false
REQUIRE_HUMAN_APPROVAL=true
MIN_VERIFICATION_SCORE=60
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-3)
- [x] Project setup with TypeScript
- [ ] Database schema and migrations
- [ ] Source registry system
- [ ] News discovery (5 sources)
- [ ] Job discovery (3 sources)
- [ ] Verification pipeline
- [ ] Deduplication system
- [ ] Basic CLI for testing

### Phase 2: Telegram Integration (Week 3-4)
- [ ] Telegram bot setup
- [ ] Content generation (news)
- [ ] Content generation (jobs)
- [ ] Image generation for Telegram
- [ ] Publishing workflow
- [ ] Error handling & retries

### Phase 3: Instagram Integration (Week 4-6)
- [ ] Meta Graph API setup
- [ ] Carousel image generation
- [ ] Job card generation
- [ ] Reel/video generation (basic)
- [ ] Publishing workflow
- [ ] Caption optimization

### Phase 4: Admin Dashboard (Week 6-8)
- [ ] Next.js dashboard setup
- [ ] Review queue interface
- [ ] Content management
- [ ] Publishing controls
- [ ] Analytics views
- [ ] Settings management

---

## Security Considerations

1. **Credentials**: All secrets via environment variables
2. **API Access**: Rate limiting on admin endpoints
3. **Input Validation**: Strict validation on all inputs
4. **Content Safety**: AI content moderation before publishing
5. **Audit Trail**: Log all admin actions
6. **Source Verification**: Never trust scraped content blindly

---

## Monitoring & Alerts

1. **Source Health**: Alert when sources fail repeatedly
2. **Publishing Failures**: Notify on failed publications
3. **Queue Backlog**: Alert when review queue grows
4. **Error Rates**: Track and alert on error spikes
5. **Content Quality**: Monitor verification score trends

---

## Future Enhancements

1. **Multi-language support**: Translate content for global audiences
2. **Twitter/X integration**: Publish to additional platforms
3. **Newsletter**: Weekly digest via email
4. **API access**: Public API for third-party integrations
5. **ML improvements**: Better deduplication, categorization
6. **Mobile app**: For admin review on-the-go
