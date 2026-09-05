/**
 * Web-Based Video Reel Generator
 * 
 * Creates animated infographic-style reels using HTML Canvas
 * Renders client-side, no FFmpeg required
 * Exports as WebM video via MediaRecorder API
 */

// Scene types for the animated infographic
export interface ReelScene {
  type: 'hook' | 'stat' | 'list' | 'quote' | 'cta';
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string }[];
  items?: string[];
  duration: number; // seconds
  accent: string;
}

export interface ReelConfig {
  id: string;
  title: string;
  category: 'news' | 'job' | 'tip';
  scenes: ReelScene[];
  script: string; // Voice narration text
  audioUrl?: string; // Pre-generated TTS audio URL
}

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

/**
 * Generate HTML for a video reel that can be rendered in browser
 * Returns standalone HTML that uses Canvas API for animation
 */
export function generateReelHTML(config: ReelConfig): string {
  const { scenes, script } = config;
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>${config.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: ${COLORS.bgDark}; 
      display: flex; 
      justify-content: center; 
      align-items: center;
      min-height: 100vh;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    #canvas-container {
      width: 360px;
      height: 640px;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 100%;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 212, 255, 0.2);
    }
    .controls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
    }
    .controls button {
      padding: 12px 24px;
      background: ${COLORS.accentCyan};
      color: ${COLORS.bgDark};
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    .controls button:hover { opacity: 0.9; }
    .controls button:disabled { opacity: 0.5; cursor: not-allowed; }
    #status {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: ${COLORS.textMuted};
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="status">Ready to play</div>
  <div id="canvas-container">
    <canvas id="reel-canvas" width="1080" height="1920"></canvas>
  </div>
  <div class="controls">
    <button id="play-btn" onclick="playReel()">▶ Play</button>
    <button id="record-btn" onclick="recordReel()" disabled>⏺ Record</button>
    <button id="download-btn" onclick="downloadReel()" disabled>⬇ Download</button>
  </div>

  <script>
    const canvas = document.getElementById('reel-canvas');
    const ctx = canvas.getContext('2d');
    const W = 1080, H = 1920;
    
    // Scene data from config
    const scenes = ${JSON.stringify(scenes)};
    const totalDuration = ${totalDuration};
    
    // Colors
    const COLORS = ${JSON.stringify(COLORS)};
    
    let isPlaying = false;
    let startTime = 0;
    let animationFrame;
    let mediaRecorder;
    let recordedChunks = [];
    
    // Draw a scene based on elapsed time
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
      
      // Clear canvas
      ctx.fillStyle = COLORS.bgDark;
      ctx.fillRect(0, 0, W, H);
      
      // Draw based on scene type
      switch (currentScene.type) {
        case 'hook':
          drawHookScene(currentScene, sceneTime);
          break;
        case 'stat':
          drawStatScene(currentScene, sceneTime);
          break;
        case 'list':
          drawListScene(currentScene, sceneTime);
          break;
        case 'cta':
          drawCTAScene(currentScene, sceneTime);
          break;
      }
      
      // Progress bar
      const progress = currentTime / totalDuration;
      ctx.fillStyle = currentScene.accent;
      ctx.fillRect(0, H - 20, W * progress, 20);
      
      // Watermark
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '28px Segoe UI';
      ctx.textAlign = 'right';
      ctx.fillText('@TechGigRadar', W - 40, H - 60);
    }
    
    function drawHookScene(scene, t) {
      // Accent stripe
      ctx.fillStyle = scene.accent;
      ctx.fillRect(0, 0, W, 8);
      
      // Breaking badge
      ctx.fillStyle = COLORS.accentRed;
      ctx.fillRect(40, 200, 280, 60);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText('BREAKING', 80, 242);
      
      // Title with fade-in
      const alpha = Math.min(1, t * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 72px Segoe UI';
      ctx.textAlign = 'center';
      wrapText(scene.title, W/2, H/2 - 50, W - 120, 90);
      
      // Subtitle
      if (scene.subtitle && t > 0.5) {
        const subAlpha = Math.min(1, (t - 0.5) * 3);
        ctx.globalAlpha = subAlpha;
        ctx.fillStyle = scene.accent;
        ctx.font = '44px Segoe UI';
        ctx.fillText(scene.subtitle, W/2, H/2 + 100);
      }
      ctx.globalAlpha = 1;
    }
    
    function drawStatScene(scene, t) {
      // Background card
      ctx.fillStyle = COLORS.bgCard;
      ctx.fillRect(0, 0, W, H);
      
      // Accent line
      ctx.fillStyle = scene.accent;
      ctx.fillRect(0, 0, 8, H);
      
      // Title
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '48px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText(scene.title, 60, 350);
      
      // Stats with staggered animation
      const stats = scene.stats || [];
      stats.forEach((stat, i) => {
        const y = 500 + (i * 280);
        const delay = 0.3 + (i * 0.3);
        
        if (t > delay) {
          const alpha = Math.min(1, (t - delay) * 3);
          ctx.globalAlpha = alpha;
          
          // Big number
          ctx.fillStyle = scene.accent;
          ctx.font = 'bold 110px Segoe UI';
          ctx.fillText(stat.value, 60, y);
          
          // Label
          ctx.fillStyle = '#fff';
          ctx.font = '36px Segoe UI';
          ctx.fillText(stat.label, 60, y + 60);
        }
      });
      ctx.globalAlpha = 1;
    }
    
    function drawListScene(scene, t) {
      // Title bar
      ctx.fillStyle = COLORS.bgCard;
      ctx.fillRect(0, 200, W, 100);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 52px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText(scene.title, 60, 265);
      
      // List items with staggered reveal
      const items = scene.items || [];
      items.forEach((item, i) => {
        const y = 420 + (i * 200);
        const delay = 0.5 + (i * 0.4);
        
        if (t > delay) {
          const alpha = Math.min(1, (t - delay) * 3);
          ctx.globalAlpha = alpha;
          
          // Bullet
          ctx.fillStyle = scene.accent;
          ctx.beginPath();
          ctx.arc(80, y + 20, 12, 0, Math.PI * 2);
          ctx.fill();
          
          // Text
          ctx.fillStyle = '#fff';
          ctx.font = '40px Segoe UI';
          wrapText(item, 130, y + 30, W - 180, 55);
        }
      });
      ctx.globalAlpha = 1;
    }
    
    function drawCTAScene(scene, t) {
      // Accent glow (pulsing)
      const pulse = 0.3 + Math.sin(t * 4) * 0.1;
      ctx.fillStyle = scene.accent;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(W/2, H/2 - 150, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Logo
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 80px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('TechGig', W/2, H/2 - 200);
      
      ctx.fillStyle = scene.accent;
      ctx.fillText('Radar', W/2, H/2 - 100);
      
      // CTA text
      const alpha = Math.min(1, t * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 52px Segoe UI';
      ctx.fillText(scene.title, W/2, H/2 + 150);
      
      if (scene.subtitle) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '36px Segoe UI';
        ctx.fillText(scene.subtitle, W/2, H/2 + 220);
      }
      
      // Handle
      ctx.fillStyle = scene.accent;
      ctx.font = 'bold 48px Segoe UI';
      ctx.fillText('@TechGigRadar', W/2, H/2 + 350);
      ctx.globalAlpha = 1;
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
        document.getElementById('play-btn').textContent = '▶ Play';
        document.getElementById('status').textContent = 'Finished';
        
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
        document.getElementById('record-btn').disabled = true;
        requestAnimationFrame(animate);
      }
    }
    
    function recordReel() {
      recordedChunks = [];
      const stream = canvas.captureStream(30);
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        document.getElementById('download-btn').disabled = false;
        document.getElementById('status').textContent = 'Recording complete! Click Download';
      };
      
      mediaRecorder.start();
      document.getElementById('status').textContent = 'Recording...';
      document.getElementById('record-btn').disabled = true;
      
      // Start playback
      startTime = 0;
      isPlaying = true;
      requestAnimationFrame(animate);
    }
    
    function downloadReel() {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '${config.id}.webm';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    // Enable record button after page load
    window.onload = () => {
      document.getElementById('record-btn').disabled = false;
      drawScene(0); // Show first frame
    };
  </script>
</body>
</html>`;
}

/**
 * Create news reel config
 */
export function createNewsReelConfig(
  id: string,
  headline: string,
  keyPoints: string[],
  stats: { label: string; value: string }[],
): ReelConfig {
  const script = `
    Breaking tech news. ${headline}.
    ${keyPoints.map((p, i) => `Point ${i + 1}. ${p}.`).join(' ')}
    ${stats.length > 0 ? `The numbers. ${stats.map(s => `${s.value} ${s.label}.`).join(' ')}` : ''}
    Follow TechGig Radar for daily tech updates.
  `.trim().replace(/\s+/g, ' ');

  return {
    id,
    title: headline,
    category: 'news',
    script,
    scenes: [
      {
        type: 'hook',
        title: headline,
        subtitle: 'Swipe for details ➤',
        duration: 4,
        accent: COLORS.accentCyan
      },
      ...(keyPoints.length > 0 ? [{
        type: 'list' as const,
        title: 'Key Points',
        items: keyPoints.slice(0, 4),
        duration: 7,
        accent: COLORS.accentPurple
      }] : []),
      ...(stats.length > 0 ? [{
        type: 'stat' as const,
        title: 'By the Numbers',
        stats: stats.slice(0, 3),
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
    ]
  };
}

/**
 * Create job reel config
 */
export function createJobReelConfig(
  id: string,
  title: string,
  company: string,
  salary: string,
  skills: string[],
): ReelConfig {
  const script = `
    Hot job alert! ${company} is hiring a ${title}.
    Salary range. ${salary}.
    Skills needed. ${skills.slice(0, 3).join(', ')}.
    Apply now. Link in bio. Follow TechGig Radar for more remote jobs.
  `.trim().replace(/\s+/g, ' ');

  return {
    id,
    title: `${company} hiring ${title}`,
    category: 'job',
    script,
    scenes: [
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
          { label: 'Salary Range', value: salary },
          { label: 'Work Type', value: 'Remote' }
        ],
        duration: 6,
        accent: COLORS.accentCyan
      },
      {
        type: 'list',
        title: 'Required Skills',
        items: skills.slice(0, 4),
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
    ]
  };
}
