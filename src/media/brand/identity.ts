/**
 * TechGig Radar Brand Identity
 */

// ================================
// Colors
// ================================
export const colors = {
  // Primary palette
  primary: '#6366F1',      // Indigo-500 - main brand color
  primaryDark: '#4F46E5',  // Indigo-600
  primaryLight: '#818CF8', // Indigo-400
  
  // Secondary
  secondary: '#EC4899',    // Pink-500 - accent
  secondaryDark: '#DB2777',
  
  // Backgrounds
  bgDark: '#0F172A',       // Slate-900
  bgCard: '#1E293B',       // Slate-800
  bgLight: '#334155',      // Slate-700
  
  // Text
  textPrimary: '#F8FAFC',  // Slate-50
  textSecondary: '#94A3B8', // Slate-400
  textMuted: '#64748B',    // Slate-500
  
  // Status colors
  success: '#22C55E',      // Green-500
  warning: '#F59E0B',      // Amber-500
  error: '#EF4444',        // Red-500
  info: '#3B82F6',         // Blue-500
  
  // Category colors
  categories: {
    ai: '#8B5CF6',         // Violet
    security: '#EF4444',   // Red
    cloud: '#3B82F6',      // Blue
    devops: '#F97316',     // Orange
    webdev: '#22C55E',     // Green
    mobile: '#EC4899',     // Pink
    startup: '#F59E0B',    // Amber
    programming: '#6366F1', // Indigo
    general: '#64748B',    // Slate
  },
  
  // Gradients (CSS format)
  gradients: {
    primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    hero: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
    card: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
    accent: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  },
} as const;

// ================================
// Typography
// ================================
export const typography = {
  fontFamily: {
    primary: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },
} as const;

// ================================
// Spacing
// ================================
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

// ================================
// Social Media Dimensions
// ================================
export const dimensions = {
  // Instagram
  instagram: {
    square: { width: 1080, height: 1080 },
    portrait: { width: 1080, height: 1350 },
    story: { width: 1080, height: 1920 },
    reel: { width: 1080, height: 1920 },
  },
  // Telegram (optimal for preview)
  telegram: {
    standard: { width: 1200, height: 630 },
    square: { width: 1080, height: 1080 },
  },
} as const;

// ================================
// Brand Elements
// ================================
export const brand = {
  name: 'TechGig Radar',
  tagline: 'Real Tech News. Real Global Opportunities.',
  handle: '@TechGigRadar',
  
  // Logo text (for SVG rendering)
  logoText: '🎯 TechGig Radar',
  
  // Category emojis
  categoryEmojis: {
    ai: '🤖',
    security: '🔐',
    cloud: '☁️',
    devops: '⚙️',
    webdev: '🌐',
    mobile: '📱',
    startup: '🚀',
    programming: '💻',
    general: '📰',
    job: '💼',
  } as Record<string, string>,
} as const;

// ================================
// Experience Level Labels
// ================================
export const experienceLevelLabels: Record<string, { label: string; emoji: string; color: string }> = {
  fresher: { label: 'Entry Level', emoji: '🌱', color: '#22C55E' },
  junior: { label: 'Junior', emoji: '📗', color: '#3B82F6' },
  mid: { label: 'Mid-Level', emoji: '📘', color: '#8B5CF6' },
  senior: { label: 'Senior', emoji: '📕', color: '#F59E0B' },
  lead: { label: 'Lead', emoji: '⭐', color: '#EC4899' },
};

// ================================
// Job Type Labels
// ================================
export const jobTypeLabels: Record<string, { label: string; emoji: string }> = {
  'full-time': { label: 'Full-Time', emoji: '⏰' },
  'part-time': { label: 'Part-Time', emoji: '🕐' },
  contract: { label: 'Contract', emoji: '📝' },
  freelance: { label: 'Freelance', emoji: '💻' },
  internship: { label: 'Internship', emoji: '🎓' },
};
