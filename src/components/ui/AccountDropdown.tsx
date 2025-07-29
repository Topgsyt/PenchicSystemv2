import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccountDropdownProps {
  user: {
    email: string;
    role: string;
  };
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({
  user,
  onProfileClick,
  onSettingsClick,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-neutral-900">
            {user.role === 'admin' ? 'Administrator' : 'User'}
          </p>
          <p className="text-xs text-neutral-500 truncate max-w-32">
            {user.email}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-neutral-500" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg z-50"
          >
            <div className="p-4 border-b border-neutral-200">
              <p className="font-medium text-neutral-900">{user.email}</p>
              <p className="text-sm text-neutral-500 capitalize">{user.role}</p>
            </div>
            
            <div className="py-2">
              <button
                onClick={() => handleMenuClick(onProfileClick)}
                className="w-full px-4 py-2 text-left hover:bg-neutral-50 transition-colors flex items-center gap-3"
              >
                <User className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-700">Profile Settings</span>
              </button>
              <button
                onClick={() => handleMenuClick(onSettingsClick)}
                className="w-full px-4 py-2 text-left hover:bg-neutral-50 transition-colors flex items-center gap-3"
              >
                <Settings className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-700">Preferences</span>
              </button>
            </div>
            
            <div className="border-t border-neutral-200 py-2">
              <button
                onClick={() => handleMenuClick(onLogout)}
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
  );
};

export default AccountDropdown;