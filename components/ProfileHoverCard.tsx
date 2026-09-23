'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/supabase';

interface HoverCardProps {
  username: string;
  children: React.ReactNode;
}

const SHOW_DELAY = 400;   // ms hover before showing
const HIDE_DELAY = 180;   // ms grace period to move onto card

export default function ProfileHoverCard({ username, children }: HoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  function handleTriggerEnter() {
    clearTimers();
    showTimer.current = setTimeout(() => setIsVisible(true), SHOW_DELAY);
  }

  function handleTriggerLeave() {
    clearTimers();
    hideTimer.current = setTimeout(() => setIsVisible(false), HIDE_DELAY);
  }

  function handleCardEnter() {
    clearTimers();
  }

  function handleCardLeave() {
    clearTimers();
    hideTimer.current = setTimeout(() => setIsVisible(false), HIDE_DELAY);
  }

  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleTriggerEnter}
      onMouseLeave={handleTriggerLeave}
    >
      {children}

      {isVisible && (
        <div
          className="absolute left-0 top-full mt-2 z-50"
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
        >
          <CardContent username={username} />
        </div>
      )}
    </div>
  );
}

function CardContent({ username }: { username: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile-preview', username],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .eq('username', username)
        .single();

      if (!profile) return null;

      const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
      ]);

      return {
        profile,
        followerCount: followersRes.count || 0,
        followingCount: followingRes.count || 0,
        isCurrentUser: currentUserId === profile.id,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="w-72 bg-zinc-950 border border-border-subtle rounded-2xl shadow-2xl p-4 animate-pulse">
        <div className="flex gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-surface-muted" />
          <div className="flex-1 space-y-2 mt-1">
            <div className="h-4 bg-surface-muted rounded w-2/3" />
            <div className="h-3 bg-surface-muted rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-surface-muted rounded w-full mb-2" />
        <div className="h-3 bg-surface-muted rounded w-3/4" />
      </div>
    );
  }

  if (!data?.profile) return null;

  const { profile, followerCount, followingCount, isCurrentUser } = data;

  return (
    <div
      className="w-72 bg-zinc-950 border border-border-subtle rounded-2xl shadow-2xl p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-3">
        <Link href={`/${profile.username}`} className="flex gap-3 group/card">
          <div className="w-12 h-12 shrink-0 rounded-full bg-surface-muted overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-text-muted uppercase">{profile.username.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <p className="font-bold text-white group-hover/card:underline">
              {profile.display_name || profile.username}
            </p>
            <p className="text-text-muted text-sm">@{profile.username}</p>
          </div>
        </Link>

        {!isCurrentUser && <FollowButton targetId={profile.id} />}
      </div>

      {profile.bio && (
        <p className="text-zinc-300 text-sm leading-relaxed mb-3 line-clamp-3">
          {profile.bio}
        </p>
      )}

      <div className="flex gap-4 text-sm">
        <span>
          <span className="font-bold text-zinc-200">{followingCount}</span>{' '}
          <span className="text-text-muted">Following</span>
        </span>
        <span>
          <span className="font-bold text-zinc-200">{followerCount}</span>{' '}
          <span className="text-text-muted">Followers</span>
        </span>
      </div>
    </div>
  );
}

function FollowButton({ targetId }: { targetId: string }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);

      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', targetId)
        .maybeSingle();

      setIsFollowing(!!data);
      setLoading(false);
    }
    load();
  }, [targetId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId || loading) return;

    const previous = isFollowing;
    setIsFollowing(!previous);

    if (previous) {
      await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetId);
    } else {
      await supabase.from('follows').insert({ follower_id: userId, following_id: targetId });
    }
  }

  if (loading) return <div className="w-20 h-8 rounded-full bg-surface-muted animate-pulse" />;

  return (
    <button
      onClick={toggle}
      className={`shrink-0 font-bold text-xs px-3.5 py-1.5 rounded-full transition ${
        isFollowing
          ? 'bg-transparent border border-border-subtle text-foreground hover:border-red-500 hover:text-red-500'
          : 'bg-white text-black hover:bg-zinc-200'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}