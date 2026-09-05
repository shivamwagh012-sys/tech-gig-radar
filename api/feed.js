export default function handler(req, res) {
  res.json({ items: [
    { id: '1', type: 'news', title: 'OpenAI opens fine-tuning to o-series models', category: 'AI', timeAgo: '18m ago', status: 'published' },
    { id: '2', type: 'job', title: 'Senior Platform Engineer', category: 'REMOTE', timeAgo: '42m ago', status: 'scheduled' },
    { id: '3', type: 'news', title: 'CISA flags active exploitation in CI runner', category: 'SECURITY', timeAgo: '2h ago', status: 'published' }
  ]});
}
