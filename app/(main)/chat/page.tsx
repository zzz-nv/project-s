'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/supabase';
import { loadInbox } from '@/lib/loadInbox';

// Smart timestamp: "now" → "5m" → "3h" → "3d" → "Sep 27"
function formatTime(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatInboxPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inboxFilter, setInboxFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: loadInbox,
  });

  const currentUserId = data?.currentUserId ?? null;
  const conversations = data?.conversations ?? [];

  const setInboxData = (updater: (prev: any) => any) => {
    queryClient.setQueryData(['inbox'], (prev: any) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  // Realtime — writes to cache directly, never invalidates
  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `inbox_${currentUserId}_${Date.now()}`;
    const inboxSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new;

          setInboxData((prev) => {
            const exists = prev.conversations.some((c: any) => c.conversation_id === newMessage.conversation_id);

            if (exists) {
              const updated = prev.conversations.map((chat: any) => {
                if (chat.conversation_id === newMessage.conversation_id) {
                  return {
                    ...chat,
                    conversations: {
                      updated_at: newMessage.created_at,
                      last_message: newMessage.content,
                      last_sender_id: newMessage.sender_id,
                    },
                  };
                }
                return chat;
              });

              return {
                ...prev,
                conversations: updated.sort((a: any, b: any) => {
                  const dateA = new Date(a.conversations?.updated_at || 0).getTime();
                  const dateB = new Date(b.conversations?.updated_at || 0).getTime();
                  return dateB - dateA;
                }),
              };
            }

            fetchNewChatRoom(newMessage.conversation_id, currentUserId);
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'participants', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          setInboxData((prev) => ({
            ...prev,
            conversations: prev.conversations.map((c: any) =>
              c.conversation_id === payload.new.conversation_id
                ? { ...c, my_last_read: payload.new.last_read_at }
                : c
            ),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inboxSubscription);
    };
  }, [currentUserId]);

  async function fetchNewChatRoom(conversationId: string, userId: string) {
    const { data: amIInIt } = await supabase
      .from('participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!amIInIt) return;

    const { data: newPartner } = await supabase
      .from('participants')
      .select(`
        conversation_id,
        conversations ( updated_at, last_message, last_sender_id ),
        profiles ( id, username, display_name, avatar_url )
      `)
      .eq('conversation_id', conversationId)
      .neq('user_id', userId)
      .single();

    if (newPartner) {
      setInboxData((prev) => {
        if (prev.conversations.some((c: any) => c.conversation_id === conversationId)) return prev;
        return { ...prev, conversations: [{ ...newPartner, my_last_read: null }, ...prev.conversations] };
      });
    }
  }

  // Search for new chat (modal)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function performSearch() {
      if (debouncedQuery.trim().length === 0) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);

      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${debouncedQuery.replace('@', '')}%`)
        .neq('id', currentUserId)
        .limit(8);

      setSearchResults(data || []);
      setIsSearching(false);
    }
    if (currentUserId) performSearch();
  }, [debouncedQuery, currentUserId]);

  async function startChatWithUser(targetId: string) {
    if (!currentUserId) return;

    const existingChat = conversations.find((c: any) => c.profiles.id === targetId);
    if (existingChat) {
      closeModal();
      router.push(`/chat/${existingChat.conversation_id}`);
      return;
    }

    const { data: newChatId, error: chatError } = await supabase
      .rpc('create_new_chat', { other_user_id: targetId });

    if (chatError || !newChatId) {
      console.error("FATAL: RPC failed to create room:", chatError);
      alert("Failed to start conversation.");
      return;
    }

    closeModal();
    router.push(`/chat/${newChatId}`);
  }

  function closeModal() {
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  // Filter existing conversations by the inbox search bar
  const filteredConversations = useMemo(() => {
    if (!inboxFilter.trim()) return conversations;
    const q = inboxFilter.toLowerCase().trim();
    return conversations.filter((c: any) => {
      const name = (c.profiles.display_name || '').toLowerCase();
      const username = (c.profiles.username || '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [conversations, inboxFilter]);

  return (
    <div className="min-h-full relative flex flex-col">

            {/* HEADER */}
           <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md shrink-0 border-b border-border-subtle">
        {showSearch ? (
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                value={inboxFilter}
                onChange={(e) => setInboxFilter(e.target.value)}
                placeholder="Search messages"
                className="w-full bg-surface border border-border-subtle rounded-full pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <button
              onClick={() => { setShowSearch(false); setInboxFilter(''); }}
              className="text-sm font-bold text-brand hover:text-brand-hover transition-colors px-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="relative px-5 py-4 flex items-center justify-center">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            <div className="absolute right-5 flex items-center gap-1">
              <button
                onClick={() => setShowSearch(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors text-foreground"
                aria-label="Search messages"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors text-foreground"
                aria-label="New message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INBOX */}
        <div className="flex flex-col flex-1 pb-20 pt-3">
        {isLoading ? (
          <div className="flex flex-col w-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle animate-pulse">
                <div className="w-12 h-12 rounded-full bg-surface-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-muted rounded w-1/3" />
                  <div className="h-3 bg-surface-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-8 py-16 flex flex-col items-center text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No messages yet</h2>
            <p className="text-text-muted text-sm mb-6 leading-relaxed">
              Start a conversation with someone you follow.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand hover:bg-brand-hover text-white font-bold rounded-full px-6 py-2.5 text-sm transition-colors active:scale-95"
            >
              Write a message
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="text-text-muted text-sm">No conversations match "{inboxFilter}"</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredConversations.map((chat: any) => {
                const isUnread =
                chat.conversations?.last_sender_id !== currentUserId &&
                new Date(chat.conversations?.updated_at) > new Date(chat.my_last_read || 0);

             

              return (
                <Link
                  key={chat.conversation_id}
                  href={`/chat/${chat.conversation_id}`}
                                    className="flex items-start gap-3 px-5 py-3.5 mx-2 rounded-xl hover:bg-brand/15 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-text-muted font-bold overflow-hidden shrink-0">
                    {chat.profiles.avatar_url ? (
                      <img src={chat.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      chat.profiles.username.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row: name, handle, timestamp */}
                    <div className="flex items-baseline gap-1.5">
                      <span className={`truncate ${isUnread ? 'font-bold text-white' : 'font-semibold text-foreground'}`}>
                        {chat.profiles.display_name || chat.profiles.username}
                      </span>
                      <span className="text-text-muted text-sm truncate">
                        @{chat.profiles.username}
                      </span>
                      <span className={`text-xs whitespace-nowrap ml-auto ${isUnread ? 'text-brand font-bold' : 'text-text-muted'}`}>
                        {formatTime(chat.conversations?.updated_at)}
                      </span>
                    </div>

                    {/* Bottom row: preview + unread dot */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-sm truncate flex-1 ${isUnread ? 'text-zinc-200 font-medium' : 'text-text-muted'}`}>
                        {chat.conversations?.last_message || 'Start the conversation'}
                      </span>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-brand shrink-0" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW MESSAGE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border-subtle w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-foreground">New message</h2>
              <button onClick={closeModal} className="text-text-muted hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-full px-4 py-2 focus-within:border-brand transition-colors">
                <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  placeholder="Search people"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-foreground placeholder:text-text-muted w-full text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
              {isSearching ? (
                <div className="p-5 text-center text-text-muted text-sm">Searching…</div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startChatWithUser(user.id)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface transition-colors w-full text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-text-muted font-bold overflow-hidden shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-bold text-foreground text-sm truncate">
                          {user.display_name || user.username}
                        </span>
                        <span className="text-text-muted text-sm truncate">@{user.username}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim().length > 0 ? (
                <div className="p-5 text-center text-text-muted text-sm">No accounts found</div>
              ) : (
                <div className="p-5 text-center text-text-muted text-sm">Type a name to search</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}