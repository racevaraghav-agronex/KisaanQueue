import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationItem } from '../types.ts';
import { useAuth } from './AuthContext.tsx';
import { safeFetchJson } from '../utils/api.ts';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const url = `/api/notifications?limit=30${unreadOnly ? '&unreadOnly=true' : ''}`;
      const res = await safeFetchJson<{
        notifications: NotificationItem[];
        total: number;
        unreadCount: number;
      }>(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(typeof res.data.unreadCount === 'number' ? res.data.unreadCount : 0);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  // Fast unread count poll
  const pollUnreadCount = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await safeFetchJson<{ unreadCount: number }>('/api/notifications/unread-count', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok && res.data) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Quiet poll failure
    }
  }, [token, user]);

  // Initial fetch and polling loop
  useEffect(() => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Poll unread count every 15 seconds
    const interval = setInterval(() => {
      pollUnreadCount();
    }, 15000);

    return () => clearInterval(interval);
  }, [token, user, fetchNotifications, pollUnreadCount]);

  const markAsRead = async (id: string) => {
    if (!token) return;

    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await safeFetchJson(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await safeFetchJson('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn('Failed to mark all read:', err);
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    if (!token) return;

    const target = notifications.find(n => n._id === id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (target && !target.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await safeFetchJson(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn('Failed to delete notification:', err);
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
