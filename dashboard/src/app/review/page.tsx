'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Newspaper,
  Briefcase,
  Globe,
  MapPin,
  Clock,
  DollarSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  category: string;
  sourceUrl: string;
  sourceName: string;
  verificationScore?: number;
  discoveredAt: string;
  status: string;
}

interface JobItem {
  id: string;
  title: string;
  companyName: string;
  companyLocation?: string;
  experienceLevel?: string;
  jobType?: string;
  isRemote?: boolean;
  acceptsWorldwide?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  applicationUrl: string;
  sourceName?: string;
  verificationScore?: number;
  discoveredAt: string;
  status: string;
}

interface ReviewQueue {
  news: NewsItem[];
  jobs: JobItem[];
  totalPending: number;
}

const categoryColors: Record<string, string> = {
  ai: 'bg-violet-500/20 text-violet-400',
  security: 'bg-red-500/20 text-red-400',
  cloud: 'bg-blue-500/20 text-blue-400',
  devops: 'bg-orange-500/20 text-orange-400',
  webdev: 'bg-green-500/20 text-green-400',
  mobile: 'bg-pink-500/20 text-pink-400',
  startup: 'bg-amber-500/20 text-amber-400',
  programming: 'bg-indigo-500/20 text-indigo-400',
  general: 'bg-slate-500/20 text-slate-400',
};

function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  
  return (
    <span className={`text-sm font-mono ${color}`}>
      {score}/100
    </span>
  );
}

function NewsCard({ 
  news, 
  onApprove, 
  onReject,
  isLoading 
}: { 
  news: NewsItem; 
  onApprove: () => void; 
  onReject: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[news.category] || categoryColors.general}`}>
              {news.category.toUpperCase()}
            </span>
            <ScoreBadge score={news.verificationScore} />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">{news.title}</h3>
          
          {news.summary && (
            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{news.summary}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{news.sourceName}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(news.discoveredAt), { addSuffix: true })}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <a 
            href={news.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white hover:bg-dark-700 rounded-lg transition"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700">
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}

function JobCard({ 
  job, 
  onApprove, 
  onReject,
  isLoading 
}: { 
  job: JobItem; 
  onApprove: () => void; 
  onReject: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {job.acceptsWorldwide && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                🌍 WORLDWIDE
              </span>
            )}
            {job.isRemote && !job.acceptsWorldwide && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                🏠 REMOTE
              </span>
            )}
            {job.experienceLevel && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">
                {job.experienceLevel.toUpperCase()}
              </span>
            )}
            <ScoreBadge score={job.verificationScore} />
          </div>
          
          <h3 className="text-lg font-semibold">{job.title}</h3>
          <p className="text-primary-500 font-medium">{job.companyName}</p>
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
            {job.companyLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.companyLocation}
              </span>
            )}
            {job.jobType && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {job.jobType}
              </span>
            )}
            {job.salaryMin && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${(job.salaryMin / 1000).toFixed(0)}k
                {job.salaryMax && ` - $${(job.salaryMax / 1000).toFixed(0)}k`}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
            <span>{job.sourceName}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(job.discoveredAt), { addSuffix: true })}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <a 
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white hover:bg-dark-700 rounded-lg transition"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700">
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const queryClient = useQueryClient();
  
  const { data: queue, isLoading } = useQuery<ReviewQueue>({
    queryKey: ['review-queue'],
    queryFn: async () => {
      const res = await fetch('/api/review/queue');
      if (!res.ok) throw new Error('Failed to fetch queue');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'news' | 'jobs'; id: string }) => {
      const res = await fetch(`/api/${type}/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'news' | 'jobs'; id: string }) => {
      const res = await fetch(`/api/${type}/${id}/reject`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected via admin dashboard' }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const hasNews = queue?.news && queue.news.length > 0;
  const hasJobs = queue?.jobs && queue.jobs.length > 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/"
          className="p-2 hover:bg-dark-700 rounded-lg transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-slate-400">
            {queue?.totalPending || 0} items pending review
          </p>
        </div>
      </div>

      {/* Empty State */}
      {!hasNews && !hasJobs && (
        <div className="flex flex-col items-center justify-center py-20">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
          <p className="text-slate-400">No items pending review.</p>
        </div>
      )}

      {/* News Section */}
      {hasNews && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Newspaper className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">News ({queue.news.length})</h2>
          </div>
          
          <div className="grid gap-6">
            {queue.news.map((news) => (
              <NewsCard
                key={news.id}
                news={news}
                onApprove={() => approveMutation.mutate({ type: 'news', id: news.id })}
                onReject={() => rejectMutation.mutate({ type: 'news', id: news.id })}
                isLoading={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Jobs Section */}
      {hasJobs && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-semibold">Jobs ({queue.jobs.length})</h2>
          </div>
          
          <div className="grid gap-6">
            {queue.jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApprove={() => approveMutation.mutate({ type: 'jobs', id: job.id })}
                onReject={() => rejectMutation.mutate({ type: 'jobs', id: job.id })}
                isLoading={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
