import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Smartphone,
  Banknote,
  Calculator,
  Package,
  User,
  LogOut,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DiscountCalculator from '../../components/pos/DiscountCalculator';
import { Product, CartItem } from '../../types';

const POSInterface = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartQuantity = useStore((state) => state.updateCartQuantity);
  const clearCart = useStore((state) => state.clearCart);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [processing, setProcessing] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchProducts();
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
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Product out of stock');
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem && existingItem.quantity >= product.stock) {
      alert('Cannot add more items than available in stock');
      return;
    }

    addToCart({ product, quantity: 1 });
  };

  const handleDiscountApplied = (discounts: any[]) => {
    setAppliedDiscounts(discounts);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const calculateDiscountTotal = () => {
    return appliedDiscounts.reduce((sum, discount) => sum + discount.savings, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountTotal();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    setProcessing(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id,
            status: 'completed',
            total: calculateTotal(),
            cashier_id: user?.id
          }
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        price: item.product.price,
        discount_amount: appliedDiscounts.find(d => d.productId === item.product.id)?.discountAmount || 0
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            order_id: order.id,
            amount: calculateTotal(),
            payment_method: paymentMethod,
            status: 'completed'
          }
        ]);

      if (paymentError) throw paymentError;

      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id);

        if (stockError) throw stockError;
      }

      clearCart();
      setShowCheckout(false);
      setAppliedDiscounts([]);
      alert('Order completed successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-neutral-900">POS Terminal</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-neutral-500" />
                  <span className="text-sm text-neutral-600">{user?.email}</span>
                </div>
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Exit POS
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAddToCart(product)}
                  className="bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-lg transition-all text-left"
                >
                  <div className="aspect-square bg-neutral-100 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-1 truncate">{product.name}</h3>
                  <p className="text-primary font-bold text-lg mb-1">KES {product.price.toLocaleString()}</p>
                  <p className="text-sm text-neutral-500">Stock: {product.stock}</p>
                </motion.button>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Products Found</h3>
                <p className="text-neutral-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-96 bg-white border-l border-neutral-200 flex flex-col">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                Cart
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-600 transition-colors text-sm"
                >
                  Clear All
                </button>
              )}
            </div>
            <p className="text-sm text-neutral-600">{cart.length} items</p>
          </div>

          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <div className="text-center py-12 px-4">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                <p className="text-neutral-600">Cart is empty</p>
              </div>
            ) : (
              <>
                <div className="p-4 space-y-3">
                  {cart.map((item) => (
                    <div key={`${item.product.id}-${item.variant?.id || ''}`} className="bg-neutral-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-neutral-900 flex-1">{item.product.name}</h3>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.variant?.id, -1)}
                            className="p-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.variant?.id, 1)}
                            className="p-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100"
                            disabled={item.quantity >= item.product.stock}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-bold text-neutral-900">
                          KES {(item.product.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <DiscountCalculator
                  cartItems={cart}
                  onDiscountApplied={handleDiscountApplied}
                  userId={user?.id}
                />
              </>
            )}
          </div>

          <div className="border-t border-neutral-200 p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">KES {calculateSubtotal().toLocaleString()}</span>
              </div>
              {calculateDiscountTotal() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Discount</span>
                  <span className="font-medium text-green-600">-KES {calculateDiscountTotal().toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
                <span>Total</span>
                <span className="text-primary">KES {calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
            >
              <CreditCard className="w-5 h-5" />
              Checkout
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCheckout && (
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
                <h2 className="text-xl font-bold text-neutral-900">Complete Payment</h2>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-neutral-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-medium">KES {calculateSubtotal().toLocaleString()}</span>
                  </div>
                  {calculateDiscountTotal() > 0 && (
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-green-600">Discount</span>
                      <span className="font-medium text-green-600">-KES {calculateDiscountTotal().toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
                    <span>Total</span>
                    <span className="text-primary">KES {calculateTotal().toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-primary bg-primary/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Banknote className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === 'cash' ? 'text-primary' : 'text-neutral-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        paymentMethod === 'cash' ? 'text-primary' : 'text-neutral-600'
                      }`}>Cash</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('mpesa')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'mpesa'
                          ? 'border-primary bg-primary/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Smartphone className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === 'mpesa' ? 'text-primary' : 'text-neutral-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        paymentMethod === 'mpesa' ? 'text-primary' : 'text-neutral-600'
                      }`}>M-Pesa</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'card'
                          ? 'border-primary bg-primary/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === 'card' ? 'text-primary' : 'text-neutral-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        paymentMethod === 'card' ? 'text-primary' : 'text-neutral-600'
                      }`}>Card</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Confirm'}
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
