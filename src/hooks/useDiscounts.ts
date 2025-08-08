import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DiscountInfo {
  campaign_id: string;
  discount_type: string;
  original_price: number;
  discount_amount: number;
  final_price: number;
  savings_percentage: number;
  offer_description: string;
}

interface UseDiscountsReturn {
  getProductDiscount: (productId: string, quantity: number, userId?: string) => Promise<DiscountInfo | null>;
  validateDiscountUsage: (campaignId: string, userId: string) => Promise<boolean>;
  applyDiscount: (campaignId: string, orderId: string, userId: string, discountAmount: number, quantity: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useDiscounts = (): UseDiscountsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProductDiscount = async (
    productId: string, 
    quantity: number, 
    userId?: string
  ): Promise<DiscountInfo | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('calculate_product_discount', {
        p_product_id: productId,
        p_quantity: quantity,
        p_user_id: userId || null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0];
      }

      return null;
    } catch (err: any) {
      console.error('Error calculating discount:', err);
      setError(err.message || 'Failed to calculate discount');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validateDiscountUsage = async (campaignId: string, userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_discount_usage', {
        p_campaign_id: campaignId,
        p_user_id: userId
      });

      if (error) throw error;
      return data || false;
    } catch (err: any) {
      console.error('Error validating discount usage:', err);
      setError(err.message || 'Failed to validate discount usage');
      return false;
    }
  };

  const applyDiscount = async (
    campaignId: string,
    orderId: string,
    userId: string,
    discountAmount: number,
    quantity: number
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('discount_usage')
        .insert([{
          campaign_id: campaignId,
          order_id: orderId,
          user_id: userId,
          discount_amount: discountAmount,
          quantity_used: quantity
        }]);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error applying discount:', err);
      setError(err.message || 'Failed to apply discount');
      throw err;
    }
  };

  return {
    getProductDiscount,
    validateDiscountUsage,
    applyDiscount,
    loading,
    error
  };
};