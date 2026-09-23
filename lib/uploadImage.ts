import imageCompression from 'browser-image-compression';
import { supabase } from '@/app/supabase';

// Target: ~400KB after compression. Enough for retina displays, small enough for fast uploads.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
};

// X allows up to 4 images per tweet. We cap at 4 too.
export const MAX_IMAGES_PER_POST = 4;

export interface UploadResult {
  ok: true;
  url: string;
  path: string;
}

export interface UploadError {
  ok: false;
  error: string;
}

/**
 * Compress and upload a single image to Supabase Storage.
 * Returns the public URL and the storage path (needed for deletion later).
 */
export async function uploadImage(file: File): Promise<UploadResult | UploadError> {
  try {
    // 1. Validate it's an image
    if (!file.type.startsWith('image/')) {
      return { ok: false, error: 'Not an image file' };
    }

    // 2. Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { ok: false, error: 'Not signed in' };
    }
    const userId = session.user.id;

    // 3. Compress client-side (3MB phone photo → ~400KB)
    let compressed: File;
    try {
      compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    } catch (err) {
      // If compression fails, fall back to the original (better than failing outright)
      console.warn('Compression failed, using original:', err);
      compressed = file;
    }

    // 4. Build a unique path: {userId}/{timestamp}-{random}.jpg
    const ext = 'jpg'; // we always output jpg from compression
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${userId}/${filename}`;

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, compressed, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    // 6. Get the public URL
    const { data } = supabase.storage
      .from('post-images')
      .getPublicUrl(path);

    return { ok: true, url: data.publicUrl, path };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Upload failed' };
  }
}

/**
 * Upload multiple images in parallel. Returns only the successful ones.
 * Fails fast if ANY upload fails, so we don't end up with partial posts.
 */
export async function uploadImages(files: File[]): Promise<{ ok: true; urls: string[]; paths: string[] } | UploadError> {
  if (files.length === 0) {
    return { ok: true, urls: [], paths: [] };
  }

  if (files.length > MAX_IMAGES_PER_POST) {
    return { ok: false, error: `Max ${MAX_IMAGES_PER_POST} images per post` };
  }

  const results = await Promise.all(files.map(uploadImage));

  const failed = results.find(r => !r.ok);
  if (failed && !failed.ok) {
    // Clean up any that succeeded before the failure
    const uploaded = results.filter((r): r is UploadResult => r.ok);
    if (uploaded.length > 0) {
      await supabase.storage
        .from('post-images')
        .remove(uploaded.map(r => r.path));
    }
    return { ok: false, error: failed.error };
  }

  const successful = results as UploadResult[];
  return {
    ok: true,
    urls: successful.map(r => r.url),
    paths: successful.map(r => r.path),
  };
}

/**
 * Delete images from storage. Used when a tweet with images is deleted.
 * Silently ignores errors — orphaned files aren't catastrophic.
 */
export async function deleteImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from('post-images').remove(paths);
}