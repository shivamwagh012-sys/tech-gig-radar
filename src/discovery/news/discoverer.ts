import { createLogger } from '../../utils/logger.js';
import { generateNewsFingerprint, normalizeUrl } from '../../utils/fingerprint.js';
import { getActiveSources, type SourceConfig } from '../sources/registry.js';
import { fetchRSS, type RSSItem } from '../sources/rss.js';
import { fetchHackerNews, type HNStory } from '../sources/api.js';
import type { NewNews } from '../../db/schema.js';

const logger = createLogger('news-discoverer');

// ================================
// Types
// ================================
export interface DiscoveredNews {
  title: string;
  summary?: string;
  content?: string;
  sourceUrl: string;
  sourceName: string;
  sourceReliability: number;
  isPrimarySource: boolean;
  category: string;
  tags: string[];
  publishedAt?: Date;
  fingerprint: string;
}

// ================================
// Category Detection
// ================================
const categoryKeywords: Record<string, string[]> = {
  ai: [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
    'gpt', 'llm', 'chatgpt', 'openai', 'anthropic', 'claude', 'gemini',
    'neural network', 'transformer', 'diffusion', 'stable diffusion', 'midjourney',
    'copilot', 'generative ai', 'gen ai',
  ],
  security: [
    'security', 'vulnerability', 'cve', 'exploit', 'malware', 'ransomware',
    'breach', 'hack', 'cyber', 'phishing', 'zero-day', 'patch',
    'encryption', 'authentication', 'ddos',
  ],
  cloud: [
    'aws', 'amazon web services', 'azure', 'google cloud', 'gcp',
    'kubernetes', 'k8s', 'docker', 'container', 'serverless', 'lambda',
    'cloud native', 'microservices', 'iaas', 'paas', 'saas',
  ],
  devops: [
    'devops', 'ci/cd', 'jenkins', 'github actions', 'gitlab ci',
    'terraform', 'ansible', 'infrastructure as code', 'iac',
    'monitoring', 'observability', 'prometheus', 'grafana',
  ],
  webdev: [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte',
    'next.js', 'nextjs', 'nuxt', 'remix', 'astro', 'vite',
    'node.js', 'nodejs', 'deno', 'bun', 'frontend', 'backend',
    'html', 'css', 'tailwind', 'web development',
  ],
  mobile: [
    'ios', 'android', 'swift', 'kotlin', 'react native', 'flutter',
    'mobile app', 'app store', 'play store', 'xcode', 'mobile development',
  ],
  startup: [
    'startup', 'funding', 'series a', 'series b', 'seed round',
    'acquisition', 'ipo', 'unicorn', 'venture capital', 'vc',
    'y combinator', 'yc', 'techstars',
  ],
  programming: [
    'python', 'rust', 'go', 'golang', 'java', 'cpp', 'csharp',
    'programming', 'developer', 'coding', 'software engineering',
    'algorithm', 'data structure', 'open source', 'github',
  ],
};

function detectCategory(title: string, content: string, sourceSubcategory?: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  // Check source subcategory first (more reliable)
  if (sourceSubcategory && sourceSubcategory !== 'general') {
    return sourceSubcategory;
  }
  
  // Score each category based on keyword matches
  const scores: Record<string, number> = {};
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = keywords.reduce((score, keyword) => {
      // Count occurrences with higher weight for title matches
      const titleMatches = (title.toLowerCase().match(new RegExp(keyword, 'gi')) || []).length;
      const contentMatches = (content.toLowerCase().match(new RegExp(keyword, 'gi')) || []).length;
      return score + (titleMatches * 3) + contentMatches;
    }, 0);
  }
  
  // Get highest scoring category
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  
  return sorted[0][1] > 0 ? sorted[0][0] : 'general';
}

function extractTags(title: string, content: string, category: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const tags: Set<string> = new Set([category]);
  
  // Extract matching keywords as tags (limited to 5)
  for (const keywords of Object.values(categoryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword) && tags.size < 6) {
        tags.add(keyword.replace(/\s+/g, '-'));
      }
    }
  }
  
  return Array.from(tags);
}

// ================================
// RSS News Processing
// ================================
function processRSSItem(item: RSSItem, source: SourceConfig): DiscoveredNews | null {
  if (!item.title || !item.link) {
    return null;
  }
  
  const normalizedUrl = normalizeUrl(item.link);
  const content = item.contentSnippet || item.content || '';
  const category = detectCategory(item.title, content, source.subcategory);
  
  return {
    title: item.title.trim(),
    summary: item.contentSnippet?.slice(0, 500),
    content: item.content,
    sourceUrl: normalizedUrl,
    sourceName: source.name,
    sourceReliability: source.reliabilityScore,
    isPrimarySource: source.isPrimarySource,
    category,
    tags: extractTags(item.title, content, category),
    publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
    fingerprint: generateNewsFingerprint(item.title, normalizedUrl),
  };
}

// ================================
// Hacker News Processing
// ================================
function processHNStory(story: HNStory, source: SourceConfig): DiscoveredNews | null {
  if (!story.title || !story.url) {
    return null;
  }
  
  const normalizedUrl = normalizeUrl(story.url);
  const category = detectCategory(story.title, story.text || '', source.subcategory);
  
  return {
    title: story.title.trim(),
    summary: story.text?.slice(0, 500),
    sourceUrl: normalizedUrl,
    sourceName: `${source.name} (${story.score} points)`,
    sourceReliability: Math.min(source.reliabilityScore + Math.floor(story.score / 100) * 5, 100),
    isPrimarySource: false,
    category,
    tags: extractTags(story.title, story.text || '', category),
    publishedAt: new Date(story.time * 1000),
    fingerprint: generateNewsFingerprint(story.title, normalizedUrl),
  };
}

// ================================
// Main Discovery Function
// ================================
export interface DiscoveryResult {
  news: DiscoveredNews[];
  errors: Array<{ source: string; error: string }>;
  stats: {
    sourcesChecked: number;
    itemsFound: number;
    itemsProcessed: number;
    duration: number;
  };
}

export async function discoverNews(): Promise<DiscoveryResult> {
  const startTime = Date.now();
  const errors: Array<{ source: string; error: string }> = [];
  const allNews: DiscoveredNews[] = [];
  
  const sources = getActiveSources('news');
  logger.info({ sourceCount: sources.length }, 'Starting news discovery');
  
  let totalItemsFound = 0;
  
  for (const source of sources) {
    try {
      if (source.type === 'rss') {
        const result = await fetchRSS(source);
        
        if (result.error) {
          errors.push({ source: source.name, error: result.error });
          continue;
        }
        
        totalItemsFound += result.items.length;
        
        for (const item of result.items) {
          const processed = processRSSItem(item, source);
          if (processed) {
            allNews.push(processed);
          }
        }
      } else if (source.type === 'api' && source.url.includes('hacker-news')) {
        const result = await fetchHackerNews(source);
        
        if (result.error) {
          errors.push({ source: source.name, error: result.error });
          continue;
        }
        
        totalItemsFound += result.items.length;
        
        for (const story of result.items) {
          const processed = processHNStory(story, source);
          if (processed) {
            allNews.push(processed);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ source: source.name, error: message });
      logger.error({ source: source.name, error: message }, 'Discovery failed');
    }
  }
  
  const duration = Date.now() - startTime;
  
  logger.info({
    sourcesChecked: sources.length,
    itemsFound: totalItemsFound,
    itemsProcessed: allNews.length,
    errors: errors.length,
    duration,
  }, 'News discovery completed');
  
  return {
    news: allNews,
    errors,
    stats: {
      sourcesChecked: sources.length,
      itemsFound: totalItemsFound,
      itemsProcessed: allNews.length,
      duration,
    },
  };
}

// ================================
// Convert to Database Format
// ================================
export function toNewsRecord(discovered: DiscoveredNews): NewNews {
  return {
    title: discovered.title,
    summary: discovered.summary,
    content: discovered.content,
    sourceUrl: discovered.sourceUrl,
    sourceName: discovered.sourceName,
    originalPublishedAt: discovered.publishedAt?.toISOString(),
    category: discovered.category,
    tags: discovered.tags,
    fingerprint: discovered.fingerprint,
    verificationStatus: 'pending',
    status: 'discovered',
    // Reliability affects initial priority
    priority: Math.floor(discovered.sourceReliability * 0.5 + (discovered.isPrimarySource ? 25 : 0)),
  };
}
