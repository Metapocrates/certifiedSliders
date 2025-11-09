'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type ActivityItem = {
  id: string;
  type: 'result';
  athleteId: string;
  athleteName: string;
  athleteProfileId: string | null;
  athleteProfilePic: string | null;
  timestamp: string;
  data: {
    event: string;
    mark: string;
    meetName: string;
    meetDate: string;
    season: string;
  };
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await fetch('/api/activity-feed?limit=20');
      if (!response.ok) {
        throw new Error('Failed to load activity feed');
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('Activity feed error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-app bg-card p-8">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-app/20 border-t-scarlet" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-app/40 bg-muted/30 p-12 text-center">
        <p className="text-muted">No activity yet</p>
        <p className="mt-2 text-sm text-muted">
          Follow athletes to see their latest results and videos here
        </p>
        <Link
          href="/athletes"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-scarlet px-6 text-sm font-semibold text-white transition hover:bg-scarlet/90"
        >
          Discover Athletes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-3xl border border-app bg-card p-5 shadow-sm transition hover:border-scarlet/50"
        >
          <div className="flex items-start gap-4">
            <Link
              href={activity.athleteProfileId ? `/athletes/${activity.athleteProfileId}` : '#'}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
            >
              {activity.athleteProfilePic ? (
                <Image
                  src={activity.athleteProfilePic}
                  alt={activity.athleteName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-lg font-semibold text-muted">
                  {activity.athleteName[0]}
                </div>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <Link
                  href={activity.athleteProfileId ? `/athletes/${activity.athleteProfileId}` : '#'}
                  className="font-semibold text-app hover:text-scarlet"
                >
                  {activity.athleteName}
                </Link>
                <span className="text-xs text-muted">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>

              {activity.type === 'result' && (
                <div className="mt-2">
                  <p className="text-sm text-muted">
                    New PR in <span className="font-semibold text-app">{activity.data.event}</span>
                  </p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-scarlet">{activity.data.mark}</span>
                    <span className="text-xs text-muted">
                      {activity.data.meetName} • {new Date(activity.data.meetDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="text-center">
          <button className="text-sm font-semibold text-scarlet hover:underline">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
