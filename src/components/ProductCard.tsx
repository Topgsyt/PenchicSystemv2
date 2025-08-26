import React from 'react';
import { ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import DiscountBadge from './DiscountBadge';
import { useStore } from '../store';
import { useInventoryVisibility } from '../hooks/useInventoryVisibility';

interface ProductCardProps {
  product: Product & {
    discount?: {
      type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle';
      value: number;
      original_price: number;
      discounted_price: number;
      savings: number;
      buy_quantity?: number;
      get_quantity?: number;
      campaign_name: string;
    };
  };
  onAddToCart?: (product: Product) => void;
  showAddToCart?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  showAddToCart = true,
  className = ''
}) => {
  const user = useStore((state) => state.user);
  const { canViewStock } = useInventoryVisibility(user?.role);
  
  // Determine if user can see discounts (guests and customers only)
  const canSeeDiscounts = !user || user.role === 'customer';
  
  // Determine if user can use cart (only admin and worker roles)
  const canUseCart = user && ['admin', 'worker'].includes(user.role);
  
  const hasDiscount = canSeeDiscounts && product.discount && product.discount.value > 0;
  const displayPrice = hasDiscount ? product.discount.discounted_price : product.price;
  const originalPrice = hasDiscount ? product.discount.original_price : product.price;

  const getStockDisplay = (stock: number) => {
    if (canViewStock) {
      // Admin/Worker: Show exact stock numbers
      if (stock <= 0) return { text: `Out of Stock (${stock})`, color: 'text-red-500', bgColor: 'bg-red-50' };
      if (stock <= 5) return { text: `Low Stock (${stock} left)`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
      return { text: `In Stock (${stock} available)`, color: 'text-green-600', bgColor: 'bg-green-50' };
    } else {
      // Guest/Customer: Show only status
      if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500', bgColor: 'bg-red-50' };
      return { text: 'In Stock', color: 'text-green-600', bgColor: 'bg-green-50' };
    }
  };

  const stockDisplay = getStockDisplay(product.stock);

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all group ${className}`}>
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Discount Badge - Only for guests and customers */}
        {hasDiscount && (
          <div className="absolute top-3 left-3">
            <DiscountBadge
              type={product.discount.type}
              value={product.discount.value}
              buyQuantity={product.discount.buy_quantity}
              getQuantity={product.discount.get_quantity}
              size="small"
            />
          </div>
        )}

        {/* Stock Status */}
        <div className="absolute top-3 right-3">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockDisplay.bgColor} ${stockDisplay.color}`}>
            <div className={`w-2 h-2 rounded-full ${
              product.stock > 5 ? 'bg-green-500' : 
              product.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            {stockDisplay.text}
          </div>
        </div>

        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold px-4 py-2 bg-red-500 rounded-lg">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-lg text-neutral-900 mb-1 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-neutral-600 text-sm line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Enhanced Pricing Section with Clear Discount Display */}
        <div className="mb-4">
          {hasDiscount ? (
            <div className="space-y-2">
              {product.discount.type === 'buy_x_get_y' ? (
                <div>
                  {/* Regular price for BOGO */}
                  <div className="text-center mb-2">
                    <span className="text-2xl font-bold text-neutral-900">
                      KES {originalPrice.toLocaleString()}
                    </span>
                  </div>
                  {/* BOGO Offer Display */}
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 border-2 border-green-300">
                    <p className="text-green-800 font-bold text-center text-lg">
                      Buy {product.discount.buy_quantity} Get {product.discount.get_quantity} Free!
                    </p>
                    <p className="text-green-700 text-center text-sm mt-1">
                      Special Promotional Offer
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Discount Price Display: "Was X Now Y" Format */}
                  <div className="text-center mb-2">
                    <div className="text-sm text-neutral-500 mb-1">
                      <span className="line-through">Was KES {originalPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      Now KES {displayPrice.toLocaleString()}
                    </div>
                  </div>
                  {/* Savings Display */}
                  <div className="bg-gradient-to-r from-red-100 to-pink-100 rounded-lg p-2 border-2 border-red-300">
                    <p className="text-red-800 font-bold text-center">
                      Save KES {product.discount.savings.toLocaleString()}
                    </p>
                    <p className="text-red-700 text-center text-sm">
                      {product.discount.value}% OFF
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <span className="text-2xl font-bold text-neutral-900">
                KES {product.price.toLocaleString()}
              </span>
              <div className="text-sm text-neutral-500 mt-1">{product.category}</div>
            </div>
          )}
        </div>

        {/* Stock Information - Only visible to admin/worker */}
        {canViewStock && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-600">
                {product.stock} in stock
              </span>
              {product.stock <= 5 && product.stock > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                  Low Stock
                </span>
              )}
              {product.stock === 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  Out of Stock
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add to Cart Button - Only for admin/worker */}
        {canUseCart && showAddToCart && onAddToCart && (
          <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock <= 0}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              product.stock > 0
                ? 'bg-primary text-white hover:bg-primary-dark hover:shadow-lg transform hover:scale-105'
                : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        )}

        {/* Message for guests and customers */}
        {!canUseCart && (
          <div className="text-center p-3 bg-neutral-100 rounded-lg">
            <p className="text-sm text-neutral-600">
              {!user ? 'Please login to purchase' : 'Contact staff to purchase'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;