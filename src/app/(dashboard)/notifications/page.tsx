'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notificationService, type Notification } from '@/services/notificationService';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getMyNotifications();
        setNotifications(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load notifications.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
    }
  };

  const getStatusLabel = (notification: Notification) => {
    if (!notification.isRead) return 'Pending';
    if (notification.title === 'Update 100-Point ID Documents') return 'Completed';
    return 'Read';
  };

  const getStatusClasses = (status: string) => {
    if (status === 'Pending') return 'bg-amber-100 text-amber-800';
    if (status === 'Completed') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-700';
  };

  const getAction = (notification: Notification) => {
    if (
      notification.title === 'Complete 100-Point ID Check' ||
      notification.title === 'Update 100-Point ID Documents'
    ) {
      return {
        label: 'Review 100-Point ID Documents',
        href: '/self-service/id-check'
      };
    }
    if (notification.title === 'ID Documents Resubmitted') {
      return {
        label: 'Review in Onboarding',
        href: '/employees/onboarding'
      };
    }
    if (notification.title === 'New Course Assigned') {
      return {
        label: 'View Learning',
        href: '/talent/learning'
      };
    }
    return null;
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading notifications...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            View messages and alerts from HR, managers, and the system.
          </p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500 text-sm">
          You have no notifications yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {notifications.map(notification => {
            const statusLabel = getStatusLabel(notification);
            const statusClasses = getStatusClasses(statusLabel);
            const action = getAction(notification);
            return (
              <div
                key={notification.id}
                className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses}`}
                    >
                      {statusLabel}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {notification.title}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-xs font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
                    >
                      Mark as read
                    </button>
                  )}
                  {action && (
                    <Link
                      href={action.href}
                      className="text-xs font-medium rounded-md px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {action.label}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

