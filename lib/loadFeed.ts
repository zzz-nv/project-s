import { supabase } from '@/app/supabase';

export interface FeedPayload {
  user: any;
  tweets: any[];
}

export async function loadFeed(feedType: 'global' | 'following'): Promise<FeedPayload | null> {
  // 1. Session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const user = session.user;

  // 2. Build base query
  let query = supabase
    .from('tweets')
    .select(`id, user_id, content, created_at, parent_id, image_urls, profiles (username, display_name, avatar_url)`)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // 3. If "friends" tab, restrict to people you follow
    if (feedType === 'following') {
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = followData?.map(f => f.following_id) || [];

    // If you follow nobody, there's nothing to show
    if (followingIds.length === 0) {
      return { user, tweets: [] };
    }

    query = query.in('user_id', followingIds);
  }

  // 4. Fetch raw tweets
  const { data: rawTweets } = await query;

  if (!rawTweets || rawTweets.length === 0) {
    return { user, tweets: [] };
  }

  // 5. Hydrate with likes + reply counts
  const tweetIds = rawTweets.map(t => t.id);

  const [likesRes, repliesRes] = await Promise.all([
    supabase.from('likes').select('tweet_id, user_id').in('tweet_id', tweetIds),
    supabase.from('tweets').select('parent_id').in('parent_id', tweetIds)
  ]);

  const allLikes = likesRes.data || [];
  const allReplies = repliesRes.data || [];

  const hydratedTweets = rawTweets.map(tweet => {
    const tweetLikes = allLikes.filter(l => l.tweet_id === tweet.id);
    const tweetReplies = allReplies.filter(r => r.parent_id === tweet.id);
    return {
      ...tweet,
      _likeCount: tweetLikes.length,
      _replyCount: tweetReplies.length,
      _isLiked: tweetLikes.some(l => l.user_id === user.id)
    };
  });

  return { user, tweets: hydratedTweets };
}