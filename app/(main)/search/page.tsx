'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import Link from 'next/link';



export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getSession();
      if (data.session) setCurrentUserId(data.session.user.id);
    }
    getUser();
  }, []);

  // The Debounce Engine
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      searchUsers();
    }, 300); 

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  async function searchUsers() {
    setIsSearching(true);
    
    let dbQuery = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    if (currentUserId) {
      dbQuery = dbQuery.neq('id', currentUserId);
    }

    const { data } = await dbQuery;
    if (data) setResults(data);
    
    setIsSearching(false);
  }

  return (
  <div className="min-h-screen bg-background text-white flex flex-col font-sans w-full">
      
      
     {/* SEARCH HEADER */}
<div className="sticky top-4 z-40 bg-background backdrop-blur-md border-b border-border-subtle pt-4 px-4 pb-6 flex items-center gap-3">
      
        

        <div className="relative flex-1">
          <svg className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for people or handles..."
            className="w-full bg-surface border border-border-subtle rounded-full pl-12 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors shadow-inner"
            autoFocus
          />
        </div>
      </div>

      {/* DYNAMIC RESULTS CANVAS */}
     <div className="flex flex-col">
        {isSearching ? (
          <div className="flex flex-col w-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 border-b border-border-subtle flex gap-4 items-start animate-pulse">
                <div className="w-12 h-12 rounded-full bg-surface-muted shrink-0"></div>
                <div className="flex-1 space-y-2.5 mt-1">
                  <div className="h-4 bg-surface-muted rounded w-1/4"></div>
                  <div className="h-3 bg-surface-muted rounded w-1/5"></div>
                  <div className="h-3 bg-surface-muted rounded w-3/4 mt-3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          results.map((user) => (
            <Link 
              key={user.id} 
              href={`/${user.username}`} 
              className="p-5 border-b border-border-subtle hover:bg-surface transition flex gap-4 items-start cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-surface-muted overflow-hidden shrink-0 border border-border-subtle">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand text-background font-bold uppercase text-lg">
                    {user.username.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{user.display_name || user.username}</p>
                <p className="text-text-muted text-sm truncate">@{user.username}</p>
                {user.bio && (
                  <p className="mt-2 text-[15px] text-zinc-300 line-clamp-2 leading-snug">
                    {user.bio}
                  </p>
                )}
              </div>
            </Link>
          ))
        ) : query.trim() ? (
          <div className="p-12 text-center text-text-muted">
            <p className="text-lg font-bold text-zinc-300 mb-1">No results found</p>
            <p className="text-sm">We couldn't find anyone matching "{query}"</p>
          </div>
        ) : (
          <div className="p-16 text-center text-text-muted flex flex-col items-center">
            <svg className="w-12 h-12 mx-auto text-zinc-800 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <p className="text-lg font-medium text-text-muted">Discover your network</p>
            <p className="text-sm mt-2 max-w-sm">Search for users by name or handle to build your following feed.</p>
          </div>
        )}
      </div>

    </div>
  );
}