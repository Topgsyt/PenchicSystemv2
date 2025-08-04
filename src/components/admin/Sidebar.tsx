import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Store,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Package2, // ✅ FIX: Add missing icon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileToggle,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', exact: true },
    { icon: Package, label: 'Products', path: '/admin/products' },
    { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Package2, label: 'Stock', path: '/admin/stock-management' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden touch-none"
            onClick={onMobileToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? '64px' : '280px',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          fixed lg:sticky lg:top-0 left-0 h-screen bg-white border-r border-neutral-200 z-50 flex flex-col overflow-hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-xl lg:shadow-none
        `}
        style={{ position: 'sticky !important', top: 0, maxHeight: '100vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-neutral-200 min-h-[64px] lg:min-h-[80px]">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 lg:gap-3"
              >
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg lg:text-xl font-bold text-neutral-900">Penchic</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileToggle}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-neutral-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-neutral-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-4 space-y-1 lg:space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-neutral-100 scrollbar-thumb-neutral-300 hover:scrollbar-thumb-neutral-400">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onMobileToggle()}
                className={`min-h-[44px]
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${
                    active
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium text-sm lg:text-base"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-3 lg:p-4 border-t border-neutral-200 flex-shrink-0">
          <div
            className={`min-h-[44px] flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs lg:text-sm font-medium text-neutral-900 truncate">
                    {user?.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                  <p className="text-xs text-neutral-500 truncate max-w-[120px]" title={user?.email}>
                    {user?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout Button */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-xs lg:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;