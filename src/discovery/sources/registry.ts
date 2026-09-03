/**
 * Source Registry - Defines all news and job sources
 */

export interface SourceConfig {
  name: string;
  type: 'rss' | 'api' | 'scraper';
  url: string;
  category: 'news' | 'jobs';
  subcategory?: string;
  reliabilityScore: number; // 0-100
  isPrimarySource: boolean;
  checkIntervalMinutes: number;
  config?: Record<string, unknown>;
  enabled: boolean;
}

// ================================
// News Sources
// ================================
export const newsSources: SourceConfig[] = [
  // Official AI Company Blogs (Primary Sources - High Reliability)
  {
    name: 'OpenAI Blog',
    type: 'rss',
    url: 'https://openai.com/blog/rss.xml',
    category: 'news',
    subcategory: 'ai',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'Google AI Blog',
    type: 'rss',
    url: 'https://blog.google/technology/ai/rss/',
    category: 'news',
    subcategory: 'ai',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'Anthropic News',
    type: 'rss',
    url: 'https://www.anthropic.com/news/rss',
    category: 'news',
    subcategory: 'ai',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  
  // Developer Platforms
  {
    name: 'GitHub Blog',
    type: 'rss',
    url: 'https://github.blog/feed/',
    category: 'news',
    subcategory: 'programming',
    reliabilityScore: 90,
    isPrimarySource: true,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'Dev.to',
    type: 'rss',
    url: 'https://dev.to/feed',
    category: 'news',
    subcategory: 'programming',
    reliabilityScore: 70,
    isPrimarySource: false,
    checkIntervalMinutes: 30,
    enabled: true,
  },
  
  // Cloud Providers
  {
    name: 'AWS News Blog',
    type: 'rss',
    url: 'https://aws.amazon.com/blogs/aws/feed/',
    category: 'news',
    subcategory: 'cloud',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'Azure Updates',
    type: 'rss',
    url: 'https://azure.microsoft.com/en-us/blog/feed/',
    category: 'news',
    subcategory: 'cloud',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'Google Cloud Blog',
    type: 'rss',
    url: 'https://cloud.google.com/blog/rss',
    category: 'news',
    subcategory: 'cloud',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  
  // Tech News Publications
  {
    name: 'Hacker News',
    type: 'api',
    url: 'https://hacker-news.firebaseio.com/v0',
    category: 'news',
    subcategory: 'general',
    reliabilityScore: 75,
    isPrimarySource: false,
    checkIntervalMinutes: 30,
    config: {
      minScore: 100, // Only fetch stories with 100+ points
      maxItems: 30,
    },
    enabled: true,
  },
  {
    name: 'TechCrunch',
    type: 'rss',
    url: 'https://techcrunch.com/feed/',
    category: 'news',
    subcategory: 'startup',
    reliabilityScore: 80,
    isPrimarySource: false,
    checkIntervalMinutes: 30,
    enabled: true,
  },
  {
    name: 'The Verge Tech',
    type: 'rss',
    url: 'https://www.theverge.com/tech/rss/index.xml',
    category: 'news',
    subcategory: 'general',
    reliabilityScore: 80,
    isPrimarySource: false,
    checkIntervalMinutes: 30,
    enabled: true,
  },
  {
    name: 'Ars Technica',
    type: 'rss',
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    category: 'news',
    subcategory: 'general',
    reliabilityScore: 85,
    isPrimarySource: false,
    checkIntervalMinutes: 30,
    enabled: true,
  },
  
  // Security Sources
  {
    name: 'Krebs on Security',
    type: 'rss',
    url: 'https://krebsonsecurity.com/feed/',
    category: 'news',
    subcategory: 'security',
    reliabilityScore: 90,
    isPrimarySource: false,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'The Hacker News',
    type: 'rss',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    category: 'news',
    subcategory: 'security',
    reliabilityScore: 80,
    isPrimarySource: false,
    checkIntervalMinutes: 30,
    enabled: true,
  },
  
  // JavaScript/Web
  {
    name: 'JavaScript Weekly',
    type: 'rss',
    url: 'https://javascriptweekly.com/rss/',
    category: 'news',
    subcategory: 'webdev',
    reliabilityScore: 85,
    isPrimarySource: false,
    checkIntervalMinutes: 120,
    enabled: true,
  },
  {
    name: 'React Blog',
    type: 'rss',
    url: 'https://react.dev/rss.xml',
    category: 'news',
    subcategory: 'webdev',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 120,
    enabled: true,
  },
  
  // Mobile
  {
    name: 'Android Developers Blog',
    type: 'rss',
    url: 'https://android-developers.googleblog.com/feeds/posts/default',
    category: 'news',
    subcategory: 'mobile',
    reliabilityScore: 95,
    isPrimarySource: true,
    checkIntervalMinutes: 120,
    enabled: true,
  },
];

// ================================
// Job Sources (Including Fresher/Entry-Level)
// ================================
export const jobSources: SourceConfig[] = [
  // General Remote Job Boards
  {
    name: 'RemoteOK',
    type: 'api',
    url: 'https://remoteok.com/api',
    category: 'jobs',
    reliabilityScore: 80,
    isPrimarySource: false,
    checkIntervalMinutes: 60,
    config: {
      filterTags: ['developer', 'engineer', 'programming', 'devops', 'design', 'junior', 'entry'],
    },
    enabled: true,
  },
  {
    name: 'We Work Remotely',
    type: 'rss',
    url: 'https://weworkremotely.com/remote-jobs.rss',
    category: 'jobs',
    reliabilityScore: 85,
    isPrimarySource: false,
    checkIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'Remote.co Jobs',
    type: 'rss',
    url: 'https://remote.co/remote-jobs/developer/feed/',
    category: 'jobs',
    reliabilityScore: 80,
    isPrimarySource: false,
    checkIntervalMinutes: 120,
    enabled: true,
  },
  {
    name: 'HN Who Is Hiring',
    type: 'api',
    url: 'https://hacker-news.firebaseio.com/v0',
    category: 'jobs',
    reliabilityScore: 85,
    isPrimarySource: false,
    checkIntervalMinutes: 240,
    config: {
      type: 'whoishiring',
    },
    enabled: true,
  },
  // Entry-Level / Fresher Focused Sources
  {
    name: 'JustRemote Entry Level',
    type: 'rss',
    url: 'https://justremote.co/remote-developer-jobs/rss',
    category: 'jobs',
    subcategory: 'fresher',
    reliabilityScore: 75,
    isPrimarySource: false,
    checkIntervalMinutes: 120,
    enabled: true,
  },
  {
    name: 'FlexJobs Tech',
    type: 'rss', 
    url: 'https://www.flexjobs.com/rss/jobs-it-computer',
    category: 'jobs',
    subcategory: 'remote',
    reliabilityScore: 80,
    isPrimarySource: false,
    checkIntervalMinutes: 120,
    enabled: true,
  },
  {
    name: 'Himalayas Remote',
    type: 'rss',
    url: 'https://himalayas.app/jobs/rss',
    category: 'jobs',
    subcategory: 'worldwide',
    reliabilityScore: 80,
    isPrimarySource: false,
    checkIntervalMinutes: 120,
    enabled: true,
  },
  {
    name: 'Working Nomads',
    type: 'rss',
    url: 'https://www.workingnomads.com/jobs/rss',
    category: 'jobs',
    subcategory: 'remote',
    reliabilityScore: 75,
    isPrimarySource: false,
    checkIntervalMinutes: 120,
    enabled: true,
  },
];

// All sources combined
export const allSources: SourceConfig[] = [...newsSources, ...jobSources];

// Get active sources by category
export function getActiveSources(category: 'news' | 'jobs'): SourceConfig[] {
  return allSources.filter(s => s.category === category && s.enabled);
}

// Get sources by subcategory
export function getSourcesBySubcategory(subcategory: string): SourceConfig[] {
  return allSources.filter(s => s.subcategory === subcategory && s.enabled);
}
