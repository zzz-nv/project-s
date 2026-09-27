'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';

export default function WhoToFollow() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setIsLoading(false);
        return;
      }
      setCurrentUserId(userId);

      const [profilesRes, followsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .neq('id', userId)
          .limit(50),
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId),
      ]);

      const followedIds = new Set(followsRes.data?.map(f => f.following_id) || []);
      setFollowingIds(followedIds);

      const eligible = (profilesRes.data || []).filter(p => !followedIds.has(p.id));
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);

      setSuggestions(shuffled.slice(0, 6));
      setIsLoading(false);
    }
    load();
  }, []);

  async function toggleFollow(targetId: string) {
    if (!currentUserId) return;
    const isFollowing = followingIds.has(targetId);

    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetId);
      else next.add(targetId);
      return next;
    });

    if (!isFollowing) {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: targetId });

      if (error) {
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        return;
      }

      // Let "Following" show briefly, then start the collapse
      setTimeout(() => {
        setExiting(prev => new Set(prev).add(targetId));
      }, 400);

      // Wait for CSS transition, then remove from list
      setTimeout(() => {
        setSuggestions(prev => prev.filter(s => s.id !== targetId));
        setExiting(prev => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }, 750);

      // Fetch current follows + extra profiles in parallel
      const [extraRes, freshFollowsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .neq('id', currentUserId)
          .limit(50),
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId),
      ]);

      const freshFollowedIds = new Set(freshFollowsRes.data?.map(f => f.following_id) || []);
      setFollowingIds(freshFollowedIds);

      setTimeout(() => {
        setSuggestions(prev => {
          const shownIds = new Set(prev.map(s => s.id));
          const candidates = (extraRes.data || []).filter(p => {
            if (shownIds.has(p.id)) return false;
            if (freshFollowedIds.has(p.id)) return false;
            return true;
          });
          const shuffled = [...candidates].sort(() => Math.random() - 0.5);
          return [...prev, ...shuffled.slice(0, 6 - prev.length)];
        });
      }, 780);
    } else {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetId);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-background border border-border-subtle rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="h-5 bg-surface-muted rounded w-1/2 animate-pulse" />
        </div>
        <div className="flex flex-col">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-surface-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface-muted rounded w-2/3" />
                <div className="h-3 bg-surface-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visible = suggestions.slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="bg-background border border-border-subtle rounded-2xl overflow-hidden">
      <h2 className="px-4 py-3 text-lg font-bold border-b border-border-subtle">
        Who to follow
      </h2>
      <div className="flex flex-col">
        {visible.map(u => {
          const isFollowing = followingIds.has(u.id);
          const isExiting = exiting.has(u.id);

          return (
            <div
              key={u.id}
              className={`overflow-hidden transition-all duration-[350ms] ease-out ${
                isExiting ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
              }`}
            >
              <div className="px-4 py-3 flex items-center gap-3">
                <Link href={`/${u.username}`} className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-surface-muted overflow-hidden flex items-center justify-center">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-text-muted uppercase text-sm">
                        {u.username.charAt(0)}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/${u.username}`} className="block">
                    <p className="font-bold text-sm truncate hover:underline">
                      {u.display_name || u.username}
                    </p>
                    <p className="text-text-muted text-sm truncate">@{u.username}</p>
                  </Link>
                </div>

                <button
                  onClick={() => toggleFollow(u.id)}
                  className={`shrink-0 font-bold text-xs px-3.5 py-1.5 rounded-full transition ${
                    isFollowing
                      ? 'bg-transparent border border-border-subtle text-foreground hover:border-red-500 hover:text-red-500'
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}