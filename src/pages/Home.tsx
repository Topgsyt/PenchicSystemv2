import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
// import { Link } from 'react-router-dom'; // Commented out for demo
import Typed from 'typed.js';
import { supabase } from '../lib/supabase'; // Commented out for demo
// const supabase = null; // Mock for demo
import ScrollReveal from '../components/animations/ScrollReveal'; // Commented out for demo

// Mock ScrollReveal component for demo
const ScrollReveal = ({ children, direction = 'up', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: direction === 'up' ? 30 : direction === 'down' ? -30 : 0, x: direction === 'left' ? -30 : direction === 'right' ? 30 : 0 }}
    whileInView={{ opacity: 1, y: 0, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);
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
  ChevronRight,
  ArrowUpRight,
  Star,
  TrendingUp,
  Award
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
    description: 'Complete nutrition for chickens, ducks, and other poultry with specialized formulas for different growth stages',
    icon: Egg,
    link: '/shop?category=poultry',
    features: ['High Protein', 'Vitamins & Minerals', 'Growth Formula'],
    popular: true,
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400'
  },
  {
    title: 'Cattle Feed',
    description: 'Premium quality feed for dairy and beef cattle, designed to maximize milk production and healthy weight gain',
    icon: Beef,
    link: '/shop?category=cattle',
    features: ['Enhanced Nutrition', 'Digestive Health', 'Milk Boost'],
    popular: false,
    image: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=400'
  },
  {
    title: 'Fish Feed',
    description: 'Specialized aquaculture nutrition for various fish species with optimal protein and nutrient balance',
    icon: Fish,
    link: '/shop?category=fish',
    features: ['Water Stable', 'High Protein', 'Fast Growth'],
    popular: false,
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=400'
  },
  {
    title: 'Premium Mix',
    description: 'Custom blended feeds tailored to specific livestock needs with premium ingredients and additives',
    icon: Wheat,
    link: '/shop?category=premium',
    features: ['Custom Blend', 'Premium Quality', 'Expert Formulated'],
    popular: true,
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400'
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
    // Mock fetch since supabase is not available in demo
    const mockProducts = [
      {
        id: 1,
        name: 'Premium Poultry Starter',
        description: 'High-protein formula for young chickens',
        price: 2500,
        category: 'Poultry',
        image_url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400',
        stock: 50
      },
      {
        id: 2,
        name: 'Dairy Cattle Concentrate',
        description: 'Enhanced nutrition for milk production',
        price: 3200,
        category: 'Cattle',
        image_url: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=400',
        stock: 30
      }
    ];
    setFeaturedProducts(mockProducts);
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
              <button
                onClick={() => window.open('/shop', '_blank')}
                className="px-8 py-3 text-lg font-medium bg-white text-[#2B5741] rounded-full hover:bg-[#f8f9fa] transition-colors shadow-lg"
              >
                <span className="flex items-center">
                  <Store className="mr-2 h-5 w-5" />
                  Shop Now
                </span>
              </button>
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

      {/* Enhanced Categories Section */}
      <section className="py-24 bg-gradient-to-br from-neutral-50 to-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-20">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center bg-[#2B5741]/10 text-[#2B5741] px-4 py-2 rounded-full text-sm font-medium mb-6"
              >
                <Star className="w-4 h-4 mr-2" />
                Premium Feed Solutions
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
                Our Feed Categories
              </h2>
              <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
                Discover our comprehensive range of scientifically formulated feeds, each designed to meet the specific nutritional needs of your livestock
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {categories.map((category, index) => (
              <ScrollReveal
                key={category.title}
                direction={index % 2 === 0 ? 'left' : 'right'}
                delay={index * 0.15}
              >
                <button onClick={() => window.open(category.link, '_blank')} className="block group">
                  <motion.div
                    whileHover={{ 
                      scale: 1.02, 
                      y: -8,
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-neutral-100"
                  >
                    {/* Popular badge */}
                    {category.popular && (
                      <div className="absolute top-4 right-4 z-20">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          POPULAR
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row">
                      {/* Image Section */}
                      <div className="md:w-2/5 relative">
                        <div className="aspect-[4/3] md:aspect-auto md:h-full relative overflow-hidden">
                          <img
                            src={category.image}
                            alt={category.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#2B5741]/20 to-transparent" />
                          
                          {/* Floating icon */}
                          <div className="absolute bottom-4 left-4">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl border border-white/30">
                              <category.icon className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="md:w-3/5 p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#2B5741] transition-colors">
                                {category.title}
                              </h3>
                              <p className="text-neutral-600 leading-relaxed mb-6">
                                {category.description}
                              </p>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="grid grid-cols-1 gap-3 mb-6">
                            {category.features.map((feature, idx) => (
                              <div key={idx} className="flex items-center">
                                <div className="w-2 h-2 bg-[#2B5741] rounded-full mr-3 group-hover:bg-[#D4A373] transition-colors" />
                                <span className="text-neutral-700 font-medium">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                          <span className="text-[#2B5741] font-semibold group-hover:text-[#1A3F2E] transition-colors">
                            Explore Products
                          </span>
                          <motion.div
                            whileHover={{ x: 4 }}
                            className="p-2 bg-[#2B5741]/10 rounded-full group-hover:bg-[#2B5741] transition-colors"
                          >
                            <ArrowUpRight className="w-5 h-5 text-[#2B5741] group-hover:text-white transition-colors" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Hover overlay effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2B5741]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </motion.div>
                </button>
              </ScrollReveal>
            ))}
          </div>

          {/* Bottom CTA */}
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="text-center mt-16"
            >
              <div className="bg-gradient-to-r from-[#2B5741] to-[#1A3F2E] rounded-2xl p-8 text-white">
                <div className="flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 mr-2 text-[#D4A373]" />
                  <span className="text-[#D4A373] font-medium">Quality Guaranteed</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Need a Custom Feed Solution?
                </h3>
                <p className="text-neutral-200 mb-6 max-w-2xl mx-auto">
                  Our nutrition experts can create a custom blend specifically tailored to your livestock's unique needs and requirements.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowContact(true)}
                  className="bg-[#D4A373] hover:bg-[#C4946A] text-[#2B5741] font-semibold px-8 py-3 rounded-full transition-colors inline-flex items-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Consult Our Experts
                </motion.button>
              </div>
            </motion.div>
          </ScrollReveal>
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
              <button
                onClick={() => window.open('/shop', '_blank')}
                className="text-[#2B5741] hover:text-[#1A3F2E] font-medium flex items-center"
              >
                View all products
                <ExternalLink className="ml-2 w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredProducts.map((product, index) => (
                <ScrollReveal
                  key={product.id}
                  direction={index % 2 === 0 ? 'left' : 'right'}
                >
                  <button onClick={() => window.open(`/product/${product.id}`, '_blank')}>
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
                  </button>
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
              <button
                onClick={() => window.open('/shop', '_blank')}
                className="inline-flex items-center px-8 py-3 text-lg font-medium text-[#2B5741] bg-[#D4A373] rounded-full hover:bg-[#C4946A] transition-colors"
              >
                <Store className="mr-2 h-5 w-5" />
                Visit Store
              </button>
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