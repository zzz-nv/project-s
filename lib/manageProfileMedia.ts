import { supabase } from '@/app/supabase';

// Extract storage path from a public URL for a given bucket
function extractPath(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split('?')[0];
}

async function tryDeleteOldFile(url: string | null, bucket: string) {
  if (!url) return;
  const path = extractPath(url, bucket);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

// ─── AVATAR ───
export async function replaceAvatar(
  userId: string,
  file: File,
  currentUrl: string | null
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const imageCompression = (await import('browser-image-compression')).default;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 512,
      useWebWorker: true,
      fileType: 'image/jpeg',
    });

    const path = `${userId}/avatar-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);

    // Delete the old avatar in the background
    tryDeleteOldFile(currentUrl, 'avatars').catch(() => {});

    return { ok: true, url: data.publicUrl };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Upload failed' };
  }
}

export async function removeAvatar(currentUrl: string | null) {
  await tryDeleteOldFile(currentUrl, 'avatars');
}

// ─── BANNER ───
export async function replaceBanner(
  userId: string,
  file: File,
  currentUrl: string | null
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const imageCompression = (await import('browser-image-compression')).default;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
    });

    const path = `${userId}/banner-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = supabase.storage.from('post-images').getPublicUrl(path);

    tryDeleteOldFile(currentUrl, 'post-images').catch(() => {});

    return { ok: true, url: data.publicUrl };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Upload failed' };
  }
}

export async function removeBanner(currentUrl: string | null) {
  await tryDeleteOldFile(currentUrl, 'post-images');
}