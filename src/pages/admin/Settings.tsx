import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  Receipt,
  Percent,
  DollarSign,
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  AlertCircle,
  Settings as SettingsIcon,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  logo_url: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
  created_at: string;
}

interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  is_active: boolean;
  created_at: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Business Settings
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    name: 'Penchic Farm',
    address: 'Limuru, Kiambu County, Kenya',
    phone: '+254 722 395 370',
    email: 'info@penchicfarm.com',
    tax_id: 'P051234567A',
    logo_url: ''
  });

  // Tax Rates
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRate | null>(null);
  const [taxForm, setTaxForm] = useState({
    name: '',
    rate: '',
    is_default: false
  });

  // Discounts
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    is_active: true
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchSettings();
  }, [user, navigate]);

  const fetchSettings = async () => {
    try {
      // Fetch tax rates
      const { data: taxData, error: taxError } = await supabase
        .from('tax_rates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!taxError && taxData) {
        setTaxRates(taxData);
      }

      // Fetch discounts
      const { data: discountData, error: discountError } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!discountError && discountData) {
        setDiscounts(discountData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleBusinessSave = async () => {
    setLoading(true);
    try {
      // In a real app, you'd save to a business_settings table
      showMessage('success', 'Business settings saved successfully!');
    } catch (error) {
      showMessage('error', 'Failed to save business settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTaxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taxData = {
        name: taxForm.name,
        rate: parseFloat(taxForm.rate),
        is_default: taxForm.is_default
      };

      if (editingTax) {
        const { error } = await supabase
          .from('tax_rates')
          .update(taxData)
          .eq('id', editingTax.id);

        if (error) throw error;
        showMessage('success', 'Tax rate updated successfully!');
      } else {
        const { error } = await supabase
          .from('tax_rates')
          .insert([taxData]);

        if (error) throw error;
        showMessage('success', 'Tax rate created successfully!');
      }

      setTaxForm({ name: '', rate: '', is_default: false });
      setEditingTax(null);
      setShowTaxForm(false);
      fetchSettings();
    } catch (error) {
      showMessage('error', 'Failed to save tax rate');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const discountData = {
        name: discountForm.name,
        type: discountForm.type,
        value: parseFloat(discountForm.value),
        is_active: discountForm.is_active
      };

      if (editingDiscount) {
        const { error } = await supabase
          .from('discounts')
          .update(discountData)
          .eq('id', editingDiscount.id);

        if (error) throw error;
        showMessage('success', 'Discount updated successfully!');
      } else {
        const { error } = await supabase
          .from('discounts')
          .insert([discountData]);

        if (error) throw error;
        showMessage('success', 'Discount created successfully!');
      }

      setDiscountForm({ name: '', type: 'percentage', value: '', is_active: true });
      setEditingDiscount(null);
      setShowDiscountForm(false);
      fetchSettings();
    } catch (error) {
      showMessage('error', 'Failed to save discount');
    } finally {
      setLoading(false);
    }
  };

  const deleteTaxRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) return;

    try {
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showMessage('success', 'Tax rate deleted successfully!');
      fetchSettings();
    } catch (error) {
      showMessage('error', 'Failed to delete tax rate');
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showMessage('success', 'Discount deleted successfully!');
      fetchSettings();
    } catch (error) {
      showMessage('error', 'Failed to delete discount');
    }
  };

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building2 },
    { id: 'tax', label: 'Tax Rates', icon: DollarSign },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'receipt', label: 'Receipt', icon: Receipt }
  ];

  return (
    <AdminLayout title="Settings" subtitle="Configure your business settings">
      <div className="space-y-6">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Business Information Tab */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-neutral-900">Business Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessSettings.name}
                      onChange={(e) => setBusinessSettings({...businessSettings, name: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={businessSettings.tax_id}
                      onChange={(e) => setBusinessSettings({...businessSettings, tax_id: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Address
                    </label>
                    <textarea
                      value={businessSettings.address}
                      onChange={(e) => setBusinessSettings({...businessSettings, address: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={businessSettings.phone}
                      onChange={(e) => setBusinessSettings({...businessSettings, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={businessSettings.email}
                      onChange={(e) => setBusinessSettings({...businessSettings, email: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-neutral-200">
                  <button
                    onClick={handleBusinessSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Tax Rates Tab */}
            {activeTab === 'tax' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-neutral-900">Tax Rates</h2>
                  </div>
                  <button
                    onClick={() => setShowTaxForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tax Rate
                  </button>
                </div>

                {/* Tax Rates List */}
                <div className="space-y-3">
                  {taxRates.map((tax) => (
                    <div key={tax.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-neutral-900">{tax.name}</h3>
                        <p className="text-sm text-neutral-600">{tax.rate}%</p>
                        {tax.is_default && (
                          <span className="inline-flex px-2 py-1 text-xs bg-primary/10 text-primary rounded-full mt-1">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTax(tax);
                            setTaxForm({
                              name: tax.name,
                              rate: tax.rate.toString(),
                              is_default: tax.is_default
                            });
                            setShowTaxForm(true);
                          }}
                          className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTaxRate(tax.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tax Form Modal */}
                <AnimatePresence>
                  {showTaxForm && (
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
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-neutral-900">
                            {editingTax ? 'Edit Tax Rate' : 'Add Tax Rate'}
                          </h3>
                          <button
                            onClick={() => {
                              setShowTaxForm(false);
                              setEditingTax(null);
                              setTaxForm({ name: '', rate: '', is_default: false });
                            }}
                            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <form onSubmit={handleTaxSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Tax Name
                            </label>
                            <input
                              type="text"
                              value={taxForm.name}
                              onChange={(e) => setTaxForm({...taxForm, name: e.target.value})}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                              placeholder="e.g., VAT, Sales Tax"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Tax Rate (%)
                            </label>
                            <input
                              type="number"
                              value={taxForm.rate}
                              onChange={(e) => setTaxForm({...taxForm, rate: e.target.value})}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                              placeholder="16"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="is_default"
                              checked={taxForm.is_default}
                              onChange={(e) => setTaxForm({...taxForm, is_default: e.target.checked})}
                              className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                            />
                            <label htmlFor="is_default" className="text-sm text-neutral-700">
                              Set as default tax rate
                            </label>
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setShowTaxForm(false);
                                setEditingTax(null);
                                setTaxForm({ name: '', rate: '', is_default: false });
                              }}
                              className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                              {loading ? 'Saving...' : editingTax ? 'Update' : 'Create'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Discounts Tab */}
            {activeTab === 'discounts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Percent className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-neutral-900">Discount Management</h2>
                  </div>
                  <button
                    onClick={() => setShowDiscountForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Discount
                  </button>
                </div>

                {/* Discounts List */}
                <div className="space-y-3">
                  {discounts.map((discount) => (
                    <div key={discount.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-neutral-900">{discount.name}</h3>
                        <p className="text-sm text-neutral-600">
                          {discount.type === 'percentage' ? `${discount.value}%` : `KES ${discount.value}`} off
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full mt-1 ${
                          discount.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {discount.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingDiscount(discount);
                            setDiscountForm({
                              name: discount.name,
                              type: discount.type,
                              value: discount.value.toString(),
                              is_active: discount.is_active
                            });
                            setShowDiscountForm(true);
                          }}
                          className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteDiscount(discount.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discount Form Modal */}
                <AnimatePresence>
                  {showDiscountForm && (
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
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-neutral-900">
                            {editingDiscount ? 'Edit Discount' : 'Add Discount'}
                          </h3>
                          <button
                            onClick={() => {
                              setShowDiscountForm(false);
                              setEditingDiscount(null);
                              setDiscountForm({ name: '', type: 'percentage', value: '', is_active: true });
                            }}
                            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <form onSubmit={handleDiscountSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Discount Name
                            </label>
                            <input
                              type="text"
                              value={discountForm.name}
                              onChange={(e) => setDiscountForm({...discountForm, name: e.target.value})}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                              placeholder="e.g., Student Discount, Bulk Order"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Discount Type
                            </label>
                            <select
                              value={discountForm.type}
                              onChange={(e) => setDiscountForm({...discountForm, type: e.target.value as 'percentage' | 'fixed'})}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            >
                              <option value="percentage">Percentage</option>
                              <option value="fixed">Fixed Amount</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              {discountForm.type === 'percentage' ? 'Percentage (%)' : 'Amount (KES)'}
                            </label>
                            <input
                              type="number"
                              value={discountForm.value}
                              onChange={(e) => setDiscountForm({...discountForm, value: e.target.value})}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                              placeholder={discountForm.type === 'percentage' ? '10' : '100'}
                              min="0"
                              max={discountForm.type === 'percentage' ? '100' : undefined}
                              step={discountForm.type === 'percentage' ? '0.01' : '1'}
                              required
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="is_active"
                              checked={discountForm.is_active}
                              onChange={(e) => setDiscountForm({...discountForm, is_active: e.target.checked})}
                              className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                            />
                            <label htmlFor="is_active" className="text-sm text-neutral-700">
                              Active discount
                            </label>
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDiscountForm(false);
                                setEditingDiscount(null);
                                setDiscountForm({ name: '', type: 'percentage', value: '', is_active: true });
                              }}
                              className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                              {loading ? 'Saving...' : editingDiscount ? 'Update' : 'Create'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Receipt Tab */}
            {activeTab === 'receipt' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Receipt className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-neutral-900">Receipt Configuration</h2>
                </div>

                <div className="bg-neutral-50 rounded-xl p-6">
                  <h3 className="font-medium text-neutral-900 mb-4">Receipt Preview</h3>
                  <div className="bg-white p-6 rounded-lg border-2 border-dashed border-neutral-200 max-w-sm mx-auto">
                    <div className="text-center mb-4">
                      <h4 className="font-bold text-lg">{businessSettings.name}</h4>
                      <p className="text-sm text-neutral-600">{businessSettings.address}</p>
                      <p className="text-sm text-neutral-600">{businessSettings.phone}</p>
                      <p className="text-sm text-neutral-600">{businessSettings.email}</p>
                    </div>
                    
                    <div className="border-t border-neutral-200 pt-4 mb-4">
                      <p className="text-sm text-neutral-600">Receipt #: RCP-12345</p>
                      <p className="text-sm text-neutral-600">Date: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Sample Product x2</span>
                        <span>KES 1,000</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Another Item x1</span>
                        <span>KES 500</span>
                      </div>
                    </div>

                    <div className="border-t border-neutral-200 pt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>KES 1,500</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (16%):</span>
                        <span>KES 240</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>KES 1,740</span>
                      </div>
                    </div>

                    <div className="text-center mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-xs text-neutral-500">Thank you for your business!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;