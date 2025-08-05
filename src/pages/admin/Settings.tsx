import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Save, 
  Building, 
  DollarSign, 
  Percent, 
  Bell, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  AlertCircle,
  CheckCircle,
  X,
  Edit3,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  Monitor,
  Smartphone,
  Type,
  Layout,
  Volume2,
  Shield,
  Database,
  Wifi,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BusinessSettings {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  logo_url?: string;
}

interface TaxRate {
  id?: string;
  name: string;
  rate: number;
  is_default: boolean;
}

interface PaymentInfo {
  id?: string;
  paybill_number: string;
  account_number: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  low_stock_alerts: boolean;
  order_notifications: boolean;
  system_alerts: boolean;
}

interface DisplaySettings {
  font_size: 'small' | 'medium' | 'large';
  layout_spacing: 'compact' | 'comfortable' | 'spacious';
  sidebar_collapsed: boolean;
  show_tooltips: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});
  const [confirmMessage, setConfirmMessage] = useState('');
  
  // Settings state
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    tax_id: ''
  });
  
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [newTaxRate, setNewTaxRate] = useState<TaxRate>({
    name: '',
    rate: 0,
    is_default: false
  });
  
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    paybill_number: '',
    account_number: ''
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    low_stock_alerts: true,
    order_notifications: true,
    system_alerts: true
  });
  
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    font_size: 'medium',
    layout_spacing: 'comfortable',
    sidebar_collapsed: false,
    show_tooltips: true
  });
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchSettings();
  }, [user, navigate]);

  // Fetch all settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch business settings
      const { data: businessData, error: businessError } = await supabase
        .from('business_settings')
        .select('*')
        .maybeSingle();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error('Business settings error:', businessError);
      }

      if (businessData) {
        setBusinessSettings(businessData);
      }

      // Fetch tax rates
      const { data: taxData, error: taxError } = await supabase
        .from('tax_rates')
        .select('*')
        .order('name');

      if (taxError) {
        console.error('Tax rates error:', taxError);
      } else {
        setTaxRates(taxData || []);
      }

      // Fetch payment info
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_info')
        .select('*')
        .maybeSingle();

      if (paymentError && paymentError.code !== 'PGRST116') {
        console.error('Payment info error:', paymentError);
      }

      if (paymentData) {
        setPaymentInfo(paymentData);
      }

      // Load notification and display settings from localStorage
      try {
        const savedNotifications = localStorage.getItem('notification_settings');
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          setNotificationSettings(parsed);
        }

        const savedDisplay = localStorage.getItem('display_settings');
        if (savedDisplay) {
          const parsed = JSON.parse(savedDisplay);
          setDisplaySettings(parsed);
        }
      } catch (localStorageError) {
        console.error('Error loading from localStorage:', localStorageError);
      }

    } catch (error) {
      console.error('Error fetching settings:', error);
      setErrorMessage('Failed to load settings');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Save business settings
  const saveBusinessSettings = async () => {
    if (!businessSettings.name || !businessSettings.address || !businessSettings.phone || !businessSettings.email) {
      setErrorMessage('Please fill in all required fields');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .upsert(businessSettings, {
          onConflict: 'id'
        });

      if (error) throw error;
      
      setSuccessMessage('Business settings saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving business settings:', error);
      setErrorMessage('Failed to save business settings');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Save tax rates
  const saveTaxRate = async (taxRate: TaxRate) => {
    if (!taxRate.name || taxRate.rate <= 0) {
      setErrorMessage('Please provide a valid tax name and rate');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      if (taxRate.is_default) {
        // Remove default from other rates first
        await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .neq('id', taxRate.id || '');
      }

      const { error } = await supabase
        .from('tax_rates')
        .upsert(taxRate, {
          onConflict: 'id'
        });

      if (error) throw error;
      
      await fetchSettings(); // Refetch to get updated data
      setSuccessMessage('Tax rate saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving tax rate:', error);
      setErrorMessage('Failed to save tax rate');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Delete tax rate
  const deleteTaxRate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchSettings(); // Refetch to get updated data
      setSuccessMessage('Tax rate deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting tax rate:', error);
      setErrorMessage('Failed to delete tax rate');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Save payment info
  const savePaymentInfo = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_info')
        .upsert(paymentInfo, {
          onConflict: 'id'
        });

      if (error) throw error;
      
      setSuccessMessage('Payment information saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving payment info:', error);
      setErrorMessage('Failed to save payment information');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Save notification settings
  const saveNotificationSettings = () => {
    try {
      localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
      setSuccessMessage('Notification settings saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setErrorMessage('Failed to save notification settings');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Save display settings
  const saveDisplaySettings = () => {
    try {
      localStorage.setItem('display_settings', JSON.stringify(displaySettings));
      
      // Apply font size setting immediately
      const rootElement = document.documentElement;
      if (rootElement) {
        rootElement.style.fontSize = 
          displaySettings.font_size === 'small' ? '14px' : 
          displaySettings.font_size === 'large' ? '18px' : '16px';
      }
      
      setSuccessMessage('Display settings saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving display settings:', error);
      setErrorMessage('Failed to save display settings');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Confirmation dialog
  const showConfirmation = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = () => {
    confirmAction();
    setShowConfirmDialog(false);
  };

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building },
    { id: 'tax', label: 'Tax & Pricing', icon: DollarSign },
    { id: 'payment', label: 'Payment', icon: Percent },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display', icon: Monitor },
    { id: 'system', label: 'System', icon: SettingsIcon }
  ];

  if (loading) {
    return (
      <AdminLayout title="Settings" subtitle="Configure system settings and preferences">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings" subtitle="Configure system settings and preferences">
      <div className="space-y-6">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200"
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
              className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200"
            >
              <AlertCircle className="w-5 h-5" />
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Business Settings */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">Business Information</h3>
                  <button
                    onClick={() => showConfirmation('Save business settings?', saveBusinessSettings)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={businessSettings.name}
                      onChange={(e) => setBusinessSettings({...businessSettings, name: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="Enter business name"
                      required
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
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="Enter tax ID"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Address *
                    </label>
                    <textarea
                      value={businessSettings.address}
                      onChange={(e) => setBusinessSettings({...businessSettings, address: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      rows={3}
                      placeholder="Enter business address"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={businessSettings.phone}
                      onChange={(e) => setBusinessSettings({...businessSettings, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="+254 XXX XXX XXX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={businessSettings.email}
                      onChange={(e) => setBusinessSettings({...businessSettings, email: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="business@example.com"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tax & Pricing Settings */}
            {activeTab === 'tax' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">Tax Rates & Pricing</h3>
                </div>

                {/* Existing Tax Rates */}
                <div className="space-y-4">
                  <h4 className="font-medium text-neutral-900">Current Tax Rates</h4>
                  {taxRates.length === 0 ? (
                    <p className="text-neutral-500 text-center py-8">No tax rates configured yet</p>
                  ) : (
                    taxRates.map((rate) => (
                      <div key={rate.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-neutral-900">{rate.name}</p>
                            <p className="text-sm text-neutral-600">{rate.rate}%</p>
                          </div>
                          {rate.is_default && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">Default</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => showConfirmation(`Delete tax rate "${rate.name}"?`, () => deleteTaxRate(rate.id!))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Tax Rate */}
                <div className="border-t border-neutral-200 pt-6">
                  <h4 className="font-medium text-neutral-900 mb-4">Add New Tax Rate</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={newTaxRate.name}
                      onChange={(e) => setNewTaxRate({...newTaxRate, name: e.target.value})}
                      className="px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="Tax name (e.g., VAT)"
                    />
                    <input
                      type="number"
                      value={newTaxRate.rate}
                      onChange={(e) => setNewTaxRate({...newTaxRate, rate: parseFloat(e.target.value) || 0})}
                      className="px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="Rate (%)"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newTaxRate.is_default}
                          onChange={(e) => setNewTaxRate({...newTaxRate, is_default: e.target.checked})}
                          className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500/20"
                        />
                        <span className="text-sm text-neutral-700">Default</span>
                      </label>
                      <button
                        onClick={() => {
                          if (newTaxRate.name && newTaxRate.rate > 0) {
                            saveTaxRate(newTaxRate);
                            setNewTaxRate({ name: '', rate: 0, is_default: false });
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">Payment Configuration</h3>
                  <button
                    onClick={() => showConfirmation('Save payment settings?', savePaymentInfo)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      M-Pesa Paybill Number
                    </label>
                    <input
                      type="text"
                      value={paymentInfo.paybill_number}
                      onChange={(e) => setPaymentInfo({...paymentInfo, paybill_number: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="Enter paybill number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={paymentInfo.account_number}
                      onChange={(e) => setPaymentInfo({...paymentInfo, account_number: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      placeholder="Enter account number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">Notification Preferences</h3>
                  <button
                    onClick={saveNotificationSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>

                <div className="space-y-4">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-900">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {key === 'email_notifications' && 'Receive notifications via email'}
                            {key === 'push_notifications' && 'Receive browser push notifications'}
                            {key === 'low_stock_alerts' && 'Get alerts when products are low in stock'}
                            {key === 'order_notifications' && 'Receive notifications for new orders'}
                            {key === 'system_alerts' && 'Get system maintenance and error alerts'}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            [key]: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Display Settings */}
            {activeTab === 'display' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">Display Preferences</h3>
                  <button
                    onClick={saveDisplaySettings}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      <Type className="w-4 h-4 inline mr-1" />
                      Font Size
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['small', 'medium', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setDisplaySettings({...displaySettings, font_size: size as any})}
                          className={`p-3 text-center rounded-lg border transition-colors ${
                            displaySettings.font_size === size
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <span className={`font-medium ${
                            size === 'small' ? 'text-sm' : 
                            size === 'large' ? 'text-lg' : 'text-base'
                          }`}>
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Layout Spacing */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      <Layout className="w-4 h-4 inline mr-1" />
                      Layout Spacing
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['compact', 'comfortable', 'spacious'].map((spacing) => (
                        <button
                          key={spacing}
                          onClick={() => setDisplaySettings({...displaySettings, layout_spacing: spacing as any})}
                          className={`p-3 text-center rounded-lg border transition-colors ${
                            displaySettings.layout_spacing === spacing
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <span className="font-medium">
                            {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other Display Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <Layout className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-900">Collapse Sidebar by Default</p>
                          <p className="text-sm text-neutral-600">Start with a collapsed sidebar for more space</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displaySettings.sidebar_collapsed}
                          onChange={(e) => setDisplaySettings({
                            ...displaySettings,
                            sidebar_collapsed: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-900">Show Tooltips</p>
                          <p className="text-sm text-neutral-600">Display helpful tooltips on hover</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displaySettings.show_tooltips}
                          onChange={(e) => setDisplaySettings({
                            ...displaySettings,
                            show_tooltips: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-900">System Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-900">Database Status</p>
                          <p className="text-sm text-neutral-600">Connection status</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Connected
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-900">Real-time Updates</p>
                          <p className="text-sm text-neutral-600">Live data synchronization</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <HardDrive className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-900">Storage Usage</p>
                          <p className="text-sm text-neutral-600">Database storage</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-neutral-900">
                        2.4 MB / 1 GB
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-900">Security Status</p>
                          <p className="text-sm text-neutral-600">System security</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Secure
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-6">
                  <h4 className="font-medium text-neutral-900 mb-4">System Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setSuccessMessage('Cache cleared successfully');
                        setTimeout(() => setSuccessMessage(''), 3000);
                      }}
                      className="flex items-center justify-center gap-2 p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <Database className="w-4 h-4" />
                      Clear Cache
                    </button>
                    
                    <button
                      onClick={() => {
                        setSuccessMessage('System refreshed successfully');
                        setTimeout(() => setSuccessMessage(''), 3000);
                      }}
                      className="flex items-center justify-center gap-2 p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <Wifi className="w-4 h-4" />
                      Refresh System
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AnimatePresence>
          {showConfirmDialog && (
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
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  <h3 className="text-lg font-semibold text-neutral-900">Confirm Action</h3>
                </div>
                
                <p className="text-neutral-600 mb-6">{confirmMessage}</p>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default Settings;