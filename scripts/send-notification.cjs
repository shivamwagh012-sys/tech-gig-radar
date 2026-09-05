/**
 * TechGig Radar - Send Status Notification
 * Sends summary to Telegram and Email after each discovery run
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID; // Your personal chat ID
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Get counts from environment (set by previous steps)
const NEWS_COUNT = process.env.NEWS_COUNT || '0';
const JOBS_COUNT = process.env.JOBS_COUNT || '0';
const TECH_JOBS_COUNT = process.env.TECH_JOBS_COUNT || '0';
const HR_JOBS_COUNT = process.env.HR_JOBS_COUNT || '0';
const REELS_COUNT = process.env.REELS_COUNT || '0';

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.log('Telegram not configured, skipping...');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Telegram notification sent');
          resolve();
        } else {
          console.log('Telegram error:', body);
          reject(new Error(body));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendEmail(subject, htmlBody) {
  if (!SENDGRID_API_KEY || !ADMIN_EMAIL) {
    console.log('Email not configured, skipping...');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      personalizations: [{ to: [{ email: ADMIN_EMAIL }] }],
      from: { email: 'notifications@techgigradar.com', name: 'TechGig Radar' },
      subject: subject,
      content: [{ type: 'text/html', value: htmlBody }]
    });
    
    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 202) {
        console.log('✅ Email notification sent');
        resolve();
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log('Email error:', res.statusCode, body);
          reject(new Error(body));
        });
      }
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  const telegramMessage = `
🚀 <b>TechGig Radar - Sync Complete</b>

📅 <b>Time:</b> ${now} IST

📊 <b>Discovery Summary:</b>
━━━━━━━━━━━━━━━━━━━━
📰 News Articles: <b>${NEWS_COUNT}</b>
💼 Total Jobs: <b>${JOBS_COUNT}</b>
   ├ 💻 Technical: <b>${TECH_JOBS_COUNT}</b>
   └ 👔 HR/Recruitment: <b>${HR_JOBS_COUNT}</b>
🎬 Video Reels: <b>${REELS_COUNT}</b>
━━━━━━━━━━━━━━━━━━━━

✅ All systems operational!
🌐 Website: tech-gig-radar.vercel.app
📢 Channel: @TechGigRadar
`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fafafa; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; padding: 24px; }
    h1 { color: #a855f7; margin-bottom: 20px; }
    .stat { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #333; }
    .stat-label { color: #888; }
    .stat-value { font-weight: bold; color: #fff; }
    .success { color: #22c55e; font-size: 18px; margin-top: 20px; }
    .sub { color: #666; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 TechGig Radar</h1>
    <p style="color: #888;">Sync completed at ${now} IST</p>
    
    <div class="stat">
      <span class="stat-label">📰 News Articles</span>
      <span class="stat-value">${NEWS_COUNT}</span>
    </div>
    <div class="stat">
      <span class="stat-label">💼 Total Jobs</span>
      <span class="stat-value">${JOBS_COUNT}</span>
    </div>
    <div class="stat">
      <span class="stat-label">&nbsp;&nbsp;&nbsp;💻 Technical Jobs</span>
      <span class="stat-value">${TECH_JOBS_COUNT}</span>
    </div>
    <div class="stat">
      <span class="stat-label">&nbsp;&nbsp;&nbsp;👔 HR/Recruitment</span>
      <span class="stat-value">${HR_JOBS_COUNT}</span>
    </div>
    <div class="stat">
      <span class="stat-label">🎬 Video Reels</span>
      <span class="stat-value">${REELS_COUNT}</span>
    </div>
    
    <p class="success">✅ All systems operational!</p>
    <p class="sub">
      🌐 <a href="https://tech-gig-radar.vercel.app" style="color: #a855f7;">Website</a> | 
      📢 <a href="https://t.me/TechGigRadar" style="color: #a855f7;">Telegram</a>
    </p>
  </div>
</body>
</html>
`;

  try {
    await sendTelegram(telegramMessage);
  } catch (e) {
    console.error('Telegram failed:', e.message);
  }
  
  try {
    await sendEmail(`✅ TechGig Radar Sync Complete - ${NEWS_COUNT} News, ${JOBS_COUNT} Jobs`, emailHtml);
  } catch (e) {
    console.error('Email failed:', e.message);
  }
  
  console.log('\n✅ Notifications sent!');
}

main();
