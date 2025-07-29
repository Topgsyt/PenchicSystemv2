import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#2B5741] text-white py-12"> {/* Custom forest green */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">About Us</h3>
            <p className="text-neutral-200">
              Quality animal feed solutions for your farm. We provide the best products for your livestock needs.
            </p>
            <div className="flex space-x-4 mt-6">
              <motion.a 
                whileHover={{ scale: 1.1 }}
                href="#" 
                className="text-neutral-200 hover:text-accent transition-colors touch-target"
              >
                <Facebook className="w-6 h-6" />
              </motion.a>
              <motion.a whileHover={{ scale: 1.1 }} href="#" className="text-neutral-200 hover:text-accent transition-colors touch-target">
                <Instagram className="w-6 h-6" />
              </motion.a>
              <motion.a whileHover={{ scale: 1.1 }} href="#" className="text-neutral-200 hover:text-accent transition-colors touch-target">
                <Twitter className="w-6 h-6" />
              </motion.a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="text-neutral-200 hover:text-accent transition-colors touch-target block py-1">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-neutral-200 hover:text-accent transition-colors touch-target block py-1">
                  Cart
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-neutral-200 hover:text-accent transition-colors touch-target block py-1">
                  Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Products</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products/dairy" className="text-neutral-200 hover:text-accent transition-colors touch-target block py-1">
                  Dairy Feeds
                </Link>
              </li>
              <li>
                <Link to="/products/poultry" className="text-neutral-200 hover:text-accent transition-colors touch-target block py-1">
                  Poultry Feeds
                </Link>
              </li>
              <li>
                <Link to="/products/swine" className="text-neutral-200 hover:text-accent transition-colors touch-target block py-1">
                  Farm Fresh Eggs
                </Link>
              </li>
              <li>
                <Link to="/products/other" className="text-neutral-200 hover:text-accent transition-colors touch-target block py-1">
                  Other Feeds
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-center">
                <MapPin className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                <span>Limuru, Kiambu, Kenya</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                <a href="tel:+254722395370" className="hover:text-accent transition-colors touch-target">
                  +254 722 395 370 
                  +254 722 899 822
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                <a href="mailto:info@penchicfarm.com" className="hover:text-accent transition-colors touch-target">
                  info@penchicfarm.com
                </a>
              </li>
              <li className="flex items-center">
                <Clock className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                <span>Mon-Fri: 8:00 AM - 5:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-[#1f3f2f]">
          <p className="text-center text-neutral-200">
            © {new Date().getFullYear()} Penchic Farm. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
