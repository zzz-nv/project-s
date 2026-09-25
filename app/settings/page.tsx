'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabase';

import InlineBackButton from '@/components/InlineBackButton';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { replaceAvatar, replaceBanner, removeAvatar, removeBanner } from '@/lib/manageProfileMedia';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [searchQuery, setSearchQuery] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const [loading, setLoading] = useState(true);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<'avatar' | 'banner' | null>(null);

  // Profile tab state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  // Avatar/Banner
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);


  // Notifications state
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifChats, setNotifChats] = useState(true);

  // Securely fetch active session credentials on mount
      useEffect(() => {
    async function loadAuthUser() {
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserEmail(session.user.email || '');
      setUserId(session.user.id || '');

        const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, banner_url, notification_prefs')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatar_url);
        setBannerUrl(profile.banner_url);

        const prefs = profile.notification_prefs || {};
        setNotifLikes(prefs.likes ?? true);
        setNotifReplies(prefs.replies ?? true);
        setNotifFollows(prefs.follows ?? true);
        setNotifChats(prefs.chats ?? true);
      }

      setLoading(false);
    }
    loadAuthUser();
  }, [router]);

  

  async function saveProfileFields() {
    setProfileSaving(true);
    setProfileMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
      })
      .eq('id', userId);

    setProfileSaving(false);

      if (error) {
      setProfileMessage('Failed to save. Try again.');
    } else {
      setProfileMessage('Saved.');
      setTimeout(() => setProfileMessage(''), 2000);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Saved' }
      }));
    }
  }

      async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingAvatar(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const result = await replaceAvatar(userId, file, avatarUrl);
      if (!result.ok) {
        alert('Avatar upload failed: ' + result.error);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(result.url);
    } catch (err: any) {
      alert('Avatar upload failed: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

    async function handleRemoveAvatar() {
    if (!avatarUrl) return;

    await removeAvatar(avatarUrl);

    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    setAvatarUrl(null);
    setConfirmRemove(null);
  }

   async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingBanner(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const result = await replaceBanner(userId, file, bannerUrl);
      if (!result.ok) {
        alert('Banner upload failed: ' + result.error);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: result.url })
        .eq('id', userId);

      if (updateError) throw updateError;

      setBannerUrl(result.url);
    } catch (err: any) {
      alert('Banner upload failed: ' + err.message);
    } finally {
      setUploadingBanner(false);
    }
  }

    async function handleRemoveBanner() {
    if (!bannerUrl) return;

    await removeBanner(bannerUrl);

    await supabase
      .from('profiles')
      .update({ banner_url: null })
      .eq('id', userId);

    setBannerUrl(null);
    setConfirmRemove(null);
  }

  
  async function updateNotifPref(
    key: 'likes' | 'replies' | 'follows' | 'chats',
    value: boolean
  ) {
    // Optimistic update
    const next = {
      likes: key === 'likes' ? value : notifLikes,
      replies: key === 'replies' ? value : notifReplies,
      follows: key === 'follows' ? value : notifFollows,
      chats: key === 'chats' ? value : notifChats,
    };

    if (key === 'likes') setNotifLikes(value);
    if (key === 'replies') setNotifReplies(value);
    if (key === 'follows') setNotifFollows(value);
    if (key === 'chats') setNotifChats(value);

      const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: next })
      .eq('id', userId);

    if (error) {
      // Revert on failure
      if (key === 'likes') setNotifLikes(!value);
      if (key === 'replies') setNotifReplies(!value);
      if (key === 'follows') setNotifFollows(!value);
      if (key === 'chats') setNotifChats(!value);

      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Failed to save' }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Saved' }
      }));
    }
  }

 







    const navigationSections = [
    {
      title: '',
      items: [
        { id: 'account', label: 'Your account', desc: 'Account information and data options' },
        { id: 'profile', label: 'Profile customization', desc: 'Manage your public persona and bio' },
        { id: 'notifications', label: 'Notifications', desc: 'Manage alerts and push updates' },
      ]
    }
  ];

  // Safeguard: If search filters out the active tab, fallback safely to the first available item
  const filteredSections = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex w-full">
      
      {/* LEFT SIDEBAR: Professional Dashboard Navigation */}
      <aside className="w-80 border-r border-border-subtle bg-background flex flex-col shrink-0">
        <InlineBackButton title="Settings" />
        
        <div className="p-6 flex flex-col flex-1 space-y-6">
          
          {/* Search Input */}
          <div className="relative">
            <svg className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Grouped Navigation */}
          <div className="bg-backgroundspace-y-6 flex-1 overflow-y-auto">
            {filteredSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {section.title && (
                  <p className="px-3 text-[11px] font-bold tracking-wider text-text-muted mb-2">{section.title}</p>
                )}                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                        isActive 
                          ? 'bg-surface-muted/90 text-white font-semibold shadow-sm border-l-2 border-brand' 
                          : 'text-text-muted hover:bg-surface hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-sm">{item.label}</span>
                      <svg className={`w-4 h-4 transition-transform ${isActive ? 'text-brand translate-x-0.5' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer Badge */}
          <div className="pt-4 border-t border-border-subtle text-xs text-text-muted flex items-center justify-between px-2">
            <span>Project S Core</span>
            <span className="bg-surface border border-border-subtle px-2 py-0.5 rounded text-text-muted font-mono">v1.0</span>
          </div>

        </div>
      </aside>

      {/* RIGHT CANVAS: Centered, Balanced Content Area */}
      <main className="flex-1 bg-background flex justify-center py-12 px-8 overflow-y-auto">
        <div className="w-full max-w-3xl space-y-8">
          
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Header Section */}
              <div className="flex items-center justify-between border-b border-border-subtle/60 pb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Your Account</h1>
                  <p className="text-sm text-text-muted mt-1">
                    Manage your credentials, security preferences, and account lifecycle.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </div>
              </div>

              {/* Cards Group */}
              <div className="space-y-4">
                <div className="bg-surface border border-border-subtle rounded-2xl p-6 transition">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base text-zinc-100">Account Information</h3>
                    <span className="text-xs text-text-muted font-mono">ID: {userId.slice(0, 8)}...</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Registered Email</span>
                      <span className="text-zinc-200 font-medium">{userEmail}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-text-muted">Authentication Provider</span>
                      <span className="text-zinc-200 font-medium">Supabase Auth</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full bg-surface border border-border-subtle rounded-2xl p-6 hover:border-brand/40 transition flex items-center justify-between cursor-pointer group text-left"
                >
                  <div>
                    <h3 className="font-bold text-base text-zinc-100 group-hover:text-white">Change Password</h3>
                    <p className="text-sm text-text-muted mt-1">Update your authentication credentials to maintain security.</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-surface-muted/80 flex items-center justify-center text-text-muted group-hover:bg-brand group-hover:text-background transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </button>

                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 hover:bg-red-500/10 transition flex items-center justify-between cursor-pointer group">
                  <div>
                    <h3 className="font-bold text-base text-red-400">Deactivate Account</h3>
                    <p className="text-sm text-red-400/70 mt-1">Permanently erase your data nodes and terminate your creator status.</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </div>
              </div>

            </div>
          )}

          

                    {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="border-b border-border-subtle/60 pb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white">Profile customization</h1>
                <p className="text-sm text-text-muted mt-1">
                  How you appear across Project S.
                </p>
              </div>

              {/* BANNER */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
                  Banner
                </label>
                                <div className="relative group w-full h-[150px] bg-background border border-border-subtle rounded-2xl overflow-hidden">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-xs font-bold text-white bg-black/60 px-3 py-1.5 rounded-full">
                      {uploadingBanner ? 'Uploading…' : bannerUrl ? 'Change banner' : 'Upload banner'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                      className="hidden"
                    />
                  </label>
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove('banner')}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* AVATAR */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
                  Avatar
                </label>
                                <div className="flex items-center gap-4">
                  <div className="relative group w-24 h-24">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border border-border-subtle"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-surface-muted flex items-center justify-center text-zinc-400 font-bold text-3xl uppercase border border-border-subtle">
                        {displayName.charAt(0) || '?'}
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <span className="text-xs font-bold text-white">
                        {uploadingAvatar ? '…' : 'Change'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove('avatar')}
                      className="text-xs font-bold text-text-muted hover:text-red-500 transition-colors"
                    >
                      Remove avatar
                    </button>
                  )}
                </div>
              </div>

              {/* DISPLAY NAME */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {/* BIO */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors resize-none"
                />
                <p className="text-xs text-text-muted mt-1">{bio.length}/160</p>
              </div>

              {/* SAVE */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={saveProfileFields}
                  disabled={profileSaving}
                  className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-full text-sm transition active:scale-95"
                >
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
                {profileMessage && (
                  <span className="text-sm text-text-muted">{profileMessage}</span>
                )}
              </div>
            </div>
          )}

            {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="border-b border-border-subtle/60 pb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white">Notifications</h1>
                <p className="text-sm text-text-muted mt-1">
                  Choose what updates you want to hear about.
                </p>
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl divide-y divide-border-subtle overflow-hidden">
                <ToggleRow
                  label="Likes"
                  description="When someone likes one of your posts."
                  checked={notifLikes}
                  onChange={(v) => updateNotifPref('likes', v)}
                />
                <ToggleRow
                  label="Replies"
                  description="When someone replies to you."
                  checked={notifReplies}
                  onChange={(v) => updateNotifPref('replies', v)}
                />
                <ToggleRow
                  label="Follows"
                  description="When someone follows you."
                  checked={notifFollows}
                  onChange={(v) => updateNotifPref('follows', v)}
                />
                <ToggleRow
                  label="Chats"
                  description="When someone sends you a new message."
                  checked={notifChats}
                  onChange={(v) => updateNotifPref('chats', v)}
                />
              </div>
            </div>
          )}

        </div>
      </main>

      {showPasswordModal && (
        <ChangePasswordModal
          userEmail={userEmail}
          onClose={() => setShowPasswordModal(false)}
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

    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-surface-hover/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-medium text-white text-sm">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <div
        className={`w-11 h-6 rounded-full shrink-0 relative transition-colors ${
          checked ? 'bg-brand' : 'bg-surface-muted'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}