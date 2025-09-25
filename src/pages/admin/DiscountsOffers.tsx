import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Calendar,
  Percent,
  DollarSign,
  Gift,
  Tag,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Eye,
  EyeOff,
  Package,
  Clock,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Discount {
  id: string;
  product_id: string;
  percentage: number;
  start_date: string;
  end_date: string;
  created_by?: string;
  created_at: string;
  products?: {
    name: string;
    price: number;
    image_url: string;
  };
}

const DiscountsOffers = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDiscount, setExpandedDiscount] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    product_id: '',
    percentage: 0,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchDiscounts();
    fetchProducts();
  }, [user, navigate]);

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select(`
          *,
          products (name, price, image_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts(data || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      setErrorMessage('Failed to fetch discounts. Please check your database connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, category')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Validate form data
      if (!formData.product_id || !formData.start_date || !formData.end_date || formData.percentage <= 0) {
        throw new Error('Please fill in all required fields');
      }
      
      if (formData.percentage > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }

      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        throw new Error('End date must be after start date');
      }
      
      // Check if product exists
      const { data: productExists, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', formData.product_id)
        .single();
      
      if (productError || !productExists) {
        throw new Error('Selected product does not exist');
      }

      const discountData = {
        product_id: formData.product_id,
        percentage: formData.percentage,
        start_date: formData.start_date,
        end_date: formData.end_date,
        created_by: user?.id
      };

      if (editingDiscount) {
        const { error } = await supabase
          .from('discounts')
          .update(discountData)
          .eq('id', editingDiscount.id);

        if (error) throw error;
        setSuccessMessage('Discount updated successfully!');
      } else {
        const { error } = await supabase
          .from('discounts')
          .insert([discountData]);

        if (error) throw error;
        setSuccessMessage('Discount created successfully!');
      }

      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
      fetchDiscounts();
    } catch (error: any) {
      console.error('Error saving discount:', error);
      setErrorMessage(error.message || 'Failed to save discount');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', discountId);

      if (error) throw error;

      setSuccessMessage('Discount deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchDiscounts();
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      setErrorMessage('Failed to delete discount');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      product_id: discount.product_id,
      percentage: discount.percentage,
      start_date: discount.start_date.split('T')[0],
      end_date: discount.end_date.split('T')[0]
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      percentage: 0,
      start_date: '',
      end_date: ''
    });
    setEditingDiscount(null);
    setShowForm(false);
  };

  const getStatusColor = (discount: Discount) => {
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);
    
    if (now < startDate) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (now > endDate) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusText = (discount: Discount) => {
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);
    
    if (now < startDate) return 'Scheduled';
    if (now > endDate) return 'Expired';
    return 'Active';
  };

  const formatDiscountDisplay = (discount: Discount) => {
    if (!discount.products) {
      return {
        display: 'Product information unavailable',
        savings: '',
        badge: 'Special Offer'
      };
    }
    
    const originalPrice = discount.products.price;
    const discountedPrice = originalPrice * (1 - discount.percentage / 100);
    const savings = originalPrice - discountedPrice;
    
    return {
      display: `${discount.products.name}: Was KES ${originalPrice.toLocaleString()}, Now KES ${discountedPrice.toLocaleString()}`,
      savings: `Save KES ${savings.toLocaleString()}`,
      badge: `${discount.percentage}% OFF`
    };
  };

  const filteredDiscounts = discounts.filter(discount => {
    const productName = discount.products?.name || '';
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading && !showForm) {
    return (
      <AdminLayout title="Discounts & Offers" subtitle="Manage promotional campaigns and special offers">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Discounts & Offers" subtitle="Manage promotional campaigns and special offers">
      <div className="space-y-6">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-xl border border-green-200"
            >
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </motion.div>
          )}
          
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200"
            >
              <AlertCircle className="w-5 h-5" />
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search discounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Discount
          </motion.button>
        </div>

        {/* Discounts List */}
        <div className="space-y-4">
          {filteredDiscounts.map((discount, index) => {
            const displayInfo = formatDiscountDisplay(discount);
            const status = getStatusText(discount);
            
            return (
              <motion.div
                key={discount.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Discount Header */}
                <div className="p-6 bg-gradient-to-r from-neutral-50 to-white">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Percent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-neutral-900">
                            {discount.percentage}% OFF - {discount.products?.name || 'Unknown Product'}
                          </h3>
                          <p className="text-neutral-600">{displayInfo.display}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-500" />
                          <div>
                            <span className="text-neutral-500">Start:</span>
                            <p className="font-medium text-neutral-900">
                              {new Date(discount.start_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-neutral-500" />
                          <div>
                            <span className="text-neutral-500">End:</span>
                            <p className="font-medium text-neutral-900">
                              {new Date(discount.end_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-neutral-500" />
                          <div>
                            <span className="text-neutral-500">Savings:</span>
                            <p className="font-medium text-green-600">{displayInfo.savings}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(discount)}`}>
                        {status === 'Active' && <CheckCircle className="w-4 h-4" />}
                        {status === 'Expired' && <X className="w-4 h-4" />}
                        {status === 'Scheduled' && <Clock className="w-4 h-4" />}
                        {status}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(discount)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Edit discount"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedDiscount(expandedDiscount === discount.id ? null : discount.id)}
                          className="p-2 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors"
                          title="View details"
                        >
                          {expandedDiscount === discount.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(discount.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Delete discount"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Discount Details */}
                <AnimatePresence>
                  {expandedDiscount === discount.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-neutral-200"
                    >
                      <div className="p-6 space-y-6">
                        {/* Product Information */}
                        {discount.products && (
                          <div>
                            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                              <Package className="w-5 h-5" />
                              Product Details
                            </h4>
                            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                              <div className="flex items-start gap-4">
                                <img
                                  src={discount.products.image_url}
                                  alt={discount.products.name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                                <div className="flex-1">
                                  <h5 className="font-semibold text-neutral-900 mb-2">{discount.products.name}</h5>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-neutral-500">Original Price:</span>
                                      <p className="font-medium text-neutral-900">KES {discount.products.price.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <span className="text-neutral-500">Discounted Price:</span>
                                      <p className="font-medium text-green-600">
                                        KES {(discount.products.price * (1 - discount.percentage / 100)).toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-neutral-500">Discount:</span>
                                      <p className="font-medium text-red-600">{discount.percentage}% OFF</p>
                                    </div>
                                    <div>
                                      <span className="text-neutral-500">Savings:</span>
                                      <p className="font-medium text-green-600">
                                        KES {(discount.products.price * (discount.percentage / 100)).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Discount Timeline */}
                        <div>
                          <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Discount Timeline
                          </h4>
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-blue-700 font-medium">Start Date:</span>
                                <p className="text-blue-900 font-bold">
                                  {new Date(discount.start_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div>
                                <span className="text-blue-700 font-medium">End Date:</span>
                                <p className="text-blue-900 font-bold">
                                  {new Date(discount.end_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filteredDiscounts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
              <Tag className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Discounts Found</h3>
              <p className="text-neutral-600 mb-4">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Create your first discount to get started'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Create Discount
                </button>
              )}
            </div>
          )}
        </div>

        {/* Discount Form Modal */}
        <AnimatePresence>
          {showForm && (
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
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <div className="p-6 border-b border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Tag className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900">
                          {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
                        </h2>
                        <p className="text-sm text-neutral-600">Configure discount rules and promotional offers</p>
                      </div>
                    </div>
                    <button
                      onClick={resetForm}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Product *
                      </label>
                      <select
                        value={formData.product_id}
                        onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - KES {product.price.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Discount Percentage *
                      </label>
                      <input
                        type="number"
                        value={formData.percentage}
                        onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="e.g., 20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {formData.product_id && formData.percentage > 0 && (
                    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
                      <h4 className="font-medium text-neutral-900 mb-3">Preview</h4>
                      {(() => {
                        const selectedProduct = products.find(p => p.id === formData.product_id);
                        if (!selectedProduct) return null;
                        
                        const originalPrice = selectedProduct.price;
                        const discountedPrice = originalPrice * (1 - formData.percentage / 100);
                        const savings = originalPrice - discountedPrice;
                        
                        return (
                          <div className="bg-white rounded-lg p-4 border border-neutral-200">
                            <div className="text-center">
                              <h5 className="font-semibold text-neutral-900 mb-2">{selectedProduct.name}</h5>
                              <div className="space-y-1">
                                <div className="text-sm text-neutral-500 line-through">
                                  Was KES {originalPrice.toLocaleString()}
                                </div>
                                <div className="text-xl font-bold text-red-600">
                                  Now KES {discountedPrice.toLocaleString()}
                                </div>
                                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold inline-block">
                                  {formData.percentage}% OFF
                                </div>
                                <div className="text-sm text-green-600 font-medium">
                                  Save KES {savings.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : editingDiscount ? 'Update Discount' : 'Create Discount'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default DiscountsOffers;