'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabase';
import { motion, AnimatePresence } from 'motion/react';

import TweetImages from './TweetImages';
import { usePrefetchThread, usePrefetchProfile } from '@/lib/usePrefetch';
import ProfileHoverCard from './ProfileHoverCard';
import ConfirmDialog from './ConfirmDialog';

type CardVariant = 'feed' | 'profile' | 'thread' | 'reply' | 'nested';


function renderTweetContent(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      const username = part.slice(1);
      return (
        <Link
          key={i}
          href={`/${username}`}
          onClick={(e) => e.stopPropagation()}
          className="text-brand hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface TweetCardProps {
  tweet: any;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  variant?: CardVariant;
  justPosted?: boolean;
}

export default function TweetCard({ tweet, currentUserId, onDelete, variant = 'feed', justPosted = false }: TweetCardProps) {
  const router = useRouter();
  
  // Reply States
  const [showReplies, setShowReplies] = useState(false);
  const [nestedReplies, setNestedReplies] = useState<any[]>([]);
  


 // 1. Check if the parent page already handed us the data
  const [isHydrated] = useState(tweet._likeCount !== undefined);

  // 2. Use the parent data if it exists, otherwise default to 0/false
  const [likeCount, setLikeCount] = useState(tweet._likeCount || 0);
  const [isLiked, setIsLiked] = useState(tweet._isLiked || false);
  const [replyCount, setReplyCount] = useState(tweet._replyCount || 0);
  
  const [isLiking, setIsLiking] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [confirming, setConfirming] = useState(false);

  // Prefetch the thread on hover so clicking feels instant
  const prefetchThread = usePrefetchThread(tweet.id);
  const prefetchProfile = usePrefetchProfile(tweet.profiles?.username);

  

  // Fetch Initial Data (Likes & Replies)
  useEffect(() => {
    // THE KILL SWITCH: If the parent passed the data, do absolutely nothing. Zero popping.
    if (isHydrated) return;

    // FALLBACK: If a page hasn't been upgraded yet, fetch manually.
    async function fetchFallbackData() {
      const { count: rCount } = await supabase.from('tweets').select('*', { count: 'exact', head: true }).eq('parent_id', tweet.id);
      if (rCount !== null) setReplyCount(rCount);

      const { count: lCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('tweet_id', tweet.id);
      if (lCount !== null) setLikeCount(lCount);

      if (currentUserId) {
        const { data } = await supabase.from('likes').select('id').eq('tweet_id', tweet.id).eq('user_id', currentUserId).maybeSingle();
        if (data) setIsLiked(true);
      }
    }
    fetchFallbackData();
  }, [tweet.id, currentUserId, isHydrated]);

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('tweets')
      .select('*, profiles(username, display_name, avatar_url)')
      .eq('parent_id', tweet.id)
      .order('created_at', { ascending: true });
    if (data) setNestedReplies(data);
  };

  async function toggleReplies(e: React.MouseEvent) {
    e.stopPropagation(); 
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    setShowReplies(true);
    fetchReplies();
  }

  async function toggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentUserId || isLiking) return;

    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;

      // Optimistic UI Update (No load animations)
    setIsLiked(!previousLiked);
    setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1);
    setPulseKey(k => k + 1);

    if (previousLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('tweet_id', tweet.id)
        .eq('user_id', currentUserId);
      if (error) {
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ tweet_id: tweet.id, user_id: currentUserId });
      if (error) {
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
      }
    }
    setIsLiking(false);
  }

    const goToThread = (e: React.MouseEvent) => {
    // The hero card in a thread is already where the click would take you
    if (variant === 'thread') return;

    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button') || target.closest('input')) {
      return;
    }

    // Remember which tweet was clicked so the feed can snap to it on return
    sessionStorage.setItem('snap-to-tweet', tweet.id);

    router.push(`/${tweet.profiles?.username}/status/${tweet.id}`);
  };
    
  const isReply = variant === 'reply' || variant === 'nested';
  const isThreadHero = variant === 'thread';
  
    return (
      <motion.div 
      data-tweet-id={tweet.id}
      style={{ scrollMarginTop: '72px' }}
      onClick={goToThread}
      onMouseEnter={prefetchThread.onMouseEnter}
      onMouseLeave={prefetchThread.onMouseLeave}
      initial={justPosted ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        borderBottomWidth: 0,
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`relative group ${variant !== 'thread' ? 'cursor-pointer' : ''} ${
        variant === 'reply' 
          ? 'px-5 py-3 border-b border-border-subtle' 
          : variant === 'nested' 
            ? 'py-1.5 px-2 border-none' 
            : 'px-5 py-4 border-b border-border-subtle'
      }`}
    >
      
           {currentUserId === tweet.user_id && onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
          className="absolute top-5 right-5 text-text-muted hover:text-red-500 text-xs font-bold transition opacity-0 group-hover:opacity-100 z-10"
        >
          Delete
        </button>
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete this post?"
          message="This can't be undone."
          confirmText="Delete"
          destructive
          onConfirm={() => {
            setConfirming(false);
            onDelete?.(tweet.id);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
        
      <div className="flex items-center gap-3 mb-2">
                   <ProfileHoverCard username={tweet.profiles?.username}>
            <Link 
            href={`/${tweet.profiles?.username}`} 
            onMouseEnter={prefetchProfile.onMouseEnter}
            onMouseLeave={prefetchProfile.onMouseLeave}
              className={`shrink-0 bg-surface-muted rounded-full flex items-center justify-center text-text-muted font-bold uppercase hover:ring-2 ring-brand transition-all overflow-hidden ${
              isThreadHero ? 'w-12 h-12 text-lg'
              : variant === 'nested' ? 'w-7 h-7 text-[10px]'
              : 'w-10 h-10 text-sm'
            }`}
          >
            {tweet.profiles?.avatar_url ? (
              <img src={tweet.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              tweet.profiles?.username?.charAt(0)
            )}
          </Link>
          </ProfileHoverCard>
        <div className="flex flex-col leading-tight">
          <Link 
            href={`/${tweet.profiles?.username}`} 
            className={`font-bold text-foreground hover:underline ${isThreadHero ? 'text-lg' : ''}`}
          >
            {tweet.profiles?.display_name || tweet.profiles?.username}
          </Link>
          <span className="text-text-muted text-sm">@{tweet.profiles?.username}</span>
        </div>
      </div>

        <p dir="auto" className={`text-foreground whitespace-pre-wrap break-words ${
        isThreadHero 
          ? 'text-lg sm:text-xl leading-snug font-medium mt-4' 
          : variant === 'nested'
            ? 'text-[15px] leading-relaxed ml-10 mt-0.5'
            : variant === 'reply'
            ? 'text-[17px] leading-[1.5] ml-12 mt-1'
              : 'text-[17px] leading-[1.5] mt-4 ml-2'
      }`}>
        {renderTweetContent(tweet.content)}
      </p>

      {tweet.image_urls && tweet.image_urls.length > 0 && (
        <div>
          <TweetImages urls={tweet.image_urls} />
        </div>
      )}

      {/* ACTION BAR */}
      {variant !== 'nested' && (
           <div className={`${isThreadHero ? 'mt-4' : 'ml-12 mt-3'} flex items-center gap-8`}>
      
        {/* 1. REPLY BUTTON */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/${tweet.profiles?.username}/status/${tweet.id}`);
          }}
          className="text-sm font-bold text-text-muted hover:text-brand transition-colors flex items-center gap-1.5 group/btn"
        >
          <div className="w-8 h-8 rounded-full group-hover/btn:bg-brand/10 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </div>
          <span>{replyCount > 0 ? replyCount : ''}</span>
        </button>

       {/* 2. LIKE BUTTON */}
        <button 
          onClick={toggleLike}
          className={`text-sm font-bold flex items-center gap-1.5 group/like ${
            isLiked ? 'text-rose-500' : 'text-text-muted hover:text-rose-500'
          }`}
        >
          <div className="w-8 h-8 rounded-full group-hover/like:bg-rose-500/10 flex items-center justify-center transition-colors active:scale-90">
                        <motion.svg
              key={pulseKey}
              className="w-4 h-4"
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={pulseKey > 0 ? { scale: 1 } : false}
              animate={
                pulseKey === 0
                  ? { scale: 1 }
                  : isLiked
                    ? { scale: [1, 1.28, 1] }
                    : { scale: [1, 0.88, 1] }
              }
              transition={
                isLiked
                  ? { duration: 0.22, times: [0, 0.4, 1], ease: 'easeOut' }
                  : { duration: 0.15, times: [0, 0.4, 1], ease: 'easeOut' }
              }
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </motion.svg>
          </div>
          <span>{likeCount > 0 ? likeCount : ''}</span>
        </button>

        {/* 3. INLINE REPLIES TOGGLE (Next to the buttons, no ml-auto) */}
        {!isThreadHero && variant === 'reply' && replyCount > 0 && (
          <button 
            onClick={toggleReplies}
            className="text-sm font-bold text-brand hover:text-brand-hover transition-colors ml-4"
          >
            {showReplies ? 'Hide replies' : `View ${replyCount} replies`}
          </button>
        )}
      </div>
      )}

      {/* INLINE REPLIES ACCORDION */}
        {showReplies && variant === 'reply' && (
        <div className="mt-2 ml-11 flex flex-col">
          {nestedReplies.map(reply => (
            <TweetCard 
              key={reply.id} 
              tweet={reply} 
              currentUserId={currentUserId} 
              onDelete={onDelete} 
              variant="nested" 
            />
          ))}
        </div>
      )}
    </motion.div>
    );
}