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
  Filter,
  Calendar,
  Percent,
  DollarSign,
  Gift,
  Tag,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Eye,
  EyeOff,
  Package,
  ShoppingCart,
  Clock,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscountCampaign {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle';
  status: 'active' | 'inactive' | 'expired';
  start_date: string;
  end_date: string;
  created_by?: string;
  created_at: string;
  discount_rules?: DiscountRule[];
  discount_usage?: DiscountUsage[];
}

interface DiscountRule {
  id: string;
  product_id: string;
  discount_value: number;
  minimum_quantity: number;
  maximum_quantity?: number;
  buy_quantity?: number;
  get_quantity?: number;
  maximum_usage_per_customer?: number;
  maximum_total_usage?: number;
  products?: {
    name: string;
    price: number;
    image_url: string;
  };
}

interface DiscountUsage {
  id: string;
  user_id?: string;
  discount_amount: number;
  quantity_used: number;
  created_at: string;
}

const DiscountsOffers = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DiscountCampaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage' as const,
    status: 'active' as const,
    start_date: '',
    end_date: '',
    rules: [{
      product_id: '',
      discount_value: 0,
      minimum_quantity: 1,
      maximum_quantity: null,
      buy_quantity: null,
      get_quantity: null,
      maximum_usage_per_customer: null,
      maximum_total_usage: null
    }]
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchCampaigns();
    fetchProducts();
  }, [user, navigate]);

  const fetchCampaigns = async () => {
    try {
      // Try to fetch from discount_campaigns table first
      const { data: campaignData, error: campaignError } = await supabase
        .from('discount_campaigns')
        .select(`
          *,
          discount_rules (
            *,
            products (name, price, image_url)
          ),
          discount_usage (*)
        `)
        .order('created_at', { ascending: false });

      if (!campaignError && campaignData) {
        setCampaigns(campaignData);
        return;
      }

      console.log('Campaign tables not found, using legacy discounts table');
      
      // Fallback to legacy discounts table
      const { data: legacyData, error: legacyError } = await supabase
        .from('discounts')
        .select(`
          *,
          products (name, price, image_url)
        `)
        .order('created_at', { ascending: false });

      if (legacyError) throw legacyError;
      
      // Transform the legacy discounts data to match the expected campaign structure
      const transformedCampaigns = (legacyData || []).map(discount => ({
        id: discount.id,
        name: `Discount for ${discount.products?.name || 'Product'}`,
        description: `${discount.percentage}% off`,
        type: 'percentage' as const,
        status: new Date(discount.end_date) > new Date() ? 'active' as const : 'expired' as const,
        start_date: discount.start_date,
        end_date: discount.end_date,
        created_by: discount.created_by,
        created_at: discount.created_at,
        discount_rules: [{
          id: discount.id,
          product_id: discount.product_id,
          discount_value: discount.percentage,
          minimum_quantity: 1,
          maximum_quantity: null,
          buy_quantity: null,
          get_quantity: null,
          maximum_usage_per_customer: null,
          maximum_total_usage: null,
          products: discount.products
        }],
        discount_usage: []
      }));
      
      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setErrorMessage('Failed to fetch discount campaigns. Please check your database connection.');
      setCampaigns([]);
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
      if (!formData.name || !formData.start_date || !formData.end_date) {
        throw new Error('Please fill in all required fields');
      }

      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        throw new Error('End date must be after start date');
      }

      if (formData.rules.some(rule => !rule.product_id || rule.discount_value <= 0)) {
        throw new Error('Please configure all discount rules properly');
      }

      // Validate discount values based on type
      if (formData.type === 'percentage') {
        if (formData.rules.some(rule => rule.discount_value > 100)) {
          throw new Error('Percentage discount cannot exceed 100%');
        }
      }

      // Try to use new campaign system first
      const { data: testCampaign, error: testError } = await supabase
        .from('discount_campaigns')
        .select('id')
        .limit(1);

      if (!testError) {
        // New campaign system exists
        const campaignData = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date,
          created_by: user?.id
        };

        if (editingCampaign) {
          const { error: updateError } = await supabase
            .from('discount_campaigns')
            .update(campaignData)
            .eq('id', editingCampaign.id);

          if (updateError) throw updateError;
        } else {
          const { data: newCampaign, error: campaignError } = await supabase
            .from('discount_campaigns')
            .insert([campaignData])
            .select()
            .single();

          if (campaignError) throw campaignError;

          // Insert discount rules
          const rulesData = formData.rules.map(rule => ({
            campaign_id: newCampaign.id,
            product_id: rule.product_id,
            discount_value: rule.discount_value,
            minimum_quantity: rule.minimum_quantity,
            maximum_quantity: rule.maximum_quantity,
            buy_quantity: rule.buy_quantity,
            get_quantity: rule.get_quantity,
            maximum_usage_per_customer: rule.maximum_usage_per_customer,
            maximum_total_usage: rule.maximum_total_usage
          }));

          const { error: rulesError } = await supabase
            .from('discount_rules')
            .insert(rulesData);

          if (rulesError) throw rulesError;
        }
      } else {
        // Fallback to legacy discounts table
        const legacyData = {
        product_id: formData.rules[0].product_id,
        percentage: formData.rules[0].discount_value,
        start_date: formData.start_date,
        end_date: formData.end_date,
        created_by: user?.id
        };

        if (editingCampaign) {
          const { error: updateError } = await supabase
            .from('discounts')
            .update(legacyData)
            .eq('id', editingCampaign.id);

          if (updateError) throw updateError;
        } else {
          const { error: campaignError } = await supabase
            .from('discounts')
            .insert([legacyData]);

          if (campaignError) throw campaignError;
        }
      }

      setSuccessMessage(editingCampaign ? 'Campaign updated successfully!' : 'Campaign created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      setErrorMessage(error.message || 'Failed to save campaign');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      // Try new system first
      const { data: testCampaign, error: testError } = await supabase
        .from('discount_campaigns')
        .select('id')
        .eq('id', campaignId)
        .limit(1);

      if (!testError && testCampaign) {
        // Delete from new system
        const { error } = await supabase
          .from('discount_campaigns')
          .delete()
          .eq('id', campaignId);

        if (error) throw error;
      } else {
        // Delete from legacy system
        const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', campaignId);

        if (error) throw error;
      }

      setSuccessMessage('Campaign deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      setErrorMessage('Failed to delete campaign');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleEdit = (campaign: DiscountCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name || `Discount for ${campaign.discount_rules?.[0]?.products?.name || 'Product'}`,
      description: campaign.description || `${campaign.discount_rules?.[0]?.discount_value || 0}% off`,
      type: 'percentage' as const,
      status: 'active' as const,
      start_date: campaign.start_date.split('T')[0],
      end_date: campaign.end_date.split('T')[0],
      rules: campaign.discount_rules?.map(rule => ({
        product_id: rule.product_id,
        discount_value: Number(rule.discount_value),
        minimum_quantity: Number(rule.minimum_quantity),
        maximum_quantity: rule.maximum_quantity ? Number(rule.maximum_quantity) : null,
        buy_quantity: rule.buy_quantity ? Number(rule.buy_quantity) : null,
        get_quantity: rule.get_quantity ? Number(rule.get_quantity) : null,
        maximum_usage_per_customer: rule.maximum_usage_per_customer ? Number(rule.maximum_usage_per_customer) : null,
        maximum_total_usage: rule.maximum_total_usage ? Number(rule.maximum_total_usage) : null
      })) || [{
        product_id: '',
        discount_value: 0,
        minimum_quantity: 1,
        maximum_quantity: null,
        buy_quantity: null,
        get_quantity: null,
        maximum_usage_per_customer: null,
        maximum_total_usage: null
      }]
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      status: 'active',
      start_date: '',
      end_date: '',
      rules: [{
        product_id: '',
        discount_value: 0,
        minimum_quantity: 1,
        maximum_quantity: null,
        buy_quantity: null,
        get_quantity: null,
        maximum_usage_per_customer: null,
        maximum_total_usage: null
      }]
    });
    setEditingCampaign(null);
    setShowForm(false);
  };

  const addRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, {
        product_id: '',
        discount_value: 0,
        minimum_quantity: 1,
        maximum_quantity: null,
        buy_quantity: null,
        get_quantity: null,
        maximum_usage_per_customer: null,
        maximum_total_usage: null
      }]
    });
  };

  const removeRule = (index: number) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index)
    });
  };

  const updateRule = (index: number, field: string, value: any) => {
    const updatedRules = [...formData.rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setFormData({ ...formData, rules: updatedRules });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed_amount': return <DollarSign className="w-4 h-4" />;
      case 'buy_x_get_y': return <Gift className="w-4 h-4" />;
      case 'bundle': return <Package className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const formatDiscountDisplay = (rule: DiscountRule, campaign: DiscountCampaign) => {
    const product = rule.products;
    if (!product) {
      return {
        display: 'Product information unavailable',
        savings: '',
        badge: 'Special Offer'
      };
    }
    
    const originalPrice = product.price;
    
    switch (campaign.type) {
      case 'percentage':
        const discountedPrice = originalPrice * (1 - rule.discount_value / 100);
        const savings = originalPrice - discountedPrice;
        return {
          display: `${product.name}: Was KES ${originalPrice.toLocaleString()}, Now KES ${discountedPrice.toLocaleString()} (${rule.discount_value}% OFF)`,
          savings: `Save KES ${savings.toLocaleString()}`,
          badge: `${rule.discount_value}% OFF`
        };
      case 'fixed_amount':
        const fixedDiscountPrice = Math.max(0, originalPrice - rule.discount_value);
        return {
          display: `${product.name}: Was KES ${originalPrice.toLocaleString()}, Now KES ${fixedDiscountPrice.toLocaleString()}`,
          savings: `Save KES ${rule.discount_value.toLocaleString()}`,
          badge: `KES ${rule.discount_value} OFF`
        };
      case 'buy_x_get_y':
        return {
          display: `${product.name}: Buy ${rule.buy_quantity} Get ${rule.get_quantity} Free`,
          savings: `Get ${rule.get_quantity} free items`,
          badge: `Buy ${rule.buy_quantity} Get ${rule.get_quantity}`
        };
      default:
        return {
          display: product.name,
          savings: '',
          badge: 'Special Offer'
        };
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
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
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="all">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
              <option value="buy_x_get_y">Buy X Get Y</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </motion.button>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          {filteredCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Campaign Header */}
              <div className="p-6 bg-gradient-to-r from-neutral-50 to-white">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getTypeIcon(campaign.type)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-neutral-900">{campaign.name}</h3>
                        <p className="text-neutral-600">{campaign.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-neutral-500" />
                        <div>
                          <span className="text-neutral-500">Start:</span>
                          <p className="font-medium text-neutral-900">
                            {new Date(campaign.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        <div>
                          <span className="text-neutral-500">End:</span>
                          <p className="font-medium text-neutral-900">
                            {new Date(campaign.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-neutral-500" />
                        <div>
                          <span className="text-neutral-500">Usage:</span>
                          <p className="font-medium text-neutral-900">
                            {campaign.discount_usage?.length || 0} times
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(campaign.status)}`}>
                      {campaign.status === 'active' && <CheckCircle className="w-4 h-4" />}
                      {campaign.status === 'inactive' && <X className="w-4 h-4" />}
                      {campaign.status === 'expired' && <AlertCircle className="w-4 h-4" />}
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(campaign)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Edit campaign"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}
                        className="p-2 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors"
                        title="View details"
                      >
                        {expandedCampaign === campaign.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Campaign Details */}
              <AnimatePresence>
                {expandedCampaign === campaign.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-neutral-200"
                  >
                    <div className="p-6 space-y-6">
                      {/* Discount Rules */}
                      <div>
                        <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Discount Rules ({campaign.discount_rules?.length || 0})
                        </h4>
                        {campaign.discount_rules && campaign.discount_rules.length > 0 ? (
                          <div className="space-y-4">
                            {campaign.discount_rules.map((rule, ruleIndex) => {
                              const displayInfo = formatDiscountDisplay(rule, campaign);
                              return (
                                <div key={rule.id} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                                  <div className="flex items-start gap-4">
                                    <img
                                      src={rule.products.image_url}
                                      alt={rule.products.name}
                                      className="w-16 h-16 object-cover rounded-lg"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h5 className="font-semibold text-neutral-900">{displayInfo.display}</h5>
                                          <p className="text-green-600 font-medium">{displayInfo.savings}</p>
                                        </div>
                                        <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                                          {displayInfo.badge}
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        <div>
                                          <span className="text-neutral-500">Min Qty:</span>
                                          <p className="font-medium">{rule.minimum_quantity}</p>
                                        </div>
                                        {rule.maximum_quantity && (
                                          <div>
                                            <span className="text-neutral-500">Max Qty:</span>
                                            <p className="font-medium">{rule.maximum_quantity}</p>
                                          </div>
                                        )}
                                        {rule.maximum_usage_per_customer && (
                                          <div>
                                            <span className="text-neutral-500">Per Customer:</span>
                                            <p className="font-medium">{rule.maximum_usage_per_customer}</p>
                                          </div>
                                        )}
                                        {rule.maximum_total_usage && (
                                          <div>
                                            <span className="text-neutral-500">Total Usage:</span>
                                            <p className="font-medium">{rule.maximum_total_usage}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-neutral-500">
                            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No discount rules configured</p>
                          </div>
                        )}
                      </div>

                      {/* Usage Statistics */}
                      {campaign.discount_usage && campaign.discount_usage.length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Usage Statistics
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                <span className="font-medium text-blue-900">Total Uses</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-900">
                                {campaign.discount_usage.length}
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-green-900">Total Savings</span>
                              </div>
                              <p className="text-2xl font-bold text-green-900">
                                KES {campaign.discount_usage.reduce((sum, usage) => sum + usage.discount_amount, 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <ShoppingCart className="w-5 h-5 text-purple-600" />
                                <span className="font-medium text-purple-900">Items Sold</span>
                              </div>
                              <p className="text-2xl font-bold text-purple-900">
                                {campaign.discount_usage.reduce((sum, usage) => sum + usage.quantity_used, 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
              <Tag className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Campaigns Found</h3>
              <p className="text-neutral-600 mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first discount campaign to get started'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Create Campaign
                </button>
              )}
            </div>
          )}
        </div>

        {/* Campaign Form Modal */}
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
                className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <div className="p-6 border-b border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Tag className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900">
                          {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
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
                  {/* Basic Campaign Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Discount Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        placeholder="e.g., Summer Sale Discount"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Discount Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        disabled
                      >
                        <option value="percentage">Percentage Discount</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        rows={3}
                        placeholder="Describe your discount..."
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

                  {/* Discount Rules */}
                  <div className="border-t border-neutral-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-neutral-900">Discount Configuration</h3>
                    </div>

                    <div className="space-y-4">
                      {formData.rules.slice(0, 1).map((rule, index) => (
                        <div key={index} className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-neutral-900">Discount Settings</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Product *
                              </label>
                              <select
                                value={rule.product_id}
                                onChange={(e) => updateRule(index, 'product_id', e.target.value)}
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
                                value={rule.discount_value}
                                onChange={(e) => updateRule(index, 'discount_value', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                min="0"
                                max="100"
                                step="0.01"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

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
                      {loading ? 'Saving...' : editingCampaign ? 'Update Discount' : 'Create Discount'}
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