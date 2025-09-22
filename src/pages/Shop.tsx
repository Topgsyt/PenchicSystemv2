import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Store, AlertCircle, Search, Filter, X } from 'lucide-react';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';
import { useDiscounts } from '../hooks/useDiscounts';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [productsWithDiscounts, setProductsWithDiscounts] = useState<(Product & {
    discount?: {
      type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle';
      value: number;
      original_price: number;
      discounted_price: number;
      savings: number;
      campaign_name: string;
      buy_quantity?: number;
      get_quantity?: number;
    };
  })[]>([]);
  const addToCart = useStore((state) => state.addToCart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const { getProductDiscount } = useDiscounts();
  
  // All users can see discounts (guests and all logged-in users)
  const canSeeDiscounts = true;
  
  // Determine if user can use cart (only admin and worker roles)
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      loadProductDiscounts();
    }
  }, [products]);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const initialQuantities = {};
        data.forEach(product => {
          initialQuantities[product.id] = 1;
        });
        setQuantities(initialQuantities);
        setProducts(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const loadProductDiscounts = async () => {
    if (!canSeeDiscounts) {
      setProductsWithDiscounts([...products]);
      return;
    }
    
    try {
      const productsWithDiscountInfo = await Promise.all(
        products.map(async (product) => {
          try {
            const discountInfo = await getProductDiscount(product.id, 1);
          
            if (discountInfo) {
              return {
                ...product,
                discount: {
                  type: 'percentage' as const,
                  value: discountInfo.savings_percentage,
                  original_price: discountInfo.original_price,
                  discounted_price: discountInfo.final_price,
                  savings: discountInfo.discount_amount,
                  campaign_name: discountInfo.offer_description.split(':')[0] || 'Special Offer'
                }
              };
            }
          } catch (error) {
            console.error(`Error loading discount for product ${product.id}:`, error);
            // Return product without discount instead of breaking
            return product;
          }
          
          return product;
        })
      );
      
      setProductsWithDiscounts(productsWithDiscountInfo);
    } catch (error) {
      console.error('Error loading discounts:', error);
      // If discount loading fails, show products without discounts
      setProductsWithDiscounts([...products]);
    }
  };

  const handleQuantityChange = (productId: string, value: string | number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let newQuantity: number;
    if (typeof value === 'string') {
      newQuantity = parseInt(value) || 1;
    } else {
      const currentQty = quantities[productId] || 1;
      newQuantity = currentQty + value;
    }

    newQuantity = Math.max(1, Math.min(newQuantity, product.stock));
    setQuantities(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!canUseCart) {
      // Show message for customers/guests
      alert('Cart functionality is only available to staff members. Please contact our staff to make a purchase.');
      return;
    }

    const quantity = quantities[product.id] || 1;
    if (quantity > product.stock) {
      alert('Not enough stock available');
      return;
    }

    addToCart({
      product,
      quantity
    });

    setProducts(prev =>
      prev.map(p =>
        p.id === product.id ? { ...p, stock: p.stock - quantity } : p
      )
    );

    setQuantities(prev => ({
      ...prev,
      [product.id]: 1
    }));
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500' };
    if (stock <= 5) return { text: 'Low in Stock', color: 'text-yellow-500' };
    return { text: 'In Stock', color: 'text-green-500' };
  };

  const formatPrice = (price: number) => {
    return `KES ${price.toLocaleString('en-KE')}`;
  };

  const filteredProducts = productsWithDiscounts
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search and Filter Bar */}
        <div className="mb-8 bg-white rounded-xl p-6 shadow-lg border border-neutral-200">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-neutral-100 text-neutral-900 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all border border-neutral-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-200 text-neutral-800 rounded-xl hover:bg-neutral-300 transition-colors"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Category Filters */}
          {showFilters && (
            <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all transform hover:scale-105 ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              showAddToCart={canUseCart}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
            <Store className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <h3 className="text-xl font-semibold mb-2 text-neutral-900">No Products Found</h3>
            <p className="text-neutral-600">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}