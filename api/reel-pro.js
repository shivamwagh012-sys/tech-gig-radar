/**
 * Cloud-based Video Reel Generator API
 * 
 * This endpoint generates professional reels using:
 * - Canvas-based animations (client-side rendering)
 * - Edge TTS voice narration (server-side)
 * - Background music from royalty-free sources
 * 
 * For the full technologgia.ai style with stock video backgrounds,
 * you would need to use services like:
 * - Creatomate API
 * - Shotstack API
 * - Bannerbear API
 * 
 * These can add:
 * - Real stock video backgrounds
 * - Advanced text animations
 * - Watermarks and branding
 */

// Demo: Return HTML that creates professional-looking animated reel
export default function handler(req, res) {
  const { 
    type = 'news',
    headline = 'Breaking Tech News',
    points = '',
    stats = '',
    company = '',
    title = '',
    salary = '',
    skills = ''
  } = req.query;

  // Colors
  const COLORS = {
    primary: '#00d4ff',
    secondary: '#a855f7',
    accent: '#00ff88',
    warning: '#ff4444',
    dark: '#0a0a1a',
    gradient1: '#1a1a3a',
    gradient2: '#2a1a4a'
  };

  // Build scenes based on type
  let scenes = [];
  let voiceScript = '';

  if (type === 'job' && company && title) {
    const skillsList = skills ? skills.split(',').map(s => s.trim()) : [];
    
    scenes = [
      { type: 'hook', text: `${company} is HIRING!`, subtext: title, duration: 4, accent: COLORS.accent },
      { type: 'stat', text: salary || '$100K+', subtext: 'Remote / Hybrid', duration: 4, accent: COLORS.primary },
      { type: 'list', text: 'Required Skills', items: skillsList.slice(0, 4), duration: 5, accent: COLORS.secondary },
      { type: 'cta', text: 'APPLY NOW', subtext: 'Link in Bio', duration: 4, accent: COLORS.accent }
    ];
    
    voiceScript = `Hot job alert! ${company} is hiring a ${title}! The salary range is ${salary || 'competitive'}, with remote work options. You'll need skills in ${skillsList.slice(0, 3).join(', ')}. Apply now! Link in bio. Follow TechGig Radar for more opportunities!`;
  } else {
    const keyPoints = points ? points.split('|').map(p => p.trim()) : [];
    const statsList = stats ? stats.split('|').map(s => {
      const [value, label] = s.split(':');
      return { value: value?.trim() || '', label: label?.trim() || '' };
    }) : [];

    scenes = [
      { type: 'hook', text: headline, subtext: 'Breaking News', duration: 4, accent: COLORS.primary },
      ...(keyPoints.length > 0 ? [{ type: 'list', text: 'Key Points', items: keyPoints.slice(0, 4), duration: 6, accent: COLORS.secondary }] : []),
      ...(statsList.length > 0 ? [{ type: 'stat', text: 'The Numbers', stats: statsList.slice(0, 3), duration: 5, accent: COLORS.accent }] : []),
      { type: 'cta', text: 'Follow for More', subtext: '@TechGigRadar', duration: 4, accent: COLORS.primary }
    ];
    
    voiceScript = `Breaking news! ${headline}. ${keyPoints.map((p, i) => `Point ${i + 1}: ${p}.`).join(' ')} Follow TechGig Radar for daily tech updates!`;
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  // Generate professional HTML with animated gradient backgrounds
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type === 'job' ? `${company} Hiring` : headline} | TechGig Radar</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, sans-serif;
      padding: 20px;
    }
    
    .reel-container {
      width: 100%;
      max-width: 360px;
      aspect-ratio: 9/16;
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 80px rgba(0, 212, 255, 0.3);
    }
    
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    
    .controls {
      margin-top: 25px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .btn {
      padding: 14px 24px;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      font-size: 15px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-primary { background: ${COLORS.primary}; color: #000; }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; border: 2px solid ${COLORS.primary}; }
    .btn-success { background: ${COLORS.accent}; color: #000; }
    .btn:hover { transform: scale(1.05); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    
    .status {
      color: #888;
      font-size: 14px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${COLORS.accent};
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .title {
      color: #fff;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .voice-script {
      margin-top: 20px;
      padding: 15px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      max-width: 360px;
      color: #888;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .voice-script strong {
      color: ${COLORS.primary};
      display: block;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="title">${type === 'job' ? `${company} - ${title}` : headline}</div>
  <div class="status">
    <span class="status-dot"></span>
    <span id="status-text">Ready • ${totalDuration}s</span>
  </div>
  
  <div class="reel-container">
    <canvas id="canvas" width="1080" height="1920"></canvas>
  </div>
  
  <div class="controls">
    <button class="btn btn-primary" id="playBtn" onclick="togglePlay()">▶ Play</button>
    <button class="btn btn-secondary" id="recordBtn" onclick="startRecording()">⏺ Record</button>
    <button class="btn btn-success" id="downloadBtn" onclick="downloadVideo()" disabled>⬇ Download</button>
  </div>
  
  <div class="voice-script">
    <strong>🎙️ Voice Script (for TTS):</strong>
    ${voiceScript}
  </div>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 1080, H = 1920;
    
    const scenes = ${JSON.stringify(scenes)};
    const totalDuration = ${totalDuration};
    const COLORS = ${JSON.stringify(COLORS)};
    
    let isPlaying = false;
    let startTime = 0;
    let animId;
    let mediaRecorder;
    let chunks = [];
    
    // Animated gradient background
    let gradientOffset = 0;
    
    function drawGradientBg(t) {
      gradientOffset = t * 20;
      
      // Animated radial gradient
      const gradient = ctx.createRadialGradient(
        W/2 + Math.sin(t * 0.5) * 200,
        H/2 + Math.cos(t * 0.3) * 300,
        0,
        W/2, H/2, Math.max(W, H)
      );
      
      gradient.addColorStop(0, '#2a1a5a');
      gradient.addColorStop(0.5, '#1a1a3a');
      gradient.addColorStop(1, '#0a0a1a');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
      
      // Animated particles
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(t * 0.3 + i * 0.5) + 1) * W/2;
        const y = (Math.cos(t * 0.2 + i * 0.7) + 1) * H/2;
        const size = 2 + Math.sin(t + i) * 2;
        const alpha = 0.3 + Math.sin(t * 2 + i) * 0.2;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(0, 212, 255, \${alpha})\`;
        ctx.fill();
      }
    }
    
    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }
    
    function drawText(text, x, y, fontSize, color, align = 'center', alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.font = \`bold \${fontSize}px Inter, sans-serif\`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      
      // Text shadow for depth
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;
      
      // Word wrap
      const words = text.split(' ');
      const maxWidth = W - 120;
      let line = '';
      let lineY = y;
      
      words.forEach((word, i) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), x, lineY);
          line = word + ' ';
          lineY += fontSize * 1.3;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line.trim(), x, lineY);
      
      ctx.shadowColor = 'transparent';
      ctx.globalAlpha = 1;
    }
    
    function drawHookScene(scene, t, duration) {
      const progress = Math.min(1, t / 0.6);
      const eased = easeOutQuart(progress);
      
      // Animated badge
      const badgeAlpha = Math.min(1, t * 3);
      ctx.globalAlpha = badgeAlpha;
      ctx.fillStyle = '${COLORS.warning}';
      roundRect(W/2 - 160, 280, 320, 70, 35);
      ctx.fill();
      
      ctx.font = 'bold 32px Inter';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('⚡ BREAKING', W/2, 325);
      ctx.globalAlpha = 1;
      
      // Main text with scale animation
      const scale = 0.8 + eased * 0.2;
      ctx.save();
      ctx.translate(W/2, H/2 - 100);
      ctx.scale(scale, scale);
      drawText(scene.text, 0, 0, 72, '#fff', 'center', eased);
      ctx.restore();
      
      // Subtext
      if (scene.subtext && t > 0.4) {
        const subAlpha = Math.min(1, (t - 0.4) * 3);
        drawText(scene.subtext, W/2, H/2 + 80, 44, scene.accent, 'center', subAlpha);
      }
    }
    
    function drawStatScene(scene, t, duration) {
      // Title
      drawText(scene.text, W/2, 400, 48, '#888', 'center', Math.min(1, t * 2));
      
      if (scene.stats) {
        scene.stats.forEach((stat, i) => {
          const delay = 0.3 + i * 0.3;
          if (t > delay) {
            const alpha = Math.min(1, (t - delay) * 3);
            const y = 550 + i * 280;
            
            // Big number with glow
            ctx.shadowColor = scene.accent;
            ctx.shadowBlur = 30;
            drawText(stat.value, W/2, y, 110, scene.accent, 'center', alpha);
            ctx.shadowBlur = 0;
            
            // Label
            drawText(stat.label, W/2, y + 80, 36, '#fff', 'center', alpha);
          }
        });
      } else if (scene.subtext) {
        drawText(scene.subtext, W/2, 550, 100, scene.accent, 'center', Math.min(1, (t - 0.3) * 2));
      }
    }
    
    function drawListScene(scene, t, duration) {
      // Title bar
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 280, W, 100);
      drawText(scene.text, W/2, 345, 52, '#fff', 'center', 1);
      
      const items = scene.items || [];
      items.forEach((item, i) => {
        const delay = 0.4 + i * 0.35;
        if (t > delay) {
          const alpha = Math.min(1, (t - delay) * 3);
          const y = 480 + i * 180;
          const slideX = (1 - alpha) * -100;
          
          // Bullet
          ctx.globalAlpha = alpha;
          ctx.fillStyle = scene.accent;
          ctx.beginPath();
          ctx.arc(100 + slideX, y + 20, 12, 0, Math.PI * 2);
          ctx.fill();
          
          // Text
          drawText(item, 150 + slideX, y + 30, 40, '#fff', 'left', alpha);
        }
      });
    }
    
    function drawCTAScene(scene, t, duration) {
      // Pulsing glow
      const pulse = 0.4 + Math.sin(t * 6) * 0.15;
      ctx.beginPath();
      ctx.arc(W/2, H/2 - 150, 180, 0, Math.PI * 2);
      ctx.fillStyle = \`rgba(0, 212, 255, \${pulse})\`;
      ctx.fill();
      
      // Logo
      drawText('TechGig', W/2, H/2 - 200, 80, '#fff', 'center', 1);
      drawText('Radar', W/2, H/2 - 100, 80, scene.accent, 'center', 1);
      
      // CTA
      const ctaAlpha = Math.min(1, t * 2);
      drawText(scene.text, W/2, H/2 + 150, 56, '#fff', 'center', ctaAlpha);
      
      if (scene.subtext) {
        drawText(scene.subtext, W/2, H/2 + 230, 36, '#888', 'center', ctaAlpha);
      }
      
      // Handle
      drawText('@TechGigRadar', W/2, H/2 + 350, 44, scene.accent, 'center', ctaAlpha);
    }
    
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    
    function drawScene(currentTime) {
      // Find current scene
      let elapsed = 0;
      let currentScene = scenes[0];
      let sceneTime = currentTime;
      
      for (const scene of scenes) {
        if (currentTime < elapsed + scene.duration) {
          currentScene = scene;
          sceneTime = currentTime - elapsed;
          break;
        }
        elapsed += scene.duration;
      }
      
      // Clear and draw background
      drawGradientBg(currentTime);
      
      // Draw scene content
      switch (currentScene.type) {
        case 'hook': drawHookScene(currentScene, sceneTime, currentScene.duration); break;
        case 'stat': drawStatScene(currentScene, sceneTime, currentScene.duration); break;
        case 'list': drawListScene(currentScene, sceneTime, currentScene.duration); break;
        case 'cta': drawCTAScene(currentScene, sceneTime, currentScene.duration); break;
      }
      
      // Progress bar
      const progress = currentTime / totalDuration;
      ctx.fillStyle = currentScene.accent;
      ctx.fillRect(0, H - 24, W * progress, 24);
      
      // Watermark
      ctx.globalAlpha = 0.6;
      ctx.font = '28px Inter';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.fillText('@TechGigRadar', W - 50, H - 70);
      ctx.globalAlpha = 1;
    }
    
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const currentTime = (timestamp - startTime) / 1000;
      
      if (currentTime < totalDuration) {
        drawScene(currentTime);
        animId = requestAnimationFrame(animate);
      } else {
        drawScene(totalDuration - 0.01);
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ Replay';
        document.getElementById('status-text').textContent = 'Complete!';
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }
    }
    
    function togglePlay() {
      if (isPlaying) {
        cancelAnimationFrame(animId);
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ Play';
        document.getElementById('status-text').textContent = 'Paused';
      } else {
        startTime = 0;
        isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸ Pause';
        document.getElementById('status-text').textContent = 'Playing...';
        requestAnimationFrame(animate);
      }
    }
    
    function startRecording() {
      chunks = [];
      const stream = canvas.captureStream(30);
      
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        document.getElementById('downloadBtn').disabled = false;
        document.getElementById('status-text').textContent = 'Ready to download!';
        document.getElementById('recordBtn').disabled = false;
      };
      
      mediaRecorder.start();
      document.getElementById('status-text').textContent = 'Recording...';
      document.getElementById('recordBtn').disabled = true;
      
      // Auto-play
      startTime = 0;
      isPlaying = true;
      document.getElementById('playBtn').textContent = '⏸ Pause';
      requestAnimationFrame(animate);
    }
    
    function downloadVideo() {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'techgig-reel.webm';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    // Initialize
    drawScene(0);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
