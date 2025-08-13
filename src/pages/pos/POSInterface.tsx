import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Product, CartItem } from '../../types';
import { useDiscounts } from '../../hooks/useDiscounts';
import { useInventoryVisibility } from '../../hooks/useInventoryVisibility';
import DiscountCalculator from '../../components/pos/DiscountCalculator';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  Search,
  Grid3X3,
  List,
  User,
  LogOut,
  Maximize,
  Minimize,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  Calculator,
  DollarSign,
  Percent,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const POSInterface = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const { canViewStock } = useInventoryVisibility(user?.role);
  const { getProductDiscount } = useDiscounts();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [isCartCollapsed, setIsCartCollapsed] = useState(false);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  // Check user permissions
  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  // Fullscreen management
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('pos-fullscreen-mode');
    } else {
      document.body.classList.remove('pos-fullscreen-mode');
    }

    return () => {
      document.body.classList.remove('pos-fullscreen-mode');
    };
  }, [isFullscreen]);

  // Load products with discount information
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;

      // Load discount information for each product
      const productsWithDiscounts = await Promise.all(
        (data || []).map(async (product) => {
          try {
            const discountInfo = await getProductDiscount(product.id, 1, user?.id);
            return {
              ...product,
              discount: discountInfo
            };
          } catch (error) {
            console.error(`Error loading discount for product ${product.id}:`, error);
            return product;
          }
        })
      );

      setProducts(productsWithDiscounts);
      
      // Show success notification
      showNotification('success', 'Products Loaded', `${productsWithDiscounts.length} products loaded successfully`);
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('error', 'Loading Error', 'Failed to load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced notification system
  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    window.dispatchEvent(new CustomEvent('posNotification', {
      detail: {
        type,
        title,
        message,
        timestamp: new Date()
      }
    }));
  };

  // Add item to cart with discount calculation
  const addToCart = async (product: Product) => {
    try {
      const existingItem = cart.find(item => item.product.id === product.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + 1;

      if (newQuantity > product.stock) {
        showNotification('warning', 'Stock Limit', `Only ${product.stock} units available for ${product.name}`);
        return;
      }

      // Calculate discount for the new quantity
      const discountInfo = await getProductDiscount(product.id, newQuantity, user?.id);
      const productWithDiscount = {
        ...product,
        discount: discountInfo
      };

      if (existingItem) {
        setCart(prev =>
          prev.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity, product: productWithDiscount }
              : item
          )
        );
      } else {
        setCart(prev => [...prev, { product: productWithDiscount, quantity: 1 }]);
      }

      // Update product stock locally
      setProducts(prev =>
        prev.map(p =>
          p.id === product.id ? { ...p, stock: p.stock - 1 } : p
        )
      );

      const discountMessage = discountInfo 
        ? ` (${discountInfo.savings_percentage.toFixed(0)}% discount applied)`
        : '';
      
      showNotification('success', 'Item Added', `${product.name} added to cart${discountMessage}`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showNotification('error', 'Add to Cart Failed', 'Could not add item to cart. Please try again.');
    }
  };

  // Remove item from cart
  const removeFromCart = (productId: string) => {
    const item = cart.find(item => item.product.id === productId);
    if (!item) return;

    setCart(prev => prev.filter(item => item.product.id !== productId));
    
    // Restore stock locally
    setProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, stock: p.stock + item.quantity } : p
      )
    );

    showNotification('info', 'Item Removed', `${item.product.name} removed from cart`);
  };

  // Update cart quantity
  const updateCartQuantity = async (productId: string, change: number) => {
    try {
      const item = cart.find(item => item.product.id === productId);
      if (!item) return;

      const newQuantity = item.quantity + change;
      const product = products.find(p => p.id === productId);
      
      if (!product) return;

      if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
      }

      if (newQuantity > product.stock + item.quantity) {
        showNotification('warning', 'Stock Limit', `Only ${product.stock + item.quantity} units available`);
        return;
      }

      // Recalculate discount for new quantity
      const discountInfo = await getProductDiscount(productId, newQuantity, user?.id);
      const productWithDiscount = {
        ...product,
        discount: discountInfo
      };

      setCart(prev =>
        prev.map(cartItem =>
          cartItem.product.id === productId
            ? { ...cartItem, quantity: newQuantity, product: productWithDiscount }
            : cartItem
        )
      );

      // Update product stock locally
      const stockChange = change > 0 ? -change : Math.abs(change);
      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, stock: p.stock + stockChange } : p
        )
      );

    } catch (error) {
      console.error('Error updating quantity:', error);
      showNotification('error', 'Update Failed', 'Could not update item quantity');
    }
  };

  // Calculate totals with discounts
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;

    cart.forEach(item => {
      const originalPrice = item.product.price * item.quantity;
      subtotal += originalPrice;

      if (item.product.discount) {
        const itemOriginalTotal = (item.product.discount.original_price || item.product.price) * item.quantity;
        const itemDiscountedTotal = (item.product.discount.discounted_price || item.product.price) * item.quantity;
        totalDiscount += (itemOriginalTotal - itemDiscountedTotal);
      }
    });

    const total = subtotal - totalDiscount;
    return { subtotal, totalDiscount, total };
  };

  // Process payment
  const processPayment = async () => {
    try {
      if (cart.length === 0) {
        showNotification('warning', 'Empty Cart', 'Please add items to cart before payment');
        return;
      }

      const { total } = calculateTotals();

      if (paymentMethod === 'cash') {
        const cashAmountNum = parseFloat(cashAmount);
        if (isNaN(cashAmountNum) || cashAmountNum < total) {
          showNotification('error', 'Insufficient Payment', `Cash amount must be at least KES ${total.toLocaleString()}`);
          return;
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          total: total,
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
        price: item.product.discount ? item.product.discount.final_price : item.product.price
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

      // Apply discount usage tracking
      for (const item of cart) {
        if (item.product.discount) {
          try {
            const { error: usageError } = await supabase
              .from('discount_usage')
              .insert([{
                campaign_id: item.product.discount.campaign_id,
                order_id: order.id,
                user_id: user?.id,
                discount_amount: item.product.discount.discount_amount * item.quantity,
                quantity_used: item.quantity
              }]);

            if (usageError) {
              console.error('Error tracking discount usage:', usageError);
            }
          } catch (discountError) {
            console.error('Discount tracking failed:', discountError);
          }
        }
      }

      // Generate receipt
      const receiptNumber = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setReceiptData({
        receiptNumber,
        items: [...cart],
        totals: calculateTotals(),
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? parseFloat(cashAmount) : total,
        timestamp: new Date(),
        orderId: order.id
      });

      setShowReceipt(true);
      setCart([]);
      setCashAmount('');
      setShowPayment(false);
      
      showNotification('success', 'Payment Completed', `Order processed successfully - Receipt #${receiptNumber}`);
      
      // Refresh products to get updated stock
      fetchProducts();

    } catch (error) {
      console.error('Error processing payment:', error);
      showNotification('error', 'Payment Failed', 'Could not process payment. Please try again.');
    }
  };

  // Print receipt
  const printReceipt = () => {
    window.print();
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const { subtotal, totalDiscount, total } = calculateTotals();

  // Render product price with discount
  const renderProductPrice = (product: Product) => {
    if (product.discount) {
      if (product.discount.type === 'buy_x_get_y') {
        return (
          <div className="text-center">
            <div className="mb-2">
              <span className="text-lg font-bold text-neutral-900">
                KES {product.price.toLocaleString()}
              </span>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-2 py-2 rounded-lg text-xs font-bold border-2 border-green-300">
              Buy {product.discount.buy_quantity} Get {product.discount.get_quantity} Free!
            </div>
          </div>
        );
      } else {
        return (
          <div className="text-center">
            <div className="text-sm text-neutral-500 line-through mb-1">
              Was KES {product.discount.original_price?.toLocaleString() || product.price.toLocaleString()}
            </div>
            <div className="text-lg font-bold text-red-600">
              Now KES {product.discount.discounted_price?.toLocaleString() || product.price.toLocaleString()}
            </div>
            <div className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 px-2 py-2 rounded-lg text-xs font-bold border-2 border-red-300">
              {product.discount.type === 'percentage' ? 
                `${product.discount.value.toFixed(0)}% OFF` :
                `Save KES ${product.discount.savings.toLocaleString()}`
              }
            </div>
          </div>
        );
      }
    }

    return (
      <div className="text-center">
        <div className="text-lg font-bold text-neutral-900">
          KES {product.price.toLocaleString()}
        </div>
      </div>
    );
  };

  // Render cart item with discount
  const renderCartItemPrice = (item: CartItem) => {
    if (item.product.discount) {
      if (item.product.discount.type === 'buy_x_get_y') {
        return (
          <div className="text-right">
            <div className="text-sm font-medium text-neutral-900">
              KES {(item.product.price * item.quantity).toLocaleString()}
            </div>
            <div className="text-xs text-green-600 font-medium">
              Buy {item.product.discount.buy_quantity} Get {item.product.discount.get_quantity} Free
            </div>
          </div>
        );
      } else {
        const originalTotal = (item.product.discount.original_price || item.product.price) * item.quantity;
        const discountedTotal = (item.product.discount.discounted_price || item.product.price) * item.quantity;
        
        return (
          <div className="text-right">
            <div className="text-xs text-neutral-500 line-through">
              Was KES {originalTotal.toLocaleString()}
            </div>
            <div className="text-sm font-bold text-red-600">
              Now KES {discountedTotal.toLocaleString()}
            </div>
            <div className="text-xs text-green-600 font-medium">
              Save KES {(originalTotal - discountedTotal).toLocaleString()}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="text-right">
        <div className="text-sm font-medium text-neutral-900">
          KES {(item.product.price * item.quantity).toLocaleString()}
        </div>
      </div>
    );
  };

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

  if (showReceipt && receiptData) {
    const change = receiptData.cashAmount - receiptData.totals.total;
    
    return (
      <div className="min-h-screen bg-neutral-100 p-4">
        <div className="max-w-md mx-auto">
          <div 
            ref={receiptRef}
            className="bg-white p-6 rounded-lg shadow-lg print:shadow-none print:rounded-none print:p-4"
          >
            {/* Receipt Header */}
            <div className="text-center mb-6 print:mb-4">
              <h1 className="text-2xl font-bold text-neutral-900 print:text-xl">Penchic Farm</h1>
              <p className="text-neutral-600 print:text-sm">Limuru, Kiambu County</p>
              <p className="text-neutral-600 print:text-sm">Tel: +254 722 395 370</p>
              <p className="text-neutral-600 print:text-sm">info@penchicfarm.com</p>
            </div>

            {/* Receipt Details */}
            <div className="border-t border-b border-neutral-300 py-4 mb-4 print:py-2 print:mb-2">
              <div className="grid grid-cols-2 gap-4 text-sm print:text-xs">
                <div>
                  <p className="text-neutral-500">Receipt #:</p>
                  <p className="font-medium">{receiptData.receiptNumber}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Date:</p>
                  <p className="font-medium">{receiptData.timestamp.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Time:</p>
                  <p className="font-medium">{receiptData.timestamp.toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Cashier:</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6 print:mb-4">
              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-neutral-300">
                    <th className="text-left py-2 print:py-1">Item</th>
                    <th className="text-center py-2 print:py-1">Qty</th>
                    <th className="text-right py-2 print:py-1">Price</th>
                    <th className="text-right py-2 print:py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((item: CartItem, index: number) => {
                    const itemTotal = item.product.discount 
                      ? (item.product.discount.discounted_price || item.product.price) * item.quantity
                      : item.product.price * item.quantity;
                    
                    return (
                      <tr key={index} className="border-b border-neutral-200">
                        <td className="py-2 print:py-1">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            {item.product.discount && (
                              <p className="text-xs text-green-600">
                                {item.product.discount.type === 'buy_x_get_y' 
                                  ? `Buy ${item.product.discount.buy_quantity} Get ${item.product.discount.get_quantity} Free`
                                  : `${item.product.discount.value.toFixed(0)}% OFF`
                                }
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-2 print:py-1">{item.quantity}</td>
                        <td className="text-right py-2 print:py-1">
                          {item.product.discount ? (
                            <div>
                              <div className="text-xs text-neutral-500 line-through">
                                {(item.product.discount.original_price || item.product.price).toLocaleString()}
                              </div>
                              <div className="font-medium">
                                {(item.product.discount.discounted_price || item.product.price).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div className="font-medium">
                              {item.product.price.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="text-right py-2 print:py-1 font-medium">
                          {itemTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6 print:mb-4">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal:</span>
                <span className="font-medium">KES {receiptData.totals.subtotal.toLocaleString()}</span>
              </div>
              {receiptData.totals.totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Total Discount:</span>
                  <span className="font-medium">-KES {receiptData.totals.totalDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-neutral-300 pt-2">
                <span>Total:</span>
                <span>KES {receiptData.totals.total.toLocaleString()}</span>
              </div>
              {paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Cash Received:</span>
                    <span className="font-medium">KES {receiptData.cashAmount.toLocaleString()}</span>
                  </div>
                  {change > 0 && (
                    <div className="flex justify-between text-lg font-bold">
                      <span>Change:</span>
                      <span>KES {change.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-neutral-600 text-sm print:text-xs">
              <p>Thank you for shopping with us!</p>
              <p>Visit us again soon.</p>
            </div>
          </div>

          {/* Receipt Actions */}
          <div className="mt-6 space-y-3 print:hidden">
            <button
              onClick={printReceipt}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              Print Receipt
            </button>
            <button
              onClick={() => {
                setShowReceipt(false);
                setReceiptData(null);
              }}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              New Transaction
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* POS Header */}
      <div className="bg-white border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">POS System</h1>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-neutral-600">Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <User className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Exit POS
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Products Section */}
        <div className="flex-1 p-4 overflow-hidden">
          {/* Search and Filters */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid/List */}
          <div className="h-[calc(100%-120px)] overflow-y-auto">
            <div className={`gap-4 ${
              viewMode === 'grid' 
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                : 'space-y-2'
            }`}>
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(product)}
                  className={`bg-white rounded-lg border border-neutral-200 cursor-pointer hover:shadow-md transition-all ${
                    viewMode === 'grid' ? 'p-3' : 'p-4 flex items-center gap-4'
                  }`}
                >
                  <div className={`${viewMode === 'grid' ? 'aspect-square mb-3' : 'w-16 h-16 flex-shrink-0'} overflow-hidden rounded`}>
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <h3 className={`font-medium text-neutral-900 mb-1 ${
                      viewMode === 'grid' ? 'text-sm' : 'text-base'
                    }`}>
                      {product.name}
                    </h3>
                    
                    {renderProductPrice(product)}
                    
                    {canViewStock && (
                      <div className="mt-2 flex items-center gap-1">
                        <Package className="w-3 h-3 text-neutral-500" />
                        <span className="text-xs text-neutral-500">
                          {product.stock} in stock
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className={`bg-white border-l border-neutral-200 flex flex-col transition-all duration-300 ${
          isCartCollapsed ? 'w-16' : 'w-80 lg:w-96'
        }`}>
          {/* Cart Header */}
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              {!isCartCollapsed && (
                <h2 className="text-lg font-semibold text-neutral-900">Cart ({cart.length})</h2>
              )}
              <button
                onClick={() => setIsCartCollapsed(!isCartCollapsed)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {isCartCollapsed ? <ShoppingCart className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isCartCollapsed && (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.product.id} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-neutral-900 text-sm truncate">
                              {item.product.name}
                            </h4>
                            {item.product.discount && (
                              <div className="mt-1">
                                {item.product.discount.discount_type === 'buy_x_get_y' ? (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                                    Buy {item.product.discount.buy_quantity} Get {item.product.discount.get_quantity} Free
                                  </span>
                                ) : (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                                    {item.product.discount.savings_percentage.toFixed(0)}% OFF
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="p-1 hover:bg-neutral-200 rounded transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className="p-1 hover:bg-neutral-200 rounded transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {renderCartItemPrice(item)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Totals and Checkout */}
              {cart.length > 0 && (
                <div className="border-t border-neutral-200 p-4 space-y-4">
                  {/* Discount Calculator */}
                  <DiscountCalculator
                    cartItems={cart}
                    onDiscountApplied={setAppliedDiscounts}
                    userId={user?.id}
                  />
                  
                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Subtotal:</span>
                      <span className="font-medium">KES {subtotal.toLocaleString()}</span>
                      Was KES {(product.discount.original_price || product.price).toLocaleString()}
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                      Now KES {(product.discount.discounted_price || product.price).toLocaleString()}
                        <span className="font-medium">-KES {totalDiscount.toLocaleString()}</span>
                    <div className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 px-2 py-2 rounded-lg text-xs font-bold border-2 border-red-300 mt-1">
                      {product.discount.type === 'percentage' ? 
                        `${product.discount.value.toFixed(0)}% OFF` :
                        `Save KES ${product.discount.savings.toLocaleString()}`
                      <span>KES {total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setPaymentMethod('cash');
                        setShowPayment(true);
                      }}
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Banknote className="w-5 h-5" />
                      Cash Payment
                    </button>
                    <button
                      onClick={() => {
                        setPaymentMethod('mpesa');
                        setShowPayment(true);
                      }}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      M-Pesa Payment
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
                  onClick={() => setShowPayment(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-neutral-600">Subtotal:</span>
                    <span className="font-medium">KES {subtotal.toLocaleString()}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between items-center mb-2 text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-KES {totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold border-t border-neutral-200 pt-2">
                    <span>Total:</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Cash Amount Received:
                    </label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="Enter cash amount"
                      min={total}
                      step="0.01"
                    />
                    {cashAmount && parseFloat(cashAmount) >= total && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700 font-medium">Change:</span>
                          <span className="text-green-700 font-bold">
                            KES {(parseFloat(cashAmount) - total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={processPayment}
                    disabled={paymentMethod === 'cash' && (!cashAmount || parseFloat(cashAmount) < total)}
                    className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Process Payment
                  </button>
                  
                  <button
                    onClick={() => setShowPayment(false)}
                    className="w-full bg-neutral-200 text-neutral-700 py-3 rounded-lg hover:bg-neutral-300 transition-colors"
                  >
                    Cancel
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