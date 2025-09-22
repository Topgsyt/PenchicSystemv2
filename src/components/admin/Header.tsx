import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Menu, 
  Sun, 
  Moon, 
  User, 
  Settings, 
  LogOut,
  X,
  Check,
  AlertCircle,
  Info,
  Clock,
  ChevronDown,
  Bell,
  Package,
  ShoppingCart,
  Users,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMobileMenuToggle: () => void;
  title?: string;
  subtitle?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface SearchResult {
  id: string;
  type: 'order' | 'user' | 'product';
  title: string;
  subtitle: string;
  url: string;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle, title, subtitle }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();
  
  const accountRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enhanced notification system
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }

    // Show toast notification for immediate feedback
    showToastNotification(newNotification);
  };

  // Enhanced toast notification system
  const showToastNotification = (notification: Notification) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-4 z-[9999] p-4 rounded-xl shadow-2xl max-w-sm transform transition-all duration-500 border-l-4 ${
      notification.type === 'success' ? 'bg-green-50 text-green-800 border-green-500' :
      notification.type === 'error' ? 'bg-red-50 text-red-800 border-red-500' :
      notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-yellow-500' :
      'bg-blue-50 text-blue-800 border-blue-500'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 mt-0.5">
          ${notification.type === 'success' ? '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>' :
            notification.type === 'error' ? '<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>' :
            notification.type === 'warning' ? '<svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>' :
            '<svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
          }
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm mb-1">${notification.title}</div>
          <div class="text-sm">${notification.message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 text-current opacity-70 hover:opacity-100">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
        </button>
      </div>
    `;
    
    // Set initial position off-screen
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 100);
    
    // Auto-remove after duration based on type
    const duration = notification.type === 'error' ? 8000 : 
                   notification.type === 'warning' ? 6000 : 4000;
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 500);
      }
    }, duration);
  };

  // Listen for POS notifications with enhanced handling
  useEffect(() => {
    const handlePOSNotification = (event: any) => {
      console.log('POS Notification received:', event.detail);
      
      addNotification({
        type: event.detail.type || 'info',
        title: event.detail.title || 'POS Notification',
        message: event.detail.message || 'Action completed',
        data: event.detail
      });
    };

    // Listen for discount notifications
    const handleDiscountNotification = (event: any) => {
      console.log('Discount Notification received:', event.detail);
      
      addNotification({
        type: event.detail.type || 'info',
        title: event.detail.title || 'Discount Update',
        message: event.detail.message || 'Discount action completed',
        data: event.detail
      });
    };

    // Listen for shop notifications
    const handleShopNotification = (event: any) => {
      console.log('Shop Notification received:', event.detail);
      
      addNotification({
        type: event.detail.type || 'info',
        title: event.detail.title || 'Shop Update',
        message: event.detail.message || 'Shop action completed',
        data: event.detail
      });
    };

    window.addEventListener('posNotification', handlePOSNotification);
    window.addEventListener('discountNotification', handleDiscountNotification);
    window.addEventListener('shopNotification', handleShopNotification);
    
    return () => {
      window.removeEventListener('posNotification', handlePOSNotification);
      window.removeEventListener('discountNotification', handleDiscountNotification);
      window.removeEventListener('shopNotification', handleShopNotification);
    };
  }, []);

  // Real-time notifications setup with enhanced error handling
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        console.log('Setting up real-time notifications...');

        // Subscribe to new orders with enhanced handling
        const ordersSubscription = supabase
          .channel('orders_changes')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => {
              console.log('New order received:', payload);
              addNotification({
                type: 'success',
                title: 'New Order Received',
                message: `Order #${payload.new.id.slice(0, 8)} - KES ${payload.new.total.toLocaleString()}`,
                data: payload.new
              });
            }
          )
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            (payload) => {
              console.log('Order updated:', payload);
              addNotification({
                type: 'info',
                title: 'Order Status Updated',
                message: `Order #${payload.new.id.slice(0, 8)} is now ${payload.new.status}`,
                data: payload.new
              });
            }
          )
          .subscribe((status) => {
            console.log('Orders subscription status:', status);
            setIsConnected(status === 'SUBSCRIBED');
          });

        // Subscribe to stock updates with enhanced alerts
        const productsSubscription = supabase
          .channel('products_changes')
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'products' },
            (payload) => {
              console.log('Product updated:', payload);
              const product = payload.new;
              
              if (product.stock <= 0) {
                addNotification({
                  type: 'error',
                  title: 'Out of Stock Alert',
                  message: `${product.name} is now out of stock`,
                  data: product
                });
              } else if (product.stock <= 5) {
                addNotification({
                  type: 'warning',
                  title: 'Low Stock Alert',
                  message: `${product.name} is running low (${product.stock} units left)`,
                  data: product
                });
              }
            }
          )
          .subscribe((status) => {
            console.log('Products subscription status:', status);
          });

        // Subscribe to new user registrations
        const profilesSubscription = supabase
          .channel('profiles_changes')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'profiles' },
            (payload) => {
              console.log('New user registered:', payload);
              addNotification({
                type: 'info',
                title: 'New User Registration',
                message: `${payload.new.email} registered as ${payload.new.role}`,
                data: payload.new
              });
            }
          )
          .subscribe((status) => {
            console.log('Profiles subscription status:', status);
          });

        return () => {
          console.log('Cleaning up subscriptions...');
          ordersSubscription.unsubscribe();
          productsSubscription.unsubscribe();
          profilesSubscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up notifications:', error);
        setIsConnected(false);
      }
    };

    const cleanup = setupNotifications();
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn?.());
      }
    };
  }, [user]);

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Global search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // Search orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, profiles(email)')
        .ilike('id', `%${query}%`)
        .limit(3);

      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, role')
        .ilike('email', `%${query}%`)
        .limit(3);

      // Search products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, category')
        .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(3);

      const results: SearchResult[] = [];

      // Add order results
      orders?.forEach(order => {
        results.push({
          id: order.id,
          type: 'order',
          title: `Order #${order.id.slice(0, 8)}`,
          subtitle: `KES ${order.total.toLocaleString()} - ${order.profiles?.email}`,
          url: `/admin/orders`
        });
      });

      // Add user results
      users?.forEach(user => {
        results.push({
          id: user.id,
          type: 'user',
          title: user.email,
          subtitle: `Role: ${user.role}`,
          url: `/admin/users`
        });
      });

      // Add product results
      products?.forEach(product => {
        results.push({
          id: product.id,
          type: 'product',
          title: product.name,
          subtitle: `Category: ${product.category}`,
          url: `/admin/products`
        });
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSearchIcon = (type: string) => {
    switch (type) {
      case 'order': return '📦';
      case 'user': return '👤';
      case 'product': return '🛍️';
      default: return '📄';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <header className="bg-white border-b border-neutral-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-neutral-600" />
          </button>

          {/* Page Title */}
          {title && (
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search */}
          <div className="relative hidden md:block" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search orders, users, products..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-48 lg:w-64 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 w-full bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-neutral-500">
                      <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            navigate(result.url);
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors flex items-center gap-3"
                        >
                          <span className="text-lg">{getSearchIcon(result.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 truncate">{result.title}</p>
                            <p className="text-sm text-neutral-500 truncate">{result.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-4 text-center text-neutral-500">
                      No results found for "{searchQuery}"
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-neutral-600" />
            ) : (
              <Moon className="w-5 h-5 text-neutral-600" />
            )}
          </motion.button>

          {/* Enhanced Notifications */}
          <div className="relative" ref={notificationRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-neutral-600" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
              {/* Connection Status Indicator */}
              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
            </motion.button>

            {/* Enhanced Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900">
                      Notifications ({unreadCount})
                    </h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors ${
                            !notification.read ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm text-neutral-900 truncate">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                                )}
                              </div>
                              <p className="text-sm text-neutral-600 mt-1 break-words">
                                {notification.message}
                              </p>
                              <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1">
                          {(order.order_items || []).map((item, index) => (
                                {formatTimeAgo(notification.timestamp)}
                              {item.products?.name || 'Unknown Product'} x {item.quantity}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-neutral-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                        <p className="text-sm">No notifications yet</p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {isConnected ? 'Connected - waiting for updates' : 'Connecting...'}
                        </p>
                      </div>
                    )}
                  </div>
                          KES {(order.order_items || []).reduce((acc, item) => 
                            acc + (item.quantity * (item.products?.price || item.price || 0)), 0
            </AnimatePresence>
          </div>

          {/* Account Menu */}
          <div className="relative" ref={accountRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-1 sm:gap-2 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-neutral-900">
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </p>
                <p className="text-xs text-neutral-500 truncate max-w-24 lg:max-w-32">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            </motion.button>

            {/* Account Dropdown */}
            <AnimatePresence>
              {showAccountMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-white border border-neutral-200 rounded-lg shadow-lg z-50"
                >
                  <div className="p-4 border-b border-neutral-200">
                    <p className="font-medium text-neutral-900">{user?.email}</p>
                    <p className="text-sm text-neutral-500 capitalize">{user?.role}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        navigate('/admin/settings');
                        setShowAccountMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-neutral-50 transition-colors flex items-center gap-3"
                    >
                      <User className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm text-neutral-700">Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/admin/settings');
                        setShowAccountMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-neutral-50 transition-colors flex items-center gap-3"
                    >
                      <Settings className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm text-neutral-700">Preferences</span>
                    </button>
                  </div>
                  <div className="border-t border-neutral-200 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;