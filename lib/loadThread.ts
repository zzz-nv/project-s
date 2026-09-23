import { supabase } from '@/app/supabase';

export interface ThreadPayload {
  tweet: any;
  replies: any[];
  currentUser: any;
}

export async function loadThread(id: string): Promise<ThreadPayload | null> {
  // 1. Fetch parent + replies in parallel
  const [parentRes, repliesRes] = await Promise.all([
    supabase
      .from('tweets')
      .select(`*, profiles(username, display_name, avatar_url)`)
      .eq('id', id)
      .single(),
    supabase
      .from('tweets')
      .select(`*, profiles(username, display_name, avatar_url)`)
      .eq('parent_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const rawParent = parentRes.data;
  const rawReplies = repliesRes.data || [];

  if (!rawParent) return null;

  // 2. Batch fetch likes + sub-reply counts + session
  const allIds = [rawParent.id, ...rawReplies.map(r => r.id)];

  const [likesRes, subRepliesRes, sessionRes] = await Promise.all([
    supabase.from('likes').select('tweet_id, user_id').in('tweet_id', allIds),
    supabase.from('tweets').select('parent_id').in('parent_id', allIds),
    supabase.auth.getSession(),
  ]);

  const allLikes = likesRes.data || [];
  const allSubReplies = subRepliesRes.data || [];
  const currentUser = sessionRes.data.session?.user || null;
  const currentUserId = currentUser?.id;

  // 3. Hydrate
  const hydrate = (tweet: any) => {
    const tweetLikes = allLikes.filter(l => l.tweet_id === tweet.id);
    const tweetReplies = allSubReplies.filter(r => r.parent_id === tweet.id);
    return {
      ...tweet,
      _likeCount: tweetLikes.length,
      _replyCount: tweetReplies.length,
      _isLiked: currentUserId ? tweetLikes.some(l => l.user_id === currentUserId) : false,
    };
  };

  return {
    tweet: hydrate(rawParent),
    replies: rawReplies.map(hydrate),
    currentUser,
  };
}