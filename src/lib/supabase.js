// Supabase client for TechGig Radar
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found, using mock client');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);

// Helper functions
export async function getNews(limit = 20) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export async function getJobs(limit = 20) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export async function upsertNews(newsItems) {
  const { data, error } = await supabase
    .from('news')
    .upsert(newsItems, { onConflict: 'id' });
  
  if (error) throw error;
  return data;
}

export async function upsertJobs(jobItems) {
  const { data, error } = await supabase
    .from('jobs')
    .upsert(jobItems, { onConflict: 'id' });
  
  if (error) throw error;
  return data;
}

export async function getReels(limit = 12) {
  const { data, error } = await supabase
    .from('reels')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export async function upsertReel(reel) {
  const { data, error } = await supabase
    .from('reels')
    .upsert(reel, { onConflict: 'id' });
  
  if (error) throw error;
  return data;
}
