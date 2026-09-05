// API endpoint to generate animated video reel HTML
// GET /api/reel?type=news&headline=...&points=...
// GET /api/reel?type=job&title=...&company=...&salary=...&skills=...

export default function handler(req, res) {
  const { type, headline, points, stats, title, company, salary, skills } = req.query;

  // Color palette
  const COLORS = {
    bgDark: '#0a0a1a',
    bgCard: '#12122a',
    accentCyan: '#00d4ff',
    accentPurple: '#a855f7',
    accentGreen: '#00ff88',
    accentRed: '#ff4444',
    textWhite: '#ffffff',
    textMuted: '#888899'
  };

  let scenes = [];
  let reelTitle = '';
  let reelId = 'reel-' + Date.now();

  if (type === 'job' && title && company) {
    reelTitle = `${company} is Hiring!`;
    const skillsList = skills ? skills.split(',').map(s => s.trim()) : [];
    
    scenes = [
      {
        type: 'hook',
        title: `${company} is Hiring!`,
        subtitle: title,
        duration: 4,
        accent: COLORS.accentGreen
      },
      {
        type: 'stat',
        title: 'The Offer',
        stats: [
          { label: 'Salary Range', value: salary || '$100K+' },
          { label: 'Work Type', value: 'Remote' }
        ],
        duration: 6,
        accent: COLORS.accentCyan
      },
      {
        type: 'list',
        title: 'Required Skills',
        items: skillsList.slice(0, 4),
        duration: 6,
        accent: COLORS.accentPurple
      },
      {
        type: 'cta',
        title: 'Apply Now!',
        subtitle: 'Link in Bio',
        duration: 4,
        accent: COLORS.accentGreen
      }
    ];
  } else if (type === 'news' && headline) {
    reelTitle = headline;
    const keyPoints = points ? points.split('|').map(p => p.trim()) : [];
    const statsList = stats ? stats.split('|').map(s => {
      const [value, label] = s.split(':');
      return { value: value?.trim() || '', label: label?.trim() || '' };
    }) : [];

    scenes = [
      {
        type: 'hook',
        title: headline,
        subtitle: 'Swipe for details ➤',
        duration: 4,
        accent: COLORS.accentCyan
      },
      ...(keyPoints.length > 0 ? [{
        type: 'list',
        title: 'Key Points',
        items: keyPoints.slice(0, 4),
        duration: 7,
        accent: COLORS.accentPurple
      }] : []),
      ...(statsList.length > 0 ? [{
        type: 'stat',
        title: 'By the Numbers',
        stats: statsList.slice(0, 3),
        duration: 6,
        accent: COLORS.accentGreen
      }] : []),
      {
        type: 'cta',
        title: 'Follow for More',
        subtitle: 'Daily Tech News & Jobs',
        duration: 4,
        accent: COLORS.accentCyan
      }
    ];
  } else {
    // Demo reel
    reelTitle = 'GPT-5 Launches Today';
    scenes = [
      {
        type: 'hook',
        title: 'GPT-5 Launches Today!',
        subtitle: 'The AGI Era Begins',
        duration: 4,
        accent: COLORS.accentCyan
      },
      {
        type: 'list',
        title: 'Key Features',
        items: [
          'Trained on 100K+ GPUs',
          'First model rated CRITICAL',
          '36x faster than humans',
          'Plus tier only'
        ],
        duration: 7,
        accent: COLORS.accentPurple
      },
      {
        type: 'stat',
        title: 'By the Numbers',
        stats: [
          { value: '100K+', label: 'Training GPUs' },
          { value: '36x', label: 'Speed Improvement' }
        ],
        duration: 6,
        accent: COLORS.accentGreen
      },
      {
        type: 'cta',
        title: 'Follow for More',
        subtitle: 'Daily AI News & Updates',
        duration: 4,
        accent: COLORS.accentCyan
      }
    ];
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reelTitle} - TechGig Radar Reel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #000; 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center;
      min-height: 100vh;
      font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
      padding: 20px;
    }
    #canvas-container {
      width: 100%;
      max-width: 360px;
      aspect-ratio: 9/16;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 100%;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 212, 255, 0.3);
    }
    .controls {
      margin-top: 20px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .controls button {
      padding: 12px 20px;
      background: ${COLORS.accentCyan};
      color: ${COLORS.bgDark};
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .controls button:hover { transform: scale(1.05); }
    .controls button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .controls button.secondary {
      background: transparent;
      color: ${COLORS.accentCyan};
      border: 2px solid ${COLORS.accentCyan};
    }
    #status {
      margin-bottom: 15px;
      color: ${COLORS.textMuted};
      font-size: 14px;
    }
    .title {
      color: #fff;
      font-size: 18px;
      margin-bottom: 10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="title">${reelTitle}</div>
  <div id="status">Ready • ${totalDuration}s</div>
  <div id="canvas-container">
    <canvas id="reel-canvas" width="1080" height="1920"></canvas>
  </div>
  <div class="controls">
    <button id="play-btn" onclick="playReel()">▶ Play</button>
    <button id="record-btn" class="secondary" onclick="recordReel()">⏺ Record</button>
    <button id="download-btn" onclick="downloadReel()" disabled>⬇ Download</button>
  </div>

  <script>
    const canvas = document.getElementById('reel-canvas');
    const ctx = canvas.getContext('2d');
    const W = 1080, H = 1920;
    
    const scenes = ${JSON.stringify(scenes)};
    const totalDuration = ${totalDuration};
    const COLORS = ${JSON.stringify(COLORS)};
    
    let isPlaying = false;
    let startTime = 0;
    let animationFrame;
    let mediaRecorder;
    let recordedChunks = [];
    
    function drawScene(currentTime) {
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
      
      ctx.fillStyle = COLORS.bgDark;
      ctx.fillRect(0, 0, W, H);
      
      switch (currentScene.type) {
        case 'hook': drawHookScene(currentScene, sceneTime); break;
        case 'stat': drawStatScene(currentScene, sceneTime); break;
        case 'list': drawListScene(currentScene, sceneTime); break;
        case 'cta': drawCTAScene(currentScene, sceneTime); break;
      }
      
      const progress = currentTime / totalDuration;
      ctx.fillStyle = currentScene.accent;
      ctx.fillRect(0, H - 24, W * progress, 24);
      
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '32px Segoe UI';
      ctx.textAlign = 'right';
      ctx.fillText('@TechGigRadar', W - 50, H - 70);
    }
    
    function drawHookScene(scene, t) {
      ctx.fillStyle = scene.accent;
      ctx.fillRect(0, 0, W, 10);
      
      ctx.fillStyle = COLORS.accentRed;
      roundRect(40, 220, 300, 70, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 38px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText('BREAKING', 80, 268);
      
      const alpha = Math.min(1, t * 2.5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 76px Segoe UI';
      ctx.textAlign = 'center';
      wrapText(scene.title, W/2, H/2 - 80, W - 140, 95);
      
      if (scene.subtitle && t > 0.4) {
        ctx.globalAlpha = Math.min(1, (t - 0.4) * 3);
        ctx.fillStyle = scene.accent;
        ctx.font = '48px Segoe UI';
        ctx.fillText(scene.subtitle, W/2, H/2 + 120);
      }
      ctx.globalAlpha = 1;
    }
    
    function drawStatScene(scene, t) {
      ctx.fillStyle = COLORS.bgCard;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = scene.accent;
      ctx.fillRect(0, 0, 10, H);
      
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '50px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText(scene.title, 70, 380);
      
      const stats = scene.stats || [];
      stats.forEach((stat, i) => {
        const y = 520 + (i * 300);
        const delay = 0.3 + (i * 0.35);
        
        if (t > delay) {
          ctx.globalAlpha = Math.min(1, (t - delay) * 3.5);
          ctx.fillStyle = scene.accent;
          ctx.font = 'bold 120px Segoe UI';
          ctx.fillText(stat.value, 70, y);
          ctx.fillStyle = '#fff';
          ctx.font = '40px Segoe UI';
          ctx.fillText(stat.label, 70, y + 70);
        }
      });
      ctx.globalAlpha = 1;
    }
    
    function drawListScene(scene, t) {
      ctx.fillStyle = COLORS.bgCard;
      ctx.fillRect(0, 220, W, 110);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 56px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText(scene.title, 70, 295);
      
      const items = scene.items || [];
      items.forEach((item, i) => {
        const y = 450 + (i * 210);
        const delay = 0.4 + (i * 0.35);
        
        if (t > delay) {
          ctx.globalAlpha = Math.min(1, (t - delay) * 3.5);
          ctx.fillStyle = scene.accent;
          ctx.beginPath();
          ctx.arc(90, y + 25, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '44px Segoe UI';
          wrapText(item, 140, y + 40, W - 200, 60);
        }
      });
      ctx.globalAlpha = 1;
    }
    
    function drawCTAScene(scene, t) {
      const pulse = 0.25 + Math.sin(t * 5) * 0.12;
      ctx.fillStyle = scene.accent;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(W/2, H/2 - 180, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 90px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('TechGig', W/2, H/2 - 230);
      ctx.fillStyle = scene.accent;
      ctx.fillText('Radar', W/2, H/2 - 120);
      
      ctx.globalAlpha = Math.min(1, t * 2.5);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 56px Segoe UI';
      ctx.fillText(scene.title, W/2, H/2 + 150);
      
      if (scene.subtitle) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '40px Segoe UI';
        ctx.fillText(scene.subtitle, W/2, H/2 + 230);
      }
      
      ctx.fillStyle = scene.accent;
      ctx.font = 'bold 52px Segoe UI';
      ctx.fillText('@TechGigRadar', W/2, H/2 + 380);
      ctx.globalAlpha = 1;
    }
    
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    
    function wrapText(text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      
      words.forEach((word, i) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), x, currentY);
          line = word + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line.trim(), x, currentY);
    }
    
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const currentTime = (timestamp - startTime) / 1000;
      
      if (currentTime < totalDuration) {
        drawScene(currentTime);
        animationFrame = requestAnimationFrame(animate);
      } else {
        drawScene(totalDuration - 0.01);
        isPlaying = false;
        document.getElementById('play-btn').textContent = '▶ Replay';
        document.getElementById('status').textContent = 'Complete!';
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }
    }
    
    function playReel() {
      if (isPlaying) {
        cancelAnimationFrame(animationFrame);
        isPlaying = false;
        document.getElementById('play-btn').textContent = '▶ Play';
        document.getElementById('status').textContent = 'Paused';
      } else {
        startTime = 0;
        isPlaying = true;
        document.getElementById('play-btn').textContent = '⏸ Pause';
        document.getElementById('status').textContent = 'Playing...';
        requestAnimationFrame(animate);
      }
    }
    
    function recordReel() {
      recordedChunks = [];
      const stream = canvas.captureStream(30);
      
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      }
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        document.getElementById('download-btn').disabled = false;
        document.getElementById('status').textContent = 'Recording ready! Click Download';
        document.getElementById('record-btn').disabled = false;
      };
      
      mediaRecorder.start();
      document.getElementById('status').textContent = 'Recording...';
      document.getElementById('record-btn').disabled = true;
      
      startTime = 0;
      isPlaying = true;
      document.getElementById('play-btn').textContent = '⏸ Pause';
      requestAnimationFrame(animate);
    }
    
    function downloadReel() {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'techgig-reel-${reelId}.webm';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    window.onload = () => drawScene(0);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
