import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { type, limit = 20 } = req.query;
  
  try {
    let news = [];
    let jobs = [];
    let hrJobs = [];
    let reels = [];
    
    if (!type || type === 'news' || type === 'all') {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(parseInt(limit));
      
      if (error) throw error;
      news = data || [];
    }
    
    if (!type || type === 'jobs' || type === 'all') {
      // Fetch tech jobs
      const { data: techData, error: techError } = await supabase
        .from('jobs')
        .select('*')
        .neq('category', 'HR & Recruitment')
        .order('posted_at', { ascending: false })
        .limit(parseInt(limit));
      
      if (techError) throw techError;
      jobs = techData || [];
      
      // Fetch HR jobs separately
      const { data: hrData, error: hrError } = await supabase
        .from('jobs')
        .select('*')
        .eq('category', 'HR & Recruitment')
        .order('posted_at', { ascending: false })
        .limit(parseInt(limit));
      
      if (hrError) throw hrError;
      hrJobs = hrData || [];
    }
    
    if (!type || type === 'reels' || type === 'all') {
      const { data, error } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);
      
      if (!error) {
        reels = data || [];
      }
    }
    
    // Transform for frontend compatibility
    const transformedNews = news.map(n => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      source: n.source,
      url: n.url,
      category: n.category,
      publishedAt: n.published_at,
      isVerified: n.is_verified
    }));
    
    const transformJob = (j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      salary: j.salary,
      type: j.job_type,
      category: j.category,
      experience: j.experience,
      skills: j.skills || [],
      description: j.description,
      applyUrl: j.apply_url,
      source: j.source,
      postedAt: j.posted_at,
      isVerified: j.is_verified
    });
    
    const transformedJobs = jobs.map(transformJob);
    const transformedHRJobs = hrJobs.map(transformJob);
    
    const transformedReels = reels.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category || 'tech',
      duration: r.duration || '0:30',
      views: r.views || 0,
      badge: r.badge || 'new',
      thumbnail: r.thumbnail_url || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=700&fit=crop',
      videoUrl: r.video_url
    }));
    
    // Build response based on type
    const response = {
      updated: new Date().toISOString()
    };
    
    if (type === 'news') {
      response.news = transformedNews;
    } else if (type === 'jobs') {
      response.jobs = transformedJobs;
      response.hrJobs = transformedHRJobs;
    } else if (type === 'reels') {
      response.reels = transformedReels;
    } else {
      response.news = transformedNews;
      response.jobs = transformedJobs;
      response.hrJobs = transformedHRJobs;
      response.reels = transformedReels;
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
