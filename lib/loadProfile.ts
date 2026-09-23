import { supabase } from '@/app/supabase';

export interface ProfilePayload {
  profile: any;
  tweets: any[];
  currentUser: any;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export async function loadProfile(username: string): Promise<ProfilePayload | null> {
  // 1. Session + profile in parallel
  const [sessionRes, profileRes] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from('profiles').select('*').eq('username', username).single(),
  ]);

  const session = sessionRes.data?.session;
  const profileData = profileRes.data;

  if (!profileData) return null;

  // 2. Tweets, counts, follow check in parallel
  const queries: any[] = [
    supabase
      .from('tweets')
      .select(`id, user_id, content, created_at, parent_id, image_urls, profiles (username, display_name, avatar_url, bio)`)
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileData.id),

    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileData.id),
  ];

  let followCheckPromise: Promise<{ data: any }>;
  if (session && session.user.id !== profileData.id) {
    followCheckPromise = supabase
      .from('follows')
      .select('*')
      .eq('follower_id', session.user.id)
      .eq('following_id', profileData.id)
      .single() as unknown as Promise<{ data: any }>;
  } else {
    followCheckPromise = Promise.resolve({ data: null });
  }
  queries.push(followCheckPromise);

  const [tweetsRes, followersRes, followingRes, followCheckRes] = await Promise.all(queries);

  // 3. Hydrate tweets with likes / replies
  const rawTweets = tweetsRes.data || [];
  let hydratedTweets: any[] = [];

  if (rawTweets.length > 0) {
    const tweetIds = rawTweets.map((t: any) => t.id);

    const [likesRes, repliesRes] = await Promise.all([
      supabase.from('likes').select('tweet_id, user_id').in('tweet_id', tweetIds),
      supabase.from('tweets').select('parent_id').in('parent_id', tweetIds),
    ]);

    const allLikes = likesRes.data || [];
    const allReplies = repliesRes.data || [];

    hydratedTweets = rawTweets.map((tweet: any) => {
      const tweetLikes = allLikes.filter((l: any) => l.tweet_id === tweet.id);
      const tweetReplies = allReplies.filter((r: any) => r.parent_id === tweet.id);
      return {
        ...tweet,
        _likeCount: tweetLikes.length,
        _replyCount: tweetReplies.length,
        _isLiked: session ? tweetLikes.some((l: any) => l.user_id === session.user.id) : false,
      };
    });
  }

  return {
    profile: profileData,
    tweets: hydratedTweets,
    currentUser: session?.user || null,
    isFollowing: !!followCheckRes.data,
    followerCount: followersRes.count || 0,
    followingCount: followingRes.count || 0,
  };
}