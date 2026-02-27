
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

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

export const notificationService = {
  getMyNotifications: async () => {
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting current user for notifications:', formatError(userError));
        return [];
      }

      const user = data?.user;
      if (!user) {
        return [];
      }

      const { data: rows, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', formatError(error));
        return [];
      }

      if (!rows) {
        return [];
      }

      return rows.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        createdAt: n.created_at,
      }));
    } catch (err) {
      console.error('Unexpected error in getMyNotifications:', formatError(err));
      return [];
    }
  },

  markAsRead: async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', formatError(error));
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting current user for markAllAsRead:', formatError(userError));
        return;
      }

      const user = data?.user;
      if (!user) {
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking all notifications as read:', formatError(error));
        throw error;
      }
    } catch (err) {
      console.error('Unexpected error in markAllAsRead:', formatError(err));
    }
  },

  createNotification: async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    // Basic UUID validation to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      console.warn('Invalid userId for notification:', userId);
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
      });

    if (error) {
      console.error('Error creating notification:', formatError(error));
    }
  }
};
