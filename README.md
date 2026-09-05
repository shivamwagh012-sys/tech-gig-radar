# TechGig Radar 🚀

**Real Tech News. Real Global Opportunities.**

An AI-powered autonomous system that discovers, verifies, and publishes tech news and remote job opportunities to Telegram.

![JARVIS Dashboard](https://img.shields.io/badge/Dashboard-JARVIS%20Style-00d4ff?style=for-the-badge)
![Auto Publish](https://img.shields.io/badge/Auto%20Publish-Enabled-00ff88?style=for-the-badge)
![Telegram](https://img.shields.io/badge/Telegram-@TechGigRadar-0088cc?style=for-the-badge)

## Features

- 🤖 **Autonomous Discovery** - Automatically finds tech news and jobs every 2 minutes
- 📰 **17+ News Sources** - OpenAI, Google AI, GitHub, AWS, TechCrunch, Hacker News, etc.
- 💼 **8+ Job Sources** - RemoteOK, We Work Remotely, HN Who's Hiring, etc.
- 🎯 **Smart Filtering** - Only tech jobs suitable for remote/contract work from India
- 👶 **Fresher Friendly** - Includes entry-level and junior positions
- 📤 **Auto-Publish** - Posts directly to Telegram without manual approval
- 🎨 **JARVIS Dashboard** - Futuristic real-time monitoring UI
- ✅ **Verification** - Ensures content authenticity before publishing

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Database**: SQLite (Drizzle ORM)
- **Web**: Express.js
- **Telegram**: Grammy Bot API
- **Styling**: Custom JARVIS-inspired CSS

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Telegram bot token

# Run database migrations
npx drizzle-kit migrate

# Start the server (dashboard + auto-discovery)
npm run start:server
```

## Environment Variables

```env
DATABASE_URL=file:./data/techgig.db
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@TechGigRadar
TELEGRAM_ENABLED=true
AUTO_PUBLISH_ENABLED=true
REQUIRE_HUMAN_APPROVAL=false
NEWS_CHECK_INTERVAL_MINUTES=2
JOBS_CHECK_INTERVAL_MINUTES=2
```

## Deployment

### Render.com (Free)
1. Connect this repo to Render
2. Set build command: `npm install`
3. Set start command: `npx tsx src/server-with-auto.ts`
4. Add environment variables

### Railway.app
```bash
railway login
railway init
railway up
```

## Dashboard

Access the JARVIS-style dashboard at `http://localhost:3000`

Features:
- Real-time stats
- Live activity log
- One-click manual publish
- Auto-refresh every 30 seconds

## API Endpoints

- `GET /api/stats` - System statistics
- `GET /api/news` - List news items
- `GET /api/jobs` - List job postings
- `POST /api/news/:id/publish` - Publish news to Telegram
- `POST /api/jobs/:id/publish` - Publish job to Telegram
- `GET /api/health` - Health check

## License

MIT

---

**Follow us on Telegram: [@TechGigRadar](https://t.me/TechGigRadar)**
# Updated Sun, Sep  6, 2026  1:16:22 AM
