'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabase';

export default function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscription: any;

    async function loadThread() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        router.push('/login');
        return;
      }
      setCurrentUserId(userId);

      // Mark as read so the inbox badge clears
      await supabase
        .from('participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', chatId)
        .eq('user_id', userId);

      const { data: participants } = await supabase
        .from('participants')
        .select('user_id, profiles(username, display_name, avatar_url)')
        .eq('conversation_id', chatId);

      if (!participants || participants.length === 0) {
        setIsLoading(false);
        return;
      }

      const otherUser = participants.find(p => p.user_id !== userId);
      if (otherUser) setPartner(otherUser.profiles);

      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: true });

      if (history) setMessages(history);
      setIsLoading(false);

      subscription = supabase
        .channel(`chat_${chatId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${chatId}`
          },
          (payload) => {
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        )
        .subscribe();
    }

    loadThread();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [chatId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !currentUserId) return;

    const textToSend = inputText.trim();
    setInputText('');

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      conversation_id: chatId,
      sender_id: currentUserId,
      content: textToSend,
      created_at: new Date().toISOString()
    }]);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: chatId,
        sender_id: currentUserId,
        content: textToSend
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error("FATAL SEND ERROR:", error);
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      setInputText(textToSend);
    } else if (data) {
      setMessages((prev) => prev.map(msg =>
        msg.id === tempId ? { ...msg, id: data.id, created_at: data.created_at } : msg
      ));
    }
  }

  async function handleBack() {
    if (currentUserId) {
      await supabase.rpc('mark_chat_read', { p_chat_id: chatId });
    }
    router.refresh();
    router.push(`/chat?r=${Date.now()}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen border-x border-border-subtle items-center justify-center">
        <div className="animate-pulse text-text-muted font-bold">Connecting...</div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 h-screen flex flex-col bg-background z-10 w-full">

      {/* HEADER */}
      <div className="shrink-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-subtle px-4 py-3 flex items-center gap-6">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-full hover:bg-surface-muted flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {partner && (
          <Link href={`/${partner.username}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center overflow-hidden shrink-0 group-hover:brightness-90 transition-all">
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-text-muted font-bold">{partner.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col leading-tight">
              <h2 className="text-lg font-bold text-foreground">
                {partner.display_name || partner.username}
              </h2>
              <span className="text-text-muted text-sm">@{partner.username}</span>
            </div>
          </Link>
        )}
      </div>

      {/* MESSAGE HISTORY */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col-reverse gap-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          [...messages].reverse().map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex items-end gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && partner && (
                  <Link href={`/${partner.username}`} className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center overflow-hidden hover:brightness-90 transition-all cursor-pointer">
                      {partner.avatar_url ? (
                        <img src={partner.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-text-muted">{partner.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </Link>
                )}

                <div className={`px-4 py-2.5 max-w-[75%] break-words flex flex-col ${
                  isMine
                    ? 'bg-brand text-white rounded-2xl rounded-br-sm'
                    : 'bg-surface-muted text-foreground rounded-2xl rounded-bl-sm'
                }`}>
                  <span className="leading-relaxed">{msg.content}</span>

                  {msg.created_at && (
                    <span className={`text-[10px] mt-1 text-right select-none ${
                      isMine ? 'text-white/70' : 'text-text-muted'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* INPUT BAR */}
      <form onSubmit={sendMessage} className="shrink-0 p-3 border-t border-border-subtle bg-background">
        <div className="flex items-center gap-3 bg-surface-muted rounded-full px-4 py-2 focus-within:ring-1 ring-brand transition-shadow">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message"
            className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-text-muted py-1"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="text-brand hover:text-brand-hover p-1 transition-colors disabled:opacity-50 disabled:hover:text-brand"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>

    </div>
  );
}