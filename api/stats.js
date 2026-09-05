module.exports = (req, res) => {
  res.json({ news: { total: 1450, published: 45 }, jobs: { total: 85, published: 22 } });
};
