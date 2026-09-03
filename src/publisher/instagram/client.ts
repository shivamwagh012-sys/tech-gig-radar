import { createLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

const logger = createLogger('instagram-publisher');

// ================================
// Meta Graph API Base URL
// ================================
const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

// ================================
// Types
// ================================
export interface InstagramPublishResult {
  success: boolean;
  containerId?: string;
  mediaId?: string;
  error?: string;
  retryable?: boolean;
}

export interface MediaContainer {
  id: string;
  status: 'IN_PROGRESS' | 'FINISHED' | 'ERROR';
  status_code?: string;
}

interface GraphAPIResponse {
  id?: string;
  error?: {
    message: string;
    code: number;
    type?: string;
  };
  status?: string;
  status_code?: string;
  username?: string;
  name?: string;
}

// ================================
// Initialize Client
// ================================
function getCredentials(): { accountId: string; accessToken: string } | null {
  if (!config.instagram.enabled) {
    logger.warn('Instagram is disabled in configuration');
    return null;
  }
  
  if (!config.instagram.businessAccountId || !config.instagram.accessToken) {
    logger.error('Instagram credentials not configured');
    return null;
  }
  
  return {
    accountId: config.instagram.businessAccountId,
    accessToken: config.instagram.accessToken,
  };
}

// ================================
// Create Single Image Container
// ================================
export async function createImageContainer(
  imageUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  const creds = getCredentials();
  if (!creds) {
    return { success: false, error: 'Instagram not configured', retryable: false };
  }
  
  try {
    const url = new URL(`${GRAPH_API_BASE}/${creds.accountId}/media`);
    url.searchParams.set('image_url', imageUrl);
    url.searchParams.set('caption', caption);
    url.searchParams.set('access_token', creds.accessToken);
    
    const response = await fetch(url.toString(), { method: 'POST' });
    const data = (await response.json()) as GraphAPIResponse;
    
    if (data.error) {
      logger.error({ error: data.error }, 'Failed to create image container');
      return {
        success: false,
        error: data.error.message,
        retryable: isRetryableError(data.error),
      };
    }
    
    logger.info({ containerId: data.id }, 'Image container created');
    return { success: true, containerId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to create image container');
    return { success: false, error: message, retryable: true };
  }
}

// ================================
// Create Carousel Container
// ================================
export async function createCarouselContainer(
  imageUrls: string[],
  caption: string
): Promise<InstagramPublishResult> {
  const creds = getCredentials();
  if (!creds) {
    return { success: false, error: 'Instagram not configured', retryable: false };
  }
  
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    return { 
      success: false, 
      error: 'Carousel requires 2-10 images', 
      retryable: false 
    };
  }
  
  try {
    // Step 1: Create individual media containers for each image
    const childContainerIds: string[] = [];
    
    for (const imageUrl of imageUrls) {
      const url = new URL(`${GRAPH_API_BASE}/${creds.accountId}/media`);
      url.searchParams.set('image_url', imageUrl);
      url.searchParams.set('is_carousel_item', 'true');
      url.searchParams.set('access_token', creds.accessToken);
      
      const response = await fetch(url.toString(), { method: 'POST' });
      const data = (await response.json()) as GraphAPIResponse;
      
      if (data.error) {
        logger.error({ error: data.error, imageUrl }, 'Failed to create carousel item');
        return {
          success: false,
          error: `Failed to create carousel item: ${data.error.message}`,
          retryable: isRetryableError(data.error),
        };
      }
      
      childContainerIds.push(data.id || '');
    }
    
    // Step 2: Create the carousel container
    const carouselUrl = new URL(`${GRAPH_API_BASE}/${creds.accountId}/media`);
    carouselUrl.searchParams.set('media_type', 'CAROUSEL');
    carouselUrl.searchParams.set('children', childContainerIds.join(','));
    carouselUrl.searchParams.set('caption', caption);
    carouselUrl.searchParams.set('access_token', creds.accessToken);
    
    const carouselResponse = await fetch(carouselUrl.toString(), { method: 'POST' });
    const carouselData = (await carouselResponse.json()) as GraphAPIResponse;
    
    if (carouselData.error) {
      logger.error({ error: carouselData.error }, 'Failed to create carousel container');
      return {
        success: false,
        error: carouselData.error.message,
        retryable: isRetryableError(carouselData.error),
      };
    }
    
    logger.info({ 
      containerId: carouselData.id, 
      itemCount: childContainerIds.length 
    }, 'Carousel container created');
    
    return { success: true, containerId: carouselData.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to create carousel container');
    return { success: false, error: message, retryable: true };
  }
}

// ================================
// Create Reel Container
// ================================
export async function createReelContainer(
  videoUrl: string,
  caption: string,
  coverUrl?: string,
  shareToFeed = true
): Promise<InstagramPublishResult> {
  const creds = getCredentials();
  if (!creds) {
    return { success: false, error: 'Instagram not configured', retryable: false };
  }
  
  try {
    const url = new URL(`${GRAPH_API_BASE}/${creds.accountId}/media`);
    url.searchParams.set('media_type', 'REELS');
    url.searchParams.set('video_url', videoUrl);
    url.searchParams.set('caption', caption);
    url.searchParams.set('share_to_feed', shareToFeed.toString());
    url.searchParams.set('access_token', creds.accessToken);
    
    if (coverUrl) {
      url.searchParams.set('cover_url', coverUrl);
    }
    
    const response = await fetch(url.toString(), { method: 'POST' });
    const data = (await response.json()) as GraphAPIResponse;
    
    if (data.error) {
      logger.error({ error: data.error }, 'Failed to create reel container');
      return {
        success: false,
        error: data.error.message,
        retryable: isRetryableError(data.error),
      };
    }
    
    logger.info({ containerId: data.id }, 'Reel container created');
    return { success: true, containerId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to create reel container');
    return { success: false, error: message, retryable: true };
  }
}

// ================================
// Check Container Status
// ================================
export async function checkContainerStatus(
  containerId: string
): Promise<MediaContainer | null> {
  const creds = getCredentials();
  if (!creds) return null;
  
  try {
    const url = new URL(`${GRAPH_API_BASE}/${containerId}`);
    url.searchParams.set('fields', 'status,status_code');
    url.searchParams.set('access_token', creds.accessToken);
    
    const response = await fetch(url.toString());
          const data = (await response.json()) as GraphAPIResponse;
    
    if (data.error) {
      logger.error({ error: data.error, containerId }, 'Failed to check container status');
      return null;
    }
    
    return {
      id: containerId,
      status: (data.status as 'IN_PROGRESS' | 'FINISHED' | 'ERROR') || 'IN_PROGRESS',
      status_code: data.status_code,
    };
  } catch (error) {
    logger.error({ error, containerId }, 'Failed to check container status');
    return null;
  }
}

// ================================
// Wait for Container Ready
// ================================
async function waitForContainer(
  containerId: string,
  maxWaitMs = 60000,
  pollIntervalMs = 5000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkContainerStatus(containerId);
    
    if (!status) return false;
    if (status.status === 'FINISHED') return true;
    if (status.status === 'ERROR') {
      logger.error({ containerId, statusCode: status.status_code }, 'Container failed');
      return false;
    }
    
    // Still processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  logger.error({ containerId }, 'Container processing timeout');
  return false;
}

// ================================
// Publish Container
// ================================
export async function publishContainer(
  containerId: string
): Promise<InstagramPublishResult> {
  const creds = getCredentials();
  if (!creds) {
    return { success: false, error: 'Instagram not configured', retryable: false };
  }
  
  // Wait for container to be ready
  const isReady = await waitForContainer(containerId);
  if (!isReady) {
    return { 
      success: false, 
      error: 'Container not ready or failed', 
      retryable: false 
    };
  }
  
  try {
    const url = new URL(`${GRAPH_API_BASE}/${creds.accountId}/media_publish`);
    url.searchParams.set('creation_id', containerId);
    url.searchParams.set('access_token', creds.accessToken);
    
    const response = await fetch(url.toString(), { method: 'POST' });
    const data = (await response.json()) as GraphAPIResponse;
    
    if (data.error) {
      logger.error({ error: data.error }, 'Failed to publish container');
      return {
        success: false,
        error: data.error.message,
        retryable: isRetryableError(data.error),
      };
    }
    
    logger.info({ mediaId: data.id }, 'Media published to Instagram');
    return { success: true, mediaId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to publish container');
    return { success: false, error: message, retryable: true };
  }
}

// ================================
// High-Level Publishing Functions
// ================================
export async function publishImagePost(
  imageUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  // Create container
  const containerResult = await createImageContainer(imageUrl, caption);
  if (!containerResult.success || !containerResult.containerId) {
    return containerResult;
  }
  
  // Publish
  return publishContainer(containerResult.containerId);
}

export async function publishCarouselPost(
  imageUrls: string[],
  caption: string
): Promise<InstagramPublishResult> {
  // Create container
  const containerResult = await createCarouselContainer(imageUrls, caption);
  if (!containerResult.success || !containerResult.containerId) {
    return containerResult;
  }
  
  // Publish
  return publishContainer(containerResult.containerId);
}

export async function publishReelPost(
  videoUrl: string,
  caption: string,
  coverUrl?: string
): Promise<InstagramPublishResult> {
  // Create container
  const containerResult = await createReelContainer(videoUrl, caption, coverUrl);
  if (!containerResult.success || !containerResult.containerId) {
    return containerResult;
  }
  
  // Publish
  return publishContainer(containerResult.containerId);
}

// ================================
// Test Connection
// ================================
export async function testInstagramConnection(): Promise<{
  success: boolean;
  accountInfo?: { id: string; username: string };
  error?: string;
}> {
  const creds = getCredentials();
  if (!creds) {
    return { success: false, error: 'Instagram not configured' };
  }
  
  try {
    const url = new URL(`${GRAPH_API_BASE}/${creds.accountId}`);
    url.searchParams.set('fields', 'id,username,name,profile_picture_url');
    url.searchParams.set('access_token', creds.accessToken);
    
    const response = await fetch(url.toString());
          const data = (await response.json()) as GraphAPIResponse;
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    
    logger.info({ username: data.username, id: data.id }, 'Instagram connection test successful');
    
    return {
      success: true,
      accountInfo: { id: data.id || '', username: data.username || '' },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ================================
// Utility Functions
// ================================
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const retryableCodes = [
    1, // Unknown error
    2, // Service unavailable
    4, // API too many calls
    17, // User request limit reached
    341, // Application limit reached
  ];
  
  return retryableCodes.includes(error.code);
}
