'use client';
import { useState, useEffect, use } from 'react';import { supabase } from '@/app/supabase';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import Link from 'next/link';

import EditProfileModal from '@/components/EditProfileModal';
import TweetCard from '@/components/TweetCard';
import InlineBackButton from '@/components/InlineBackButton';

//lib
import { loadProfile } from '@/lib/loadProfile';
import { deleteTweetWithImages } from '@/lib/deleteTweet';
import { replaceAvatar, replaceBanner, removeAvatar, removeBanner } from '@/lib/manageProfileMedia';
import ConfirmDialog from '@/components/ConfirmDialog';


export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const targetUsername = decodeURIComponent(resolvedParams.username);
  const queryClient = useQueryClient();

  // ─── UI-only state (NOT cached) ───
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [modalUsers, setModalUsers] = useState<any[]>([]);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [justPostedId, setJustPostedId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<'avatar' | 'banner' | null>(null);

  // ─── Cached data ───
  const { data, isLoading } = useQuery({
    queryKey: ['profile', targetUsername],
    queryFn: () => loadProfile(targetUsername),
  });

  const profile = data?.profile;
  const tweets = data?.tweets ?? [];

  // Listen for posts made while we're on this page
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail.id;
      setJustPostedId(id);
      setTimeout(() => setJustPostedId(null), 1500);
    };
    window.addEventListener('post-created', handler);
    return () => window.removeEventListener('post-created', handler);
  }, []);

  // Check for a post we just made on another page (navigated here)
  useEffect(() => {
    const id = sessionStorage.getItem('just-posted-id');
    if (id) {
      sessionStorage.removeItem('just-posted-id');
      setJustPostedId(id);
      setTimeout(() => setJustPostedId(null), 1500);
    }
  }, []);

  // Scroll to the new tweet once it renders
  useEffect(() => {
    if (!justPostedId || !data) return;
    const el = document.querySelector(`[data-tweet-id="${justPostedId}"]`);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [justPostedId, data]);


  const currentUser = data?.currentUser;
  const isFollowing = data?.isFollowing ?? false;
  const followerCount = data?.followerCount ?? 0;
  const followingCount = data?.followingCount ?? 0;

  // Helper to update cached data
  const setProfileData = (updater: (prev: any) => any) => {
    queryClient.setQueryData(['profile', targetUsername], (prev: any) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  async function toggleFollow() {
    if (!currentUser || !profile) return;
    setIsFollowLoading(true);

    const nextFollowing = !isFollowing;
    const nextFollowerCount = isFollowing ? followerCount - 1 : followerCount + 1;

    // Optimistic cache update
    setProfileData((prev) => ({
      ...prev,
      isFollowing: nextFollowing,
      followerCount: nextFollowerCount,
    }));

    let error;
    if (isFollowing) {
      ({ error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id));
    } else {
      ({ error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: profile.id }));
    }

    // Rollback on error
    if (error) {
      setProfileData((prev) => ({
        ...prev,
        isFollowing,
        followerCount,
      }));
    } else {
      // Invalidate feed caches so Following updates next visit
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }

    setIsFollowLoading(false);
  }
  
    
  
  async function startChat() {
    if (!currentUser || !profile) return;

    // Check for an existing conversation with this user (including hidden ones)
    const { data: myChats } = await supabase
      .from('participants')
      .select('conversation_id')
      .eq('user_id', currentUser.id);

    const myChatIds = myChats?.map(c => c.conversation_id) || [];

    if (myChatIds.length > 0) {
      const { data: sharedChat } = await supabase
        .from('participants')
        .select('conversation_id')
        .in('conversation_id', myChatIds)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (sharedChat) {
        // If we had hidden ourselves, unhide — user is intentionally reopening
        await supabase
          .from('participants')
          .update({ hidden_at: null })
          .eq('conversation_id', sharedChat.conversation_id)
          .eq('user_id', currentUser.id);

        router.push(`/chat/${sharedChat.conversation_id}`);
        return;
      }
    }

    // No existing conversation — create one
    const { data: newChatId, error } = await supabase
      .rpc('create_new_chat', { other_user_id: profile.id });

    if (error || !newChatId) {
      console.error('Failed to create chat:', error);
      alert('Failed to start conversation.');
      return;
    }

    router.push(`/chat/${newChatId}`);
  }

  async function openFollowModal(type: 'followers' | 'following') {
    setFollowModal(type);
    setModalUsers([]);
    if (!profile) return;

    let userIds: string[] = [];

    if (type === 'followers') {
      const { data } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id);
      userIds = data?.map(d => d.follower_id) || [];
    } else {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id);
      userIds = data?.map(d => d.following_id) || [];
    }

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .in('id', userIds);
      if (profilesData) setModalUsers(profilesData);
    }
  }

    async function deleteTweet(tweetId: string) {
    // Optimistic cache update — triggers the exit animation
    setProfileData((prev) => ({
      ...prev,
      tweets: prev.tweets.filter((t: any) => t.id !== tweetId),
    }));

    const result = await deleteTweetWithImages(tweetId);

    if (!result.ok) {
      queryClient.invalidateQueries({ queryKey: ['profile', targetUsername] });
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Deleted!' } }));
    }
  }



  /// Upload Avatar
    async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const result = await replaceAvatar(currentUser.id, file, profile.avatar_url);
      if (!result.ok) {
        alert('Error uploading image: ' + result.error);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('id', currentUser.id);
      if (updateError) throw updateError;

      setProfileData((prev) => ({
        ...prev,
        profile: { ...prev.profile, avatar_url: result.url },
      }));
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  }


  async function handleRemoveAvatar() {
    if (!profile?.avatar_url) return;

    await removeAvatar(profile.avatar_url);

    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', currentUser.id);

    setProfileData((prev) => ({
      ...prev,
      profile: { ...prev.profile, avatar_url: null },
    }));

    setConfirmRemove(null);
  }


  /// Upload Banner
    async function handleBannerUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingBanner(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const result = await replaceBanner(currentUser.id, file, profile.banner_url);
      if (!result.ok) {
        alert('Error uploading banner: ' + result.error);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: result.url })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfileData((prev) => ({
        ...prev,
        profile: { ...prev.profile, banner_url: result.url },
      }));
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleRemoveBanner() {
    if (!profile?.banner_url) return;

    await removeBanner(profile.banner_url);

    await supabase
      .from('profiles')
      .update({ banner_url: null })
      .eq('id', currentUser.id);

    setProfileData((prev) => ({
      ...prev,
      profile: { ...prev.profile, banner_url: null },
    }));

    setConfirmRemove(null);
  }







  // ─── Skeleton ───
  if (isLoading) return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <main className="flex-1 border-x border-border-subtle w-full max-w-2xl mx-auto flex flex-col pb-24">
        <div className="p-6 border-b border-border-subtle animate-pulse">
          <div className="w-24 h-24 bg-surface-muted rounded-full mb-4"></div>
          <div className="h-6 bg-surface-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-surface-muted rounded w-1/4 mb-4"></div>
          <div className="flex gap-4">
            <div className="h-4 bg-surface-muted rounded w-16"></div>
            <div className="h-4 bg-surface-muted rounded w-16"></div>
          </div>
        </div>
        <div className="w-full flex flex-col">
          {[1, 2].map((i) => (
            <div key={i} className="p-5 border-b border-border-subtle flex gap-3 animate-pulse">
              <div className="w-10 h-10 bg-surface-muted rounded-full shrink-0"></div>
              <div className="flex-1 space-y-3 mt-1">
                <div className="h-4 bg-surface-muted rounded w-1/4"></div>
                <div className="h-4 bg-surface-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );

  // ─── Not found ───
  if (!profile) return (
    <div className="h-screen bg-background text-white flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">User not found</h1>
      <Link href="/" className="text-amber-500 hover:underline">Return to Timeline</Link>
    </div>
  );

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col font-sans">
      <main className="flex-1 border-x border-border-subtle w-full max-w-2xl mx-auto flex flex-col pb-24">

        <InlineBackButton title="Profile" />

                <div className="border-b border-border-subtle">

          {/* BANNER */}
                    <div className="relative group w-full h-[150px] bg-surface overflow-hidden">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-background" />
            )}

            {isOwnProfile && (
              <>
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <span className="text-xs font-bold text-white bg-black/60 px-3 py-1.5 rounded-full">
                    {uploadingBanner ? 'Uploading…' : 'Change banner'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                </label>
                {profile.banner_url && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmRemove('banner'); }}
                    className="absolute top-3 right-3 bg-black/70 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    Remove
                  </button>
                )}
              </>
            )}
          </div>

                    {/* AVATAR + BUTTON + INFO */}
          <div className="px-6">

            <div className="flex justify-between items-end -mt-16 mb-4">
              {/* Avatar */}
              <div className="relative group w-32 h-32">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 font-bold text-5xl uppercase border-4 border-background shadow-lg">
                    {profile.username.charAt(0)}
                  </div>
                )}

                {isOwnProfile && (
                  <>
                    <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity border-4 border-background">
                      <span className="text-xs font-bold text-white">{uploading ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        onChange={uploadAvatar}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    {profile.avatar_url && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmRemove('avatar'); }}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-black/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        aria-label="Remove avatar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>

                            {/* Follow / Message / Edit buttons */}
              <div className="pb-1 flex items-center gap-2">
                {isOwnProfile ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="font-bold py-2 px-5 rounded-full border border-border-subtle text-white hover:bg-surface transition active:scale-95 text-sm"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={startChat}
                      className="w-9 h-9 rounded-full border border-border-subtle text-brand hover:text-brand-hover transition active:scale-95 flex items-center justify-center"
                      aria-label="Message"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={toggleFollow}
                      disabled={isFollowLoading}
                      className={`font-bold py-2 px-5 rounded-full transition active:scale-95 text-sm ${
                        isFollowing
                          ? 'bg-transparent border border-red-500 text-white hover:border-red-500 hover:text-red-500 hover:bg-red-500/10'
                          : 'bg-white text-black hover:bg-zinc-200'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="pb-6">
              <h2 className="text-2xl font-bold">{profile.display_name || profile.username}</h2>
              <p className="text-text-muted">@{profile.username}</p>

              {profile.bio && (
                <p className="mt-4 text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              <div className="flex gap-4 mt-4 text-sm">
                <button onClick={() => openFollowModal('following')} className="hover:underline">
                  <span className="font-bold text-zinc-200">{followingCount}</span>{' '}
                  <span className="text-text-muted">Following</span>
                </button>
                <button onClick={() => openFollowModal('followers')} className="hover:underline">
                  <span className="font-bold text-zinc-200">{followerCount}</span>{' '}
                  <span className="text-text-muted">Followers</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        <div>
          {tweets.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm">No posts yet.</div>
          ) : (
            <AnimatePresence initial={false}>
            {tweets.filter((t: any) => !t.parent_id).map((tweet: any) => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                currentUserId={currentUser?.id}
                onDelete={deleteTweet}
                variant="profile"
                justPosted={tweet.id === justPostedId}
              />
            ))}
          </AnimatePresence>
          )}
        </div>

        {followModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">

              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h2 className="font-bold text-lg text-zinc-200 capitalize">{followModal}</h2>
                <button onClick={() => setFollowModal(null)} className="text-zinc-500 hover:text-white text-xl leading-none">&times;</button>
              </div>

              <div className="overflow-y-auto p-2">
                {modalUsers.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 text-sm">Loading or empty...</div>
                ) : (
                  modalUsers.map((u) => (
                    <Link
                      key={u.username}
                      href={`/${u.username}`}
                      onClick={() => setFollowModal(null)}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-lg transition-colors"
                    >
                      <div className="w-10 h-10 shrink-0 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 font-bold uppercase text-sm overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          u.username.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold text-zinc-200 truncate">{u.display_name || u.username}</span>
                        <span className="text-zinc-500 text-sm truncate">@{u.username}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

                {isEditing && (
          <EditProfileModal
            profile={profile}
            onClose={() => setIsEditing(false)}
            onUpdate={(updatedProfile) => {
              setProfileData((prev) => ({
                ...prev,
                profile: { ...prev.profile, ...updatedProfile },
              }));
            }}
          />
        )}

        {confirmRemove === 'avatar' && (
          <ConfirmDialog
            title="Remove avatar?"
            message="This can't be undone."
            confirmText="Remove"
            destructive
            onConfirm={handleRemoveAvatar}
            onCancel={() => setConfirmRemove(null)}
          />
        )}

        {confirmRemove === 'banner' && (
          <ConfirmDialog
            title="Remove banner?"
            message="This can't be undone."
            confirmText="Remove"
            destructive
            onConfirm={handleRemoveBanner}
            onCancel={() => setConfirmRemove(null)}
          />
        )}

      </main>
    </div>
  );
}
