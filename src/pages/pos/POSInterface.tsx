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
  CheckCircle
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

  // <-- NEW: state for cart collapse toggle
  const [cartCollapsed, setCartCollapsed] = useState(false);

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

      <div className="flex flex-1 min-h-0 overflow-hidden">
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
                        <div className="flex flex-col items-start">
                          <h3 className="font-semibold text-neutral-900 text-sm sm:text-base truncate w-full">{product.name}</h3>
                          <p className="text-primary font-bold text-xs sm:text-sm">KES {product.price.toLocaleString()}</p>
                          <p className="text-neutral-500 text-xs sm:text-sm mt-1">{product.category}</p>
                          {product.stock <= 0 && <p className="text-red-500 text-xs mt-1">Out of stock</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-neutral-900 text-sm sm:text-base truncate">{product.name}</h3>
                          <p className="text-neutral-500 text-xs sm:text-sm">{product.category}</p>
                          {product.stock <= 0 && <p className="text-red-500 text-xs mt-1">Out of stock</p>}
                        </div>
                        <div className="text-right min-w-[90px]">
                          <p className="text-primary font-bold text-sm sm:text-base">KES {product.price.toLocaleString()}</p>
                          <p className="text-neutral-400 text-xs sm:text-sm mt-1">Stock: {product.stock}</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div
          className={`${
            isFullscreen
              ? cartCollapsed ? 'w-16 lg:w-20' : 'w-80 lg:w-96'
              : cartCollapsed ? 'w-16' : 'w-full max-w-xs sm:max-w-sm lg:max-w-md'
          } bg-white border-l border-neutral-200 flex flex-col shadow-xl flex-shrink-0 transition-width duration-300 ease-in-out`}
        >
          <div className="p-3 sm:p-4 border-b border-neutral-200 flex-shrink-0 flex items-center justify-between">
            <h2 className={`text-base sm:text-lg font-bold text-neutral-900 ${cartCollapsed ? 'truncate' : ''}`}>
              Current Order
            </h2>
            <button
              onClick={() => setCartCollapsed(!cartCollapsed)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-target"
              title={cartCollapsed ? 'Expand Cart' : 'Collapse Cart'}
              aria-label={cartCollapsed ? 'Expand Cart' : 'Collapse Cart'}
            >
              {cartCollapsed ? (
                <Plus className="w-5 h-5" />
              ) : (
                <Minus className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Only show cart content if not collapsed */}
          {!cartCollapsed && (
            <>
              <div className="p-3 sm:p-4 border-b border-neutral-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Items:</span>
                      <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0 max-h-full">
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
            </>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-lg max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-4">Complete Payment</h2>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Select Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg p-2"
                >
                  <option value="">Select</option>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Cash Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg p-2"
                  />
                </div>
              )}

              {paymentMethod === 'mpesa' && (
                <div className="mb-4">
                  <label className="block mb-1 font-medium">M-Pesa Reference</label>
                  <input
                    type="text"
                    value={mpesaReference}
                    onChange={(e) => setMpesaReference(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg p-2"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPayment(false)}
                  className="px-4 py-2 rounded bg-neutral-200 hover:bg-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark"
                >
                  Pay
                </button>
              </div>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReceipt(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-lg max-w-md w-full p-6 relative overflow-y-auto max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-4">Receipt</h2>
              <div className="mb-4">
                <p><strong>Order ID:</strong> {lastTransaction.orderId}</p>
                <p><strong>Date:</strong> {lastTransaction.timestamp.toLocaleString()}</p>
                <p><strong>Payment Method:</strong> {lastTransaction.paymentMethod}</p>
                {lastTransaction.paymentMethod === 'cash' && (
                  <p><strong>Cash Amount:</strong> KES {lastTransaction.cashAmount}</p>
                )}
                {lastTransaction.paymentMethod === 'mpesa' && (
                  <p><strong>M-Pesa Reference:</strong> {lastTransaction.mpesaReference}</p>
                )}
              </div>
              <div className="mb-4">
                <table className="w-full text-sm border-collapse border border-neutral-300">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-neutral-300 p-2 text-left">Product</th>
                      <th className="border border-neutral-300 p-2 text-right">Qty</th>
                      <th className="border border-neutral-300 p-2 text-right">Price</th>
                      <th className="border border-neutral-300 p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastTransaction.items.map((item) => (
                      <tr key={item.id}>
                        <td className="border border-neutral-300 p-2">{item.name}</td>
                        <td className="border border-neutral-300 p-2 text-right">{item.quantity}</td>
                        <td className="border border-neutral-300 p-2 text-right">KES {item.price.toLocaleString()}</td>
                        <td className="border border-neutral-300 p-2 text-right">
                          KES {(item.price * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>KES {lastTransaction.totals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (16%):</span>
                  <span>KES {lastTransaction.totals.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-neutral-200 pt-2 text-sm">
                  <span>Total:</span>
                  <span>KES {lastTransaction.totals.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowReceipt(false)}
                  className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark"
                >
                  Close
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
