import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ShoppingBag, CreditCard, Banknote, ArrowLeft } from 'lucide-react';

const Checkout = () => {
  const cartItems = useStore((state) => state.cart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();

  // Check if user can access checkout (only admin and worker)
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  // Redirect if user cannot access checkout
  useEffect(() => {
    if (!canUseCart) {
      navigate('/');
    }
  }, [canUseCart, navigate]);

  if (!canUseCart) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Access Restricted</h2>
          <p className="text-neutral-600 mb-4">Checkout is only available to staff members</p>
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

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  const handlePayment = (method: string) => {
    if (cartItems.length === 0) {
      alert('Your cart is empty. Please add items before payment.');
      return;
    }
    
    if (method === 'mpesa') {
      navigate('/payment/mpesa');
    } else if (method === 'cash') {
      navigate('/payment/cash');
    } else {
      alert('Please select a valid payment method.');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Your cart is empty</h2>
          <p className="text-neutral-600 mb-4">Add some items to your cart to proceed with checkout</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-200">
          <div className="p-6 md:p-8">
            <button
              onClick={() => navigate('/cart')}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </button>

            <h1 className="text-3xl font-bold mb-8 text-neutral-900">Checkout</h1>

            <div className="space-y-6">
              <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
                <h2 className="text-xl font-semibold mb-4 text-neutral-900">Order Summary</h2>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div>
                          <h3 className="font-medium text-neutral-900">{item.product.name}</h3>
                          <p className="text-neutral-600">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium text-neutral-900">
                        KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <div className="flex justify-between items-center text-xl font-bold text-neutral-900">
                    <span>Total Amount</span>
                    <span>KES {totalAmount.toLocaleString('en-KE')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
                <h2 className="text-xl font-semibold mb-4 text-neutral-900">Select Payment Method</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handlePayment('mpesa')}
                    className="flex items-center justify-center gap-3 bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CreditCard className="w-5 h-5" />
                    <div className="text-left">
                      <p className="font-medium">M-Pesa</p>
                      <p className="text-sm text-green-200">Pay via mobile money</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handlePayment('cash')}
                    className="flex items-center justify-center gap-3 bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Banknote className="w-5 h-5" />
                    <div className="text-left">
                      <p className="font-medium">Cash</p>
                      <p className="text-sm text-blue-200">Pay on delivery</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;