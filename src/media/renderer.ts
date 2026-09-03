import nodeHtmlToImage from 'node-html-to-image';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { createLogger } from '../utils/logger.js';
import { generateNewsCardHTML, generateJobCardHTML, generateCarouselSlideHTML } from './templates/cards.js';
import { dimensions } from './brand/identity.js';
import type { News, Job } from '../db/schema.js';

const logger = createLogger('image-renderer');

// Output directory for generated images
const OUTPUT_DIR = join(process.cwd(), 'generated', 'images');

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

// ================================
// Render News Card
// ================================
export async function renderNewsCard(news: News): Promise<string> {
  await ensureOutputDir();
  
  const html = generateNewsCardHTML(news);
  const outputPath = join(OUTPUT_DIR, `news-${news.id}.png`);
  
  try {
    await nodeHtmlToImage({
      output: outputPath,
      html,
      puppeteerArgs: {
        defaultViewport: {
          width: dimensions.instagram.square.width,
          height: dimensions.instagram.square.height,
        },
      },
    });
    
    logger.info({ newsId: news.id, path: outputPath }, 'News card rendered');
    return outputPath;
  } catch (error) {
    logger.error({ newsId: news.id, error }, 'Failed to render news card');
    throw error;
  }
}

// ================================
// Render Job Card
// ================================
export async function renderJobCard(job: Job): Promise<string> {
  await ensureOutputDir();
  
  const html = generateJobCardHTML(job);
  const outputPath = join(OUTPUT_DIR, `job-${job.id}.png`);
  
  try {
    await nodeHtmlToImage({
      output: outputPath,
      html,
      puppeteerArgs: {
        defaultViewport: {
          width: dimensions.instagram.square.width,
          height: dimensions.instagram.square.height,
        },
      },
    });
    
    logger.info({ jobId: job.id, path: outputPath }, 'Job card rendered');
    return outputPath;
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Failed to render job card');
    throw error;
  }
}

// ================================
// Render News Carousel
// ================================
export interface CarouselSlide {
  title: string;
  content: string;
}

export async function renderNewsCarousel(
  news: News,
  slides: CarouselSlide[]
): Promise<string[]> {
  await ensureOutputDir();
  
  const outputPaths: string[] = [];
  const totalSlides = slides.length;
  
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const html = generateCarouselSlideHTML(
      i + 1,
      totalSlides,
      slide.title,
      slide.content,
      {
        category: news.category,
        isFirst: i === 0,
        isLast: i === slides.length - 1,
      }
    );
    
    const outputPath = join(OUTPUT_DIR, `news-${news.id}-slide-${i + 1}.png`);
    
    try {
      await nodeHtmlToImage({
        output: outputPath,
        html,
        puppeteerArgs: {
          defaultViewport: {
            width: dimensions.instagram.square.width,
            height: dimensions.instagram.square.height,
          },
        },
      });
      
      outputPaths.push(outputPath);
    } catch (error) {
      logger.error({ newsId: news.id, slide: i + 1, error }, 'Failed to render carousel slide');
      throw error;
    }
  }
  
  logger.info({ newsId: news.id, slideCount: outputPaths.length }, 'News carousel rendered');
  return outputPaths;
}

// ================================
// Generate Default Carousel from News
// ================================
export function generateNewsCarouselSlides(news: News): CarouselSlide[] {
  const slides: CarouselSlide[] = [];
  
  // Slide 1: Headline
  slides.push({
    title: news.title,
    content: news.summary?.slice(0, 150) || 'Read more about this tech news...',
  });
  
  // Slide 2: What happened
  if (news.content) {
    const contentChunk = news.content.slice(0, 400);
    slides.push({
      title: '📰 What Happened',
      content: contentChunk,
    });
  }
  
  // Slide 3: Key details (if we have more content)
  if (news.content && news.content.length > 400) {
    slides.push({
      title: '💡 Key Details',
      content: news.content.slice(400, 800),
    });
  }
  
  // Slide 4: Why it matters
  slides.push({
    title: '🎯 Why It Matters',
    content: `This development impacts developers and tech professionals working with ${news.category} technologies. Stay informed with @TechGigRadar for more updates.`,
  });
  
  return slides;
}

// ================================
// Batch Rendering
// ================================
export async function renderMultipleNewsCards(
  newsItems: News[],
  concurrency = 3
): Promise<Array<{ news: News; imagePath: string; error?: string }>> {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(concurrency);
  
  const results = await Promise.all(
    newsItems.map(news =>
      limit(async () => {
        try {
          const imagePath = await renderNewsCard(news);
          return { news, imagePath };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          return { news, imagePath: '', error: message };
        }
      })
    )
  );
  
  return results;
}

export async function renderMultipleJobCards(
  jobs: Job[],
  concurrency = 3
): Promise<Array<{ job: Job; imagePath: string; error?: string }>> {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(concurrency);
  
  const results = await Promise.all(
    jobs.map(job =>
      limit(async () => {
        try {
          const imagePath = await renderJobCard(job);
          return { job, imagePath };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          return { job, imagePath: '', error: message };
        }
      })
    )
  );
  
  return results;
}
