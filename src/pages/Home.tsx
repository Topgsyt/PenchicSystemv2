import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
  ArrowRight,
  Star,
  Shield,
  Heart,
  Zap
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
    link: '/shop?category=poultry',
    color: 'from-amber-400 to-orange-500',
    bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
    features: ['High Protein', 'Calcium Rich', 'Growth Formula'],
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400',
    popular: true
  },
  {
    title: 'Cattle Feed',
    description: 'High-quality feed for dairy and beef cattle',
    icon: Beef,
    link: '/shop?category=cattle',
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
    features: ['Energy Dense', 'Digestible Fiber', 'Mineral Rich'],
    image: 'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?auto=format&fit=crop&q=80&w=400',
    popular: false
  },
  {
    title: 'Fish Feed',
    description: 'Specialized aquaculture feed for healthy fish growth',
    icon: Fish,
    link: '/shop?category=fish',
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    features: ['Water Stable', 'High Nutrition', 'Growth Optimized'],
    image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&q=80&w=400',
    popular: false
  },
  {
    title: 'Premium Mix',
    description: 'Our signature blend for optimal animal health',
    icon: Star,
    link: '/shop?category=premium',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
    features: ['Multi-Species', 'Premium Quality', 'Enhanced Formula'],
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400',
    popular: false
  }
];

export default function Home() {
  const typedRef = useRef(null);
  const [showContact, setShowContact] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    // Simulated typing effect
    const text = 'PENCHIC FARM FEEDS';
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        if (typedRef.current) {
          typedRef.current.textContent = text.slice(0, index);
        }
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
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
    // Simulate featured products data
    setFeaturedProducts([
      {
        id: 1,
        name: "Premium Chicken Feed",
        description: "High-protein formula for optimal egg production",
        price: 2500,
        category: "Poultry",
        stock: 50,
        image_url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400"
      },
      {
        id: 2,
        name: "Cattle Growth Formula",
        description: "Complete nutrition for healthy cattle development",
        price: 3200,
        category: "Cattle",
        stock: 30,
        image_url: "https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?auto=format&fit=crop&q=80&w=400"
      }
    ]);
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

      {/* Enhanced Categories Section */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 to-blue-50/50" />
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-30" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <ScrollReveal>
            <div className="text-center mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-blue-100 px-6 py-3 rounded-full mb-6"
              >
                <Wheat className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-semibold">Premium Feed Solutions</span>
              </motion.div>
              <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
                Our Feed Categories
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Discover our comprehensive range of scientifically formulated feeds, 
                designed to optimize nutrition and maximize your livestock's potential.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {categories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <a href={category.link} className="group block">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 bg-white border border-slate-100"
                  >
                    {/* Popular badge */}
                    {category.popular && (
                      <div className="absolute top-6 right-6 z-20">
                        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full text-white text-sm font-bold shadow-lg">
                          <Star className="w-4 h-4 fill-current" />
                          Popular
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row h-full">
                      {/* Image section */}
                      <div className="relative lg:w-1/2 h-64 lg:h-auto overflow-hidden">
                        <img
                          src={category.image}
                          alt={category.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                        
                        {/* Floating icon */}
                        <div className="absolute top-6 left-6">
                          <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg`}>
                            <category.icon className="w-7 h-7 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </div>

                      {/* Content section */}
                      <div className={`lg:w-1/2 p-8 ${category.bgColor} flex flex-col justify-between`}>
                        <div>
                          <h3 className="text-3xl font-bold text-slate-900 mb-4 group-hover:text-slate-700 transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-slate-600 mb-6 leading-relaxed">
                            {category.description}
                          </p>

                          {/* Features */}
                          <div className="space-y-3 mb-6">
                            {category.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${category.color}`} />
                                <span className="text-slate-700 font-medium">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA Button */}
                        <div className="flex items-center justify-between">
                          <motion.div
                            whileHover={{ x: 5 }}
                            className={`inline-flex items-center gap-2 text-transparent bg-gradient-to-r ${category.color} bg-clip-text font-bold text-lg`}
                          >
                            Explore Range
                            <ArrowRight className="w-5 h-5" />
                          </motion.div>
                          
                          <div className="flex items-center gap-2 text-slate-500">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm">Quality Assured</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover glow effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
                  </motion.div>
                </a>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-4 bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Heart className="w-6 h-6 text-red-500" />
                  <span className="text-slate-700 font-semibold">Trusted by 1000+ farmers</span>
                </div>
                <div className="w-px h-8 bg-slate-300" />
                <div className="flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-500" />
                  <span className="text-slate-700 font-semibold">Fast delivery guaranteed</span>
                </div>
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
                <div
                  key={product.id}
                >
                  <a href={`/product/${product.id}`}>
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
                  </a>
                </div>
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