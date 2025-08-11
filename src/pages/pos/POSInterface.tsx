import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Product, CartItem } from '../../types';
import { useDiscounts } from '../../hooks/useDiscounts';
import { useInventoryVisibility } from '../../hooks/useInventoryVisibility';
import DiscountCalculator from '../../components/pos/DiscountCalculator';
import { useReactToPrint } from 'react-to-print';
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
  AlertCircle,
  CheckCircle,
  X,
  Calculator,
  Users,
  Clock,
  DollarSign,
  Percent,
  Gift,
  Tag,
  Monitor,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  User,
  LogOut,
  Bell,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface POSCartItem extends CartItem {
  appliedDiscount?: {
    campaignId: string;
    discountAmount: number;
    finalPrice: number;
    description: string;
  };
}

interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
}

const POSInterface = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const { canViewStock } = useInventoryVisibility(user?.role);
  const { getProductDiscount } = useDiscounts();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  // Check user permissions
  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to access the POS system',
        duration: 5000
      });
      navigate('/');
      return;
    }
    
    initializePOS();
  }, [user, navigate]);

  // Add notification function
  const addNotification = (notification: Omit<NotificationState, 'id' | 'timestamp'>) => {
    const newNotification: NotificationState = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 10));

    // Auto-remove notification after duration
    if (notification.duration) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, notification.duration);
    }

    // Dispatch custom event for header notifications
    window.dispatchEvent(new CustomEvent('posNotification', {
      detail: newNotification
    }));
  };

  // Initialize POS system
  const initializePOS = async () => {
    try {
      setLoading(true);
      
      // Start POS session
      const { data: session, error: sessionError } = await supabase
        .from('pos_sessions')
        .insert([{
          user_id: user?.id,
          status: 'active',
          initial_float: 0
        }])
        .select()
        .single();

      if (sessionError) {
        console.error('Session error:', sessionError);
        addNotification({
          type: 'warning',
          title: 'Session Warning',
          message: 'Could not create POS session, continuing without session tracking',
          duration: 5000
        });
      } else {
        setCurrentSession(session);
        addNotification({
          type: 'success',
          title: 'POS Ready',
          message: 'Point of Sale system initialized successfully',
          duration: 3000
        });
      }

      await fetchProducts();
    } catch (error) {
      console.error('POS initialization error:', error);
      addNotification({
        type: 'error',
        title: 'Initialization Failed',
        message: 'Failed to initialize POS system. Please refresh and try again.',
        duration: 10000
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch products with error handling
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;

      if (data) {
        setProducts(data);
        addNotification({
          type: 'info',
          title: 'Inventory Loaded',
          message: `${data.length} products available for sale`,
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      addNotification({
        type: 'error',
        title: 'Product Load Failed',
        message: 'Could not load product inventory. Please check your connection.',
        duration: 5000
      });
      setProducts([]);
    }
  };

  // Add item to POS cart with discount calculation
  const addToPosCart = async (product: Product, quantity: number = 1) => {
    try {
      // Check stock availability
      if (quantity > product.stock) {
        addNotification({
          type: 'warning',
          title: 'Insufficient Stock',
          message: `Only ${product.stock} units of ${product.name} available`,
          duration: 4000
        });
        return;
      }

      // Calculate discount if available
      let appliedDiscount = null;
      try {
        const discountInfo = await getProductDiscount(product.id, quantity, user?.id);
        if (discountInfo) {
          appliedDiscount = {
            campaignId: discountInfo.campaign_id,
            discountAmount: discountInfo.discount_amount,
            finalPrice: discountInfo.final_price,
            description: discountInfo.offer_description
          };
        }
      } catch (discountError) {
        console.error('Discount calculation error:', discountError);
        // Continue without discount if calculation fails
      }

      // Check if item already exists in cart
      const existingItemIndex = posCart.findIndex(item => item.product.id === product.id);
      
      if (existingItemIndex >= 0) {
        const existingItem = posCart[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;
        
        if (newQuantity > product.stock) {
          addNotification({
            type: 'warning',
            title: 'Stock Limit Reached',
            message: `Cannot add more ${product.name}. Maximum ${product.stock} units available.`,
            duration: 4000
          });
          return;
        }

        const updatedCart = [...posCart];
        updatedCart[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          appliedDiscount
        };
        setPosCart(updatedCart);
      } else {
        const newItem: POSCartItem = {
          product,
          quantity,
          appliedDiscount
        };
        setPosCart(prev => [...prev, newItem]);
      }

      addNotification({
        type: 'success',
        title: 'Item Added',
        message: `${quantity}x ${product.name} added to cart${appliedDiscount ? ' with discount' : ''}`,
        duration: 2000
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      addNotification({
        type: 'error',
        title: 'Add to Cart Failed',
        message: 'Could not add item to cart. Please try again.',
        duration: 4000
      });
    }
  };

  // Update cart quantity
  const updateCartQuantity = (productId: string, change: number) => {
    setPosCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(0, item.quantity + change);
          
          if (newQuantity === 0) {
            addNotification({
              type: 'info',
              title: 'Item Removed',
              message: `${item.product.name} removed from cart`,
              duration: 2000
            });
            return null;
          }
          
          if (newQuantity > item.product.stock) {
            addNotification({
              type: 'warning',
              title: 'Stock Limit',
              message: `Only ${item.product.stock} units available`,
              duration: 3000
            });
            return item;
          }

          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as POSCartItem[];
    });
  };

  // Remove item from cart
  const removeFromCart = (productId: string) => {
    const item = posCart.find(item => item.product.id === productId);
    if (item) {
      setPosCart(prev => prev.filter(item => item.product.id !== productId));
      addNotification({
        type: 'info',
        title: 'Item Removed',
        message: `${item.product.name} removed from cart`,
        duration: 2000
      });
    }
  };

  // Clear entire cart
  const clearCart = () => {
    if (posCart.length > 0) {
      setPosCart([]);
      setAppliedDiscounts([]);
      addNotification({
        type: 'info',
        title: 'Cart Cleared',
        message: 'All items removed from cart',
        duration: 2000
      });
    }
  };

  // Calculate totals with discounts
  const calculateTotals = () => {
    const subtotal = posCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const totalDiscounts = appliedDiscounts.reduce((sum, discount) => sum + discount.discountAmount, 0);
    const total = subtotal - totalDiscounts;
    
    return {
      subtotal,
      totalDiscounts,
      total: Math.max(0, total)
    };
  };

  // Process payment
  const processPayment = async () => {
    if (posCart.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Empty Cart',
        message: 'Please add items to cart before processing payment',
        duration: 3000
      });
      return;
    }

    if (paymentMethod === 'cash') {
      const cashAmountNum = parseFloat(cashAmount);
      const { total } = calculateTotals();
      
      if (isNaN(cashAmountNum) || cashAmountNum < total) {
        addNotification({
          type: 'error',
          title: 'Insufficient Payment',
          message: `Cash amount must be at least KES ${total.toLocaleString()}`,
          duration: 4000
        });
        return;
      }
    }

    try {
      setLoading(true);
      
      const { total } = calculateTotals();
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          total,
          status: 'completed'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = posCart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.appliedDiscount ? item.appliedDiscount.finalPrice : item.product.price
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
          amount: paymentMethod === 'cash' ? parseFloat(cashAmount) : total,
          payment_method: paymentMethod,
          status: 'completed',
          authorized_by: user?.id
        }]);

      if (paymentError) throw paymentError;

      // Create POS transaction record
      if (currentSession) {
        const { error: transactionError } = await supabase
          .from('pos_transactions')
          .insert([{
            session_id: currentSession.id,
            order_id: order.id,
            user_id: user?.id,
            transaction_type: 'sale',
            payment_method: paymentMethod,
            subtotal: calculateTotals().subtotal,
            discount_amount: calculateTotals().totalDiscounts,
            total_amount: total
          }]);

        if (transactionError) {
          console.error('Transaction log error:', transactionError);
          // Don't fail the entire transaction for logging errors
        }
      }

      // Apply discount usage tracking
      for (const discount of appliedDiscounts) {
        try {
          await supabase
            .from('discount_usage')
            .insert([{
              campaign_id: discount.campaignId,
              order_id: order.id,
              user_id: user?.id,
              discount_amount: discount.discountAmount,
              quantity_used: discount.quantity
            }]);
        } catch (discountError) {
          console.error('Discount usage tracking error:', discountError);
          // Continue even if discount tracking fails
        }
      }

      // Prepare receipt data
      const receiptNumber = `POS-${Date.now()}`;
      setReceiptData({
        receiptNumber,
        order,
        items: posCart,
        totals: calculateTotals(),
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? parseFloat(cashAmount) : total,
        change: paymentMethod === 'cash' ? parseFloat(cashAmount) - total : 0,
        timestamp: new Date(),
        cashier: user?.email,
        appliedDiscounts
      });

      // Clear cart and show receipt
      setPosCart([]);
      setAppliedDiscounts([]);
      setShowPayment(false);
      setShowReceipt(true);
      setCashAmount('');
      setPaymentMethod(null);

      addNotification({
        type: 'success',
        title: 'Payment Processed',
        message: `Order completed successfully. Receipt #${receiptNumber}`,
        duration: 5000
      });

      // Refresh products to update stock
      await fetchProducts();

    } catch (error) {
      console.error('Payment processing error:', error);
      addNotification({
        type: 'error',
        title: 'Payment Failed',
        message: 'Failed to process payment. Please try again or contact support.',
        duration: 8000
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle discount application
  const handleDiscountApplied = (discounts: any[]) => {
    setAppliedDiscounts(discounts);
    
    if (discounts.length > 0) {
      const totalSavings = discounts.reduce((sum, d) => sum + d.discountAmount, 0);
      addNotification({
        type: 'success',
        title: 'Discounts Applied',
        message: `${discounts.length} discount(s) applied. Total savings: KES ${totalSavings.toLocaleString()}`,
        duration: 4000
      });
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.body.classList.add('pos-fullscreen-mode');
      addNotification({
        type: 'info',
        title: 'Fullscreen Mode',
        message: 'POS is now in fullscreen mode',
        duration: 2000
      });
    } else {
      document.body.classList.remove('pos-fullscreen-mode');
      addNotification({
        type: 'info',
        title: 'Windowed Mode',
        message: 'POS returned to windowed mode',
        duration: 2000
      });
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const { subtotal, totalDiscounts, total } = calculateTotals();

  if (loading && !products.length) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Initializing POS System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Enhanced Header with Notifications */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-neutral-900">Point of Sale</h1>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  <Wifi className="w-3 h-3" />
                  <span>Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </div>
              )}
              {currentSession && (
                <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                  Session: {currentSession.id.slice(0, 8)}
                </div>
              )}
            </div>
          </div>

          {/* Header Notifications */}
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {notifications.slice(0, 3).map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    notification.type === 'success' ? 'bg-green-100 text-green-800' :
                    notification.type === 'error' ? 'bg-red-100 text-red-800' :
                    notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}
                >
                  {notification.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  {notification.type === 'error' && <AlertCircle className="w-4 h-4" />}
                  {notification.type === 'warning' && <AlertCircle className="w-4 h-4" />}
                  {notification.type === 'info' && <Bell className="w-4 h-4" />}
                  <span className="max-w-48 truncate">{notification.message}</span>
                  <button
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    className="ml-2 hover:bg-black/10 rounded p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Back to Admin"
              >
                <Monitor className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Products Section */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToPosCart(product)}
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
                  <h3 className="font-semibold text-sm text-neutral-900 mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-primary mb-2">
                    KES {product.price.toLocaleString()}
                  </p>
                  
                  {canViewStock && (
                    <div className="flex items-center gap-1 text-xs">
                      <Package className="w-3 h-3 text-neutral-500" />
                      <span className={`font-medium ${
                        product.stock > 10 ? 'text-green-600' :
                        product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {product.stock} units
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Products Found</h3>
              <p className="text-neutral-600">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className={`bg-white border-l border-neutral-200 flex flex-col transition-all duration-300 ${
          cartCollapsed ? 'w-16' : 'w-96'
        }`}>
          {/* Cart Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            {!cartCollapsed && (
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-neutral-900">Cart</h2>
                <span className="bg-primary text-white px-2 py-1 rounded-full text-xs">
                  {posCart.length}
                </span>
              </div>
            )}
            <button
              onClick={() => setCartCollapsed(!cartCollapsed)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              {cartCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>

          {!cartCollapsed && (
            <>
              {/* Discount Calculator */}
              {posCart.length > 0 && (
                <div className="p-4 border-b border-neutral-200">
                  <DiscountCalculator
                    cartItems={posCart}
                    onDiscountApplied={handleDiscountApplied}
                    userId={user?.id}
                  />
                </div>
              )}

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {posCart.length > 0 ? (
                  <div className="space-y-3">
                    {posCart.map((item) => (
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
                            
                            {item.appliedDiscount ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs line-through text-neutral-500">
                                    KES {item.product.price.toLocaleString()}
                                  </span>
                                  <span className="text-sm font-bold text-green-600">
                                    KES {item.appliedDiscount.finalPrice.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-green-600 font-medium">
                                  {item.appliedDiscount.description}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-neutral-900">
                                KES {item.product.price.toLocaleString()}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center bg-white rounded-lg border border-neutral-300">
                                <button
                                  onClick={() => updateCartQuantity(item.product.id, -1)}
                                  className="p-1 hover:bg-neutral-100 rounded-l-lg transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 py-1 text-sm font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQuantity(item.product.id, 1)}
                                  className="p-1 hover:bg-neutral-100 rounded-r-lg transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                    <p>Cart is empty</p>
                    <p className="text-sm">Add products to start a sale</p>
                  </div>
                )}
              </div>

              {/* Cart Summary and Payment */}
              {posCart.length > 0 && (
                <div className="border-t border-neutral-200 p-4 space-y-4">
                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Subtotal:</span>
                      <span className="font-medium">KES {subtotal.toLocaleString()}</span>
                    </div>
                    {totalDiscounts > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discounts:</span>
                        <span className="font-medium text-green-600">-KES {totalDiscounts.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
                      <span>Total:</span>
                      <span>KES {total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  {!showPayment ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setPaymentMethod('cash');
                          setShowPayment(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Banknote className="w-4 h-4" />
                        Cash Payment
                      </button>
                      <button
                        onClick={() => {
                          setPaymentMethod('mpesa');
                          setShowPayment(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        M-Pesa Payment
                      </button>
                      <button
                        onClick={clearCart}
                        className="w-full bg-neutral-200 text-neutral-700 py-2 rounded-lg hover:bg-neutral-300 transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentMethod === 'cash' && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Cash Amount (KES)
                          </label>
                          <input
                            type="number"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder={total.toString()}
                            min={total}
                            step="0.01"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          {cashAmount && parseFloat(cashAmount) >= total && (
                            <p className="text-sm text-green-600 mt-1">
                              Change: KES {(parseFloat(cashAmount) - total).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <button
                          onClick={processPayment}
                          disabled={loading || (paymentMethod === 'cash' && (!cashAmount || parseFloat(cashAmount) < total))}
                          className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Processing...' : `Complete ${paymentMethod?.toUpperCase()} Payment`}
                        </button>
                        <button
                          onClick={() => {
                            setShowPayment(false);
                            setPaymentMethod(null);
                            setCashAmount('');
                          }}
                          className="w-full bg-neutral-200 text-neutral-700 py-2 rounded-lg hover:bg-neutral-300 transition-colors"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">Receipt</h2>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Content */}
              <div ref={receiptRef} className="space-y-4 print:p-4 print:bg-white print:text-black">
                <div className="text-center border-b border-neutral-200 pb-4 print:border-black">
                  <h1 className="text-xl font-bold print:text-lg">Penchic Farm</h1>
                  <p className="text-sm text-neutral-600 print:text-black">Limuru, Kiambu County</p>
                  <p className="text-sm text-neutral-600 print:text-black">Tel: +254 722 395 370</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Receipt #:</span>
                    <span className="font-mono">{receiptData.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{receiptData.timestamp.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{receiptData.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{receiptData.cashier}</span>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 print:border-black">
                  <h3 className="font-semibold mb-3">Items</h3>
                  <div className="space-y-2">
                    {receiptData.items.map((item: POSCartItem, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-neutral-500">
                            {item.quantity} x KES {(item.appliedDiscount ? item.appliedDiscount.finalPrice : item.product.price).toLocaleString()}
                          </p>
                          {item.appliedDiscount && (
                            <p className="text-green-600 text-xs">
                              {item.appliedDiscount.description}
                            </p>
                          )}
                        </div>
                        <span className="font-medium">
                          KES {((item.appliedDiscount ? item.appliedDiscount.finalPrice : item.product.price) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 space-y-2 print:border-black">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>KES {receiptData.totals.subtotal.toLocaleString()}</span>
                  </div>
                  {receiptData.totals.totalDiscounts > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Total Discounts:</span>
                      <span>-KES {receiptData.totals.totalDiscounts.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>KES {receiptData.totals.total.toLocaleString()}</span>
                  </div>
                  {receiptData.paymentMethod === 'cash' && (
                    <>
                      <div className="flex justify-between">
                        <span>Cash Paid:</span>
                        <span>KES {receiptData.cashAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change:</span>
                        <span>KES {receiptData.change.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center text-sm text-neutral-500 border-t border-neutral-200 pt-4 print:border-black print:text-black">
                  <p>Thank you for your business!</p>
                  <p>Visit us again soon</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 print:hidden">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Receipt className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-neutral-200 text-neutral-700 py-3 rounded-lg hover:bg-neutral-300 transition-colors"
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