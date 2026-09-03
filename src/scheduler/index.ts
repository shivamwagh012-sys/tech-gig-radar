import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { runNewsPipeline, runJobsPipeline } from '../pipeline/index.js';
import { notifyAdmin } from '../publisher/telegram/client.js';

const logger = createLogger('scheduler');

// ================================
// Types
// ================================
interface ScheduledTask {
  name: string;
  intervalMs: number;
  lastRun?: Date;
  nextRun: Date;
  running: boolean;
  task: () => Promise<void>;
}

// ================================
// Task Registry
// ================================
const tasks: Map<string, ScheduledTask> = new Map();
let isRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;

// ================================
// Schedule Definitions
// ================================
function initializeTasks() {
  // News Discovery
  tasks.set('news-discovery', {
    name: 'News Discovery',
    intervalMs: config.discovery.newsCheckInterval * 60 * 1000, // Convert minutes to ms
    nextRun: new Date(),
    running: false,
    task: async () => {
      logger.info('Running scheduled news discovery');
      const result = await runNewsPipeline();
      
      if (result.stats.pendingReview > 0) {
        await notifyAdmin(
          `📰 <b>News Discovery Complete</b>\n\n` +
          `Found ${result.stats.discovered} items\n` +
          `Unique: ${result.stats.unique}\n` +
          `Pending review: ${result.stats.pendingReview}\n` +
          `Rejected: ${result.stats.rejected}`
        );
      }
    },
  });
  
  // Job Discovery
  tasks.set('job-discovery', {
    name: 'Job Discovery',
    intervalMs: config.discovery.jobsCheckInterval * 60 * 1000,
    nextRun: new Date(Date.now() + 5 * 60 * 1000), // Offset by 5 minutes
    running: false,
    task: async () => {
      logger.info('Running scheduled job discovery');
      const result = await runJobsPipeline();
      
      if (result.stats.pendingReview > 0) {
        await notifyAdmin(
          `💼 <b>Job Discovery Complete</b>\n\n` +
          `Found ${result.stats.discovered} jobs\n` +
          `Unique: ${result.stats.unique}\n` +
          `Pending review: ${result.stats.pendingReview}\n` +
          `Rejected: ${result.stats.rejected}`
        );
      }
    },
  });
}

// ================================
// Scheduler Engine
// ================================
async function tick() {
  const now = new Date();
  
  for (const [id, task] of tasks) {
    if (task.running) continue;
    if (task.nextRun > now) continue;
    
    // Time to run this task
    task.running = true;
    task.lastRun = now;
    
    try {
      logger.info({ task: task.name }, 'Starting scheduled task');
      await task.task();
      logger.info({ task: task.name }, 'Scheduled task completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ task: task.name, error: message }, 'Scheduled task failed');
      
      // Notify admin of failure
      await notifyAdmin(
        `⚠️ <b>Scheduled Task Failed</b>\n\n` +
        `Task: ${task.name}\n` +
        `Error: ${message}`
      ).catch(() => {}); // Don't fail on notification error
    } finally {
      task.running = false;
      // Schedule next run
      task.nextRun = new Date(now.getTime() + task.intervalMs);
    }
  }
}

// ================================
// Public API
// ================================
export function startScheduler() {
  if (isRunning) {
    logger.warn('Scheduler already running');
    return;
  }
  
  initializeTasks();
  isRunning = true;
  
  // Run tick every minute
  intervalHandle = setInterval(() => {
    tick().catch(error => {
      logger.error({ error }, 'Scheduler tick failed');
    });
  }, 60 * 1000);
  
  // Run initial tick
  tick().catch(error => {
    logger.error({ error }, 'Initial scheduler tick failed');
  });
  
  logger.info({ taskCount: tasks.size }, 'Scheduler started');
}

export function stopScheduler() {
  if (!isRunning) return;
  
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  
  isRunning = false;
  logger.info('Scheduler stopped');
}

export function getSchedulerStatus(): {
  running: boolean;
  tasks: Array<{
    name: string;
    intervalMinutes: number;
    lastRun?: Date;
    nextRun: Date;
    running: boolean;
  }>;
} {
  return {
    running: isRunning,
    tasks: Array.from(tasks.values()).map(t => ({
      name: t.name,
      intervalMinutes: t.intervalMs / 60000,
      lastRun: t.lastRun,
      nextRun: t.nextRun,
      running: t.running,
    })),
  };
}

// ================================
// Run Task Manually
// ================================
export async function runTaskNow(taskId: string): Promise<boolean> {
  const task = tasks.get(taskId);
  if (!task) {
    logger.warn({ taskId }, 'Task not found');
    return false;
  }
  
  if (task.running) {
    logger.warn({ taskId }, 'Task already running');
    return false;
  }
  
  task.running = true;
  task.lastRun = new Date();
  
  try {
    await task.task();
    return true;
  } catch (error) {
    logger.error({ taskId, error }, 'Manual task run failed');
    return false;
  } finally {
    task.running = false;
    task.nextRun = new Date(Date.now() + task.intervalMs);
  }
}
