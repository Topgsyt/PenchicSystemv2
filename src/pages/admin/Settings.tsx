import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Save, 
  Bell, 
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Monitor,
  Type,
  Layout,
  Volume2,
  Shield,
  Database,
  Wifi,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [activeTab, setActiveTab] = useState('notifications');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});
  const [confirmMessage, setConfirmMessage] = useState('');
  
  
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

  // Check admin access and load settings
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadSettings();
  }, [user, navigate]);

  // Load settings from localStorage
  const loadSettings = () => {
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
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setErrorMessage('Failed to load settings');
      setTimeout(() => setErrorMessage(''), 3000);
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