import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { CreditCard, Banknote, Store, Receipt, Calendar, Clock } from 'lucide-react';

const Payment: React.FC = () => {
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showMpesa, setShowMpesa] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<{ paybill_number: string; account_number: string } | null>(null);
  const cartItems = useStore((state) => state.cart);
  const user = useStore((state) => state.user);
  const clearCart = useStore((state) => state.clearCart);
  const navigate = useNavigate();

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      const { data, error } = await supabase
        .from('payment_info')
        .select('paybill_number, account_number')
        .single();

      if (error) {
        console.error('Error fetching payment info:', error);
        setError('Error loading payment information');
      } else {
        setPaymentInfo(data);
      }
    };

    fetchPaymentInfo();
  }, []);

  const generateReceiptNumber = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `RCP-${timestamp}-${random}`;
  };

  const handlePayment = (method: 'mpesa' | 'cash') => {
    if (method === 'mpesa') {
      setShowMpesa(true);
    } else if (method === 'cash') {
      setShowConfirmation(true);
    }
  };

  const handleMpesaPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate cart before processing
      if (cartItems.length === 0) {
        setError('Cart is empty. Please add items before payment.');
        return;
      }

      // Validate cart before processing
      if (cartItems.length === 0) {
        setError('Cart is empty. Please add items before payment.');
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id,
            total: totalAmount,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cartItems.map((item) => ({
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

      // Create payment record for M-Pesa
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          order_id: order.id,
          amount: totalAmount,
          payment_method: 'mpesa',
          status: 'pending'
        }]);

      if (paymentError) {
        console.error('Payment record error:', paymentError);
        // Continue even if payment record fails
        // Continue even if payment record fails
      }

      setReceiptItems([...cartItems]);
      const receiptNum = generateReceiptNumber();
      setReceiptNumber(receiptNum);
      setShowReceipt(true);
      clearCart();

      // Dispatch notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'success',
          title: 'M-Pesa Payment Initiated',
          message: `Payment request sent for KES ${totalAmount.toLocaleString()}`,
          timestamp: new Date()
        }
      }));
      // Dispatch notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'success',
          title: 'M-Pesa Payment Initiated',
          message: `Payment request sent for KES ${totalAmount.toLocaleString()}`,
          timestamp: new Date()
        }
      }));

    } catch (error) {
      console.error('Error processing order:', error);
      setError('Error creating order. Please try again.');
      
      // Dispatch error notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'error',
          title: 'M-Pesa Payment Failed',
          message: 'Could not initiate M-Pesa payment. Please try again.',
          timestamp: new Date()
        }
      }));
      
      // Dispatch error notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'error',
          title: 'M-Pesa Payment Failed',
          message: 'Could not initiate M-Pesa payment. Please try again.',
          timestamp: new Date()
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    const paymentAmountNum = parseFloat(paymentAmount as string);
    if (isNaN(paymentAmountNum) || paymentAmountNum < totalAmount) {
      alert('Please enter a valid amount that covers the total.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Cart is empty. Please add items before payment.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Cart is empty. Please add items before payment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id,
            total: totalAmount,
            status: 'completed',
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cartItems.map((item) => ({
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

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            order_id: order.id,
            amount: paymentAmountNum,
            payment_method: 'cash',
            status: 'completed',
            authorized_by: user?.id
          },
        ]);

      if (paymentError) throw paymentError;

      setReceiptItems([...cartItems]);
      const receiptNum = generateReceiptNumber();
      setReceiptNumber(receiptNum);
      setShowReceipt(true);
      clearCart();

      // Dispatch success notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'success',
          title: 'Cash Payment Completed',
          message: `Payment of KES ${paymentAmountNum.toLocaleString()} processed successfully`,
          timestamp: new Date()
        }
      }));
      // Dispatch success notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'success',
          title: 'Cash Payment Completed',
          message: `Payment of KES ${paymentAmount.toLocaleString()} processed successfully`,
          timestamp: new Date()
        }
      }));

    } catch (error) {
      console.error('Error processing payment:', error);
      setError('Error processing payment. Please try again.');
      
      // Dispatch error notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'error',
          title: 'Cash Payment Failed',
          message: 'Could not process cash payment. Please try again.',
          timestamp: new Date()
        }
      }));
      
      // Dispatch error notification
      window.dispatchEvent(new CustomEvent('posNotification', {
        detail: {
          type: 'error',
          title: 'Cash Payment Failed',
          message: 'Could not process cash payment. Please try again.',
          timestamp: new Date()
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (showReceipt) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = currentDate.toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const change = Number(paymentAmount) - totalAmount;

    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-neutral-200" id="receipt">
          <div className="text-center mb-8">
            <Store className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-3xl font-bold mb-2 text-neutral-900">Penchic Farm</h1>
            <div className="text-neutral-600 space-y-1">
              <p>Limuru, Kiambu County</p>
              <p>Tel: +254 700 000 000</p>
              <p>info@penchicfarm.com</p>
            </div>
          </div>

          <div className="border-t border-b border-neutral-300 py-4 mb-6 space-y-2">
            <div className="flex items-center gap-2 text-neutral-600">
              <Receipt className="w-4 h-4" />
              <span>Receipt #: {receiptNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Clock className="w-4 h-4" />
              <span>{formattedTime}</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 text-neutral-900">Purchase Details</h2>
            <table className="w-full">
              <thead>
                <tr className="text-neutral-600 text-sm border-b border-neutral-300">
                  <th className="text-left py-2">Item</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {receiptItems.map((item, index) => (
                  <tr key={index} className="text-neutral-900">
                    <td className="py-2">{item.product.name}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">
                      {item.product.price.toLocaleString('en-KE')}
                    </td>
                    <td className="text-right">
                      {(item.quantity * item.product.price).toLocaleString('en-KE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-neutral-300 pt-4 mb-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Subtotal:</span>
                <span className="text-neutral-900">KES {totalAmount.toLocaleString('en-KE')}</span>
              </div>
              {paymentAmount && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Amount Paid:</span>
                  <span className="text-neutral-900">KES {Number(paymentAmount).toLocaleString('en-KE')}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between items-center text-lg font-bold text-neutral-900">
                  <span>Change:</span>
                  <span>KES {change.toLocaleString('en-KE')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-neutral-600 text-sm mb-8">
            <p>Thank you for shopping with us!</p>
            <p>Please keep this receipt for your records.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handlePrintReceipt}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Print Receipt
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showMpesa) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-neutral-200">
          <h2 className="text-2xl font-bold mb-6 text-center text-neutral-900">M-Pesa Payment</h2>

          <div className="space-y-6">
            <div className="bg-neutral-50 p-6 rounded-lg text-center border border-neutral-200">
              <p className="text-sm text-neutral-600 mb-2">Amount to Pay</p>
              <p className="text-3xl font-bold mb-6 text-neutral-900">KES {totalAmount.toLocaleString('en-KE')}</p>
              
              <div className="space-y-2 text-left">
                <p className="text-sm text-neutral-600">Pay To:</p>
                <p className="text-xl font-bold text-neutral-900">Penchic Farm</p>
                <div className="space-y-1">
                  <p className="text-neutral-600">Paybill Number:</p>
                  <p className="text-2xl font-mono text-neutral-900">{paymentInfo?.paybill_number}</p>
                  <p className="text-neutral-600">Account Number:</p>
                  <p className="text-2xl font-mono text-neutral-900">{paymentInfo?.account_number}</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 rounded-lg space-y-4 border border-neutral-200">
              <h3 className="font-semibold text-lg text-neutral-900">How to Pay:</h3>
              <ol className="list-decimal list-inside space-y-2 text-neutral-700">
                <li>Go to M-PESA on your phone</li>
                <li>Select Pay Bill</li>
                <li>Enter Business no. {paymentInfo?.paybill_number}</li>
                <li>Enter Account no. {paymentInfo?.account_number}</li>
                <li>Enter Amount KES {totalAmount.toLocaleString('en-KE')}</li>
                <li>Enter your M-PESA PIN and Send</li>
              </ol>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 text-red-500 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleMpesaPayment}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-neutral-400"
              >
                {loading ? 'Processing...' : 'Generate Receipt'}
              </button>

              <button
                onClick={() => setShowMpesa(false)}
                disabled={loading}
                className="w-full bg-neutral-200 text-neutral-900 py-3 rounded-lg hover:bg-neutral-300 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-neutral-200">
          <h2 className="text-2xl font-bold mb-6 text-center text-neutral-900">Payment Confirmation</h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-neutral-900">
              <span>Total Amount:</span>
              <span>KES {totalAmount.toLocaleString('en-KE')}</span>
            </div>

            <div className="space-y-2">
              <label htmlFor="paymentAmount" className="block text-neutral-900">
                Enter Cash Amount:
              </label>
              <input
                type="number"
                id="paymentAmount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:outline-none"
                min={totalAmount}
              />
            </div>

            {typeof paymentAmount === 'number' && paymentAmount >= totalAmount && (
              <div className="flex justify-between text-green-600">
                <span>Change:</span>
                <span>KES {(paymentAmount - totalAmount).toLocaleString('en-KE')}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 text-red-500 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleConfirmPayment}
              disabled={loading || typeof paymentAmount !== 'number' || paymentAmount < totalAmount}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-neutral-400"
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
              className="w-full bg-neutral-200 text-neutral-900 py-2 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-neutral-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-neutral-900">Choose Payment Method</h2>

        <div className="space-y-4">
          <button
            onClick={() => handlePayment('mpesa')}
            className="w-full bg-green-600 text-white py-3 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Pay with M-Pesa
          </button>
          <button
            onClick={() => handlePayment('cash')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
          >
            <Banknote className="w-5 h-5 mr-2" />
            Pay with Cash
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-neutral-600">Total Amount:</p>
          <p className="text-2xl font-bold text-neutral-900">KES {totalAmount.toLocaleString('en-KE')}</p>
        </div>
      </div>
    </div>
  );
};

export default Payment;