import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Typed from 'typed.js';
import { supabase } from '../lib/supabase';
import ScrollReveal from '../components/animations/ScrollReveal';
import {
  Wheat,
  MapPin,
  Phone,
  Mail,
  Store,
  ExternalLink,
  ChevronDown,
  Egg,
  Beef,
  Fish,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const heroImages = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1516054575922-f0b8eeadec1a?auto=format&fit=crop&q=80&w=1920',
];

const categories = [
  {
    title: 'Poultry Feed',
    description: 'Complete nutrition for chickens, ducks, and other poultry',
    icon: Egg,
    link: '/shop?category=poultry'
  },
  {
    title: 'Cattle Feed',
    description: 'High-quality feed for dairy and beef cattle',
    icon: Beef,
    link: '/shop?category=cattle'
  },
];

export default function Home() {
  const typedRef = useRef(null);
  const [showContact, setShowContact] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    const typed = new Typed(typedRef.current, {
      strings: ['PENCHIC FARM FEEDS'],
      typeSpeed: 50,
      showCursor: false,
    });

    return () => {
      typed.destroy();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .limit(2);

        if (error) throw error;
        
        setFeaturedProducts(data || []);
      } catch (error) {
        console.error('Error fetching featured products:', error);
        setFeaturedProducts([]);
      }
    };

    fetchProducts();
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? heroImages.length - 1 : prevIndex - 1
    );
  };

  const openGoogleMaps = () => {
    window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank');
  };

  return (
    <div className="relative bg-white">
      {/* Hero Section */}
      <div className="min-h-screen relative overflow-hidden">
        {heroImages.map((image, index) => (
          <motion.div
            key={image}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: currentImageIndex === index ? 1 : 0,
              scale: currentImageIndex === index ? 1 : 1.1
            }}
            transition={{ duration: 1 }}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${image})` }}
            />
            <div className="absolute inset-0 bg-black/40" />
          </motion.div>
        ))}

        {/* Navigation arrows */}
        <button 
          onClick={prevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentImageIndex === index ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>

        {/* Hero content */}
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <h1 
                ref={typedRef} 
                className="text-5xl md:text-7xl font-bold mb-6 text-white text-shadow-lg"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
              ></h1>
              <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-white text-shadow-sm font-medium">
                Quality animal feed solutions for your farm's success
              </p>
            </motion.div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/shop"
                className="px-8 py-3 text-lg font-medium bg-white text-[#2B5741] rounded-full hover:bg-[#f8f9fa] transition-colors shadow-lg"
              >
                <span className="flex items-center">
                  <Store className="mr-2 h-5 w-5" />
                  Shop Now
                </span>
              </Link>
              <button
                onClick={() => setShowContact(true)}
                className="px-8 py-3 text-lg font-medium text-white bg-[#2B5741]/80 backdrop-blur-sm rounded-full hover:bg-[#2B5741] transition-colors shadow-lg"
              >
                <span className="flex items-center">
                  <Phone className="mr-2 h-5 w-5" />
                  Contact Us
                </span>
              </button>
            </motion.div>
          </ScrollReveal>

          {/* Bottom links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="absolute bottom-24 left-0 right-0"
          >
            <div className="flex items-center justify-center gap-8">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="group cursor-pointer bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
                onClick={openGoogleMaps}
              >
                <span className="flex items-center gap-2 text-white group-hover:text-[#D4A373] transition-colors">
                  <MapPin className="w-5 h-5" />
                  Visit Us
                </span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="group bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                <a 
                  href="tel:+254123456789" 
                  className="flex items-center gap-2 text-white group-hover:text-[#D4A373] transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call Us
                </a>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="group bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                <a 
                  href="mailto:info@penchicfarm.com" 
                  className="flex items-center gap-2 text-white group-hover:text-[#D4A373] transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Email Us
                </a>
              </motion.div>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="w-6 h-6 text-white animate-bounce" />
          </motion.div>
        </div>
      </div>

      {/* Categories Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">Our Feed Categories</h2>
              <p className="text-neutral-700 max-w-2xl mx-auto">
                Quality nutrition for all your livestock needs
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <ScrollReveal
                key={category.title}
                direction={index % 2 === 0 ? 'left' : 'right'}
                delay={index * 0.1}
              >
                <Link to={category.link}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-neutral-200"
                  >
                    <div className="bg-[#2B5741]/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                      <category.icon className="w-8 h-8 text-[#2B5741]" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-4">{category.title}</h3>
                    <p className="text-neutral-700">{category.description}</p>
                  </motion.div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-4xl font-bold text-neutral-900">Featured Products</h2>
                <p className="text-neutral-700 mt-2">Our best-selling feed solutions</p>
              </div>
              <Link
                to="/shop"
                className="text-[#2B5741] hover:text-[#1A3F2E] font-medium flex items-center"
              >
                View all products
                <ExternalLink className="ml-2 w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredProducts.map((product, index) => (
                <ScrollReveal
                  key={product.id}
                  direction={index % 2 === 0 ? 'left' : 'right'}
                >
                  <Link to={`/product/${product.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-neutral-200"
                    >
                      <div className="relative h-64">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-medium text-[#2B5741]">
                          {product.category}
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-2xl font-bold text-neutral-900 mb-2">{product.name}</h3>
                        <p className="text-neutral-700 mb-4">{product.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-[#2B5741]">
                            KES {product.price.toLocaleString()}
                          </span>
                          <span className="text-green-500 font-medium">
                            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-[#2B5741] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to improve your farm's productivity?
            </h2>
            <p className="text-xl text-neutral-200 mb-8">
              Visit our store or contact us to learn more about our premium feed products.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center px-8 py-3 text-lg font-medium text-[#2B5741] bg-[#D4A373] rounded-full hover:bg-[#C4946A] transition-colors"
              >
                <Store className="mr-2 h-5 w-5" />
                Visit Store
              </Link>
              <button
                onClick={() => setShowContact(true)}
                className="inline-flex items-center px-8 py-3 text-lg font-medium text-white border-2 border-white rounded-full hover:bg-white hover:text-[#2B5741] transition-colors"
              >
                <Phone className="mr-2 h-5 w-5" />
                Contact Us
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Contact Modal */}
      {showContact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">Contact Us</h2>
            <div className="space-y-6">
              <motion.div
                whileHover={{ x: 10 }}
                className="flex items-center group"
              >
                <Mail className="w-6 h-6 mr-3 text-[#2B5741] group-hover:text-[#1A3F2E]" />
                <a
                  href="mailto:info@penchicfarm.com"
                  className="text-neutral-700 hover:text-[#2B5741]"
                >
                  info@penchicfarm.com
                </a>
              </motion.div>
              <motion.div
                whileHover={{ x: 10 }}
                className="flex items-center group"
              >
                <Phone className="w-6 h-6 mr-3 text-[#2B5741] group-hover:text-[#1A3F2E]" />
                <a
                  href="tel:+254123456789"
                  className="text-neutral-700 hover:text-[#2B5741]"
                >
                  +254 722 395 370
                  Or
                  +254 722 899 822
                </a>
              </motion.div>
              <motion.div
                whileHover={{ x: 10 }}
                className="flex items-start group"
              >
                <MapPin className="w-6 h-6 mr-3 mt-1 text-[#2B5741] group-hover:text-[#1A3F2E]" />
                <div>
                  <p className="text-neutral-700">Limuru</p>
                  <p className="text-neutral-700">Kiambu, Kenya</p>
                  <button
                    onClick={openGoogleMaps}
                    className="flex items-center text-[#2B5741] hover:text-[#1A3F2E] mt-2"
                  >
                    View on Google Maps
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </motion.div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowContact(false)}
                className="px-6 py-2 bg-[#2B5741] text-white rounded-full hover:bg-[#1A3F2E] transition-all transform hover:scale-105"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}