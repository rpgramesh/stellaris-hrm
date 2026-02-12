
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  // Fetch notifications for the current user
  getMyNotifications: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  },

  // Mark a notification as read
  markAsRead: async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // Create a notification (system use)
  createNotification: async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
      });

    if (error) console.error('Error creating notification:', error);
  }
};
