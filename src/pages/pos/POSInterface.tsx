import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Product, CartItem } from '../../types';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  CreditCard, 
  Banknote, 
  Receipt, 
  User,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  Menu,
  Maximize2,
  Minimize2,
  Calculator,
  Clock,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DiscountCalculator from '../../components/pos/DiscountCalculator';

const POSInterface = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Check access permissions
  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.body.classList.add('pos-fullscreen-mode');
    } else {
      document.body.classList.remove('pos-fullscreen-mode');
    }
  };

  // Cleanup fullscreen on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('pos-fullscreen-mode');
    };
  }, []);

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
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        setError('Cannot add more items than available in stock');
        setTimeout(() => setError(null), 3000);
        return;
      }
      setCart(prev => 
        prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart(prev => [...prev, { product, quantity: 1 }]);
    }

    setSuccess(`${product.name} added to cart`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev => 
      prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + change;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.product.stock) {
            setError('Cannot exceed available stock');
            setTimeout(() => setError(null), 3000);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedDiscounts([]);
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const totalDiscounts = appliedDiscounts.reduce((sum, discount) => sum + discount.savings, 0);
    return subtotal - totalDiscounts;
  };

  const handleDiscountApplied = (discounts: any[]) => {
    setAppliedDiscounts(discounts);
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (paymentMethod === 'cash') {
      const cashAmountNum = parseFloat(cashAmount);
      const total = calculateTotal();
      if (isNaN(cashAmountNum) || cashAmountNum < total) {
        setError('Cash amount must be greater than or equal to total');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          total: calculateTotal(),
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
        price: item.product.price
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
          amount: paymentMethod === 'cash' ? parseFloat(cashAmount) : calculateTotal(),
          payment_method: paymentMethod,
          status: 'completed',
          authorized_by: user?.id
        }]);

      if (paymentError) throw paymentError;

      // Generate receipt
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setReceiptData({
        receiptNumber,
        items: [...cart],
        subtotal: calculateSubtotal(),
        discounts: [...appliedDiscounts],
        total: calculateTotal(),
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? parseFloat(cashAmount) : null,
        change: paymentMethod === 'cash' ? parseFloat(cashAmount) - calculateTotal() : 0,
        timestamp: new Date()
      });

      // Clear cart and show receipt
      clearCart();
      setShowPayment(false);
      setShowReceipt(true);
      setCashAmount('');
      setPaymentMethod(null);

      // Dispatch success notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'success',
          title: 'Payment Processed',
          message: `${paymentMethod === 'cash' ? 'Cash' : 'M-Pesa'} payment of KES ${calculateTotal().toLocaleString()} completed`,
          timestamp: new Date()
        }
      }));

    } catch (error) {
      console.error('Error processing payment:', error);
      setError('Failed to process payment. Please try again.');
      
      // Dispatch error notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'error',
          title: 'Payment Failed',
          message: 'Could not process payment. Please try again.',
          timestamp: new Date()
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];

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
    return (
      <div className="min-h-screen bg-neutral-100 p-4">
        <div className="max-w-md mx-auto">
          {/* Receipt */}
          <div 
            ref={receiptRef}
            className="bg-white p-6 rounded-lg shadow-lg print:shadow-none print:rounded-none print:p-4"
            id="receipt"
          >
            {/* Receipt Header */}
            <div className="text-center mb-6 print:mb-4">
              <h1 className="text-2xl font-bold text-neutral-900 print:text-lg">Penchic Farm</h1>
              <p className="text-neutral-600 print:text-xs">Limuru, Kiambu County</p>
              <p className="text-neutral-600 print:text-xs">Tel: +254 722 395 370</p>
              <p className="text-neutral-600 print:text-xs">info@penchicfarm.com</p>
            </div>

            {/* Receipt Details */}
            <div className="border-t border-b border-neutral-300 py-4 mb-4 space-y-2 print:py-2 print:mb-2">
              <div className="flex justify-between text-sm print:text-xs">
                <span>Receipt #:</span>
                <span className="font-mono">{receiptData.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-sm print:text-xs">
                <span>Date:</span>
                <span>{receiptData.timestamp.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm print:text-xs">
                <span>Time:</span>
                <span>{receiptData.timestamp.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between text-sm print:text-xs">
                <span>Cashier:</span>
                <span>{user?.email}</span>
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
                  {receiptData.items.map((item: CartItem, index: number) => (
                    <tr key={index} className="border-b border-neutral-200">
                      <td className="py-2 print:py-1">{item.product.name}</td>
                      <td className="text-center py-2 print:py-1">{item.quantity}</td>
                      <td className="text-right py-2 print:py-1">
                        {item.product.price.toLocaleString()}
                      </td>
                      <td className="text-right py-2 print:py-1">
                        {(item.product.price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6 print:mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>KES {receiptData.subtotal.toLocaleString()}</span>
              </div>
              {receiptData.discounts.length > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discounts:</span>
                  <span>-KES {receiptData.discounts.reduce((sum: number, d: any) => sum + d.savings, 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-neutral-300 pt-2">
                <span>Total:</span>
                <span>KES {receiptData.total.toLocaleString()}</span>
              </div>
              {receiptData.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Received:</span>
                    <span>KES {receiptData.cashAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>KES {receiptData.change.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-neutral-600 print:text-xs">
              <p>Thank you for shopping with us!</p>
              <p>Please keep this receipt for your records.</p>
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
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCartCollapsed(!cartCollapsed)}
              className="lg:hidden p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 text-red-800 p-4 m-4 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-200 text-green-800 p-4 m-4 rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
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
                className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 cursor-pointer hover:shadow-md transition-all"
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-lg font-bold text-primary mb-1">
                  KES {product.price.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500">Stock: {product.stock}</p>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
              <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
              <p className="text-neutral-600">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className={`bg-white border-l border-neutral-200 transition-all duration-300 ${
          cartCollapsed ? 'w-16' : 'w-80 lg:w-96'
        } ${cartCollapsed ? 'lg:block' : ''}`}>
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              {!cartCollapsed && (
                <h2 className="text-lg font-semibold">Cart ({cart.length})</h2>
              )}
              <button
                onClick={() => setCartCollapsed(!cartCollapsed)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {cartCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!cartCollapsed && (
            <div className="flex flex-col h-[calc(100vh-160px)]">
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-2">{item.product.name}</h4>
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
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1 bg-white rounded border border-neutral-300 hover:bg-neutral-100 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-1 bg-white rounded border border-neutral-300 hover:bg-neutral-100 transition-colors"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-medium text-sm">
                        KES {(item.product.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="text-center py-8 text-neutral-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                    <p>Cart is empty</p>
                  </div>
                )}
              </div>

              {/* Discount Calculator */}
              {cart.length > 0 && (
                <div className="px-4">
                  <DiscountCalculator
                    cartItems={cart}
                    onDiscountApplied={handleDiscountApplied}
                    userId={user?.id}
                  />
                </div>
              )}

              {/* Cart Summary */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-neutral-200 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>KES {calculateSubtotal().toLocaleString()}</span>
                    </div>
                    {appliedDiscounts.length > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discounts:</span>
                        <span>-KES {appliedDiscounts.reduce((sum, d) => sum + d.savings, 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
                      <span>Total:</span>
                      <span>KES {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setShowPayment(true)}
                      className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      Checkout
                    </button>
                    <button
                      onClick={clearCart}
                      className="w-full bg-neutral-200 text-neutral-700 py-2 rounded-lg hover:bg-neutral-300 transition-colors"
                    >
                      Clear Cart
                    </button>
                  </div>
                </div>
              )}
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
              <h2 className="text-xl font-bold mb-6 text-center">Payment</h2>
              
              <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    KES {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              {!paymentMethod ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Banknote className="w-6 h-6" />
                    <div>
                      <p className="font-medium">Cash Payment</p>
                      <p className="text-sm text-blue-200">Pay with cash</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('mpesa')}
                    className="w-full flex items-center justify-center gap-3 bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CreditCard className="w-6 h-6" />
                    <div>
                      <p className="font-medium">M-Pesa Payment</p>
                      <p className="text-sm text-green-200">Mobile money</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethod === 'cash' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Cash Amount Received:</label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="Enter cash amount"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        min={calculateTotal()}
                        step="0.01"
                      />
                      {parseFloat(cashAmount) >= calculateTotal() && (
                        <p className="mt-2 text-green-600">
                          Change: KES {(parseFloat(cashAmount) - calculateTotal()).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPaymentMethod(null);
                        setCashAmount('');
                      }}
                      className="flex-1 bg-neutral-200 text-neutral-700 py-3 rounded-lg hover:bg-neutral-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={processPayment}
                      disabled={isProcessing || (paymentMethod === 'cash' && parseFloat(cashAmount) < calculateTotal())}
                      className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Complete Payment'}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowPayment(false)}
                className="w-full mt-4 text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSInterface;