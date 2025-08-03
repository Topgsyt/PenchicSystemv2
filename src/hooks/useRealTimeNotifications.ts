import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  type: 'new_user' | 'order_update' | 'system_alert' | 'low_stock' | 'content_submission' | 'analytics_milestone';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface UseRealTimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  isConnected: boolean;
  connectionError: string | null;
}

export const useRealTimeNotifications = (): UseRealTimeNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const subscriptionsRef = useRef<any[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttempts = useRef(0);

  // Load persisted notifications from localStorage
  const loadPersistedNotifications = useCallback(() => {
    try {
      const stored = localStorage.getItem('admin_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        const notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading persisted notifications:', error);
    }
  }, []);

  // Persist notifications to localStorage
  const persistNotifications = useCallback((notifications: Notification[]) => {
    try {
      localStorage.setItem('admin_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error persisting notifications:', error);
    }
  }, []);

  // Add new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep only last 50 notifications
      persistNotifications(updated);
      return updated;
    });

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: newNotification.id
      });
    }
  }, [persistNotifications]);

  // Setup real-time subscriptions
  const setupSubscriptions = useCallback(() => {
    try {
      // Clear existing subscriptions
      subscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
      subscriptionsRef.current = [];

      // Subscribe to new user registrations
      const profilesSubscription = supabase
        .channel('profiles_changes')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'profiles' },
          (payload) => {
            addNotification({
              type: 'new_user',
              title: 'New User Registration',
              message: `${payload.new.email} has registered as a ${payload.new.role}`,
              data: payload.new
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionError(null);
            reconnectAttempts.current = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            handleReconnection();
          }
        });

      // Subscribe to order updates
      const ordersSubscription = supabase
        .channel('orders_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            const eventType = payload.eventType;
            const order = payload.new || payload.old;
            
            let message = '';
            if (eventType === 'INSERT') {
              message = `New order #${order.id.slice(0, 8)} received`;
            } else if (eventType === 'UPDATE') {
              message = `Order #${order.id.slice(0, 8)} status updated to ${order.status}`;
            }

            if (message) {
              addNotification({
                type: 'order_update',
                title: 'Order Update',
                message,
                data: order
              });
            }
          }
        )
        .subscribe();

      // Subscribe to low stock alerts
      const productsSubscription = supabase
        .channel('products_changes')
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'products' },
          (payload) => {
            const product = payload.new;
            if (product.stock <= 5 && product.stock > 0) {
              addNotification({
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `${product.name} is running low (${product.stock} units left)`,
                data: product
              });
            } else if (product.stock === 0) {
              addNotification({
                type: 'system_alert',
                title: 'Out of Stock',
                message: `${product.name} is now out of stock`,
                data: product
              });
            }
          }
        )
        .subscribe();

      // Subscribe to analytics milestones (simulated for demo)
      const analyticsSubscription = supabase
        .channel('analytics_changes')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            // Simulate analytics milestone notifications
            const order = payload.new;
            if (order.total >= 10000) { // Milestone for large orders
              addNotification({
                type: 'analytics_milestone',
                title: 'Large Order Received',
                message: `High-value order of KES ${order.total.toLocaleString()} received`,
                data: { value: order.total, type: 'large_order' }
              });
            }
          }
        )
        .subscribe();
      subscriptionsRef.current = [profilesSubscription, ordersSubscription, productsSubscription, analyticsSubscription];

    } catch (error) {
      console.error('Error setting up subscriptions:', error);
      setConnectionError('Failed to establish real-time connection');
      handleReconnection();
    }
  }, [addNotification]);

  // Handle reconnection logic
  const handleReconnection = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionError('Unable to establish real-time connection after multiple attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      setConnectionError(`Reconnecting... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
      setupSubscriptions();
    }, delay);
  }, [setupSubscriptions]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('admin_notifications');
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadPersistedNotifications();
    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      subscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadPersistedNotifications, setupSubscriptions]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isConnected,
    connectionError
  };
};