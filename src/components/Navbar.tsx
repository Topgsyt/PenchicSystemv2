import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Shield, Store } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const user = useStore((state) => state.user);
  const cart = useStore((state) => state.cart);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const totalCartQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="bg-[#112F25] border-b border-[#173F30] no-print sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link to="/" className="text-white font-bold text-xl">
              HOME
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-center space-x-2 lg:space-x-4">
                <Link to="/shop" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  STORE
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-gray-300 hover:text-white px-3 py-2 rounded-md flex items-center">
                    <Shield className="h-5 w-5 mr-1" />
                    Admin
                  </Link>
                )}
                {['admin', 'worker'].includes(user?.role || '') && (
                  <Link to="/pos" className="text-gray-300 hover:text-white px-3 py-2 rounded-md flex items-center">
                    <Store className="h-5 w-5 mr-1" />
                    POS
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {user && ['admin', 'worker'].includes(user.role) && (
              <Link to="/cart" className="text-gray-300 hover:text-white p-2 relative touch-target">
                <ShoppingCart className="h-6 w-6" />
                {totalCartQuantity > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-accent text-white text-xs min-w-[16px] h-4 flex items-center justify-center rounded-full px-1"
                  >
                    {totalCartQuantity}
                  </motion.span>
                )}
              </Link>
            )}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                  className="text-gray-300 hover:text-white p-2 flex items-center touch-target"
                >
                  <User className="h-6 w-6" />
                </button>
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-[#173F30] rounded-md shadow-lg py-1 z-50"
                    >
                    <div className="px-4 py-2 text-sm text-gray-400 border-b border-[#112F25]">
                      {user.email}
                    </div>
                    <button 
                      onClick={handleLogout} 
                      className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-[#112F25] hover:text-white touch-target"
                    >
                      Logout
                    </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="text-gray-300 hover:text-white px-3 lg:px-4 py-2 rounded-full border-2 border-accent hover:bg-accent transition-colors text-sm lg:text-base touch-target">
                Login
              </Link>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300 hover:text-white p-2 touch-target">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/shop" className="text-gray-300 hover:text-white block px-3 py-3 rounded-md touch-target" onClick={() => setIsMenuOpen(false)}>
                Shop
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-300 hover:text-white block px-3 py-3 rounded-md flex items-center touch-target" onClick={() => setIsMenuOpen(false)}>
                  <Shield className="h-5 w-5 mr-1" />
                  Admin
                </Link>
              )}
              {['admin', 'worker'].includes(user?.role || '') && (
                <Link to="/pos" className="text-gray-300 hover:text-white block px-3 py-3 rounded-md flex items-center touch-target" onClick={() => setIsMenuOpen(false)}>
                  <Store className="h-5 w-5 mr-1" />
                  POS
                </Link>
              )}
              {user && (
                <Link to="/cart" className="text-gray-300 hover:text-white block px-3 py-3 rounded-md touch-target" onClick={() => setIsMenuOpen(false)}>
                  {['admin', 'worker'].includes(user.role) ? (
                    <>
                      Cart
                      {totalCartQuantity > 0 && (
                        <span className="ml-2 bg-accent text-white px-2 py-1 rounded-full text-xs">
                          {totalCartQuantity}
                        </span>
                      )}
                    </>
                  ) : (
                    'Account'
                  )}
                </Link>
              )}
              {user ? (
                <>
                  <div className="px-3 py-3 text-sm text-gray-400">
                    {user.email}
                  </div>
                  <button onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }} className="text-gray-300 hover:text-white block px-3 py-3 rounded-md w-full text-left touch-target">
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="text-gray-300 hover:text-white block px-3 py-3 rounded-md touch-target" onClick={() => setIsMenuOpen(false)}>
                  Login
                </Link>
              )}
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
