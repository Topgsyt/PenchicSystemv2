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
      <header className="bg-white border-b border-neutral-200 px-4 lg:px-6 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Point of Sale</h1>
                <p className="text-sm text-neutral-500">Session Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700">Online</span>
            </div>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Products Panel */}
        {/* ... (Products panel same as previous message) */}

        {/* Cart Panel */}
        {/* ... (Cart panel same as previous message) */}
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
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Payment Successful!</h2>
                <p className="text-neutral-600">Transaction completed successfully</p>
              </div>

              <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-lg">Penchic Farm</h3>
                  <p className="text-sm text-neutral-600">Receipt #{lastTransaction.orderId.slice(0, 8)}</p>
                  <p className="text-xs text-neutral-500">{lastTransaction.timestamp.toLocaleString()}</p>
                </div>

                <div className="space-y-2 mb-4">
                  {lastTransaction.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span>KES {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-200 pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>KES {lastTransaction.totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>KES {lastTransaction.totals.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>KES {lastTransaction.totals.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-600">
                    <span>Payment:</span>
                    <span>{lastTransaction.paymentMethod.toUpperCase()}</span>
                  </div>
                  {lastTransaction.cashAmount && (
                    <div className="flex justify-between text-sm text-neutral-600">
                      <span>Change:</span>
                      <span>KES {(lastTransaction.cashAmount - lastTransaction.totals.total).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  <Receipt className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
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
