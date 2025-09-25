import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface DiscountInfo {
  campaign_id: string;
  discount_type: string;
  original_price: number;
  discount_amount: number;
  final_price: number;
  savings_percentage: number;
  offer_description: string;
  buy_quantity?: number;
  get_quantity?: number;
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
    
    if (!productId || !quantity || quantity <= 0) {
      return null;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Query the discounts table directly
      const { data: discounts, error: discountError } = await supabase
        .from('discounts')
        .select('id, product_id, percentage, start_date, end_date')
        .eq('product_id', productId)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('percentage', { ascending: false })
        .limit(1);

      if (discountError) {
        console.error('Error fetching discounts:', discountError);
        return null;
      }

      if (!discounts || discounts.length === 0) {
        return null;
      }

      const discount = discounts[0];
      
      // Get product price
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        console.error('Error fetching product:', productError);
        return null;
      }
      
      const originalPrice = productData.price;
      if (originalPrice <= 0) {
        return null;
      }
      
      if (!originalPrice || originalPrice <= 0) {
        return null;
      }
      
      const discountAmount = (originalPrice * discount.percentage / 100);
      const finalPrice = originalPrice - discountAmount;
      
      return {
        campaign_id: discount.id,
        discount_type: 'percentage',
        original_price: originalPrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        savings_percentage: discount.percentage,
        offer_description: `Special Offer: ${discount.percentage}% OFF`
      };
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
      // For now, allow unlimited usage since we don't have usage tracking table
      // This can be enhanced later with proper usage limits
      return true;
    } catch (err: any) {
      console.error('Error validating discount usage:', err);
      return true; // Allow usage on error to not break the flow
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
      // This would track discount usage if we had the table
      // For now, we'll just log the usage
      console.log('Discount applied:', {
        campaignId,
        orderId,
        userId,
        discountAmount,
        quantity
      });
    } catch (err: any) {
      console.error('Error applying discount:', err);
      // Don't throw error to not break the checkout flow
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