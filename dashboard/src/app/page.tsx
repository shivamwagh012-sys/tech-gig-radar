'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  Newspaper, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface Stats {
  news: {
    total: number;
    pendingReview: number;
    approved: number;
    published: number;
    rejected: number;
  };
  jobs: {
    total: number;
    pendingReview: number;
    approved: number;
    published: number;
    rejected: number;
  };
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  href 
}: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
  href?: string;
}) {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const content = (
    <div className={`p-6 rounded-xl border ${colors[color]} transition-transform hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="w-10 h-10 opacity-80" />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <p className="text-xl text-slate-400">Failed to load dashboard</p>
        <p className="text-sm text-slate-500">Make sure the backend is running on port 3000</p>
      </div>
    );
  }

  const totalPending = (stats.news?.pendingReview || 0) + (stats.jobs?.pendingReview || 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">🎯</span>
            TechGig Radar
          </h1>
          <p className="text-slate-400 mt-1">Admin Dashboard</p>
        </div>
        
        {totalPending > 0 && (
          <Link 
            href="/review"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400 transition"
          >
            <Clock className="w-5 h-5" />
            {totalPending} Pending Review
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Pending Review" 
          value={totalPending}
          icon={Clock}
          color="warning"
          href="/review"
        />
        <StatCard 
          title="Approved" 
          value={(stats.news?.approved || 0) + (stats.jobs?.approved || 0)}
          icon={CheckCircle}
          color="success"
        />
        <StatCard 
          title="Published" 
          value={(stats.news?.published || 0) + (stats.jobs?.published || 0)}
          icon={Send}
          color="primary"
        />
        <StatCard 
          title="Rejected" 
          value={(stats.news?.rejected || 0) + (stats.jobs?.rejected || 0)}
          icon={XCircle}
          color="error"
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* News Section */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Newspaper className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold">News</h2>
            </div>
            <Link 
              href="/news"
              className="text-sm text-primary-500 hover:text-primary-400"
            >
              View All →
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-dark-700">
              <span className="text-slate-400">Total Discovered</span>
              <span className="font-semibold">{stats.news?.total || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dark-700">
              <span className="text-slate-400">Pending Review</span>
              <span className="font-semibold text-amber-500">{stats.news?.pendingReview || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dark-700">
              <span className="text-slate-400">Approved</span>
              <span className="font-semibold text-green-500">{stats.news?.approved || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Published</span>
              <span className="font-semibold text-primary-500">{stats.news?.published || 0}</span>
            </div>
          </div>
        </div>

        {/* Jobs Section */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Briefcase className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">Jobs</h2>
            </div>
            <Link 
              href="/jobs"
              className="text-sm text-primary-500 hover:text-primary-400"
            >
              View All →
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-dark-700">
              <span className="text-slate-400">Total Discovered</span>
              <span className="font-semibold">{stats.jobs?.total || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dark-700">
              <span className="text-slate-400">Pending Review</span>
              <span className="font-semibold text-amber-500">{stats.jobs?.pendingReview || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dark-700">
              <span className="text-slate-400">Approved</span>
              <span className="font-semibold text-green-500">{stats.jobs?.approved || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Published</span>
              <span className="font-semibold text-primary-500">{stats.jobs?.published || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-dark-800 rounded-xl border border-dark-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/review"
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
          >
            <Clock className="w-4 h-4" />
            Review Queue
          </Link>
          <button
            onClick={() => {
              fetch('/api/discover/news', { method: 'POST' });
              alert('News discovery started!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            <Newspaper className="w-4 h-4" />
            Discover News
          </button>
          <button
            onClick={() => {
              fetch('/api/discover/jobs', { method: 'POST' });
              alert('Job discovery started!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            <Briefcase className="w-4 h-4" />
            Discover Jobs
          </button>
        </div>
      </div>
    </div>
  );
}
