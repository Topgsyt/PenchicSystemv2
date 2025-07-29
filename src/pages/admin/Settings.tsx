import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Save, 
  Eye, 
  EyeOff,
  Check,
  AlertCircle,
  Settings as SettingsIcon,
  Monitor,
  Smartphone,
  Download,
  Upload,
  Key,
  Globe,
  Database,
  Mail,
  Lock,
  Users,
  BarChart3,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Settings = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  
  // Form states
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [systemSettings, setSystemSettings] = useState({
    lowStockThreshold: 5,
    autoBackup: true,
    maintenanceMode: false,
    maxLoginAttempts: 3,
    sessionTimeout: 30,
    enableAuditLog: true
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    stockAlerts: true,
    orderNotifications: true,
    systemUpdates: false,
    marketingEmails: false,
    smsNotifications: false,
    pushNotifications: true,
    notificationFrequency: 'immediate'
  });

  const [themeSettings, setThemeSettings] = useState({
    theme: 'light',
    colorScheme: 'blue',
    sidebarCollapsed: false,
    compactMode: false,
    showAnimations: true,
    fontSize: 'medium'
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    passwordPolicy: 'medium',
    loginNotifications: true,
    deviceTracking: true,
    ipWhitelist: '',
    autoLockout: true
  });

  const [integrationSettings, setIntegrationSettings] = useState({
    mpesaEnabled: true,
    mpesaConsumerKey: '',
    mpesaConsumerSecret: '',
    emailProvider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    backupProvider: 'local',
    apiRateLimit: 1000
  });

  const [dataSettings, setDataSettings] = useState({
    autoExport: false,
    exportFormat: 'csv',
    exportFrequency: 'weekly',
    retentionPeriod: 365,
    compressionEnabled: true,
    encryptionEnabled: true
  });
  
  // UI states
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
    loadSettings();
  }, [user, navigate]);

  const loadSettings = async () => {
    try {
      // Load system settings from database or localStorage
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        setSystemSettings(JSON.parse(savedSettings));
      }
      
      const savedNotifications = localStorage.getItem('notificationSettings');
      if (savedNotifications) {
        setNotificationSettings(JSON.parse(savedNotifications));
      }

      const savedTheme = localStorage.getItem('themeSettings');
      if (savedTheme) {
        setThemeSettings(JSON.parse(savedTheme));
      }

      const savedSecurity = localStorage.getItem('securitySettings');
      if (savedSecurity) {
        setSecuritySettings(JSON.parse(savedSecurity));
      }

      const savedIntegration = localStorage.getItem('integrationSettings');
      if (savedIntegration) {
        setIntegrationSettings(JSON.parse(savedIntegration));
      }

      const savedData = localStorage.getItem('dataSettings');
      if (savedData) {
        setDataSettings(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update email if changed
      if (profileData.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email
        });
        if (emailError) throw emailError;

        // Update profile in database
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: profileData.email })
          .eq('id', user?.id);
        
        if (profileError) throw profileError;

        setUser({ ...user!, email: profileData.email });
      }

      // Update password if provided
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (profileData.newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: profileData.newPassword
        });
        if (passwordError) throw passwordError;

        // Clear password fields
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }

      showMessage('success', 'Profile updated successfully!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async (settingsType: string, settings: any) => {
    setLoading(true);
    try {
      localStorage.setItem(settingsType, JSON.stringify(settings));
      showMessage('success', 'Settings updated successfully!');
    } catch (error: any) {
      showMessage('error', 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      // Export data logic here
      const data = {
        products: await supabase.from('products').select('*'),
        orders: await supabase.from('orders').select('*'),
        users: await supabase.from('profiles').select('*')
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `penchic-farm-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showMessage('success', 'Data exported successfully!');
    } catch (error) {
      showMessage('error', 'Failed to export data');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: SettingsIcon },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'data', label: 'Data', icon: Database }
  ];

  const colorSchemes = [
    { id: 'blue', name: 'Blue', color: '#3B82F6' },
    { id: 'green', name: 'Green', color: '#10B981' },
    { id: 'purple', name: 'Purple', color: '#8B5CF6' },
    { id: 'red', name: 'Red', color: '#EF4444' },
    { id: 'orange', name: 'Orange', color: '#F59E0B' }
  ];

  return (
    <AdminLayout title="Settings" subtitle="Manage your account and system preferences">
      <div className="space-y-6">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border-green-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {message.text}
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
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
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
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Profile Information</h3>
                  <p className="text-neutral-600">Update your account details and password</p>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={user?.role || 'admin'}
                        disabled
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-neutral-200 pt-6">
                    <h4 className="text-md font-medium text-neutral-900 mb-4">Change Password</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={profileData.currentPassword}
                            onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-4 py-3 pr-12 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={profileData.newPassword}
                            onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="w-full px-4 py-3 pr-12 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={profileData.confirmPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Theme Settings */}
            {activeTab === 'theme' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Theme & Appearance</h3>
                  <p className="text-neutral-600">Customize the look and feel of your dashboard</p>
                </div>

                <div className="space-y-6">
                  {/* Theme Mode */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">Theme Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', name: 'Light', icon: Monitor },
                        { id: 'dark', name: 'Dark', icon: Monitor },
                        { id: 'auto', name: 'Auto', icon: Smartphone }
                      ].map((theme) => {
                        const Icon = theme.icon;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => setThemeSettings(prev => ({ ...prev, theme: theme.id }))}
                            className={`p-4 border-2 rounded-xl transition-colors ${
                              themeSettings.theme === theme.id
                                ? 'border-primary bg-primary/5'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <Icon className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                            <p className="text-sm font-medium">{theme.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Scheme */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">Color Scheme</label>
                    <div className="flex gap-3">
                      {colorSchemes.map((scheme) => (
                        <button
                          key={scheme.id}
                          onClick={() => setThemeSettings(prev => ({ ...prev, colorScheme: scheme.id }))}
                          className={`w-12 h-12 rounded-xl border-2 transition-all ${
                            themeSettings.colorScheme === scheme.id
                              ? 'border-neutral-400 scale-110'
                              : 'border-neutral-200 hover:scale-105'
                          }`}
                          style={{ backgroundColor: scheme.color }}
                          title={scheme.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Layout Options */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-neutral-900">Layout Options</h4>
                    
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                      <div>
                        <h5 className="font-medium text-neutral-900">Compact Mode</h5>
                        <p className="text-sm text-neutral-600">Reduce spacing and padding</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={themeSettings.compactMode}
                          onChange={(e) => setThemeSettings(prev => ({ ...prev, compactMode: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                      <div>
                        <h5 className="font-medium text-neutral-900">Show Animations</h5>
                        <p className="text-sm text-neutral-600">Enable smooth transitions and animations</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={themeSettings.showAnimations}
                          onChange={(e) => setThemeSettings(prev => ({ ...prev, showAnimations: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSettingsUpdate('themeSettings', themeSettings)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Theme Settings'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Notification Preferences</h3>
                  <p className="text-neutral-600">Choose what notifications you want to receive and how</p>
                </div>

                <div className="space-y-6">
                  {/* Notification Types */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-neutral-900">Notification Types</h4>
                    
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                      { key: 'stockAlerts', label: 'Stock Alerts', desc: 'Get notified when stock is low' },
                      { key: 'orderNotifications', label: 'Order Notifications', desc: 'Get notified about new orders' },
                      { key: 'systemUpdates', label: 'System Updates', desc: 'Get notified about system updates' },
                      { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Receive promotional content' },
                      { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive notifications via SMS' },
                      { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' }
                    ].map((notification) => (
                      <div key={notification.key} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                        <div>
                          <h5 className="font-medium text-neutral-900">{notification.label}</h5>
                          <p className="text-sm text-neutral-600">{notification.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings[notification.key as keyof typeof notificationSettings] as boolean}
                            onChange={(e) => setNotificationSettings(prev => ({ 
                              ...prev, 
                              [notification.key]: e.target.checked 
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Notification Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">Notification Frequency</label>
                    <select
                      value={notificationSettings.notificationFrequency}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, notificationFrequency: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="hourly">Hourly Digest</option>
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly Digest</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSettingsUpdate('notificationSettings', notificationSettings)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Notification Settings'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Security Settings</h3>
                  <p className="text-neutral-600">Manage your account security and access controls</p>
                </div>

                <div className="space-y-6">
                  {/* Two-Factor Authentication */}
                  <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-neutral-900 mb-2">Two-Factor Authentication</h4>
                        <p className="text-sm text-neutral-600">Add an extra layer of security to your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.twoFactorEnabled}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    {securitySettings.twoFactorEnabled && (
                      <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                        Configure 2FA
                      </button>
                    )}
                  </div>

                  {/* Password Policy */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">Password Policy</label>
                    <select
                      value={securitySettings.passwordPolicy}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordPolicy: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="weak">Weak (6+ characters)</option>
                      <option value="medium">Medium (8+ characters, mixed case)</option>
                      <option value="strong">Strong (12+ characters, mixed case, numbers, symbols)</option>
                    </select>
                  </div>

                  {/* Security Options */}
                  <div className="space-y-4">
                    {[
                      { key: 'loginNotifications', label: 'Login Notifications', desc: 'Get notified of new login attempts' },
                      { key: 'deviceTracking', label: 'Device Tracking', desc: 'Track and manage logged-in devices' },
                      { key: 'autoLockout', label: 'Auto Lockout', desc: 'Automatically lock account after failed attempts' }
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                        <div>
                          <h5 className="font-medium text-neutral-900">{setting.label}</h5>
                          <p className="text-sm text-neutral-600">{setting.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings[setting.key as keyof typeof securitySettings] as boolean}
                            onChange={(e) => setSecuritySettings(prev => ({ 
                              ...prev, 
                              [setting.key]: e.target.checked 
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSettingsUpdate('securitySettings', securitySettings)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Security Settings'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">System Configuration</h3>
                  <p className="text-neutral-600">Configure system-wide settings and preferences</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={systemSettings.lowStockThreshold}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Alert when stock falls below this number</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="480"
                        value={systemSettings.sessionTimeout}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Automatically log out inactive users</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'autoBackup', label: 'Auto Backup', desc: 'Automatically backup data daily' },
                      { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Temporarily disable public access' },
                      { key: 'enableAuditLog', label: 'Audit Logging', desc: 'Log all admin actions for security' }
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                        <div>
                          <h4 className="font-medium text-neutral-900">{setting.label}</h4>
                          <p className="text-sm text-neutral-600">{setting.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={systemSettings[setting.key as keyof typeof systemSettings] as boolean}
                            onChange={(e) => setSystemSettings(prev => ({ 
                              ...prev, 
                              [setting.key]: e.target.checked 
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSettingsUpdate('systemSettings', systemSettings)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save System Settings'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Integration Settings */}
            {activeTab === 'integrations' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Third-Party Integrations</h3>
                  <p className="text-neutral-600">Configure external services and API connections</p>
                </div>

                <div className="space-y-6">
                  {/* M-Pesa Integration */}
                  <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-neutral-900">M-Pesa Integration</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integrationSettings.mpesaEnabled}
                          onChange={(e) => setIntegrationSettings(prev => ({ ...prev, mpesaEnabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    {integrationSettings.mpesaEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">Consumer Key</label>
                          <input
                            type="password"
                            value={integrationSettings.mpesaConsumerKey}
                            onChange={(e) => setIntegrationSettings(prev => ({ ...prev, mpesaConsumerKey: e.target.value }))}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            placeholder="Enter M-Pesa consumer key"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">Consumer Secret</label>
                          <input
                            type="password"
                            value={integrationSettings.mpesaConsumerSecret}
                            onChange={(e) => setIntegrationSettings(prev => ({ ...prev, mpesaConsumerSecret: e.target.value }))}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            placeholder="Enter M-Pesa consumer secret"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Email Configuration */}
                  <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
                    <h4 className="font-medium text-neutral-900 mb-4">Email Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Email Provider</label>
                        <select
                          value={integrationSettings.emailProvider}
                          onChange={(e) => setIntegrationSettings(prev => ({ ...prev, emailProvider: e.target.value }))}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        >
                          <option value="smtp">SMTP</option>
                          <option value="sendgrid">SendGrid</option>
                          <option value="mailgun">Mailgun</option>
                        </select>
                      </div>
                      {integrationSettings.emailProvider === 'smtp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">SMTP Host</label>
                            <input
                              type="text"
                              value={integrationSettings.smtpHost}
                              onChange={(e) => setIntegrationSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">SMTP Port</label>
                            <input
                              type="number"
                              value={integrationSettings.smtpPort}
                              onChange={(e) => setIntegrationSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                              placeholder="587"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSettingsUpdate('integrationSettings', integrationSettings)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Integration Settings'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Data Settings */}
            {activeTab === 'data' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Data Management</h3>
                  <p className="text-neutral-600">Configure data export, import, and retention settings</p>
                </div>

                <div className="space-y-6">
                  {/* Export Settings */}
                  <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
                    <h4 className="font-medium text-neutral-900 mb-4">Data Export</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-neutral-900">Auto Export</h5>
                          <p className="text-sm text-neutral-600">Automatically export data at regular intervals</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dataSettings.autoExport}
                            onChange={(e) => setDataSettings(prev => ({ ...prev, autoExport: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">Export Format</label>
                          <select
                            value={dataSettings.exportFormat}
                            onChange={(e) => setDataSettings(prev => ({ ...prev, exportFormat: e.target.value }))}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          >
                            <option value="csv">CSV</option>
                            <option value="json">JSON</option>
                            <option value="xlsx">Excel</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">Export Frequency</label>
                          <select
                            value={dataSettings.exportFrequency}
                            onChange={(e) => setDataSettings(prev => ({ ...prev, exportFrequency: e.target.value }))}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleExportData}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export Data Now
                      </button>
                    </div>
                  </div>

                  {/* Data Retention */}
                  <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
                    <h4 className="font-medium text-neutral-900 mb-4">Data Retention</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Retention Period (days)
                        </label>
                        <input
                          type="number"
                          min="30"
                          max="3650"
                          value={dataSettings.retentionPeriod}
                          onChange={(e) => setDataSettings(prev => ({ ...prev, retentionPeriod: parseInt(e.target.value) }))}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        />
                        <p className="text-xs text-neutral-500 mt-1">How long to keep data before automatic deletion</p>
                      </div>

                      <div className="space-y-3">
                        {[
                          { key: 'compressionEnabled', label: 'Data Compression', desc: 'Compress stored data to save space' },
                          { key: 'encryptionEnabled', label: 'Data Encryption', desc: 'Encrypt sensitive data at rest' }
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-neutral-900">{setting.label}</h5>
                              <p className="text-sm text-neutral-600">{setting.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={dataSettings[setting.key as keyof typeof dataSettings] as boolean}
                                onChange={(e) => setDataSettings(prev => ({ 
                                  ...prev, 
                                  [setting.key]: e.target.checked 
                                }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSettingsUpdate('dataSettings', dataSettings)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Data Settings'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;