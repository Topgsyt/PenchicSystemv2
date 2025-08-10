import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InventoryVisibilitySettings {
  can_view_stock: boolean;
  can_view_low_stock_alerts: boolean;
  can_modify_stock: boolean;
}

interface UseInventoryVisibilityReturn {
  canViewStock: boolean;
  canViewLowStockAlerts: boolean;
  canModifyStock: boolean;
  loading: boolean;
  error: string | null;
}

export const useInventoryVisibility = (userRole?: string): UseInventoryVisibilityReturn => {
  const [settings, setSettings] = useState<InventoryVisibilitySettings>({
    can_view_stock: false,
    can_view_low_stock_alerts: false,
    can_modify_stock: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisibilitySettings = async () => {
      if (!userRole) {
        setSettings({
          can_view_stock: false,
          can_view_low_stock_alerts: false,
          can_modify_stock: false
        });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('inventory_visibility_settings')
          .select('can_view_stock, can_view_low_stock_alerts, can_modify_stock')
          .eq('role', userRole)
          .single();

        if (error) {
          // If table doesn't exist, use default role-based logic
          const defaultSettings = {
            can_view_stock: ['admin', 'worker'].includes(userRole),
            can_view_low_stock_alerts: ['admin', 'worker'].includes(userRole),
            can_modify_stock: userRole === 'admin'
          };
          setSettings(defaultSettings);
        } else {
          setSettings(data);
        }
      } catch (err: any) {
        console.error('Error fetching inventory visibility settings:', err);
        setError(err.message);
        
        // Fallback to role-based defaults
        const defaultSettings = {
          can_view_stock: ['admin', 'worker'].includes(userRole),
          can_view_low_stock_alerts: ['admin', 'worker'].includes(userRole),
          can_modify_stock: userRole === 'admin'
        };
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };

    fetchVisibilitySettings();
  }, [userRole]);

  return {
    canViewStock: settings.can_view_stock,
    canViewLowStockAlerts: settings.can_view_low_stock_alerts,
    canModifyStock: settings.can_modify_stock,
    loading,
    error
  };
};