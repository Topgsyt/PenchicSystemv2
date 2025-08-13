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
  type: 'new_order' | 'low_stock' | 'analytics_milestone' | 'user_registration';
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

  // Add notification function
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
  };

  // Listen for POS notifications
  useEffect(() => {
    const handlePOSNotification = (event: any) => {
      console.log('POS Notification received:', event.detail);
      
      addNotification({
        type: event.detail.type === 'success' ? 'new_order' : 
              event.detail.type === 'error' ? 'low_stock' :
              event.detail.type === 'warning' ? 'low_stock' : 
              event.detail.type === 'info' ? 'analytics_milestone' : 'new_order',
        title: event.detail.title,
        message: event.detail.message,
        data: event.detail
      });
      
      // Also show a toast notification for immediate feedback
      const toast = document.createElement('div');
      toast.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
        event.detail.type === 'success' ? 'bg-green-500 text-white' :
        event.detail.type === 'error' ? 'bg-red-500 text-white' :
        event.detail.type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
      }`;
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="font-semibold">${event.detail.title}</div>
        </div>
        <div class="text-sm mt-1">${event.detail.message}</div>
      `;
      
      document.body.appendChild(toast);
      
      // Animate in
      setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
      }, 100);
      
      // Remove after 4 seconds
      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 4000);
    };

    window.addEventListener('posNotification', handlePOSNotification);
    console.log('POS notification listener added');
    
    return () => {
      window.removeEventListener('posNotification', handlePOSNotification);
      console.log('POS notification listener removed');
    };
  }, []);

  // Real-time notifications setup
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        console.log('Setting up real-time notifications...');

        // Subscribe to new orders
        const ordersSubscription = supabase
          .channel('orders_changes')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => {
              console.log('New order received:', payload);
              addNotification({
                type: 'new_order',
                title: 'New Order Received',
                message: `Order #${payload.new.id.slice(0, 8)} - KES ${payload.new.total.toLocaleString()}`,
                data: payload.new
              });
            }
          )
          .subscribe((status) => {
            console.log('Orders subscription status:', status);
            setIsConnected(status === 'SUBSCRIBED');
          });

        // Subscribe to stock updates
        const productsSubscription = supabase
          .channel('products_changes')
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'products' },
            (payload) => {
              console.log('Product updated:', payload);
              const product = payload.new;
              if (product.stock <= 5 && product.stock > 0) {
                addNotification({
                  type: 'low_stock',
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
                type: 'user_registration',
                title: 'New User Registration',
                message: `${payload.new.email} registered as ${payload.new.role}`,
                data: payload.new
              });
            }
          )
          .subscribe((status) => {
            console.log('Profiles subscription status:', status);
          });

        // Real-time notifications are now active

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
      case 'new_order': return <ShoppingCart className="w-4 h-4 text-green-500" />;
      case 'low_stock': return <Package className="w-4 h-4 text-yellow-500" />;
      case 'analytics_milestone': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'user_registration': return <Users className="w-4 h-4 text-blue-500" />;
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

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-neutral-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {/* Connection Status Indicator */}
              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
            </motion.button>

            {/* Notifications Dropdown */}
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
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(notification.timestamp)}
                              </p>
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
                </motion.div>
              )}
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