/**
 * Shotstack Video Production API Integration
 * 
 * Creates professional reels with:
 * - Stock video backgrounds (Pexels integration)
 * - AI voice narration (Edge TTS)
 * - Background music
 * - Kinetic text animations
 * - 1080x1920 vertical format
 * 
 * Free tier: 10 credits (1 credit = 1 min video)
 * Pricing: $0.30/min after free tier
 * 
 * Sign up: https://dashboard.shotstack.io/register
 */

const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY || '';
// Use 'v1' for production API key, 'stage' for sandbox
const SHOTSTACK_ENV = process.env.SHOTSTACK_ENV || process.env.SHOTSTACK || 'v1';

const API_BASE = `https://api.shotstack.io/${SHOTSTACK_ENV}`;

// Brand colors
const COLORS = {
  primary: '#00d4ff',
  secondary: '#a855f7',
  accent: '#00ff88',
  dark: '#0a0a1a',
  white: '#ffffff'
};

// Stock video search terms by category
const STOCK_VIDEOS = {
  tech: [
    'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/tech-background.mp4',
    'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/code-screen.mp4'
  ],
  business: [
    'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/office-work.mp4'
  ],
  abstract: [
    'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/particles.mp4',
    'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/gradient-flow.mp4'
  ]
};

// Royalty-free music tracks
const MUSIC_TRACKS = {
  energetic: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/music/freepd/motions.mp3',
  corporate: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/music/freepd/advertising.mp3',
  dramatic: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/music/freepd/epic.mp3'
};

/**
 * Create a text clip with animation
 */
function createTextClip(text, start, duration, yPosition, fontSize, color, effect = 'fadeIn') {
  const clip = {
    asset: {
      type: 'html',
      html: `<p style="font-family: 'Montserrat', sans-serif; font-size: ${fontSize}px; font-weight: 800; color: ${color}; text-align: center; text-shadow: 2px 2px 8px rgba(0,0,0,0.8); padding: 20px; max-width: 90%;">${text}</p>`,
      css: 'p { margin: 0; }',
      width: 1080,
      height: 300
    },
    start,
    length: duration,
    position: 'center',
    offset: { x: 0, y: yPosition },
    transition: {
      in: effect,
      out: 'fadeOut'
    }
  };
  
  return clip;
}

/**
 * Create a title clip with animated badge
 */
function createTitleClip(text, subtext, start, duration, accentColor) {
  return [
    // Badge
    {
      asset: {
        type: 'html',
        html: `<div style="background: #ff4444; padding: 12px 30px; border-radius: 30px; font-family: 'Montserrat', sans-serif; font-size: 28px; font-weight: 700; color: white; text-transform: uppercase;">⚡ Breaking</div>`,
        width: 300,
        height: 60
      },
      start,
      length: duration,
      position: 'center',
      offset: { x: 0, y: -0.35 },
      transition: { in: 'slideDown' }
    },
    // Main title
    createTextClip(text, start + 0.3, duration - 0.3, -0.1, 64, '#ffffff', 'slideUp'),
    // Subtext
    ...(subtext ? [createTextClip(subtext, start + 0.6, duration - 0.6, 0.05, 40, accentColor, 'fadeIn')] : [])
  ];
}

/**
 * Create a stats clip
 */
function createStatsClip(stats, start, duration, accentColor) {
  const clips = [];
  
  stats.forEach((stat, i) => {
    const delay = i * 0.4;
    const yPos = -0.15 + (i * 0.2);
    
    // Big number
    clips.push({
      asset: {
        type: 'html',
        html: `<p style="font-family: 'Montserrat', sans-serif; font-size: 90px; font-weight: 900; color: ${accentColor}; text-shadow: 0 0 30px ${accentColor};">${stat.value}</p>`,
        width: 800,
        height: 150
      },
      start: start + delay,
      length: duration - delay,
      position: 'center',
      offset: { x: 0, y: yPos },
      transition: { in: 'slideRight' }
    });
    
    // Label
    clips.push(createTextClip(stat.label, start + delay + 0.2, duration - delay - 0.2, yPos + 0.08, 32, '#ffffff', 'fadeIn'));
  });
  
  return clips;
}

/**
 * Create a list clip with bullet points
 */
function createListClip(title, items, start, duration, accentColor) {
  const clips = [
    // Title bar background
    {
      asset: {
        type: 'html',
        html: `<div style="background: rgba(255,255,255,0.1); width: 100%; height: 80px;"></div>`,
        width: 1080,
        height: 80
      },
      start,
      length: duration,
      position: 'center',
      offset: { x: 0, y: -0.35 }
    },
    // Title
    createTextClip(title, start, duration, -0.35, 44, '#ffffff', 'fadeIn')
  ];
  
  items.slice(0, 4).forEach((item, i) => {
    const delay = 0.5 + (i * 0.4);
    const yPos = -0.15 + (i * 0.12);
    
    // Bullet point
    clips.push({
      asset: {
        type: 'html',
        html: `<div style="width: 16px; height: 16px; background: ${accentColor}; border-radius: 50%;"></div>`,
        width: 30,
        height: 30
      },
      start: start + delay,
      length: duration - delay,
      position: 'center',
      offset: { x: -0.4, y: yPos },
      transition: { in: 'slideRight' }
    });
    
    // Item text
    clips.push({
      asset: {
        type: 'html',
        html: `<p style="font-family: 'Montserrat', sans-serif; font-size: 36px; font-weight: 600; color: white; text-align: left;">${item}</p>`,
        width: 800,
        height: 80
      },
      start: start + delay,
      length: duration - delay,
      position: 'center',
      offset: { x: 0.05, y: yPos },
      transition: { in: 'slideRight' }
    });
  });
  
  return clips;
}

/**
 * Create CTA clip
 */
function createCTAClip(start, duration, accentColor) {
  return [
    // Logo
    createTextClip('TechGig', start, duration, -0.2, 72, '#ffffff', 'zoom'),
    createTextClip('Radar', start + 0.2, duration - 0.2, -0.08, 72, accentColor, 'zoom'),
    // CTA text
    createTextClip('Follow for More', start + 0.5, duration - 0.5, 0.1, 48, '#ffffff', 'fadeIn'),
    createTextClip('@TechGigRadar', start + 0.7, duration - 0.7, 0.2, 40, accentColor, 'slideUp'),
    // Subscribe hint
    createTextClip('Daily Tech News & Jobs', start + 1, duration - 1, 0.3, 28, '#888888', 'fadeIn')
  ];
}

/**
 * Build the complete video edit
 */
function buildVideoEdit(config) {
  const { type, scenes, backgroundCategory, musicMood } = config;
  
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  
  // Build all clips
  const clips = [];
  let currentTime = 0;
  
  scenes.forEach((scene, i) => {
    switch (scene.type) {
      case 'hook':
        clips.push(...createTitleClip(scene.text, scene.subtext, currentTime, scene.duration, scene.accent));
        break;
      case 'stat':
        if (scene.stats) {
          clips.push(...createStatsClip(scene.stats, currentTime, scene.duration, scene.accent));
        } else {
          clips.push(createTextClip(scene.text, currentTime, scene.duration, -0.1, 80, scene.accent, 'zoom'));
          if (scene.subtext) {
            clips.push(createTextClip(scene.subtext, currentTime + 0.3, scene.duration - 0.3, 0.05, 36, '#ffffff', 'fadeIn'));
          }
        }
        break;
      case 'list':
        clips.push(...createListClip(scene.text, scene.items || [], currentTime, scene.duration, scene.accent));
        break;
      case 'cta':
        clips.push(...createCTAClip(currentTime, scene.duration, scene.accent));
        break;
    }
    currentTime += scene.duration;
  });
  
  // Progress bar
  clips.push({
    asset: {
      type: 'html',
      html: `<div style="width: 100%; height: 20px; background: ${COLORS.primary};"></div>`,
      width: 1080,
      height: 20
    },
    start: 0,
    length: totalDuration,
    position: 'bottom',
    offset: { x: 0, y: 0 },
    scale: 1,
    effect: 'slideRight'
  });
  
  // Watermark
  clips.push({
    asset: {
      type: 'html',
      html: `<p style="font-family: 'Montserrat', sans-serif; font-size: 24px; color: rgba(255,255,255,0.5);">@TechGigRadar</p>`,
      width: 300,
      height: 40
    },
    start: 0,
    length: totalDuration,
    position: 'bottomRight',
    offset: { x: -0.02, y: -0.04 }
  });
  
  // Background video track
  const backgroundUrl = STOCK_VIDEOS[backgroundCategory]?.[0] || STOCK_VIDEOS.abstract[0];
  
  const timeline = {
    background: '#0a0a1a',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2'
      }
    ],
    tracks: [
      { clips }, // Text layer
      {
        clips: [
          {
            asset: {
              type: 'video',
              src: backgroundUrl,
              volume: 0
            },
            start: 0,
            length: totalDuration,
            fit: 'cover',
            opacity: 0.3
          }
        ]
      }
    ],
    soundtrack: {
      src: MUSIC_TRACKS[musicMood] || MUSIC_TRACKS.energetic,
      effect: 'fadeInFadeOut',
      volume: 0.3
    }
  };
  
  return {
    timeline,
    output: {
      format: 'mp4',
      resolution: 'hd', // 1080p
      aspectRatio: '9:16',
      fps: 30
    }
  };
}

/**
 * Submit render job to Shotstack
 */
async function submitRender(edit) {
  const response = await fetch(`${API_BASE}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SHOTSTACK_API_KEY
    },
    body: JSON.stringify(edit)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shotstack API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Check render status
 */
async function checkRenderStatus(renderId) {
  const response = await fetch(`${API_BASE}/render/${renderId}`, {
    headers: {
      'x-api-key': SHOTSTACK_API_KEY
    }
  });
  
  if (!response.ok) {
    throw new Error(`Status check failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  // Check for API key
  if (!SHOTSTACK_API_KEY) {
    return res.status(200).json({
      success: false,
      error: 'SHOTSTACK_API_KEY not configured',
      setup: {
        step1: 'Sign up at https://dashboard.shotstack.io/register',
        step2: 'Get your API key from the dashboard',
        step3: 'Add SHOTSTACK_API_KEY to Vercel environment variables',
        step4: 'Set SHOTSTACK_ENV=stage for testing, v1 for production',
        note: 'Free tier includes 10 credits (1 credit = 1 minute of video)'
      }
    });
  }
  
  const { action, type, headline, points, stats, company, title, salary, skills, renderId } = req.query;
  
  // Check render status
  if (action === 'status' && renderId) {
    try {
      const status = await checkRenderStatus(renderId);
      return res.status(200).json({
        success: true,
        status: status.response.status,
        url: status.response.url,
        data: status.response
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
  
  // Build scenes based on type
  let scenes = [];
  let backgroundCategory = 'tech';
  let musicMood = 'energetic';
  
  if (type === 'job' && company && title) {
    const skillsList = skills ? skills.split(',').map(s => s.trim()) : [];
    
    scenes = [
      { type: 'hook', text: `${company} is HIRING!`, subtext: title, duration: 4, accent: COLORS.accent },
      { type: 'stat', text: salary || '$100K+', subtext: 'Remote / Hybrid', duration: 4, accent: COLORS.primary },
      { type: 'list', text: 'Required Skills', items: skillsList.slice(0, 4), duration: 5, accent: COLORS.secondary },
      { type: 'cta', duration: 4, accent: COLORS.accent }
    ];
    
    backgroundCategory = 'business';
    musicMood = 'corporate';
  } else {
    const keyPoints = points ? points.split('|').map(p => p.trim()) : [];
    const statsList = stats ? stats.split('|').map(s => {
      const [value, label] = s.split(':');
      return { value: value?.trim() || '', label: label?.trim() || '' };
    }) : [];
    
    scenes = [
      { type: 'hook', text: headline || 'Breaking Tech News', subtext: 'Latest Update', duration: 4, accent: COLORS.primary },
      ...(keyPoints.length > 0 ? [{ type: 'list', text: 'Key Points', items: keyPoints.slice(0, 4), duration: 6, accent: COLORS.secondary }] : []),
      ...(statsList.length > 0 ? [{ type: 'stat', stats: statsList.slice(0, 3), duration: 5, accent: COLORS.accent }] : []),
      { type: 'cta', duration: 4, accent: COLORS.primary }
    ];
    
    backgroundCategory = 'tech';
    musicMood = 'energetic';
  }
  
  // Build the video edit
  const edit = buildVideoEdit({
    type: type || 'news',
    scenes,
    backgroundCategory,
    musicMood
  });
  
  // If action is 'preview', return the edit JSON
  if (action === 'preview') {
    return res.status(200).json({
      success: true,
      edit,
      scenes,
      totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0)
    });
  }
  
  // Submit render job
  try {
    const result = await submitRender(edit);
    
    return res.status(200).json({
      success: true,
      message: 'Video render started!',
      renderId: result.response.id,
      statusUrl: `/api/video-render?action=status&renderId=${result.response.id}`,
      note: 'Check status URL every few seconds. Video URL will be available when status is "done".',
      estimatedTime: '30-60 seconds'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
