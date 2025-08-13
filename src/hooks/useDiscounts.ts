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
    
    setLoading(true);
    setError(null);

    try {
      // First try to get active discount campaigns
      const { data: campaigns, error: campaignError } = await supabase
        .from('discount_campaigns')
        .select(`
          id,
          name,
          type,
          status,
          start_date,
          end_date,
          discount_rules (
            id,
            discount_value,
            minimum_quantity,
            maximum_quantity,
            buy_quantity,
            get_quantity,
            product_id
          )
        `)
        .eq('status', 'active')
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (campaignError) {
        console.log('Campaign table not found, using legacy discounts table');
        return await getProductDiscountLegacy(productId, quantity, userId);
      }

      // Find campaigns that apply to this product
      const applicableCampaigns = campaigns?.filter(campaign => 
        campaign.discount_rules?.some(rule => 
          rule.product_id === productId && 
          rule.minimum_quantity <= quantity &&
          (!rule.maximum_quantity || rule.maximum_quantity >= quantity)
        )
      ) || [];

      if (applicableCampaigns.length === 0) {
        return await getProductDiscountLegacy(productId, quantity, userId);
      }

      // Get the best discount (highest value)
      let bestDiscount = null;
      let bestSavings = 0;

      for (const campaign of applicableCampaigns) {
        const rule = campaign.discount_rules?.find(r => r.product_id === productId);
        if (!rule) continue;

        // Get product price
        const { data: productData } = await supabase
          .from('products')
          .select('price')
          .eq('id', productId)
          .single();

        if (!productData) continue;

        const originalPrice = productData.price;
        let discountAmount = 0;
        let finalPrice = originalPrice;

        switch (campaign.type) {
          case 'percentage':
            discountAmount = (originalPrice * rule.discount_value / 100);
            finalPrice = originalPrice - discountAmount;
            break;
          case 'fixed_amount':
            discountAmount = rule.discount_value;
            finalPrice = Math.max(0, originalPrice - discountAmount);
            break;
          case 'buy_x_get_y':
            // For BOGO, calculate effective discount
            if (rule.buy_quantity && rule.get_quantity && quantity >= rule.buy_quantity) {
              const freeItems = Math.floor(quantity / rule.buy_quantity) * rule.get_quantity;
              discountAmount = (freeItems * originalPrice) / quantity;
              finalPrice = originalPrice - discountAmount;
            }
            break;
        }

        if (discountAmount > bestSavings) {
          bestSavings = discountAmount;
          bestDiscount = {
            campaign_id: campaign.id,
            discount_type: campaign.type,
            original_price: originalPrice,
            discount_amount: discountAmount,
            final_price: finalPrice,
            savings_percentage: originalPrice > 0 ? (discountAmount / originalPrice) * 100 : 0,
            offer_description: `${campaign.name}: ${
              campaign.type === 'percentage' ? `${rule.discount_value}% OFF` :
              campaign.type === 'fixed_amount' ? `KES ${rule.discount_value} OFF` :
              campaign.type === 'buy_x_get_y' ? `Buy ${rule.buy_quantity} Get ${rule.get_quantity} Free` :
              'Special Offer'
            }`,
            buy_quantity: rule.buy_quantity,
            get_quantity: rule.get_quantity
          };
        }
      }

      return bestDiscount;
    } catch (err: any) {
      console.error('Error calculating discount:', err);
      setError(err.message || 'Failed to calculate discount');
      return await getProductDiscountLegacy(productId, quantity, userId);
    } finally {
      setLoading(false);
    }
  };

  // Legacy method using the existing discounts table
  const getProductDiscountLegacy = async (
    productId: string, 
    quantity: number, 
    userId?: string
  ): Promise<DiscountInfo | null> => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('id, product_id, percentage, start_date, end_date')
        .eq('product_id', productId)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('percentage', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const discount = data[0];
        
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
      console.error('Error in legacy discount calculation:', err);
      return null;
    }
  };

  const validateDiscountUsage = async (campaignId: string, userId: string): Promise<boolean> => {
    try {
      // Check if discount_usage table exists
      const { data: usageData, error: usageError } = await supabase
        .from('discount_usage')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .limit(1);

      if (usageError) {
        // Table doesn't exist, allow usage
        return true;
      }

      // For now, allow unlimited usage
      return true;
    } catch (err: any) {
      console.error('Error validating discount usage:', err);
      return true;
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

      if (error) {
        console.log('Discount usage tracking failed (table may not exist):', error);
      }
    } catch (err: any) {
      console.error('Error applying discount:', err);
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