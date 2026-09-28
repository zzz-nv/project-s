'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

function updateTweetInList(tweets: any[], tweetId: string, isLiked: boolean, likeCount: number) {
  if (!tweets) return tweets;
  let changed = false;
  const updated = tweets.map((t: any) => {
    if (t.id === tweetId) {
      changed = true;
      return { ...t, _isLiked: isLiked, _likeCount: likeCount };
    }
    return t;
  });
  return changed ? updated : tweets;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  // Global listener: any like anywhere updates every cache that holds that tweet.
  // This runs regardless of which page is currently mounted, which fixes the
  // "feed X thread doesn't match" problem caused by prefetched or unmounted pages.
  useEffect(() => {
    const handler = (e: Event) => {
      const { tweetId, isLiked, likeCount } = (e as CustomEvent).detail;

      // Feed caches (both global and following)
      queryClient.setQueriesData({ queryKey: ['feed'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          tweets: updateTweetInList(oldData.tweets, tweetId, isLiked, likeCount),
        };
      });

      // Profile caches (each user has their own)
      queryClient.setQueriesData({ queryKey: ['profile'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          tweets: updateTweetInList(oldData.tweets, tweetId, isLiked, likeCount),
        };
      });

      // Thread caches (hero + replies)
      queryClient.setQueriesData({ queryKey: ['thread'] }, (oldData: any) => {
        if (!oldData) return oldData;
        const updatedTweet = oldData.tweet?.id === tweetId
          ? { ...oldData.tweet, _isLiked: isLiked, _likeCount: likeCount }
          : oldData.tweet;
        const updatedReplies = updateTweetInList(oldData.replies, tweetId, isLiked, likeCount);
        return { ...oldData, tweet: updatedTweet, replies: updatedReplies };
      });
    };
    window.addEventListener('like-updated', handler);
    return () => window.removeEventListener('like-updated', handler);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}