import { Bot, InputFile } from 'grammy';
import { createLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import type { TelegramNewsContent, TelegramJobContent } from '../../content/generator.js';

const logger = createLogger('telegram-publisher');

// ================================
// Bot Instance
// ================================
let bot: Bot | null = null;

export function initTelegramBot(): Bot | null {
  if (!config.telegram.enabled) {
    logger.warn('Telegram is disabled in configuration');
    return null;
  }
  
  if (!config.telegram.botToken) {
    logger.error('Telegram bot token not configured');
    return null;
  }
  
  try {
    bot = new Bot(config.telegram.botToken);
    logger.info('Telegram bot initialized');
    return bot;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Telegram bot');
    return null;
  }
}

export function getBot(): Bot | null {
  return bot;
}

// ================================
// Publishing Functions
// ================================
export interface PublishResult {
  success: boolean;
  messageId?: number;
  error?: string;
  retryable?: boolean;
}

export async function publishNewsToTelegram(
  content: TelegramNewsContent,
  channelId?: string
): Promise<PublishResult> {
  const targetChannel = channelId || config.telegram.channelId;
  
  if (!targetChannel) {
    return { success: false, error: 'No channel ID configured', retryable: false };
  }
  
  if (!bot) {
    bot = initTelegramBot();
    if (!bot) {
      return { success: false, error: 'Bot not initialized', retryable: true };
    }
  }
  
  try {
    logger.info({ channel: targetChannel }, 'Publishing news to Telegram');
    
    const message = await bot.api.sendMessage(targetChannel, content.text, {
      parse_mode: content.parseMode === 'HTML' ? 'HTML' : 'Markdown',
      // @ts-ignore - grammy types might not include all options
      disable_web_page_preview: false,
    });
    
    logger.info({ 
      channel: targetChannel, 
      messageId: message.message_id 
    }, 'News published successfully');
    
    return { success: true, messageId: message.message_id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRetryable = isRetryableError(errorMessage);
    
    logger.error({ 
      channel: targetChannel, 
      error: errorMessage,
      retryable: isRetryable,
    }, 'Failed to publish news');
    
    return { success: false, error: errorMessage, retryable: isRetryable };
  }
}

export async function publishJobToTelegram(
  content: TelegramJobContent,
  channelId?: string
): Promise<PublishResult> {
  const targetChannel = channelId || config.telegram.channelId;
  
  if (!targetChannel) {
    return { success: false, error: 'No channel ID configured', retryable: false };
  }
  
  if (!bot) {
    bot = initTelegramBot();
    if (!bot) {
      return { success: false, error: 'Bot not initialized', retryable: true };
    }
  }
  
  try {
    logger.info({ channel: targetChannel }, 'Publishing job to Telegram');
    
    const message = await bot.api.sendMessage(targetChannel, content.text, {
      parse_mode: content.parseMode === 'HTML' ? 'HTML' : 'Markdown',
      // @ts-ignore
      disable_web_page_preview: true, // Jobs often have long URLs
    });
    
    logger.info({ 
      channel: targetChannel, 
      messageId: message.message_id 
    }, 'Job published successfully');
    
    return { success: true, messageId: message.message_id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRetryable = isRetryableError(errorMessage);
    
    logger.error({ 
      channel: targetChannel, 
      error: errorMessage,
      retryable: isRetryable,
    }, 'Failed to publish job');
    
    return { success: false, error: errorMessage, retryable: isRetryable };
  }
}

export async function publishImageToTelegram(
  imagePath: string,
  caption: string,
  channelId?: string
): Promise<PublishResult> {
  const targetChannel = channelId || config.telegram.channelId;
  
  if (!targetChannel) {
    return { success: false, error: 'No channel ID configured', retryable: false };
  }
  
  if (!bot) {
    bot = initTelegramBot();
    if (!bot) {
      return { success: false, error: 'Bot not initialized', retryable: true };
    }
  }
  
  try {
    logger.info({ channel: targetChannel, imagePath }, 'Publishing image to Telegram');
    
    const message = await bot.api.sendPhoto(
      targetChannel,
      new InputFile(imagePath),
      {
        caption,
        parse_mode: 'HTML',
      }
    );
    
    logger.info({ 
      channel: targetChannel, 
      messageId: message.message_id 
    }, 'Image published successfully');
    
    return { success: true, messageId: message.message_id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRetryable = isRetryableError(errorMessage);
    
    logger.error({ error: errorMessage }, 'Failed to publish image');
    
    return { success: false, error: errorMessage, retryable: isRetryable };
  }
}

// ================================
// Admin Notifications
// ================================
export async function notifyAdmin(message: string): Promise<boolean> {
  const adminChatId = config.telegram.adminChatId;
  
  if (!adminChatId) {
    logger.debug('No admin chat ID configured, skipping notification');
    return false;
  }
  
  if (!bot) {
    bot = initTelegramBot();
    if (!bot) return false;
  }
  
  try {
    await bot.api.sendMessage(adminChatId, message, {
      parse_mode: 'HTML',
    });
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to notify admin');
    return false;
  }
}

// ================================
// Utility Functions
// ================================
function isRetryableError(errorMessage: string): boolean {
  const retryablePatterns = [
    /rate limit/i,
    /too many requests/i,
    /timeout/i,
    /network/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /429/,
    /503/,
    /502/,
  ];
  
  return retryablePatterns.some(p => p.test(errorMessage));
}

// ================================
// Test Connection
// ================================
export async function testTelegramConnection(): Promise<{
  success: boolean;
  botInfo?: { username: string; id: number };
  error?: string;
}> {
  if (!bot) {
    bot = initTelegramBot();
    if (!bot) {
      return { success: false, error: 'Bot initialization failed' };
    }
  }
  
  try {
    const me = await bot.api.getMe();
    logger.info({ username: me.username, id: me.id }, 'Telegram connection test successful');
    
    return {
      success: true,
      botInfo: { username: me.username || 'unknown', id: me.id },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
