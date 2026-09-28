import { supabase } from '@/app/supabase';

export interface ChatPayload {
  currentUserId: string;
  partner: any;
  messages: any[];
}

export async function loadChat(chatId: string): Promise<ChatPayload | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const [participantsRes, messagesRes] = await Promise.all([
    supabase
      .from('participants')
      .select('user_id, profiles(username, display_name, avatar_url)')
      .eq('conversation_id', chatId),
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true }),
  ]);

  const participants = participantsRes.data || [];
  if (participants.length === 0) return null;

  const otherUser = participants.find((p) => p.user_id !== userId);

  return {
    currentUserId: userId,
    partner: otherUser?.profiles || null,
    messages: messagesRes.data || [],
  };
}