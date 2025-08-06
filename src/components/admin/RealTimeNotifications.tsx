import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, AlertCircle, Info, Clock, X, Wifi, WifiOff, Users, ShoppingCart, Package, AlertTriangle, TrendingUp, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeNotifications, Notification } from '../../hooks/useRealTimeNotifications';

const RealTimeNotifications: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
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
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'order_update':
        return <ShoppingCart className="w-5 h-5 text-green-500" />;
      case 'low_stock':
        return <Package className="w-5 h-5 text-yellow-500" />;
      case 'system_alert':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'analytics_milestone':
        return <TrendingUp className="w-5 h-5 text-purple-500" />;
      case 'content_submission':
        return <Info className="w-5 h-5 text-indigo-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
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
          return 'bg-red-50 border-l-red-400';
        case 'low_stock':
          return 'bg-yellow-50 border-l-yellow-400';
        case 'order_update':
          return 'bg-green-50 border-l-green-400';
        case 'new_user':
          return 'bg-blue-50 border-l-blue-400';
        case 'analytics_milestone':
          return 'bg-purple-50 border-l-purple-400';
        default:
          return 'bg-indigo-50 border-l-indigo-400';
      }
    }
    return 'bg-white border-l-neutral-200';
  };

  // Get notification priority
  const getNotificationPriority = (type: Notification['type']) => {
    switch (type) {
      case 'system_alert': return 1;
      case 'low_stock': return 2;
      case 'order_update': return 3;
      case 'analytics_milestone': return 4;
      case 'new_user': return 5;
      default: return 6;
    }
  };

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      if (selectedCategory !== 'all' && notification.type !== selectedCategory) return false;
      if (showUnreadOnly && notification.read) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by read status first (unread first), then by priority, then by timestamp
      if (a.read !== b.read) return a.read ? 1 : -1;
      const priorityDiff = getNotificationPriority(a.type) - getNotificationPriority(b.type);
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

  // Get category counts
  const categoryCounts = notifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categories = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'system_alert', label: 'System', count: categoryCounts.system_alert || 0, color: 'text-red-600' },
    { id: 'order_update', label: 'Orders', count: categoryCounts.order_update || 0, color: 'text-green-600' },
    { id: 'low_stock', label: 'Stock', count: categoryCounts.low_stock || 0, color: 'text-yellow-600' },
    { id: 'new_user', label: 'Users', count: categoryCounts.new_user || 0, color: 'text-blue-600' },
    { id: 'analytics_milestone', label: 'Analytics', count: categoryCounts.analytics_milestone || 0, color: 'text-purple-600' }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Enhanced Notification Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 hover:bg-neutral-100 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 group"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-neutral-600 group-hover:text-neutral-800 transition-colors" />
        
        {/* Enhanced Unread Count Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[22px] h-6 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center px-1.5 font-bold shadow-lg"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Status Indicator */}
        <div className="absolute -bottom-1 -right-1">
          <motion.div
            animate={{ scale: isConnected ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 2, repeat: isConnected ? Infinity : 0 }}
          >
            {isConnected ? (
              <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
            ) : (
              <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
            )}
          </motion.div>
        </div>
      </motion.button>

      {/* Enhanced Notifications Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-3 w-96 bg-white border border-neutral-200 rounded-2xl shadow-2xl z-50 max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Enhanced Header */}
            <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">Notifications</h3>
                    <p className="text-sm text-neutral-600">
                      {unreadCount} unread of {notifications.length} total
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      <Wifi className="w-3 h-3" />
                      <span>Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">
                      <WifiOff className="w-3 h-3" />
                      <span>Offline</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                    }`}
                  >
                    <span>{category.label}</span>
                    {category.count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        selectedCategory === category.id
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}>
                        {category.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      showUnreadOnly
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Unread Only
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:text-primary-dark transition-colors font-medium px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 hover:text-red-700 transition-colors font-medium px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>

            {/* Connection Error */}
            {connectionError && (
              <div className="p-4 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{connectionError}</span>
                </div>
              </div>
            )}

            {/* Enhanced Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 hover:bg-neutral-50 cursor-pointer transition-all duration-200 border-l-4 ${getNotificationBg(notification)} group`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-neutral-900 text-sm">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                )}
                              </div>
                              <p className="text-sm text-neutral-600 leading-relaxed">
                                {notification.message}
                              </p>
                            </div>
                          </div>

                          {/* Enhanced Notification Data Display */}
                          {notification.data && (
                            <div className="mt-3 p-3 bg-white/80 rounded-lg border border-neutral-200">
                              {notification.type === 'order_update' && notification.data.total && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-neutral-600">Order Value:</span>
                                  <span className="text-sm font-bold text-green-600">
                                    KES {notification.data.total.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {notification.type === 'low_stock' && notification.data.stock !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-neutral-600">Stock Level:</span>
                                  <span className={`text-sm font-bold ${
                                    notification.data.stock === 0 ? 'text-red-600' : 'text-yellow-600'
                                  }`}>
                                    {notification.data.stock} units
                                  </span>
                                </div>
                              )}
                              {notification.type === 'analytics_milestone' && notification.data.value && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-neutral-600">Milestone:</span>
                                  <span className="text-sm font-bold text-purple-600">
                                    {notification.data.type === 'large_order' ? 'Large Order' : notification.data.value}
                                  </span>
                                </div>
                              )}
                              {notification.type === 'new_user' && notification.data.role && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-neutral-600">Role:</span>
                                  <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                                    notification.data.role === 'admin' ? 'bg-red-100 text-red-700' :
                                    notification.data.role === 'worker' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {notification.data.role.charAt(0).toUpperCase() + notification.data.role.slice(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1 text-xs text-neutral-500">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeAgo(notification.timestamp)}</span>
                            </div>
                            
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:text-primary-dark font-medium transition-all px-2 py-1 bg-primary/10 rounded-lg hover:bg-primary/20"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-neutral-300" />
                  </div>
                  <p className="font-medium text-lg mb-2">
                    {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
                  </p>
                  <p className="text-sm">
                    {showUnreadOnly 
                      ? 'All caught up! Check back later for updates.' 
                      : 'You\'re all caught up! New notifications will appear here.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100">
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <div className="flex items-center gap-4">
                    <span>{filteredNotifications.length} of {notifications.length} shown</span>
                    <div className="flex items-center gap-1">
                      {isConnected ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-600 font-medium">Live updates active</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-600 font-medium">Reconnecting...</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-neutral-500">
                    Last updated: {new Date().toLocaleTimeString()}
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