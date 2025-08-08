import React from 'react';
import { ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import DiscountBadge from './DiscountBadge';

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
  const hasDiscount = product.discount && product.discount.value > 0;
  const displayPrice = hasDiscount ? product.discount.discounted_price : product.price;
  const originalPrice = hasDiscount ? product.discount.original_price : product.price;

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500', bgColor: 'bg-red-50' };
    if (stock <= 5) return { text: 'Low Stock', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { text: 'In Stock', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const stockStatus = getStockStatus(product.stock);

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all group ${className}`}>
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Discount Badge */}
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
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
            <div className={`w-2 h-2 rounded-full ${
              product.stock > 5 ? 'bg-green-500' : 
              product.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            {stockStatus.text}
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

        {/* Pricing Section */}
        <div className="mb-4">
          {hasDiscount ? (
            <div className="space-y-2">
              {/* Discount Display */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-700 font-medium text-sm">{product.discount.campaign_name}</span>
                  <DiscountBadge
                    type={product.discount.type}
                    value={product.discount.value}
                    buyQuantity={product.discount.buy_quantity}
                    getQuantity={product.discount.get_quantity}
                    size="small"
                  />
                </div>
                
                {product.discount.type === 'buy_x_get_y' ? (
                  <div>
                    <p className="text-lg font-bold text-neutral-900">
                      KES {originalPrice.toLocaleString()}
                    </p>
                    <p className="text-green-600 font-semibold text-sm">
                      Buy {product.discount.buy_quantity} Get {product.discount.get_quantity} Free!
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg line-through text-neutral-500">
                        KES {originalPrice.toLocaleString()}
                      </span>
                      <span className="text-xl font-bold text-red-600">
                        KES {displayPrice.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-green-600 font-semibold text-sm">
                      Save KES {product.discount.savings.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-neutral-900">
                KES {product.price.toLocaleString()}
              </span>
              <span className="text-sm text-neutral-500">{product.category}</span>
            </div>
          )}
        </div>

        {/* Stock Information */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-600">
              {product.stock} in stock
            </span>
          </div>
          {hasDiscount && product.discount.type !== 'buy_x_get_y' && (
            <div className="text-right">
              <span className="text-xs text-green-600 font-medium">
                {((product.discount.savings / originalPrice) * 100).toFixed(0)}% savings
              </span>
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        {showAddToCart && onAddToCart && (
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
      </div>
    </div>
  );
};

export default ProductCard;