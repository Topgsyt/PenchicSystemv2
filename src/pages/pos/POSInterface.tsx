import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Maximize2,
  Minimize2,
  X,
  ShoppingCart,
  CreditCard,
  Banknote,
  Receipt,
  Grid3X3,
  List,
  Filter,
  User,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const POSInterface = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [mpesaReference, setMpesaReference] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  // Cart collapse state
  const [isCartCollapsed, setIsCartCollapsed] = useState(false);

  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      navigate('/');
      return;
    }
    initializeSession();
    fetchProducts();
  }, [user, navigate]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('pos-fullscreen-mode');
    } else {
      document.body.classList.remove('pos-fullscreen-mode');
    }
  }, [isFullscreen]);

  // Add mobile auto-collapse functionality
  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse cart on mobile devices (768px and below)
      if (window.innerWidth <= 768) {
        setIsCartCollapsed(true);
      } else {
        setIsCartCollapsed(false);
      }
    };

    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initializeSession = async () => {
    try {
      const { data: existingSession, error: fetchError } = await supabase
        .from('pos_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSession) {
        setSessionId(existingSession.id);
        return;
      }

      const { data: newSessionData, error } = await supabase.rpc('start_pos_session', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setSessionId(newSessionData);
    } catch (error) {
      console.error('Error managing POS session:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, change) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change;
          if (newQuantity < 1 || newQuantity > item.stock) {
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.16; // 16% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handlePayment = async () => {
    if (!cart.length) return;

    const { total } = calculateTotals();

    if (paymentMethod === 'cash' && Number(cashAmount) < total) {
      alert(`Cash amount should be at least KES ${total.toFixed(2)}`);
      return;
    }

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user.id,
            status: 'processing',
            total: total,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      const { error: transactionError } = await supabase.from('pos_transactions').insert([
        {
          session_id: sessionId,
          order_id: order.id,
          user_id: user.id,
          transaction_type: 'sale',
          payment_method: paymentMethod,
          subtotal: calculateTotals().subtotal,
          tax_amount: calculateTotals().tax,
          total_amount: total,
        },
      ]);

      if (transactionError) throw transactionError;

      setLastTransaction({
        orderId: order.id,
        items: [...cart],
        totals: calculateTotals(),
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? Number(cashAmount) : null,
        mpesaReference: paymentMethod === 'mpesa' ? mpesaReference : null,
        timestamp: new Date()
      });

      setCart([]);
      setShowPayment(false);
      setShowReceipt(true);
      setPaymentMethod('');
      setMpesaReference('');
      setCashAmount('');
      fetchProducts();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(
    (product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary border-solid"></div>
      </div>
    );
  }

  const containerClass = isFullscreen 
    ? 'fixed inset-0 w-screen h-screen z-50 bg-white flex flex-col'
    : 'min-h-screen bg-neutral-50 flex flex-col max-w-full overflow-x-hidden';

  return (
    <div className={containerClass}>
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-3 sm:px-4 lg:px-6 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-neutral-900">Point of Sale</h1>
                <p className="text-xs sm:text-sm text-neutral-500">Session Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700">Online</span>
            </div>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-target"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col p-2 sm:p-3 lg:p-4 min-w-0 max-w-full">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row lg:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-2.5 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm touch-target"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-3 sm:py-2.5 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm touch-target"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>

              <div className="flex bg-white border border-neutral-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid/List */}
          <div className="flex-1 overflow-y-auto min-h-0 max-w-full">
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="text-neutral-500">No products found</p>
                </div>
              </div>
            ) : (
              <div className={`${
                viewMode === 'grid' 
                  ? `grid gap-2 sm:gap-3 ${isFullscreen ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}` 
                  : 'space-y-2'
              }`}>
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: viewMode === 'grid' ? 1.02 : 1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(product)}
                    className={`
                      bg-white rounded-xl border border-neutral-200 cursor-pointer transition-all hover:shadow-md
                      ${viewMode === 'grid' ? 'p-2 sm:p-3' : 'p-3 flex items-center gap-4'}
                      ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-square bg-neutral-100 rounded-lg mb-2 sm:mb-3 overflow-hidden">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-neutral-900 text-xs sm:text-sm mb-1 line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-primary font-bold text-xs sm:text-sm">
                            KES {product.price.toLocaleString()}
                          </p>
                          <p className={`text-xs mt-1 ${
                            product.stock > 10 ? 'text-green-600' : 
                            product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-neutral-900 truncate">{product.name}</h3>
                          <p className="text-sm text-neutral-500">{product.category}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-primary font-bold">KES {product.price.toFixed(2)}</p>
                            <p className={`text-xs ${
                              product.stock > 10 ? 'text-green-600' : 
                              product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {product.stock} left
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile collapsed cart trigger - floating button when fully collapsed */}
        {isCartCollapsed && (
          <div className="fixed right-3 sm:right-4 bottom-6 sm:bottom-8 lg:top-1/2 lg:bottom-auto lg:transform lg:-translate-y-1/2 z-40 lg:hidden">
            <button
              onClick={() => setIsCartCollapsed(false)}
              className="group bg-primary text-white p-3 sm:p-4 rounded-full shadow-2xl hover:bg-primary-dark transition-all duration-300 hover:scale-110 relative active:scale-95 touch-manipulation"
              title="Open cart"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 sm:min-w-[24px] sm:h-6 flex items-center justify-center shadow-lg animate-pulse">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
              
              {/* Ripple effect on tap */}
              <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-active:opacity-100 group-active:animate-ping"></div>
              
              {/* Floating label */}
              <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-neutral-900 text-white px-3 py-1 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                View Cart
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-neutral-900"></div>
              </div>
            </button>
          </div>
        )}

        {/* Cart Panel - Enhanced Mobile Collapse */}
        <div className={`${
          isFullscreen ? 'w-80 lg:w-96' : 'w-full max-w-xs sm:max-w-sm lg:max-w-md'
        } ${
          isCartCollapsed ? (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'fixed inset-y-0 right-0 w-full max-w-sm z-50 transform translate-x-full' : 'w-16') : (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'fixed inset-y-0 right-0 w-full max-w-sm z-50 transform translate-x-0' : '')
        } bg-white border-l border-neutral-200 flex flex-col shadow-xl flex-shrink-0 transition-all duration-300 overflow-hidden ${
          !isCartCollapsed && typeof window !== 'undefined' && window.innerWidth <= 768 ? 'touch-pan-y overscroll-contain' : ''
        }`}>

          <div className="p-3 sm:p-4 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-4 gap-2">
              {!isCartCollapsed && (
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">Current Order</h2>
              )}
              <button
                onClick={() => setIsCartCollapsed(!isCartCollapsed)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-target flex-shrink-0 z-10"
                title={isCartCollapsed ? 'Expand cart' : 'Collapse cart'}
              >
                {isCartCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <>
                    <ChevronLeft className="w-5 h-5 hidden lg:block" />
                    <X className="w-5 h-5 lg:hidden" />
                  </>
                )}
              </button>
            </div>
            
            {!isCartCollapsed && (
              <>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">{new Date().toLocaleTimeString()}</span>
                </div>
                
                <div className="bg-neutral-50 rounded-lg p-3 sm:p-4 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Items:</span>
                    <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>
              </>
            )}
            
            {/* Collapsed state indicator - only for desktop */}
            {isCartCollapsed && typeof window !== 'undefined' && window.innerWidth > 768 && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </div>
                <div className="text-xs font-medium text-neutral-900">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
              </div>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto p-3 sm:p-4 min-h-0 max-h-full ${isCartCollapsed ? 'hidden' : ''} ${
            typeof window !== 'undefined' && window.innerWidth <= 768 ? 'overscroll-contain' : ''
          }`}>
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="text-neutral-500">Cart is empty</p>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">Add products to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-neutral-50 rounded-lg p-2 sm:p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 text-xs sm:text-sm">{item.name}</h3>
                        <p className="text-primary font-bold text-xs sm:text-sm">KES {item.price.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors touch-target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-white rounded-lg border border-neutral-200">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-2 hover:bg-neutral-100 rounded-l-lg transition-colors touch-target"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-2 sm:px-3 py-2 font-medium text-sm min-w-[40px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-2 hover:bg-neutral-100 rounded-r-lg transition-colors touch-target"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-bold text-neutral-900 text-xs sm:text-sm">
                        KES {(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && !isCartCollapsed && (
            <div className="p-3 sm:p-4 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal:</span>
                  <span className="font-medium">KES {calculateTotals().subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Tax (16%):</span>
                  <span className="font-medium">KES {calculateTotals().tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-neutral-200 pt-2 text-sm sm:text-base">
                  <span>Total:</span>
                  <span>KES {calculateTotals().total.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCart([])}
                  className="px-3 py-3 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors font-medium text-sm touch-target"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-3 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm touch-target"
                >
                  Pay Now
                </button>
              </div>
            </div>
          )}
          
          {/* Collapsed cart summary - only for desktop */}
          {cart.length > 0 && isCartCollapsed && typeof window !== 'undefined' && window.innerWidth > 768 && (
            <div className="p-2 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
              <div className="text-center">
                <div className="text-xs font-medium text-neutral-900 mb-1">
                  KES {calculateTotals().total.toLocaleString()}
                </div>
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full px-2 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-xs touch-target"
                >
                  Pay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile overlay when cart is open - Improved touch handling */}
        {!isCartCollapsed && typeof window !== 'undefined' && window.innerWidth <= 768 && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsCartCollapsed(true)}
            style={{ 
              touchAction: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          />
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">Payment</h2>
                <button
                  onClick={() => setShowPayment(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>KES {calculateTotals().total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="font-medium">Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'mpesa'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">M-Pesa</span>
                  </button>
                </div>

                {paymentMethod === 'cash' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <label className="block text-sm font-medium text-neutral-700">
                      Cash Received
                    </label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      placeholder="Enter amount received"
                      min={calculateTotals().total.toString()}
                      step="0.01"
                    />
                    {cashAmount && Number(cashAmount) >= calculateTotals().total && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm text-green-700">
                          Change: KES {(Number(cashAmount) - calculateTotals().total).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {paymentMethod === 'mpesa' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <label className="block text-sm font-medium text-neutral-700">
                      M-Pesa Reference
                    </label>
                    <input
                      type="text"
                      value={mpesaReference}
                      onChange={(e) => setMpesaReference(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      placeholder="Enter M-Pesa transaction code"
                    />
                  </motion.div>
                )}
              </div>

              <button
                onClick={handlePayment}
                disabled={
                  !paymentMethod ||
                  (paymentMethod === 'cash' && (!cashAmount || Number(cashAmount) < calculateTotals().total)) ||
                  (paymentMethod === 'mpesa' && !mpesaReference)
                }
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Payment
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && lastTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Success Header - Included in print */}
              <div className="text-center p-6 pb-4 print:p-4 print:pb-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 print:w-12 print:h-12 print:mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600 print:w-6 print:h-6" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-1 print:text-lg">Payment Successful!</h2>
                <p className="text-neutral-600 text-sm print:text-xs">Transaction completed successfully</p>
              </div>

              {/* Receipt Container */}
              <div className="mx-6 mb-6 bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden print:mx-0 print:mb-0 print:border-0 print:shadow-none print:rounded-none">
                {/* Business Header */}
                <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-6 text-white print:bg-white print:text-black print:py-4 print:border-b print:border-neutral-200">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 print:bg-primary print:text-white print:w-12 print:h-12 print:mb-3">
                      <ShoppingCart className="w-8 h-8 print:w-6 print:h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 print:text-xl print:mb-1">PENCHIC FARM</h3>
                    <p className="text-white/90 text-base font-medium print:text-neutral-700 print:text-sm">Premium Agricultural Products</p>
                    <div className="mt-3 pt-3 border-t border-white/20 print:border-neutral-200 text-sm print:text-xs">
                      <p className="text-white/80 print:text-neutral-600">Limuru, Kiambu County, Kenya</p>
                      <p className="text-white/80 print:text-neutral-600">Tel: +254 722 395 370 | +254 722 899 822</p>
                      <p className="text-white/80 print:text-neutral-600">Email: info@penchicfarm.com</p>
                    </div>
                  </div>
                </div>

                {/* Receipt Details */}
                <div className="p-6 print:p-4">
                  {/* Receipt Info */}
                  <div className="bg-neutral-50 rounded-lg p-4 mb-6 print:bg-transparent print:border print:border-neutral-200">
                    <div className="text-center mb-4 print:mb-3">
                      <h4 className="text-lg font-bold text-neutral-900 print:text-base">SALES RECEIPT</h4>
                      <div className="w-16 h-0.5 bg-primary mx-auto mt-2 print:w-12"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm print:gap-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-neutral-500" />
                        <div>
                          <p className="text-neutral-500 text-xs uppercase tracking-wide font-semibold">Receipt No.</p>
                          <p className="font-mono font-bold text-primary">#{lastTransaction.orderId.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        <div>
                          <p className="text-neutral-500 text-xs uppercase tracking-wide font-semibold">Date & Time</p>
                          <p className="font-bold">{lastTransaction.timestamp.toLocaleDateString('en-KE', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</p>
                          <p className="text-neutral-600 text-xs font-medium">{lastTransaction.timestamp.toLocaleTimeString('en-KE', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-neutral-900 uppercase tracking-wide">Items Purchased</h4>
                      <div className="flex-1 border-b border-dashed border-neutral-300 mx-3"></div>
                      <span className="text-sm text-neutral-500 font-medium">{lastTransaction.items.length} item(s)</span>
                    </div>
                    
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 pb-2 mb-3 border-b border-neutral-200 text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      <div className="col-span-6">Item</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-2 text-right">Price</div>
                      <div className="col-span-2 text-right">Total</div>
                    </div>
                    
                    <div className="space-y-2">
                      {lastTransaction.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 py-2 border-b border-neutral-100 last:border-b-0 items-center">
                          <div className="col-span-6">
                            <p className="font-semibold text-neutral-900 text-sm leading-tight">{item.name}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Unit: KES {item.price.toLocaleString('en-KE')}</p>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-6 bg-neutral-100 rounded text-xs font-bold text-neutral-900">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="font-medium text-neutral-900 text-sm">KES {item.price.toLocaleString('en-KE')}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="font-bold text-neutral-900">KES {(item.price * item.quantity).toLocaleString('en-KE')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="border-t-2 border-neutral-300 pt-4">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm font-medium text-neutral-600">Subtotal</span>
                        <span className="font-semibold text-neutral-900">KES {lastTransaction.totals.subtotal.toLocaleString('en-KE')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm font-medium text-neutral-600">Tax (16% VAT)</span>
                        <span className="font-semibold text-neutral-900">KES {lastTransaction.totals.tax.toLocaleString('en-KE')}</span>
                      </div>
                      <div className="border-t border-dashed border-neutral-300 my-2"></div>
                    </div>
                    
                    {/* Total Amount - Highlighted */}
                    <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg p-4 mb-4 print:bg-neutral-900">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg">TOTAL AMOUNT</span>
                        <span className="text-white text-2xl font-black">
                          KES {lastTransaction.totals.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2">
                          {lastTransaction.paymentMethod === 'cash' ? (
                            <Banknote className="w-5 h-5 text-blue-600" />
                          ) : (
                            <CreditCard className="w-5 h-5 text-blue-600" />
                          )}
                          <span className="font-semibold text-blue-900">
                            Payment Method
                          </span>
                        </div>
                        <span className="font-bold text-blue-900 uppercase text-lg">
                          {lastTransaction.paymentMethod}
                        </span>
                      </div>

                      {lastTransaction.cashAmount && (
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">KES</span>
                            </div>
                            <span className="font-semibold text-green-900">
                              Change Given
                            </span>
                          </div>
                          <span className="font-bold text-green-900 text-xl">
                            KES {(lastTransaction.cashAmount - lastTransaction.totals.total).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {lastTransaction.mpesaReference && (
                        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                          <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold mb-2">M-Pesa Reference</p>
                          <p className="font-mono text-base font-bold text-primary">{lastTransaction.mpesaReference}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center mt-8 pt-6 border-t-2 border-neutral-200">
                    <div className="mb-4">
                      <p className="text-lg font-bold text-primary mb-2">Thank you for shopping with us!</p>
                      <p className="text-sm text-neutral-600 font-medium">Your business is greatly appreciated</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-3 text-xs text-neutral-500">
                      <p className="font-semibold mb-1">Important Notice:</p>
                      <p>Please keep this receipt for your records and warranty claims.</p>
                      <p className="mt-2">For inquiries, contact us at +254 722 395 370</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-neutral-200">
                      <p className="text-xs text-neutral-400">Served by: {user?.email}</p>
                      <p className="text-xs text-neutral-400">Transaction ID: {lastTransaction.orderId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Hidden when printing */}
              <div className="px-6 pb-6 print:hidden">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-all duration-200 font-medium"
                  >
                    <Receipt className="w-4 h-4" />
                    Print Receipt
                  </button>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSInterface;