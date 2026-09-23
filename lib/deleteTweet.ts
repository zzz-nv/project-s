import { supabase } from '@/app/supabase';
import { deleteImages } from './uploadImage';

// Convert full public URLs into storage paths
// "https://xxx.supabase.co/storage/v1/object/public/post-images/userId/file.jpg"
//   → "userId/file.jpg"
function extractStoragePaths(urls: string[]): string[] {
  const marker = '/post-images/';
  return urls
    .map((url) => {
      const idx = url.indexOf(marker);
      if (idx === -1) return null;
      const path = url.slice(idx + marker.length).split('?')[0];
      return path;
    })
    .filter((p): p is string => p !== null && p.length > 0);
}

export async function deleteTweetWithImages(tweetId: string): Promise<{ ok: boolean; error?: string }> {
  // 1. Fetch the tweet's image URLs before deleting it
  const { data: tweet, error: fetchError } = await supabase
    .from('tweets')
    .select('image_urls')
    .eq('id', tweetId)
    .maybeSingle();

  // "no row found" is fine — just proceed to delete
  if (fetchError && fetchError.code !== 'PGRST116') {
    return { ok: false, error: fetchError.message };
  }

  const paths = tweet?.image_urls ? extractStoragePaths(tweet.image_urls) : [];
  

  // 2. Delete the tweet row first (so the UI updates fast)
  const { error: deleteError } = await supabase
    .from('tweets')
    .delete()
    .eq('id', tweetId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  // 3. Fire-and-forget the storage cleanup — don't block the UI
  if (paths.length > 0) {
    deleteImages(paths).catch((err) => {
      console.error('[deleteTweet] Failed to clean up storage files:', err, 'paths:', paths);
    });
  }

  return { ok: true };
}