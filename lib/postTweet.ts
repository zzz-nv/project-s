import { supabase } from '@/app/supabase';

export async function postTweet(
  content: string,
  imageUrls: string[] = []
): Promise<{ ok: true; id: string; tweet: any } | { ok: false; error: string }> {
  const clean = content.trim();
  if (!clean && imageUrls.length === 0) return { ok: false, error: 'Empty post' };
  if (clean.length > 280) return { ok: false, error: 'Too long' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not signed in' };

  // Fetch the user's profile so we can attach it to the tweet payload
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', session.user.id)
    .single();

  const { data, error } = await supabase
    .from('tweets')
    .insert({
      user_id: session.user.id,
      content: clean,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    })
    .select('id, content, created_at, image_urls')
    .single();

  if (error) return { ok: false, error: error.message };

  const tweet = {
    ...data,
    user_id: session.user.id,
    parent_id: null,
    profiles: profile,
    _likeCount: 0,
    _replyCount: 0,
    _isLiked: false,
  };

  // Let the profile page know it should scroll to + animate this tweet
  sessionStorage.setItem('just-posted-id', data.id);

  window.dispatchEvent(new CustomEvent('post-created', { detail: { id: data.id, tweet } }));
  window.dispatchEvent(new CustomEvent('refresh-feed'));
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Posted!' } }));

  return { ok: true, id: data.id, tweet };
}