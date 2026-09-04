// Instagram Publisher for TechGig Radar
// Uses Meta Graph API for automated posting
import { createLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

const logger = createLogger('instagram-publisher');

// ================================
// Configuration
// ================================
interface InstagramConfig {
  accessToken: string;      // Long-lived access token
  instagramAccountId: string; // Instagram Business Account ID
  enabled: boolean;
}

function getInstagramConfig(): InstagramConfig {
  return {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
    enabled: process.env.INSTAGRAM_ENABLED === 'true',
  };
}

// ================================
// Types
// ================================
export interface InstagramPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface InstagramImagePost {
  imageUrl: string;        // Must be publicly accessible URL
  caption: string;
  hashtags?: string[];
}

export interface InstagramCarouselPost {
  images: { url: string }[];  // 2-10 images, publicly accessible
  caption: string;
  hashtags?: string[];
}

export interface InstagramReelPost {
  videoUrl: string;        // Must be publicly accessible URL
  caption: string;
  coverUrl?: string;       // Thumbnail
  hashtags?: string[];
}

// ================================
// API Helpers
// ================================
const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

async function graphApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, any>
): Promise<any> {
  const cfg = getInstagramConfig();
  
  const url = new URL(`${GRAPH_API_BASE}${endpoint}`);
  url.searchParams.append('access_token', cfg.accessToken);
  
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body && method === 'POST') {
    // For POST, add params to URL (Graph API style)
    Object.entries(body).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  const response = await fetch(url.toString(), options);
  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `API Error: ${response.status}`);
  }
  
  return data;
}

// ================================
// Publishing Functions
// ================================

/**
 * Publish a single image post to Instagram
 */
export async function publishImageToInstagram(
  post: InstagramImagePost
): Promise<InstagramPostResult> {
  const cfg = getInstagramConfig();
  
  if (!cfg.enabled) {
    return { success: false, error: 'Instagram publishing is disabled' };
  }
  
  if (!cfg.accessToken || !cfg.instagramAccountId) {
    return { success: false, error: 'Instagram not configured (missing token or account ID)' };
  }
  
  try {
    logger.info({ caption: post.caption.slice(0, 50) }, 'Publishing image to Instagram');
    
    // Build caption with hashtags
    let fullCaption = post.caption;
    if (post.hashtags && post.hashtags.length > 0) {
      fullCaption += '\n\n' + post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }
    
    // Step 1: Create media container
    const container = await graphApiRequest(
      `/${cfg.instagramAccountId}/media`,
      'POST',
      {
        image_url: post.imageUrl,
        caption: fullCaption,
      }
    );
    
    logger.info({ containerId: container.id }, 'Media container created');
    
    // Step 2: Publish the container
    const published = await graphApiRequest(
      `/${cfg.instagramAccountId}/media_publish`,
      'POST',
      {
        creation_id: container.id,
      }
    );
    
    logger.info({ postId: published.id }, 'Image published to Instagram');
    
    return { success: true, postId: published.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Failed to publish image to Instagram');
    return { success: false, error: errorMessage };
  }
}

/**
 * Publish a carousel (multiple images) to Instagram
 */
export async function publishCarouselToInstagram(
  post: InstagramCarouselPost
): Promise<InstagramPostResult> {
  const cfg = getInstagramConfig();
  
  if (!cfg.enabled) {
    return { success: false, error: 'Instagram publishing is disabled' };
  }
  
  if (!cfg.accessToken || !cfg.instagramAccountId) {
    return { success: false, error: 'Instagram not configured' };
  }
  
  if (post.images.length < 2 || post.images.length > 10) {
    return { success: false, error: 'Carousel requires 2-10 images' };
  }
  
  try {
    logger.info({ imageCount: post.images.length }, 'Publishing carousel to Instagram');
    
    // Build caption with hashtags
    let fullCaption = post.caption;
    if (post.hashtags && post.hashtags.length > 0) {
      fullCaption += '\n\n' + post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }
    
    // Step 1: Create container for each image
    const childContainerIds: string[] = [];
    for (const image of post.images) {
      const container = await graphApiRequest(
        `/${cfg.instagramAccountId}/media`,
        'POST',
        {
          image_url: image.url,
          is_carousel_item: true,
        }
      );
      childContainerIds.push(container.id);
    }
    
    logger.info({ containerIds: childContainerIds }, 'Child containers created');
    
    // Step 2: Create carousel container
    const carouselContainer = await graphApiRequest(
      `/${cfg.instagramAccountId}/media`,
      'POST',
      {
        media_type: 'CAROUSEL',
        caption: fullCaption,
        children: childContainerIds.join(','),
      }
    );
    
    // Step 3: Publish carousel
    const published = await graphApiRequest(
      `/${cfg.instagramAccountId}/media_publish`,
      'POST',
      {
        creation_id: carouselContainer.id,
      }
    );
    
    logger.info({ postId: published.id }, 'Carousel published to Instagram');
    
    return { success: true, postId: published.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Failed to publish carousel to Instagram');
    return { success: false, error: errorMessage };
  }
}

/**
 * Publish a Reel to Instagram
 */
export async function publishReelToInstagram(
  post: InstagramReelPost
): Promise<InstagramPostResult> {
  const cfg = getInstagramConfig();
  
  if (!cfg.enabled) {
    return { success: false, error: 'Instagram publishing is disabled' };
  }
  
  if (!cfg.accessToken || !cfg.instagramAccountId) {
    return { success: false, error: 'Instagram not configured' };
  }
  
  try {
    logger.info({ caption: post.caption.slice(0, 50) }, 'Publishing reel to Instagram');
    
    // Build caption with hashtags
    let fullCaption = post.caption;
    if (post.hashtags && post.hashtags.length > 0) {
      fullCaption += '\n\n' + post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }
    
    // Step 1: Create reel container
    const containerParams: Record<string, any> = {
      media_type: 'REELS',
      video_url: post.videoUrl,
      caption: fullCaption,
    };
    
    if (post.coverUrl) {
      containerParams.cover_url = post.coverUrl;
    }
    
    const container = await graphApiRequest(
      `/${cfg.instagramAccountId}/media`,
      'POST',
      containerParams
    );
    
    logger.info({ containerId: container.id }, 'Reel container created');
    
    // Step 2: Wait for processing (reels take time)
    let status = 'IN_PROGRESS';
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 10000)); // Wait 10 seconds
      
      const statusCheck = await graphApiRequest(
        `/${container.id}?fields=status_code`
      );
      status = statusCheck.status_code;
      attempts++;
      
      logger.info({ status, attempt: attempts }, 'Checking reel processing status');
    }
    
    if (status !== 'FINISHED') {
      return { success: false, error: `Reel processing failed: ${status}` };
    }
    
    // Step 3: Publish the reel
    const published = await graphApiRequest(
      `/${cfg.instagramAccountId}/media_publish`,
      'POST',
      {
        creation_id: container.id,
      }
    );
    
    logger.info({ postId: published.id }, 'Reel published to Instagram');
    
    return { success: true, postId: published.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Failed to publish reel to Instagram');
    return { success: false, error: errorMessage };
  }
}

// ================================
// Account Info
// ================================
export async function getInstagramAccountInfo(): Promise<any> {
  const cfg = getInstagramConfig();
  
  if (!cfg.accessToken || !cfg.instagramAccountId) {
    throw new Error('Instagram not configured');
  }
  
  return graphApiRequest(
    `/${cfg.instagramAccountId}?fields=id,username,name,profile_picture_url,followers_count,media_count`
  );
}

/**
 * Verify Instagram connection is working
 */
export async function verifyInstagramConnection(): Promise<{ connected: boolean; username?: string; error?: string }> {
  try {
    const info = await getInstagramAccountInfo();
    return { connected: true, username: info.username };
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
