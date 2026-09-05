/**
 * Post generated reels to Telegram
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@TechGigRadar';

if (!BOT_TOKEN) {
  console.log('No TELEGRAM_BOT_TOKEN, skipping post');
  process.exit(0);
}

const manifestPath = './output/reels/manifest.json';
if (!fs.existsSync(manifestPath)) {
  console.log('No manifest found, nothing to post');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`Found ${manifest.reels.length} reels to post\n`);

async function postVideo(videoPath, caption) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const videoData = fs.readFileSync(videoPath);
    const filename = path.basename(videoPath);
    
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${CHANNEL_ID}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="video"; filename="${filename}"\r\n`;
    body += `Content-Type: video/mp4\r\n\r\n`;
    
    const bodyStart = Buffer.from(body, 'utf8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([bodyStart, videoData, bodyEnd]);
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendVideo`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Telegram API error: ${res.statusCode} ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function main() {
  for (const reel of manifest.reels) {
    if (!fs.existsSync(reel.path)) {
      console.log(`Skipping ${reel.title} - file not found`);
      continue;
    }
    
    const caption = `🎬 ${reel.title}\n\n📲 Follow @TechGigRadar for daily tech news & remote jobs!\n\n#TechNews #RemoteJobs #TechGigRadar`;
    
    try {
      console.log(`Posting: ${reel.title}...`);
      await postVideo(reel.path, caption);
      console.log(`✓ Posted successfully!\n`);
      
      // Wait between posts
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`✗ Failed to post ${reel.title}:`, e.message);
    }
  }
  
  console.log('Done posting to Telegram!');
}

main().catch(console.error);
