'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/supabase';

import InlineComposer from '@/components/InlineComposer';
import TweetCard from '@/components/TweetCard';
import { loadFeed } from '@/lib/loadFeed';



const TAB_KEY = 'feed-tab';

function subscribeTab(cb: () => void) {
  window.addEventListener('feed-tab-change', cb);
  return () => window.removeEventListener('feed-tab-change', cb);
}

function getTabSnapshot(): 'global' | 'following' {
  return (sessionStorage.getItem(TAB_KEY) as 'global' | 'following') || 'global';
}

function getServerTabSnapshot(): 'global' | 'following' {
  return 'global';
}


export default function ProjectS() {
  const router = useRouter();
  const queryClient = useQueryClient();

      const feedType = useSyncExternalStore(
    subscribeTab,
    getTabSnapshot,
    getServerTabSnapshot
  );

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);

  const [justPostedId, setJustPostedId] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail.id;
      setJustPostedId(id);
      setTimeout(() => setJustPostedId(null), 1200);
    };
    window.addEventListener('post-created', handler);
    return () => window.removeEventListener('post-created', handler);
  }, []);

  function switchTab(tab: 'global' | 'following') {
    if (tab === feedType) return;
    sessionStorage.setItem(TAB_KEY, tab);
    window.dispatchEvent(new Event('feed-tab-change'));
    window.dispatchEvent(new Event('reset-feed-scroll'));
  }

  const { data, isLoading } = useQuery({
    queryKey: ['feed', feedType],
    queryFn: () => loadFeed(feedType),
  });

  const user = data?.user;
  const tweets = data?.tweets ?? [];

  // Redirect to login if no session
  useEffect(() => {
    if (!isLoading && data === null) {
      router.push('/login');
    }
  }, [isLoading, data, router]);

  // Refresh feed when a new tweet is posted
  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    };
    window.addEventListener('refresh-feed', handleRefresh);
    return () => window.removeEventListener('refresh-feed', handleRefresh);
  }, [queryClient]);

    async function deleteTweet(tweetId: string) {
    // Optimistic cache update — this triggers the exit animation
    queryClient.setQueryData(['feed', feedType], (prev: any) => {
      if (!prev) return prev;
      return { ...prev, tweets: prev.tweets.filter((t: any) => t.id !== tweetId) };
    });

    const { error } = await supabase.from('tweets').delete().eq('id', tweetId);

    if (error) {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Deleted!' } }));
    }
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col font-sans">

      {/* MINIMAL FEED TOGGLE */}
      <div className="sticky top-0 z-40 bg-background backdrop-blur-md border-b border-border-subtle flex w-full">
                  <button
          onClick={() => switchTab('global')}
          className="flex-1 flex justify-center hover:bg-surface transition-colors pt-4 pb-4"
        >
          <div className={`font-bold text-base relative px-2 transition-colors duration-150 ${feedType === 'global' ? 'text-brand' : 'text-text-muted'}`}>
            Global
            {feedType === 'global' && (
              <motion.div
                key={isHydrated ? 'hydrated' : 'initial'}
                layoutId={isHydrated ? 'tab-underline' : undefined}
                className="absolute -bottom-4 left-0 w-full h-1 bg-brand rounded-t-full"
                transition={{ type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </div>
        </button>

        <button
          onClick={() => switchTab('following')}
          className="flex-1 flex justify-center hover:bg-surface transition-colors pt-4 pb-4"
        >
          <div className={`font-bold text-base relative px-2 transition-colors duration-150 ${feedType === 'following' ? 'text-brand' : 'text-text-muted'}`}>
            Following
          {feedType === 'following' && (
              <motion.div
                key={isHydrated ? 'hydrated' : 'initial'}
                layoutId={isHydrated ? 'tab-underline' : undefined}
                className="absolute -bottom-4 left-0 w-full h-1 bg-brand rounded-t-full"
                transition={{ type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </div>
        </button>
      </div>

      <main className="w-full max-w-2xl mx-auto border-x border-border-subtle min-h-screen pb-24">
        <InlineComposer />

        {isLoading ? (
          <div className="w-full flex flex-col">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 border-b border-border-subtle flex gap-3 animate-pulse">
                <div className="w-10 h-10 bg-surface-muted rounded-full shrink-0"></div>
                <div className="flex-1 space-y-3 mt-1">
                  <div className="h-4 bg-surface-muted rounded w-1/4"></div>
                  <div className="h-4 bg-surface-muted rounded w-3/4"></div>
                  <div className="h-4 bg-surface-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : tweets.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            {feedType === 'following'
              ? "Your following feed is empty. Follow some people to see their posts."
              : "No posts yet. Be the first to post!"}
          </div>
        ) : (
            <AnimatePresence initial={false}>
            {tweets.filter((t: any) => !t.parent_id).map((tweet: any) => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                currentUserId={user?.id}
                onDelete={deleteTweet}
                variant="feed"
                justPosted={tweet.id === justPostedId}
              />
            ))}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}