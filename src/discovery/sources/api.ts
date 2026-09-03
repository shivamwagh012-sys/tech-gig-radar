import { createLogger } from '../../utils/logger.js';
import type { SourceConfig } from './registry.js';

const logger = createLogger('api-fetcher');

// ================================
// Hacker News API
// ================================
export interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
  type: 'story' | 'job' | 'comment';
}

interface HNThread {
  id: number;
  kids?: number[];
  [key: string]: unknown;
}

interface AlgoliaSearchResult {
  hits: Array<{ objectID: string }>;
}

interface HNComment {
  id: number;
  text: string;
  by: string;
  time: number;
  deleted?: boolean;
}

export async function fetchHackerNews(
  source: SourceConfig
): Promise<{ items: HNStory[]; error?: string }> {
  try {
    const sourceConfig = source.config || {};
    const minScore = (sourceConfig.minScore as number) || 100;
    const maxItems = (sourceConfig.maxItems as number) || 30;
    
    logger.info({ source: source.name, minScore, maxItems }, 'Fetching Hacker News');
    
    // Get top stories
    const topStoriesRes = await fetch(
      'https://hacker-news.firebaseio.com/v0/topstories.json'
    );
    const topStoryIds = (await topStoriesRes.json()) as number[];
    
    // Fetch story details (limited)
    const storyPromises = topStoryIds.slice(0, maxItems * 2).map(async (id) => {
      const res = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      );
      return res.json() as Promise<HNStory>;
    });
    
    const stories = await Promise.all(storyPromises);
    
    // Filter by score and only include stories with external URLs
    const filtered = stories
      .filter((s): s is HNStory => s != null && s.score >= minScore && !!s.url && s.type === 'story')
      .slice(0, maxItems);
    
    logger.info({ source: source.name, count: filtered.length }, 'HN stories fetched');
    
    return { items: filtered };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ source: source.name, error: message }, 'Failed to fetch HN');
    return { items: [], error: message };
  }
}

// ================================
// HN Who's Hiring (Monthly thread)
// ================================
export async function fetchHNWhoIsHiring(): Promise<{
  items: Array<{ id: number; text: string; by: string; time: number }>;
  error?: string;
}> {
  try {
    logger.info('Fetching HN Who is Hiring thread');
    
    // Search for "Who is hiring" posts by user "whoishiring"
    const searchUrl = new URL('https://hn.algolia.com/api/v1/search_by_date');
    searchUrl.searchParams.set('tags', 'story,author_whoishiring');
    searchUrl.searchParams.set('query', 'Ask HN: Who is hiring');
    searchUrl.searchParams.set('hitsPerPage', '1');
    
    const searchRes = await fetch(searchUrl.toString());
    const searchData = (await searchRes.json()) as AlgoliaSearchResult;
    
    if (!searchData.hits || searchData.hits.length === 0) {
      return { items: [], error: 'No Who is Hiring thread found' };
    }
    
    const threadId = searchData.hits[0].objectID;
    
    // Fetch the thread to get all comments
    const threadRes = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${threadId}.json`
    );
    const thread = (await threadRes.json()) as HNThread;
    
    if (!thread.kids || thread.kids.length === 0) {
      return { items: [] };
    }
    
    // Fetch first 100 job comments
    const commentPromises = thread.kids.slice(0, 100).map(async (id: number) => {
      const res = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      );
      return res.json() as Promise<HNComment>;
    });
    
    const comments = await Promise.all(commentPromises);
    const validComments = comments.filter((c): c is HNComment => c != null && !!c.text && !c.deleted);
    
    logger.info({ count: validComments.length }, 'HN Who is Hiring comments fetched');
    
    return { items: validComments };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to fetch HN Who is Hiring');
    return { items: [], error: message };
  }
}

// ================================
// RemoteOK API
// ================================
export interface RemoteOKJob {
  id: string;
  epoch: number;
  date: string;
  company: string;
  company_logo?: string;
  position: string;
  tags: string[];
  description: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
  apply_url?: string;
}

export async function fetchRemoteOK(
  source: SourceConfig
): Promise<{ items: RemoteOKJob[]; error?: string }> {
  try {
    logger.info({ source: source.name }, 'Fetching RemoteOK jobs');
    
    const res = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'TechGig Radar/1.0 (+https://techgigradar.com)',
      },
    });
    
    const data = await res.json();
    
    // First item is metadata, skip it
    const jobs: RemoteOKJob[] = Array.isArray(data) ? data.slice(1) : [];
    
    // Filter for dev/tech jobs if configured
    const filterTags = source.config?.filterTags as string[] | undefined;
    const filtered = filterTags
      ? jobs.filter(j => 
          j.tags?.some(tag => 
            filterTags.some(ft => tag.toLowerCase().includes(ft.toLowerCase()))
          )
        )
      : jobs;
    
    logger.info({ source: source.name, count: filtered.length }, 'RemoteOK jobs fetched');
    
    return { items: filtered };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ source: source.name, error: message }, 'Failed to fetch RemoteOK');
    return { items: [], error: message };
  }
}
