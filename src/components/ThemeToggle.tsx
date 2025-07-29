import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useStore } from '../store';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useStore();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="relative flex items-center justify-between w-[70px] h-[34px] rounded-full p-1 bg-white dark:bg-gray-800 transition-colors duration-300"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      role="switch"
      aria-checked={isDarkMode}
    >
      <span className="sr-only">Toggle theme</span>
      <motion.div
        className="absolute w-[26px] h-[26px] bg-gray-800 dark:bg-white rounded-full"
        animate={{ x: isDarkMode ? 36 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      <Sun className="h-4 w-4 text-yellow-500" />
      <Moon className="h-4 w-4 text-blue-500" />
    </motion.button>
  );
};

export default ThemeToggle;