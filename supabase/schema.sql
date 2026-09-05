-- Run this in Supabase SQL Editor to create tables

-- News table
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  url TEXT,
  category TEXT DEFAULT 'Tech',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT DEFAULT 'Remote',
  salary TEXT,
  job_type TEXT DEFAULT 'Full-time',
  category TEXT DEFAULT 'Software Engineering',
  experience TEXT DEFAULT 'Mid-level',
  skills JSONB DEFAULT '[]',
  description TEXT,
  apply_url TEXT,
  source TEXT,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reels table (for video tracking)
CREATE TABLE IF NOT EXISTS reels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'news',
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON news FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON jobs FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON reels FOR SELECT USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service insert" ON news FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service insert" ON jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service insert" ON reels FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service update" ON news FOR UPDATE USING (true);
CREATE POLICY "Allow service update" ON jobs FOR UPDATE USING (true);
CREATE POLICY "Allow service update" ON reels FOR UPDATE USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
