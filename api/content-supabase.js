import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { type, limit = 20 } = req.query;
  
  try {
    let news = [];
    let jobs = [];
    
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
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(parseInt(limit));
      
      if (error) throw error;
      jobs = data || [];
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
    
    const transformedJobs = jobs.map(j => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      salary: j.salary,
      type: j.job_type,
      experience: j.experience,
      skills: j.skills || [],
      description: j.description,
      applyUrl: j.apply_url,
      source: j.source,
      postedAt: j.posted_at,
      isVerified: j.is_verified
    }));
    
    if (type === 'news') {
      return res.status(200).json({ news: transformedNews, updated: new Date().toISOString() });
    } else if (type === 'jobs') {
      return res.status(200).json({ jobs: transformedJobs, updated: new Date().toISOString() });
    } else {
      return res.status(200).json({ 
        news: transformedNews, 
        jobs: transformedJobs, 
        updated: new Date().toISOString() 
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
