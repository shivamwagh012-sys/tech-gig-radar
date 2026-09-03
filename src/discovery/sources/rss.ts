import Parser from 'rss-parser';
import { createLogger } from '../../utils/logger.js';
import type { SourceConfig } from './registry.js';

const logger = createLogger('rss-fetcher');

export interface RSSItem {
  title: string;
  link: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  categories?: string[];
  guid?: string;
}

export interface RSSFetchResult {
  source: SourceConfig;
  items: RSSItem[];
  error?: string;
}

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'TechGig Radar/1.0 (+https://techgigradar.com)',
  },
});

/**
 * Fetch RSS feed from a source
 */
export async function fetchRSS(source: SourceConfig): Promise<RSSFetchResult> {
  try {
    logger.info({ source: source.name, url: source.url }, 'Fetching RSS feed');
    
    const feed = await parser.parseURL(source.url);
    
    const items: RSSItem[] = feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      content: item.content || item['content:encoded'] || '',
      contentSnippet: item.contentSnippet || '',
      pubDate: item.pubDate,
      isoDate: item.isoDate,
      creator: item.creator || item.author,
      categories: item.categories,
      guid: item.guid || item.link,
    }));
    
    logger.info({ source: source.name, count: items.length }, 'RSS feed fetched');
    
    return { source, items };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ source: source.name, error: message }, 'Failed to fetch RSS feed');
    
    return { source, items: [], error: message };
  }
}

/**
 * Fetch multiple RSS feeds concurrently
 */
export async function fetchMultipleRSS(
  sources: SourceConfig[],
  concurrency = 5
): Promise<RSSFetchResult[]> {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(concurrency);
  
  const promises = sources.map(source => limit(() => fetchRSS(source)));
  return Promise.all(promises);
}
