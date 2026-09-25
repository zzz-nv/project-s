import imageCompression from 'browser-image-compression';
import { supabase } from '@/app/supabase';

const BANNER_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.6,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
};

export interface BannerUploadResult {
  ok: true;
  url: string;
  path: string;
}

export interface BannerUploadError {
  ok: false;
  error: string;
}

export async function uploadBanner(file: File): Promise<BannerUploadResult | BannerUploadError> {
  try {
    if (!file.type.startsWith('image/')) {
      return { ok: false, error: 'Not an image file' };
    }

    if (file.size > 20 * 1024 * 1024) {
      return { ok: false, error: 'Image too large (max 20MB)' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'Not signed in' };

    const userId = session.user.id;

    let compressed: File;
    try {
      compressed = await imageCompression(file, BANNER_COMPRESSION_OPTIONS);
    } catch {
      compressed = file;
    }

    const filename = `banner-${Date.now()}.jpg`;
    const path = `${userId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, compressed, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = supabase.storage.from('post-images').getPublicUrl(path);

    return { ok: true, url: data.publicUrl, path };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Upload failed' };
  }
}