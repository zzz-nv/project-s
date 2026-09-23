'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/supabase'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LeftRailProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadMyProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (data) setProfile(data);
    }
    loadMyProfile();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!profile) {
    return (
      <div className="w-full flex items-center gap-3 p-3 rounded-full animate-pulse">
        <div className="w-10 h-10 rounded-full bg-surface-muted shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-muted rounded w-2/3"></div>
          <div className="h-3 bg-surface-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={menuRef}>

      {/* PROFILE PILL */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-full hover:bg-surface transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-surface-muted flex items-center justify-center">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-sm text-text-muted uppercase">
              {profile.username?.charAt(0)}
            </span>
          )}
        </div>

        {/* Name + Handle */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-white truncate leading-tight">
            {profile.display_name || profile.username}
          </p>
          <p className="text-text-muted text-[14px] truncate leading-tight">
            @{profile.username}
          </p>
        </div>

        {/* Three dots */}
        <svg className="w-5 h-5 shrink-0 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {/* POPUP MENU */}
      {isMenuOpen && (
        <div className="absolute bottom-16 left-2 right-2 bg-zinc-950 border border-border-subtle rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2">

          <div className="px-4 py-3 border-b border-border-subtle mb-2 flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-surface-muted flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-text-muted uppercase">
                  {profile.username?.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="font-bold text-white truncate leading-tight">
                {profile.display_name || profile.username}
              </p>
              <p className="text-text-muted text-sm truncate leading-tight">
                @{profile.username}
              </p>
            </div>
          </div>

                    <Link
            href={`/${profile.username}`}
            onClick={() => setIsMenuOpen(false)}
            className="block w-full text-left px-4 py-3 text-[15px] font-medium text-zinc-200 hover:bg-surface-hover transition"
          >
            Profile
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-3 text-[15px] font-medium text-zinc-200 hover:bg-surface-hover transition"
          >
            Create new account
          </button>

          <div className="h-px bg-border-subtle my-2"></div>

          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-3 text-[15px] font-bold text-red-500 hover:bg-red-500/10 transition"
          >
            Log out @{profile.username}
          </button>
        </div>
      )}
    </div>
  );
}