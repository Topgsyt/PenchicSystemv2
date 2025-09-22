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
  CreditCard, 
  Banknote, 
  Search, 
  X,
  Package,
  Calculator,
  Receipt,
  User,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Printer,
  Grid3X3,
  List,
  Filter,
  RefreshCw,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DiscountCalculator from '../../components/pos/DiscountCalculator';

const POSInterface: React.FC = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart } = useStore();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cartCollapsed, setCartCollapsed] = useState(false);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  // Discount state
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [discountTotal, setDiscountTotal] = useState(0);
  
  // Refs
  const receiptRef = useRef<HTMLDivElement>(null);

  // Check access permissions
  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  // Auto-clear errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fullscreen handling
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('name');

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    try {
      if (product.stock <= 0) {
        setError('Product is out of stock');
        return;
      }

      // Check if item already exists in cart
      const existingItem = cart.find(item => item.product.id === product.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      
      if (currentQuantity >= product.stock) {
        setError('Cannot add more items than available in stock');
        return;
      }

      addToCart({
        product,
        quantity: 1
      });

      // Update local product stock for immediate UI feedback
      setProducts(prev => 
        prev.map(p => 
          p.id === product.id 
            ? { ...p, stock: p.stock - 1 }
            : p
        )
      );
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      setError('Failed to add item to cart');
    }
  };

  const handleQuantityChange = (productId: string, variantId: string | undefined, change: number) => {
    try {
      const item = cart.find(cartItem => 
        cartItem.product.id === productId && 
        cartItem.variant?.id === variantId
      );
      
      if (!item) return;

      const newQuantity = item.quantity + change;
      
      if (newQuantity < 1) {
        handleRemoveFromCart(productId, variantId);
        return;
      }

      // Find current product to check stock
      const currentProduct = products.find(p => p.id === productId);
      const maxStock = currentProduct ? currentProduct.stock : item.product.stock;
      
      if (newQuantity > maxStock) {
        setError('Not enough stock available');
        return;
      }

      updateCartQuantity(productId, variantId, change);
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      setError('Failed to update quantity');
    }
  };

  const handleRemoveFromCart = (productId: string, variantId?: string) => {
    try {
      const item = cart.find(cartItem => 
        cartItem.product.id === productId && 
        cartItem.variant?.id === variantId
      );
      
      if (item) {
        // Restore stock to local state
        setProducts(prev => 
          prev.map(p => 
            p.id === productId 
              ? { ...p, stock: p.stock + item.quantity }
              : p
          )
        );
      }

      removeFromCart(productId, variantId);
    } catch (err: any) {
      console.error('Error removing from cart:', err);
      setError('Failed to remove item from cart');
    }
  };

  const handleDiscountApplied = (discounts: any[]) => {
    setAppliedDiscounts(discounts);
    const total = discounts.reduce((sum, discount) => sum + discount.savings, 0);
    setDiscountTotal(total);
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    return subtotal - discountTotal;
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    const total = calculateTotal();

    if (paymentMethod === 'cash') {
      const cashAmountNum = parseFloat(cashAmount);
      if (isNaN(cashAmountNum) || cashAmountNum < total) {
        setError('Please enter a valid cash amount that covers the total');
        return;
      }
    }

    if (paymentMethod === 'mpesa') {
      if (!mpesaPhone || mpesaPhone.length < 10) {
        setError('Please enter a valid M-Pesa phone number');
        return;
      }
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          total: total,
          status: 'completed',
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        price: item.product.price,
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

      // Update product stock in database
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id);

        if (stockError) {
          console.error('Error updating stock:', stockError);
        }
      }

      // Prepare receipt data
      setReceiptData({
        orderId: order.id,
        items: [...cart],
        subtotal: cart.reduce((total, item) => total + (item.product.price * item.quantity), 0),
        discounts: appliedDiscounts,
        discountTotal: discountTotal,
        total: total,
        paymentMethod: paymentMethod,
        cashAmount: paymentMethod === 'cash' ? parseFloat(cashAmount) : total,
        change: paymentMethod === 'cash' ? parseFloat(cashAmount) - total : 0,
        timestamp: new Date()
      });

      // Clear cart and show receipt
      clearCart();
      setShowPayment(false);
      setShowReceipt(true);
      setCashAmount('');
      setMpesaPhone('');
      setPaymentMethod(null);
      setAppliedDiscounts([]);
      setDiscountTotal(0);

      // Refresh products to get updated stock
      fetchProducts();

    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError('Payment processing failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      window.print();
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const finalTotal = calculateTotal();

  if (!user || !['admin', 'worker'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Access Denied</h2>
          <p className="text-neutral-600 mb-4">POS system is only available to authorized staff</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (showReceipt && receiptData) {
    return (
      <div className="min-h-screen bg-neutral-100 p-4">
        <div className="max-w-md mx-auto">
          <div ref={receiptRef} className="bg-white p-6 rounded-lg shadow-lg print:shadow-none print:rounded-none">
            {/* Receipt Header */}
            <div className="text-center mb-6 print:mb-4">
              <h1 className="text-2xl font-bold mb-2 print:text-xl">Penchic Farm</h1>
              <div className="text-sm text-neutral-600 space-y-1">
                <p>Limuru, Kiambu County</p>
                <p>Tel: +254 722 395 370</p>
                <p>Email: info@penchicfarm.com</p>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="border-t border-b border-neutral-300 py-4 mb-4 space-y-2 print:py-2">
              <div className="flex justify-between text-sm">
                <span>Receipt #:</span>
                <span>{receiptData.orderId.slice(0, 8)}</span>
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

            {/* Items */}
            <div className="mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-300">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((item: CartItem, index: number) => (
                    <tr key={index} className="border-b border-neutral-200">
                      <td className="py-2">{item.product.name}</td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="text-right py-2">
                        {item.product.price.toLocaleString()}
                      </td>
                      <td className="text-right py-2">
                        {(item.quantity * item.product.price).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>KES {receiptData.subtotal.toLocaleString()}</span>
              </div>
              {receiptData.discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-KES {receiptData.discountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-neutral-300 pt-2">
                <span>Total:</span>
                <span>KES {receiptData.total.toLocaleString()}</span>
              </div>
              {receiptData.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Paid:</span>
                    <span>KES {receiptData.cashAmount.toLocaleString()}</span>
                  </div>
                  {receiptData.change > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>Change:</span>
                      <span>KES {receiptData.change.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-neutral-600 border-t border-neutral-300 pt-4">
              <p>Thank you for shopping with us!</p>
              <p>Please keep this receipt for your records</p>
            </div>
          </div>

          {/* Receipt Actions */}
          <div className="mt-6 space-y-3 print:hidden">
            <button
              onClick={handlePrintReceipt}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Print Receipt
            </button>
            <button
              onClick={() => {
                setShowReceipt(false);
                setReceiptData(null);
              }}
              className="w-full bg-neutral-200 text-neutral-900 py-3 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              New Transaction
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className="min-h-screen bg-neutral-100 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">Payment</h2>
            <button
              onClick={() => setShowPayment(false)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-KES {discountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-neutral-300 pt-2">
                <span>Total:</span>
                <span>KES {finalTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod && (
            <div className="space-y-3">
              <h3 className="font-semibold text-neutral-900">Select Payment Method</h3>
              <button
                onClick={() => setPaymentMethod('cash')}
                className="w-full flex items-center justify-center gap-3 p-4 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <Banknote className="w-6 h-6 text-green-600" />
                <span className="font-medium">Cash Payment</span>
              </button>
              <button
                onClick={() => setPaymentMethod('mpesa')}
                className="w-full flex items-center justify-center gap-3 p-4 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <CreditCard className="w-6 h-6 text-blue-600" />
                <span className="font-medium">M-Pesa Payment</span>
              </button>
            </div>
          )}

          {/* Cash Payment Form */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Cash Amount Received
                </label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  min={finalTotal}
                  step="0.01"
                />
              </div>
              
              {cashAmount && parseFloat(cashAmount) >= finalTotal && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between text-green-800">
                    <span>Change:</span>
                    <span className="font-bold">
                      KES {(parseFloat(cashAmount) - finalTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processingPayment || !cashAmount || parseFloat(cashAmount) < finalTotal}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-neutral-400 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Processing...' : 'Complete Cash Payment'}
              </button>
            </div>
          )}

          {/* M-Pesa Payment Form */}
          {paymentMethod === 'mpesa' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="254XXXXXXXXX"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Customer will receive an M-Pesa prompt on their phone to pay KES {finalTotal.toLocaleString()}
                </p>
              </div>

              <button
                onClick={handlePayment}
                disabled={processingPayment || !mpesaPhone}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-neutral-400 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Processing...' : 'Send M-Pesa Request'}
              </button>
            </div>
          )}

          {paymentMethod && (
            <button
              onClick={() => {
                setPaymentMethod(null);
                setCashAmount('');
                setMpesaPhone('');
              }}
              className="w-full mt-4 bg-neutral-200 text-neutral-900 py-2 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              Back to Payment Methods
            </button>
          )}
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
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Products Section */}
        <div className="flex-1 p-4 overflow-hidden">
          {/* Search and Filters */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                onClick={fetchProducts}
                className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                title="Refresh products"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-white text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products Grid/List */}
          <div className="h-[calc(100%-140px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className={`gap-4 ${
                viewMode === 'grid' 
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                  : 'space-y-2'
              }`}>
                {filteredProducts.map(product => (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAddToCart(product)}
                    className={`bg-white rounded-lg border border-neutral-200 cursor-pointer hover:shadow-md transition-all ${
                      viewMode === 'grid' ? 'p-4' : 'p-3 flex items-center gap-4'
                    }`}
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={`object-cover rounded ${
                        viewMode === 'grid' ? 'w-full h-32 mb-3' : 'w-16 h-16'
                      }`}
                    />
                    <div className={viewMode === 'grid' ? 'text-center' : 'flex-1'}>
                      <h3 className={`font-medium text-neutral-900 ${
                        viewMode === 'grid' ? 'text-sm mb-2' : 'text-base mb-1'
                      }`}>
                        {product.name}
                      </h3>
                      <p className="text-primary font-bold">
                        KES {product.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Stock: {product.stock}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
                <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Products Found</h3>
                <p className="text-neutral-600">Try adjusting your search or category filter</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className={`bg-white border-l border-neutral-200 flex flex-col transition-all duration-300 ${
          cartCollapsed ? 'w-16' : 'w-96'
        }`}>
          {/* Cart Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            {!cartCollapsed && (
              <h2 className="text-lg font-bold text-neutral-900">Cart ({cart.length})</h2>
            )}
            <button
              onClick={() => setCartCollapsed(!cartCollapsed)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              {cartCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

          {!cartCollapsed && (
            <>
              {/* Discount Calculator */}
              <div className="p-4 border-b border-neutral-200">
                <DiscountCalculator
                  cartItems={cart}
                  onDiscountApplied={handleDiscountApplied}
                  userId={user?.id}
                />
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
                    <p className="text-neutral-600">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={`${item.product.id}-${item.variant?.id || 'default'}`} className="bg-neutral-50 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-neutral-900 truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-neutral-600">
                              KES {item.product.price.toLocaleString()} each
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuantityChange(item.product.id, item.variant?.id, -1)}
                                  className="p-1 hover:bg-neutral-200 rounded transition-colors"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item.product.id, item.variant?.id, 1)}
                                  className="p-1 hover:bg-neutral-200 rounded transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              
                              <button
                                onClick={() => handleRemoveFromCart(item.product.id, item.variant?.id)}
                                className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
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

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-neutral-200 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>KES {subtotal.toLocaleString()}</span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-KES {discountTotal.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-neutral-300 pt-2">
                      <span>Total:</span>
                      <span>KES {finalTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setShowPayment(true)}
                      className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors font-medium"
                    >
                      Proceed to Payment
                    </button>
                    <button
                      onClick={clearCart}
                      className="w-full bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Clear Cart
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default POSInterface;