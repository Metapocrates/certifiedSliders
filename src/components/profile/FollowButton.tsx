'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface FollowButtonProps {
  athleteId: string;
  athleteName: string;
  currentUserId?: string;
}

export default function FollowButton({ athleteId, athleteName, currentUserId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    loadFollowState();
  }, [athleteId, currentUserId]);

  const loadFollowState = async () => {
    const supabase = createClient();

    // Check if current user follows this athlete
    if (currentUserId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('followed_id', athleteId)
        .maybeSingle();

      setIsFollowing(!!followData);
    }

    // Get follower count
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followed_id', athleteId);

    setFollowerCount(count || 0);
    setLoading(false);
  };

  const handleToggleFollow = async () => {
    if (!currentUserId) {
      window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      setIsFollowing(data.following);
      setFollowerCount(data.following ? followerCount + 1 : followerCount - 1);
    } catch (error) {
      console.error('Follow error:', error);
      alert(error instanceof Error ? error.message : 'Failed to update follow status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-muted">
        Loading...
      </div>
    );
  }

  // Don't show follow button on own profile
  if (currentUserId === athleteId) {
    return followerCount > 0 ? (
      <div className="text-xs font-semibold text-white/70">
        {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
      </div>
    ) : null;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleToggleFollow}
        disabled={actionLoading}
        className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
          isFollowing
            ? 'border border-white/30 text-white hover:border-white hover:bg-white/10'
            : 'bg-white text-[#111827] hover:bg-[#F5C518]'
        }`}
      >
        {actionLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
      </button>
      {followerCount > 0 && (
        <div className="text-xs font-semibold text-white/70">
          {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
        </div>
      )}
    </div>
  );
}
