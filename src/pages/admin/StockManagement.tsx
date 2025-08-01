import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import AdminLayout from '../../components/admin/AdminLayout';
import { Package2, TrendingUp, TrendingDown, AlertCircle, Search, Filter, Plus, Minus } from 'lucide-react';
import { useStore } from '../../store';

const StockManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [stockChanges, setStockChanges] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('stock', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrorMessage('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (productId: string, value: string) => {
    setStockChanges(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handleStockUpdate = async (productId: string, action: 'add' | 'remove') => {
    const changeAmount = parseInt(stockChanges[productId]);
    if (isNaN(changeAmount) || changeAmount <= 0) {
      setErrorMessage('Please enter a valid positive number');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    let newStock: number;
    if (action === 'add') {
      newStock = product.stock + changeAmount;
    } else {
      newStock = product.stock - changeAmount;
      if (newStock < 0) {
        setErrorMessage('Cannot remove more stock than available');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, stock: newStock } : p
        )
      );

      setStockChanges(prev => ({
        ...prev,
        [productId]: ''
      }));

      setSuccessMessage(`Stock successfully ${action === 'add' ? 'added' : 'removed'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh products to get updated data
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      setErrorMessage('Failed to update stock');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { color: 'bg-red-500', text: 'Out of Stock' };
    if (stock <= 5) return { color: 'bg-yellow-500', text: 'Low Stock' };
    if (stock <= 20) return { color: 'bg-orange-500', text: 'Medium Stock' };
    return { color: 'bg-green-500', text: 'In Stock' };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStock = (() => {
      switch (stockFilter) {
        case 'out': return product.stock <= 0;
        case 'low': return product.stock > 0 && product.stock <= 5;
        case 'medium': return product.stock > 5 && product.stock <= 20;
        case 'high': return product.stock > 20;
        default: return true;
      }
    })();
    return matchesSearch && matchesCategory && matchesStock;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  if (loading) {
    return (
      <AdminLayout title="Stock Management" subtitle="Manage and monitor your inventory levels">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Stock Management" subtitle="Manage and monitor your inventory levels">
      <div className="space-y-6">
        {/* Messages */}
        {successMessage && (
          <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 text-sm font-medium">Total Products</p>
                  <p className="text-xl md:text-2xl font-bold text-neutral-900">{products.length}</p>
                </div>
                <Package2 className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 text-sm font-medium">Low Stock Items</p>
                  <p className="text-xl md:text-2xl font-bold text-neutral-900">{products.filter(p => p.stock > 0 && p.stock <= 5).length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 text-sm font-medium">Out of Stock</p>
                  <p className="text-xl md:text-2xl font-bold text-neutral-900">{products.filter(p => p.stock <= 0).length}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 text-sm font-medium">Well Stocked</p>
                  <p className="text-xl md:text-2xl font-bold text-neutral-900">{products.filter(p => p.stock > 20).length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
        </div>


        {/* Filters */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-neutral-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Stock Levels</option>
                <option value="out">Out of Stock</option>
                <option value="low">Low Stock</option>
                <option value="medium">Medium Stock</option>
                <option value="high">Well Stocked</option>
              </select>
            </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              return (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-200 hover:shadow-md transition-all">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 text-neutral-900">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${stockStatus.color}`}></div>
                      <span className="text-sm text-neutral-600 font-medium">{stockStatus.text}</span>
                    </div>
                    
                    {user?.role === 'admin' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={stockChanges[product.id] || ''}
                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                            placeholder="Enter quantity"
                            className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                            min="1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleStockUpdate(product.id, 'add')}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                          <button
                            onClick={() => handleStockUpdate(product.id, 'remove')}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">Current Stock:</span>
                        <span className="font-medium text-neutral-900">{product.stock} units</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-neutral-200">
            <Package2 className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Products Found</h3>
            <p className="text-neutral-600">No products match your current filters</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StockManagement;