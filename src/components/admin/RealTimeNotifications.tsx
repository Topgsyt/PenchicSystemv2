import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, AlertCircle, Info, Clock, X, Wifi, WifiOff, Users, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeNotifications, Notification } from '../../hooks/useRealTimeNotifications';

const RealTimeNotifications: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isConnected,
    connectionError
  } = useRealTimeNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_user':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'order_update':
        return <ShoppingCart className="w-4 h-4 text-green-500" />;
      case 'low_stock':
        return <Package className="w-4 h-4 text-yellow-500" />;
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'content_submission':
        return <Info className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Get notification background color
  const getNotificationBg = (notification: Notification) => {
    if (!notification.read) {
      switch (notification.type) {
        case 'system_alert':
          return 'bg-red-50 border-red-100';
        case 'low_stock':
          return 'bg-yellow-50 border-yellow-100';
        case 'order_update':
          return 'bg-green-50 border-green-100';
        case 'new_user':
          return 'bg-blue-50 border-blue-100';
        default:
          return 'bg-purple-50 border-purple-100';
      }
    }
    return 'bg-white border-neutral-100';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-neutral-600" />
        
        {/* Unread Count Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Connection Status Indicator */}
        <div className="absolute -bottom-1 -right-1">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500" />
          )}
        </div>
      </motion.button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-neutral-900">Notifications</h3>
                {!isConnected && (
                  <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    <WifiOff className="w-3 h-3" />
                    <span className="hidden sm:inline">Offline</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-primary-dark transition-colors font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Connection Error */}
            {connectionError && (
              <div className="p-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{connectionError}</span>
                </div>
              </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto max-h-96">
              {notifications.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors border-l-4 ${getNotificationBg(notification)}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-neutral-900 text-sm truncate">
                                {notification.title}
                              </p>
                              <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-neutral-500 mt-2">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(notification.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{notifications.length} total notifications</span>
                  <div className="flex items-center gap-1">
                    {isConnected ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Live updates</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Reconnecting...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealTimeNotifications;