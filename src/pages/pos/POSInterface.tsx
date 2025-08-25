import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Product, CartItem } from '../../types';
import { useDiscounts } from '../../hooks/useDiscounts';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Search,
  Package,
  User,
  Clock,
  DollarSign,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle,
  X,
  Calculator,
  Tag,
  Gift,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactToPrint from 'react-to-print';

interface POSCartItem extends CartItem {
  discount?: {
    type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
    value: number;
    original_price: number;
    discounted_price: number;
    savings: number;
    campaign_name: string;
    buy_quantity?: number;
    get_quantity?: number;
  };
}

const POSInterface = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { getProductDiscount } = useDiscounts();

  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      navigate('/');
      return;
    }
    
    fetchProducts();
    initializeSession();
  }, [user, navigate]);

  useEffect(() => {
    loadCartDiscounts();
  }, [cart, user]);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    window.dispatchEvent(new CustomEvent('posNotification', {
      detail: { type, title, message, timestamp: new Date() }
    }));
  };

  const initializeSession = async () => {
    try {
      const { data: session, error } = await supabase
        .from('pos_sessions')
        .insert([{
          user_id: user?.id,
          status: 'active',
          initial_float: 0
        }])
        .select()
        .single();

      if (error) throw error;
      setSessionId(session.id);
      showNotification('success', 'POS Session Started', 'Ready to process transactions');
    } catch (error) {
      console.error('Error initializing session:', error);
      showNotification('error', 'Session Error', 'Failed to initialize POS session');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('error', 'Data Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCartDiscounts = async () => {
    if (cart.length === 0) return;

    try {
      const updatedCart = await Promise.all(
        cart.map(async (item) => {
          try {
            const discountInfo = await getProductDiscount(item.product.id, item.quantity, user?.id);
            
            if (discountInfo) {
              return {
                ...item,
                discount: {
                  type: discountInfo.discount_type as 'percentage' | 'fixed_amount' | 'buy_x_get_y',
                  value: discountInfo.savings_percentage,
                  original_price: discountInfo.original_price,
                  discounted_price: discountInfo.final_price,
                  savings: discountInfo.discount_amount,
                  campaign_name: discountInfo.offer_description.split(':')[0] || 'Special Offer',
                  buy_quantity: discountInfo.buy_quantity,
                  get_quantity: discountInfo.get_quantity
                }
              };
            }
            return item;
          } catch (error) {
            console.error(`Error loading discount for ${item.product.name}:`, error);
            return item;
          }
        })
      );
      
      setCart(updatedCart);
    } catch (error) {
      console.error('Error loading cart discounts:', error);
    }
  };

  const addToCart = async (product: Product) => {
    try {
      if (product.stock <= 0) {
        showNotification('warning', 'Out of Stock', `${product.name} is currently out of stock`);
        return;
      }

      const existingItem = cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          showNotification('warning', 'Stock Limit', `Cannot add more ${product.name}. Only ${product.stock} available.`);
          return;
        }
        
        setCart(prev => prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        const newItem: POSCartItem = {
          product,
          quantity: 1
        };
        setCart(prev => [...prev, newItem]);
      }

      showNotification('success', 'Item Added', `${product.name} added to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showNotification('error', 'Cart Error', 'Failed to add item to cart');
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.product.stock) {
          showNotification('warning', 'Stock Limit', `Only ${item.product.stock} units available`);
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(c => c.product.id === productId);
    setCart(prev => prev.filter(item => item.product.id !== productId));
    if (item) {
      showNotification('info', 'Item Removed', `${item.product.name} removed from cart`);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let freeItems = 0;

    cart.forEach(item => {
      if (item.discount) {
        if (item.discount.type === 'buy_x_get_y') {
          const buyQty = item.discount.buy_quantity || 1;
          const getQty = item.discount.get_quantity || 1;
          const sets = Math.floor(item.quantity / buyQty);
          const paidItems = item.quantity - (sets * getQty);
          const itemSubtotal = paidItems * item.discount.original_price;
          subtotal += itemSubtotal;
          totalDiscount += (sets * getQty * item.discount.original_price);
          freeItems += sets * getQty;
        } else {
          subtotal += item.quantity * item.discount.discounted_price;
          totalDiscount += item.quantity * item.discount.savings;
        }
      } else {
        subtotal += item.quantity * item.product.price;
      }
    });

    const tax = subtotal * 0.16; // 16% VAT
    const total = subtotal + tax;

    return {
      subtotal,
      discount: totalDiscount,
      tax,
      total,
      freeItems,
      originalTotal: subtotal + totalDiscount + tax
    };
  };

  const processPayment = async () => {
    if (!paymentMethod) {
      showNotification('warning', 'Payment Method Required', 'Please select a payment method');
      return;
    }

    if (cart.length === 0) {
      showNotification('warning', 'Empty Cart', 'Please add items to cart before checkout');
      return;
    }

    const totals = calculateTotals();

    if (paymentMethod === 'cash') {
      const cashAmountNum = parseFloat(cashAmount);
      if (isNaN(cashAmountNum) || cashAmountNum < totals.total) {
        showNotification('warning', 'Insufficient Payment', `Cash amount must be at least KES ${totals.total.toLocaleString()}`);
        return;
      }
    }

    setProcessingPayment(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          total: totals.total,
          status: 'completed'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.discount ? item.discount.discounted_price : item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          order_id: order.id,
          amount: paymentMethod === 'cash' ? parseFloat(cashAmount) : totals.total,
          payment_method: paymentMethod,
          status: 'completed',
          authorized_by: user?.id
        }]);

      if (paymentError) throw paymentError;

      // Create POS transaction
      if (sessionId) {
        await supabase
          .from('pos_transactions')
          .insert([{
            session_id: sessionId,
            order_id: order.id,
            user_id: user?.id,
            transaction_type: 'sale',
            payment_method: paymentMethod,
            subtotal: totals.subtotal,
            tax_amount: totals.tax,
            discount_amount: totals.discount,
            total_amount: totals.total
          }]);
      }

      // Update product stock
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id);
      }

      // Generate receipt
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setReceiptData({
        receiptNumber,
        items: cart,
        totals,
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? parseFloat(cashAmount) : totals.total,
        change: paymentMethod === 'cash' ? parseFloat(cashAmount) - totals.total : 0,
        timestamp: new Date()
      });

      setShowReceipt(true);
      setCart([]);
      setCashAmount('');
      setPaymentMethod(null);
      setShowPayment(false);

      showNotification('success', 'Payment Completed', `Transaction processed successfully - ${receiptNumber}`);
      
      // Refresh products to update stock
      fetchProducts();

    } catch (error) {
      console.error('Error processing payment:', error);
      showNotification('error', 'Payment Failed', 'Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.body.classList.add('pos-fullscreen-mode');
    } else {
      document.body.classList.remove('pos-fullscreen-mode');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading POS System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">POS System</h1>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <User className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Products Section */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <motion.div
                key={product.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="aspect-square overflow-hidden bg-neutral-100">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-neutral-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  
                  {/* Enhanced Price Display with Discounts */}
                  <div className="mb-2">
                    <div className="text-lg font-bold text-neutral-900">
                      KES {product.price.toLocaleString()}
                    </div>
                    
                    {/* Discount Display Placeholder - Will be enhanced with real discount data */}
                    <div className="mt-1">
                      <div className="bg-gradient-to-r from-red-100 to-pink-100 rounded-lg p-2 border border-red-200">
                        <p className="text-red-800 font-bold text-center text-xs">
                          Sample: 20% OFF
                        </p>
                        <p className="text-red-700 text-center text-xs">
                          Was KES {(product.price * 1.25).toLocaleString()} Now KES {product.price.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* BOGO Display Placeholder */}
                    <div className="mt-1">
                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-2 border border-green-200">
                        <p className="text-green-800 font-bold text-center text-xs">
                          Buy 1 Get 1 Free!
                        </p>
                        <p className="text-green-700 text-center text-xs">
                          Special Promotional Offer
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{product.category}</span>
                    <span>{product.stock} left</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-500">No products found</p>
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="w-80 bg-white border-l border-neutral-200 flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">Cart</h2>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-neutral-600" />
                <span className="text-sm text-neutral-600">{cart.length} items</span>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <p className="text-neutral-500">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                    <div className="flex items-start gap-3">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-neutral-900 mb-1">
                          {item.product.name}
                        </h4>
                        
                        {/* Enhanced Price Display with Discounts */}
                        {item.discount ? (
                          <div className="space-y-1">
                            {item.discount.type === 'buy_x_get_y' ? (
                              <div>
                                <div className="text-sm font-bold text-neutral-900">
                                  KES {item.discount.original_price.toLocaleString()}
                                </div>
                                <div className="bg-green-100 rounded px-2 py-1">
                                  <p className="text-green-800 font-bold text-xs text-center">
                                    Buy {item.discount.buy_quantity} Get {item.discount.get_quantity} Free!
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-xs text-neutral-500 line-through">
                                  Was KES {item.discount.original_price.toLocaleString()}
                                </div>
                                <div className="text-sm font-bold text-red-600">
                                  Now KES {item.discount.discounted_price.toLocaleString()}
                                </div>
                                <div className="text-xs text-green-600 font-medium">
                                  Save KES {item.discount.savings.toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-neutral-900">
                            KES {item.product.price.toLocaleString()}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="p-1 bg-neutral-200 hover:bg-neutral-300 rounded transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="p-1 bg-neutral-200 hover:bg-neutral-300 rounded transition-colors"
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t border-neutral-200 p-4 space-y-4">
              {/* Enhanced Totals with Discount Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal:</span>
                  <span className="text-neutral-900">KES {totals.subtotal.toLocaleString()}</span>
                </div>
                
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Discount:</span>
                    <span className="text-green-600 font-medium">-KES {totals.discount.toLocaleString()}</span>
                  </div>
                )}
                
                {totals.freeItems > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Free Items:</span>
                    <span className="text-green-600 font-medium">{totals.freeItems} items</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Tax (16%):</span>
                  <span className="text-neutral-900">KES {totals.tax.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
                  <span className="text-neutral-900">Total:</span>
                  <span className="text-neutral-900">KES {totals.total.toLocaleString()}</span>
                </div>
                
                {totals.discount > 0 && (
                  <div className="text-center text-sm text-green-600 font-medium">
                    You saved KES {totals.discount.toLocaleString()}!
                  </div>
                )}
              </div>

              {/* Payment Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setPaymentMethod('cash');
                    setShowPayment(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Banknote className="w-5 h-5" />
                  Cash Payment
                </button>
                
                <button
                  onClick={() => {
                    setPaymentMethod('mpesa');
                    setShowPayment(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  M-Pesa Payment
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
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-neutral-900">
                  {paymentMethod === 'cash' ? 'Cash Payment' : 'M-Pesa Payment'}
                </h3>
                <button
                  onClick={() => {
                    setShowPayment(false);
                    setPaymentMethod(null);
                    setCashAmount('');
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                  <div className="text-center">
                    <p className="text-sm text-neutral-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      KES {totals.total.toLocaleString()}
                    </p>
                    {totals.discount > 0 && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        (You saved KES {totals.discount.toLocaleString()})
                      </p>
                    )}
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Cash Amount Received
                    </label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Enter cash amount"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      min={totals.total}
                      step="0.01"
                    />
                    {cashAmount && parseFloat(cashAmount) >= totals.total && (
                      <div className="mt-2 text-center">
                        <p className="text-sm text-neutral-600">Change:</p>
                        <p className="text-lg font-bold text-green-600">
                          KES {(parseFloat(cashAmount) - totals.total).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'mpesa' && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-blue-800 text-sm text-center">
                      Customer will receive M-Pesa prompt on their phone
                    </p>
                  </div>
                )}

                <button
                  onClick={processPayment}
                  disabled={processingPayment || (paymentMethod === 'cash' && (!cashAmount || parseFloat(cashAmount) < totals.total))}
                  className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete Payment
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && receiptData && (
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
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-neutral-900">Receipt</h3>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Receipt Content */}
                <div ref={receiptRef} className="receipt-container">
                  <div className="receipt-header">
                    <div className="receipt-business-name">Penchic Farm</div>
                    <div className="receipt-contact">
                      <p>Limuru, Kiambu County</p>
                      <p>Tel: +254 722 395 370</p>
                      <p>info@penchicfarm.com</p>
                    </div>
                  </div>

                  <div className="receipt-section">
                    <div className="flex justify-between text-sm">
                      <span>Receipt #:</span>
                      <span>{receiptData.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Date:</span>
                      <span>{receiptData.timestamp.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Time:</span>
                      <span>{receiptData.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cashier:</span>
                      <span>{user?.email}</span>
                    </div>
                  </div>

                  <table className="receipt-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptData.items.map((item: POSCartItem, index: number) => (
                        <tr key={index}>
                          <td>
                            <div>
                              {item.product.name}
                              {item.discount && (
                                <div className="text-xs text-green-600 mt-1">
                                  {item.discount.type === 'buy_x_get_y' 
                                    ? `Buy ${item.discount.buy_quantity} Get ${item.discount.get_quantity} Free`
                                    : `${Math.round(item.discount.value)}% OFF`
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-right">
                            {item.discount ? (
                              <div>
                                <div className="line-through text-xs">
                                  {item.discount.original_price.toLocaleString()}
                                </div>
                                <div className="text-red-600 font-bold">
                                  {item.discount.discounted_price.toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              item.product.price.toLocaleString()
                            )}
                          </td>
                          <td className="text-right font-bold">
                            {item.discount 
                              ? (item.quantity * item.discount.discounted_price).toLocaleString()
                              : (item.quantity * item.product.price).toLocaleString()
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="receipt-total-section">
                    <div className="receipt-total-line">
                      <span>Subtotal:</span>
                      <span>KES {receiptData.totals.subtotal.toLocaleString()}</span>
                    </div>
                    {receiptData.totals.discount > 0 && (
                      <div className="receipt-total-line text-green-600">
                        <span>Discount:</span>
                        <span>-KES {receiptData.totals.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="receipt-total-line">
                      <span>Tax (16%):</span>
                      <span>KES {receiptData.totals.tax.toLocaleString()}</span>
                    </div>
                    <div className="receipt-total-line receipt-grand-total">
                      <span>TOTAL:</span>
                      <span>KES {receiptData.totals.total.toLocaleString()}</span>
                    </div>
                    <div className="receipt-total-line">
                      <span>Paid ({receiptData.paymentMethod}):</span>
                      <span>KES {receiptData.cashAmount.toLocaleString()}</span>
                    </div>
                    {receiptData.change > 0 && (
                      <div className="receipt-total-line">
                        <span>Change:</span>
                        <span>KES {receiptData.change.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="receipt-footer">
                    <p>Thank you for shopping with us!</p>
                    <p>Visit us again soon</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <ReactToPrint
                    trigger={() => (
                      <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Print
                      </button>
                    )}
                    content={() => receiptRef.current}
                  />
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="flex-1 bg-neutral-200 text-neutral-700 py-2 rounded-lg hover:bg-neutral-300 transition-colors"
                  >
                    Close
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