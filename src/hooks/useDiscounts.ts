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
    if (!productId || quantity <= 0) {
      return null;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('id, product_id, percentage, start_date, end_date, created_by')
        .eq('product_id', productId)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        // Sort discounts by percentage in descending order (client-side)
        const sortedDiscounts = data.sort((a, b) => b.percentage - a.percentage);
        
        const discount = sortedDiscounts[0];
        
        // Get product price
        const { data: productData } = await supabase
          .from('products')
          .select('price')
          .eq('id', productId)
          .single();
          
        if (!productData) return null;
        
        const originalPrice = productData.price;
        const discountAmount = (originalPrice * discount.percentage / 100);
        const finalPrice = originalPrice - discountAmount;
        
        return {
          campaign_id: discount.id,
          discount_type: 'percentage',
          original_price: originalPrice,
          discount_amount: discountAmount,
          final_price: finalPrice,
          savings_percentage: originalPrice > 0 ? (discountAmount / originalPrice) * 100 : 0,
          offer_description: `Special Offer: ${discount.percentage}% OFF`
        };
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