module.exports = (req, res) => {
  res.json({ jobs: [
    { id: '1', title: 'Senior Platform Engineer', companyName: 'Grafana Labs', experienceLevel: 'senior', salaryMin: 150000, applicationUrl: 'https://grafana.com/careers', email: 'careers@grafana.com' },
    { id: '2', title: 'Data Scientist', companyName: 'Airbnb', experienceLevel: 'senior', salaryMin: 180000, applicationUrl: 'https://airbnb.com/careers', email: 'talent@airbnb.com' }
  ]});
};
