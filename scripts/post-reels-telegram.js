/**
 * Post generated reels to Telegram
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'reels');

/**
 * Send video to Telegram
 */
async function sendVideoToTelegram(videoPath, caption) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHANNEL_ID);
    form.append('video', fs.createReadStream(videoPath));
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendVideo`,
      method: 'POST',
      headers: form.getHeaders()
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.ok) {
            resolve(result);
          } else {
            reject(new Error(result.description));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Main function
 */
async function main() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.log('Telegram credentials not configured. Skipping post.');
    return;
  }
  
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.log('No manifest found. No reels to post.');
    return;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  console.log(`Posting ${manifest.reels.length} reels to Telegram...`);
  
  for (const reel of manifest.reels) {
    if (!fs.existsSync(reel.path)) {
      console.log(`Skipping ${reel.title} - file not found`);
      continue;
    }
    
    const caption = `🎬 <b>${reel.title}</b>\n\n` +
                   `📍 ${reel.type === 'job' ? '💼 Job Alert' : '📰 Tech News'}\n\n` +
                   `👉 Follow @TechGigRadar for daily updates!\n\n` +
                   `#TechGigRadar #Tech #Jobs #Remote`;
    
    try {
      await sendVideoToTelegram(reel.path, caption);
      console.log(`✅ Posted: ${reel.title}`);
      
      // Wait 5 seconds between posts to avoid rate limiting
      await new Promise(r => setTimeout(r, 5000));
    } catch (error) {
      console.error(`❌ Failed to post ${reel.title}:`, error.message);
    }
  }
  
  console.log('Done posting to Telegram!');
}

main().catch(console.error);
