# TechGig Radar - Deployment Guide

## Free Cloud Deployment Options

### Option 1: Render.com (Recommended - Free Tier)
1. Sign up at https://render.com
2. Connect your GitHub repo
3. Create a new Web Service
4. Use these settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:server`
   - Environment: Node

### Option 2: Railway.app
1. Sign up at https://railway.app
2. Connect GitHub repo
3. Deploy automatically

### Option 3: Fly.io
1. Install flyctl CLI
2. Run `flyctl launch`
3. Deploy with `flyctl deploy`

## Required Environment Variables

Copy these to your cloud platform's environment settings:

```env
DATABASE_URL=file:./data/techgig.db
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@TechGigRadar
TELEGRAM_ENABLED=true
AUTO_PUBLISH_ENABLED=true
REQUIRE_HUMAN_APPROVAL=false
NEWS_CHECK_INTERVAL_MINUTES=15
JOBS_CHECK_INTERVAL_MINUTES=30
NODE_ENV=production
PORT=3000
```

## Files Required

Make sure these files exist:
- package.json (with start scripts)
- Dockerfile (for containerized deployment)
- render.yaml (for Render.com)
