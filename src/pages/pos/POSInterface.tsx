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
  Store
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
  const [quantityInput, setQuantityInput] = useState({});

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
    const quantity = parseInt(quantityInput[product.id]) || 1;
    
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          alert(`Only ${product.stock - existingItem.quantity} more units available`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQuantity } : item
        );
      }
      if (quantity > product.stock) {
        alert(`Only ${product.stock} units available`);
        return prevCart;
      }
      return [...prevCart, { ...product, quantity }];
    });
    
    // Reset quantity input
    setQuantityInput(prev => ({ ...prev, [product.id]: '' }));
  };

  const handleQuantityInputChange = (productId, value) => {
    const numValue = parseInt(value);
    const product = products.find(p => p.id === productId);
    
    if (product && numValue > product.stock) {
      setQuantityInput(prev => ({ ...prev, [productId]: product.stock.toString() }));
    } else {
      setQuantityInput(prev => ({ ...prev, [productId]: value }));
    }
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
    : 'min-h-screen bg-neutral-50 flex flex-col';

  return (
    <div className={containerClass}>
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-3 sm:px-4 lg:px-6 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col p-2 sm:p-3 lg:p-4 min-w-0">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm sm:text-base touch-target"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm touch-target"
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
                  className={`p-2 rounded transition-colors touch-target ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors touch-target ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid/List */}
          <div className="flex-1 overflow-y-auto min-h-0">
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
                  ? `grid gap-2 sm:gap-3 ${isFullscreen ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}` 
                  : 'space-y-2'
              }`}>
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: viewMode === 'grid' ? 1.02 : 1 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      bg-white rounded-xl border border-neutral-200 transition-all hover:shadow-md touch-target
                      ${viewMode === 'grid' ? 'p-2 sm:p-3' : 'p-3 flex items-center gap-3 sm:gap-4'}
                      ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        <div 
                          className="aspect-square bg-neutral-100 rounded-lg mb-2 overflow-hidden cursor-pointer"
                          onClick={() => product.stock > 0 && addToCart(product)}
                        >
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-medium text-neutral-900 text-xs sm:text-sm line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-primary font-bold text-xs sm:text-sm">
                            KES {product.price.toLocaleString()}
                          </p>
                          <p className={`text-xs ${
                            product.stock > 10 ? 'text-green-600' : 
                            product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                        
                        {/* Quantity Input for Grid View */}
                        {product.stock > 0 && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center bg-neutral-50 rounded-lg border border-neutral-200">
                              <button
                                onClick={() => {
                                  const currentQty = parseInt(quantityInput[product.id]) || 1;
                                  if (currentQty > 1) {
                                    setQuantityInput(prev => ({ 
                                      ...prev, 
                                      [product.id]: (currentQty - 1).toString() 
                                    }));
                                  }
                                }}
                                className="p-1.5 sm:p-2 hover:bg-neutral-200 rounded-l-lg transition-colors touch-target"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                value={quantityInput[product.id] || '1'}
                                onChange={(e) => handleQuantityInputChange(product.id, e.target.value)}
                                className="w-8 sm:w-12 text-center bg-transparent text-xs sm:text-sm border-none focus:outline-none touch-target"
                                min="1"
                                max={product.stock}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={() => {
                                  const currentQty = parseInt(quantityInput[product.id]) || 1;
                                  if (currentQty < product.stock) {
                                    setQuantityInput(prev => ({ 
                                      ...prev, 
                                      [product.id]: (currentQty + 1).toString() 
                                    }));
                                  }
                                }}
                                className="p-1.5 sm:p-2 hover:bg-neutral-200 rounded-r-lg transition-colors touch-target"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => addToCart(product)}
                              className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-xs sm:text-sm font-medium touch-target"
                            >
                              Add to Cart
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div 
                          className="w-12 h-12 sm:w-16 sm:h-16 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => product.stock > 0 && addToCart(product)}
                        >
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-neutral-900 text-sm sm:text-base truncate">{product.name}</h3>
                          <p className="text-xs sm:text-sm text-neutral-500">{product.category}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-primary font-bold text-sm sm:text-base">KES {product.price.toFixed(2)}</p>
                            <p className={`text-xs ${
                              product.stock > 10 ? 'text-green-600' : 
                              product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {product.stock} left
                            </p>
                          </div>
                        </div>
                        
                        {/* Quantity Input for List View */}
                        {product.stock > 0 && (
                          <div className="flex items-center gap-2 ml-2 sm:ml-4">
                            <div className="flex items-center bg-neutral-50 rounded-lg border border-neutral-200">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentQty = parseInt(quantityInput[product.id]) || 1;
                                  if (currentQty > 1) {
                                    setQuantityInput(prev => ({ 
                                      ...prev, 
                                      [product.id]: (currentQty - 1).toString() 
                                    }));
                                  }
                                }}
                                className="p-1.5 hover:bg-neutral-200 rounded-l-lg transition-colors touch-target"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                value={quantityInput[product.id] || '1'}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleQuantityInputChange(product.id, e.target.value);
                                }}
                                className="w-8 sm:w-10 text-center bg-transparent text-xs border-none focus:outline-none touch-target"
                                min="1"
                                max={product.stock}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentQty = parseInt(quantityInput[product.id]) || 1;
                                  if (currentQty < product.stock) {
                                    setQuantityInput(prev => ({ 
                                      ...prev, 
                                      [product.id]: (currentQty + 1).toString() 
                                    }));
                                  }
                                }}
                                className="p-1.5 hover:bg-neutral-200 rounded-r-lg transition-colors touch-target"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              className="px-2 sm:px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-xs font-medium touch-target"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className={`${isFullscreen ? 'w-72 sm:w-80 lg:w-96' : 'w-full max-w-xs sm:max-w-sm lg:max-w-md'} bg-white border-l border-neutral-200 flex flex-col shadow-xl flex-shrink-0`}>
          <div className="p-3 sm:p-4 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900">Current Order</h2>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-3 sm:p-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Items:</span>
                <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="text-neutral-500">Cart is empty</p>
                  <p className="text-sm text-neutral-400 mt-1">Add products to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-neutral-50 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 text-sm">{item.name}</h3>
                        <p className="text-primary font-bold text-sm">KES {item.price.toLocaleString()}</p>
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
                          className="p-1.5 hover:bg-neutral-100 rounded-l-lg transition-colors touch-target"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1.5 font-medium text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 hover:bg-neutral-100 rounded-r-lg transition-colors touch-target"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-bold text-neutral-900 text-sm">
                        KES {(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
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
                <div className="flex justify-between font-bold border-t border-neutral-200 pt-2">
                  <span>Total:</span>
                  <span>KES {calculateTotals().total.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCart([])}
                  className="px-3 py-2.5 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors font-medium text-sm touch-target"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-3 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm touch-target"
                >
                  Pay Now
                </button>
              </div>
            </div>
          )}
        </div>
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
              className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">Payment</h2>
                <button
                  onClick={() => setShowPayment(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-target"
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
                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors touch-target ${
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
                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors touch-target ${
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
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
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
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
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
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-target"
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
              className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2">Payment Successful!</h2>
                <p className="text-neutral-600">Transaction completed successfully</p>
              </div>

              <div className="bg-neutral-50 rounded-lg p-3 sm:p-4 mb-6">
                <div className="text-center mb-4">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-primary">Penchic Farm</h3>
                  <p className="text-xs text-neutral-600">Limuru, Kiambu County, Kenya</p>
                  <p className="text-xs text-neutral-600">+254 722 395 370 | info@penchicfarm.com</p>
                  <div className="border-t border-neutral-200 mt-3 pt-3">
                    <p className="text-sm font-medium text-neutral-900">Receipt #{lastTransaction.orderId.slice(0, 8)}</p>
                    <p className="text-xs text-neutral-500">{lastTransaction.timestamp.toLocaleString()}</p>
                    <p className="text-xs text-neutral-500">Cashier: {user?.email}</p>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs font-medium text-neutral-700 border-b border-neutral-200 pb-1">
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Price</span>
                    <span>Total</span>
                  </div>
                  {lastTransaction.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-4 gap-1 text-xs">
                      <span className="truncate">{item.name}</span>
                      <span className="text-center">{item.quantity}</span>
                      <span className="text-right">{item.price.toLocaleString()}</span>
                      <span className="text-right font-medium">{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-200 pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>KES {lastTransaction.totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>KES {lastTransaction.totals.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-neutral-200 pt-2">
                    <span>Total:</span>
                    <span>KES {lastTransaction.totals.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-600 mt-2">
                    <span>Payment:</span>
                    <span>{lastTransaction.paymentMethod.toUpperCase()}</span>
                  </div>
                  {lastTransaction.cashAmount && (
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>Change:</span>
                      <span>KES {(lastTransaction.cashAmount - lastTransaction.totals.total).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center mt-4 pt-3 border-t border-neutral-200">
                  <p className="text-xs text-neutral-500 mb-1">Thank you for your business!</p>
                  <p className="text-xs text-neutral-400">Visit us again soon</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors touch-target"
                >
                  <Receipt className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors touch-target"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSInterface;