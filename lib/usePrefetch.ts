'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loadThread } from './loadThread';
import { loadProfile } from './loadProfile';



const HOVER_DELAY = 120; // ms — matches X's feel. Quick pass-overs don't trigger.

export function usePrefetchThread(tweetId: string) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['thread', tweetId],
        queryFn: () => loadThread(tweetId),
        staleTime: 30_000,
      });
    }, HOVER_DELAY);
  }, [tweetId, queryClient]);

   const onMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { onMouseEnter, onMouseLeave };
}

export function usePrefetchProfile(username: string | undefined) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (!username) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['profile', username],
        queryFn: () => loadProfile(username),
        staleTime: 30_000,
      });
    }, HOVER_DELAY);
  }, [username, queryClient]);

    const onMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { onMouseEnter, onMouseLeave };
}