import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, Store, AlertCircle } from 'lucide-react';
import { useStore } from '../store';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useStore((state) => state.addToCart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_variants(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleAddToCart = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!product) return;

    const selectedVariantData = selectedVariant
      ? product.product_variants?.find(v => v.id === selectedVariant)
      : null;

    if (quantity > (selectedVariantData?.stock ?? product.stock)) {
      alert('Not enough stock available');
      return;
    }

    addToCart({
      product,
      variant: selectedVariantData,
      quantity
    });

    navigate('/cart');
  };

  const openGoogleMaps = () => {
    window.open('https://maps.google.com/?q=-1.1166,36.6333', '_blank');
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-[#D72638]' };
    if (stock <= 5) return { text: 'Low in Stock', color: 'text-[#E6B800]' };
    return { text: 'In Stock', color: 'text-[#2B5741]' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-900 text-xl">Product not found</p>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.stock);

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="relative aspect-square">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-neutral-900">{product.name}</h1>
              <p className="text-neutral-700">{product.description}</p>
            </div>

            <div className="border-t border-neutral-300 pt-6">
              <p className="text-3xl font-bold text-primary">
                KES {product.price.toLocaleString('en-KE')}
              </p>

              <div className={`flex items-center gap-2 mt-4 ${stockStatus.color}`}>
                <AlertCircle className="w-5 h-5" />
                <span className="text-lg font-medium">{stockStatus.text}</span>
              </div>

              {product.product_variants && product.product_variants.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {product.product_variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant.id)}
                        className={`py-2 px-4 rounded-lg ${
                          selectedVariant === variant.id
                            ? 'bg-primary text-white'
                            : 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300'
                        }`}
                        disabled={variant.stock <= 0}
                      >
                        {variant.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {user ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center">
                    <label className="block text-sm font-medium mr-4 text-neutral-900">Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-1 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0}
                    className={`w-full flex items-center justify-center py-3 px-8 rounded-lg text-lg font-medium ${
                      product.stock > 0
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-neutral-400 text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-6 h-6 mr-2" />
                    {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                </div>
              ) : (
                product.stock > 0 && (
                  <button
                    onClick={openGoogleMaps}
                    className="w-full mt-6 flex items-center justify-center py-3 px-8 rounded-lg text-lg font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
                  >
                    <Store className="w-6 h-6 mr-2" />
                    Visit Shop to Purchase
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
