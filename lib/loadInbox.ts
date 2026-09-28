import { supabase } from '@/app/supabase';

export interface InboxPayload {
  currentUserId: string;
  conversations: any[];
}

export async function loadInbox(): Promise<InboxPayload | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  // 1. Get your chats + your personal last_read_at
    const { data: myChats } = await supabase
    .from('participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)
    .is('hidden_at', null);

  const chatIds = myChats?.map(c => c.conversation_id) || [];

  if (chatIds.length === 0) {
    return { currentUserId: userId, conversations: [] };
  }

  // 2. Get the other participants + conversation metadata
  const { data: partners } = await supabase
    .from('participants')
    .select(`
      conversation_id,
      conversations ( updated_at, last_message, last_sender_id ),
      profiles ( id, username, display_name, avatar_url )
    `)
    .in('conversation_id', chatIds)
    .neq('user_id', userId);

  if (!partners) {
    return { currentUserId: userId, conversations: [] };
  }

  // 3. Merge your read status, then sort by updated_at
  const merged = partners
    .map((partner: any) => {
      const myRecord = myChats?.find(m => m.conversation_id === partner.conversation_id);
      return { ...partner, my_last_read: myRecord?.last_read_at };
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.conversations?.updated_at || 0).getTime();
      const dateB = new Date(b.conversations?.updated_at || 0).getTime();
      return dateB - dateA;
    });

  return { currentUserId: userId, conversations: merged };
}