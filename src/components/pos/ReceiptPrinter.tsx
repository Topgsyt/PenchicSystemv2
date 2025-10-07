import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface ReceiptProps {
  orderId: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  cashierEmail: string;
  date: Date;
  onPrintComplete?: () => void;
}

const ReceiptPrinter: React.FC<ReceiptProps> = ({
  orderId,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  cashierEmail,
  date,
  onPrintComplete
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${orderId}`,
    onAfterPrint: onPrintComplete,
  });

  return (
    <div>
      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
      >
        <Printer className="w-5 h-5" />
        Print Receipt
      </button>

      <div style={{ display: 'none' }}>
        <div ref={receiptRef} style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '300px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0' }}>PENCHIC FARM</h1>
            <p style={{ fontSize: '12px', margin: '0' }}>Sales Receipt</p>
            <div style={{ borderTop: '2px dashed #000', margin: '10px 0' }}></div>
          </div>

          <div style={{ fontSize: '11px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Order #:</span>
              <span>{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Date:</span>
              <span>{date.toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Cashier:</span>
              <span>{cashierEmail}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment:</span>
              <span>{paymentMethod.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ borderTop: '2px dashed #000', margin: '10px 0' }}></div>

          <div style={{ marginBottom: '15px' }}>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '5px 0' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '5px 0' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '5px 0' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '5px 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td style={{ padding: '5px 0', verticalAlign: 'top' }}>{item.name}</td>
                      <td style={{ textAlign: 'center', padding: '5px 0', verticalAlign: 'top' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '5px 0', verticalAlign: 'top' }}>
                        {item.discount > 0 ? (
                          <div>
                            <div style={{ textDecoration: 'line-through', fontSize: '9px' }}>
                              {item.price.toLocaleString()}
                            </div>
                            <div>{(item.price - item.discount).toLocaleString()}</div>
                          </div>
                        ) : (
                          item.price.toLocaleString()
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '5px 0', verticalAlign: 'top' }}>
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                    {item.discount > 0 && (
                      <tr>
                        <td colSpan={4} style={{ fontSize: '9px', color: '#666', paddingBottom: '5px' }}>
                          Discount: KES {item.discount.toLocaleString()} per item
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '2px dashed #000', margin: '10px 0' }}></div>

          <div style={{ fontSize: '11px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <span>KES {subtotal.toLocaleString('en-KE')}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#28a745' }}>
                <span>Discount:</span>
                <span>-KES {discount.toLocaleString('en-KE')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #000' }}>
              <span>TOTAL:</span>
              <span>KES {total.toLocaleString('en-KE')}</span>
            </div>
          </div>

          <div style={{ borderTop: '2px dashed #000', margin: '15px 0' }}></div>

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '15px' }}>
            <p style={{ margin: '5px 0' }}>Thank you for shopping with us!</p>
            <p style={{ margin: '5px 0' }}>Visit us again soon</p>
            <p style={{ margin: '10px 0 5px 0', fontWeight: 'bold' }}>PENCHIC FARM</p>
            <p style={{ margin: '0' }}>Contact: +254 XXX XXX XXX</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrinter;
