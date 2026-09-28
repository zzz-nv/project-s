'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/supabase';
import { postTweet } from '@/lib/postTweet';
import { uploadImages, MAX_IMAGES_PER_POST } from '@/lib/uploadImage';

export default function InlineComposer() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', session.user.id)
        .single();
      if (data) {
        setAvatarUrl(data.avatar_url);
        setUsername(data.username);
      }
    }
    load();
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const remaining = MAX_IMAGES_PER_POST - files.length;
    const toAdd = selected.slice(0, remaining);

    if (selected.length > remaining) {
      setError(`Max ${MAX_IMAGES_PER_POST} images per post`);
    } else {
      setError('');
    }

    setFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);

    // Reset input so picking the same file again still triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setError('');
  }

  async function handlePost() {
    if ((!content.trim() && files.length === 0) || isPosting) return;
    setIsPosting(true);
    setError('');

    let imageUrls: string[] = [];
    let uploadedPaths: string[] = [];
    if (files.length > 0) {
      const upload = await uploadImages(files);
      if (!upload.ok) {
        setError(upload.error);
        setIsPosting(false);
        return;
      }
      imageUrls = upload.urls;
      uploadedPaths = upload.paths;
    }

    const result = await postTweet(content, imageUrls);
    setIsPosting(false);

    // If the post failed, clean up the images we already uploaded
    if (!result.ok && uploadedPaths.length > 0) {
      const { deleteImages } = await import('@/lib/uploadImage');
      deleteImages(uploadedPaths).catch(() => {});
    }

    if (result.ok) {
      previews.forEach(URL.revokeObjectURL);
      setContent('');
      setFiles([]);
      setPreviews([]);

      const username = result.tweet.profiles?.username;
      if (username) {
        // Optimistically insert into the profile cache so it appears instantly
        queryClient.setQueryData(['profile', username], (prev: any) => {
          if (!prev) return prev;
          if (prev.tweets.some((t: any) => t.id === result.tweet.id)) return prev;
          return { ...prev, tweets: [result.tweet, ...prev.tweets] };
        });

        // Navigate to profile (no-op if already there)
        if (pathname !== `/${username}`) {
          router.push(`/${username}`);
        }
      }
    } else {
      setError(result.error);
    }
  }

  const remaining = 280 - content.length;
  const canPost = (content.trim().length > 0 || files.length > 0) && remaining >= 0 && !isPosting;
  const showCounter = content.length > 240;

  return (
    <div className="px-4 py-3 border-b border-border-subtle flex gap-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-surface-muted overflow-hidden shrink-0 flex items-center justify-center mt-1">
        {avatarUrl ? (
          <img src={avatarUrl} alt="You" className="w-full h-full object-cover" />
        ) : (
          <span className="text-text-muted font-bold uppercase">
            {username?.charAt(0) || '?'}
          </span>
        )}
      </div>

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          rows={1}
          maxLength={280}
          dir="auto"
          className="w-full bg-transparent text-foreground placeholder:text-text-muted text-xl resize-none outline-none leading-normal pt-2 pb-3 overflow-hidden"
          style={{ minHeight: '52px' }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 300) + 'px';
          }}
        />

        {/* Image previews */}
        {previews.length > 0 && (
          <div className={`grid gap-1 rounded-2xl overflow-hidden mb-2 ${
            previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}>
            {previews.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt=""
                  className={`w-full object-cover ${
                    previews.length === 1 ? 'max-h-[300px]' : 'h-[160px]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition"
                  aria-label="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-red-500 text-xs font-semibold mb-2">{error}</p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Action row */}
        <div className="flex items-center justify-between -ml-2 mt-1">
          <div className="flex items-center text-brand">
            <IconBtn
              label="Media"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_IMAGES_PER_POST}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z"/>
              </svg>
            </IconBtn>

            <IconBtn label="GIF" disabled>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v13c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-13c0-.276-.224-.5-.5-.5h-13z"/>
                <path d="M9 9h2v6H9V9zm3 0h3.5v1.5H13.5v1H15v1.5h-1.5V15H12V9zm4 0h2v6h-2V9z"/>
              </svg>
            </IconBtn>

            <IconBtn label="Poll" disabled>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 5V3h2v2H6zm0 3h2v13H6V8zm4-2h2V3h-2v3zm0 5h2V8h-2v3zm0 4h2v-8h-2v8zm4-9h2V3h-2v3zm0 5h2V8h-2v3zm0 4h2v-3h-2v3zm4-9h2V3h-2v3zm0 5h2V8h-2v3zm0 4h2v-8h-2v8z"/>
              </svg>
            </IconBtn>

            <IconBtn label="Emoji" disabled>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9"/>
                <path d="M8.5 14.5s1.5 2 3.5 2 3.5-2 3.5-2" strokeLinecap="round"/>
                <circle cx="9" cy="9.5" r="0.5" fill="currentColor"/>
                <circle cx="15" cy="9.5" r="0.5" fill="currentColor"/>
              </svg>
            </IconBtn>

            <IconBtn label="Schedule" disabled>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="16" rx="2"/>
                <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round"/>
              </svg>
            </IconBtn>
          </div>

          <div className="flex items-center gap-3">
            {showCounter && (
              <span className={`text-xs font-mono ${remaining < 20 ? 'text-red-500' : 'text-text-muted'}`}>
                {remaining}
              </span>
            )}
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-1.5 rounded-full text-sm transition-colors active:scale-95"
            >
              {isPosting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full hover:bg-brand/10 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}