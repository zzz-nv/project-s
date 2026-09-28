'use client';

import { useState, useEffect, use } from 'react';
import { AnimatePresence } from 'motion/react';
import { supabase } from '@/app/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import TweetCard from '@/components/TweetCard';
import InlineBackButton from '@/components/InlineBackButton';
import { loadThread } from '@/lib/loadThread';
import { deleteTweetWithImages } from '@/lib/deleteTweet';


export default function ThreadPage({ params }: { params: Promise<{ username: string, id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [replyContent, setReplyContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['thread', id],
    queryFn: () => loadThread(id),
  });

  const tweet = data?.tweet;
  const replies = data?.replies ?? [];
  const user = data?.currentUser;

    const setThreadData = (updater: (prev: any) => any) => {
    queryClient.setQueryData(['thread', id], (prev: any) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  

    async function postReply(e: React.FormEvent) {
    e.preventDefault();
    const cleanContent = replyContent.trim();
    if (!cleanContent || cleanContent.length > 280 || !user) return;

    setReplyContent('');

    const { error } = await supabase
      .from('tweets')
      .insert({
        user_id: user.id,
        content: cleanContent,
        parent_id: id,
      });

    if (error) {
      setReplyContent(cleanContent); // restore on failure
      return;
    }

    // Refetch thread + invalidate feed so reply count updates
    queryClient.invalidateQueries({ queryKey: ['thread', id] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }

    async function deleteTweet(tweetId: string) {
    const result = await deleteTweetWithImages(tweetId);
    if (!result.ok) return;

    if (tweetId === id) {
      router.back();
      return;
    }

    // Optimistic cache update — triggers the exit animation
    setThreadData((prev) => ({
      ...prev,
      replies: prev.replies.filter((r: any) => r.id !== tweetId),
    }));

    queryClient.invalidateQueries({ queryKey: ['feed'] });
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Deleted!' } }));
  }

    if (isLoading) return (
   
    <div className="min-h-screen bg-background text-white font-sans flex flex-col pb-24">
      
     
      <main className="flex-1 w-full max-w-2xl mx-auto border-x border-border-subtle p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-surface rounded-full"></div>
          <div className="flex flex-col gap-2 w-32">
            <div className="h-4 bg-surface rounded w-full"></div>
            <div className="h-3 bg-surface rounded w-2/3"></div>
          </div>
        </div>
        <div className="h-6 bg-surface rounded w-full mb-3"></div>
        <div className="h-6 bg-surface rounded w-4/5 mb-3"></div>
        <div className="h-6 bg-surface rounded w-1/2"></div>
      </main>
    </div>
  );

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

return (
  <div className="min-h-screen bg-background text-white font-sans flex flex-col pb-24">
   
    {/* Header */}
   

    <main className="flex-1 w-full max-w-2xl mx-auto border-x border-border-subtle">
    <InlineBackButton title="Thread"/>
     {/* HERO TWEET (The Parent) */}
     <TweetCard 
          tweet={tweet} 
          currentUserId={user?.id} 
          onDelete={deleteTweet} 
          variant="thread" 
        />
      

      {/* COMPOSE REPLY */}
      {user && (
                <form onSubmit={postReply} className="px-5 py-3 border-b border-border-subtle flex gap-3">
          <div className="w-10 h-10 shrink-0 bg-surface-muted rounded-full flex items-center justify-center text-text-muted font-bold uppercase text-sm overflow-hidden mt-1">
            {user.email?.charAt(0)}
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Post your reply..."
              rows={1}
              className="w-full bg-transparent text-foreground placeholder:text-text-muted text-lg resize-none outline-none pt-2 pb-2"
              style={{ minHeight: '48px' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 300) + 'px';
              }}
              maxLength={280}
            />
            <div className="flex items-center justify-end mt-1">
              <button
                type="submit"
                disabled={!replyContent.trim()}
                className="bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-1.5 rounded-full transition-colors active:scale-95"
              >
                Reply
              </button>
            </div>
          </div>
        </form>
      )}

      {/* REPLIES LIST */}
      <div className="bg-background">
        {replies.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No replies yet.</div>
          
        ) : (
          <AnimatePresence initial={false}>
            {replies.map(reply => (
              <TweetCard 
                key={reply.id} 
                tweet={reply} 
                currentUserId={user?.id}
                onDelete={deleteTweet}
                variant="reply" 
              />
            ))}
          </AnimatePresence>
        )}
      </div>
      
    </main>
  </div>
);
}