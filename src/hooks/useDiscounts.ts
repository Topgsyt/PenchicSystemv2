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
      // Use the database function to get the best discount
      const { data, error } = await supabase
        .rpc('get_product_discount', {
          p_product_id: productId,
          p_quantity: quantity,
          p_user_id: userId || null
        });

      if (error) {
        console.error('Error calling get_product_discount function:', error);
        // Fallback to direct table query if function doesn't exist
        return await getProductDiscountFallback(productId, quantity, userId);
      }

      if (data && data.length > 0) {
        const discount = data[0];
        return {
          campaign_id: discount.campaign_id,
          discount_type: discount.discount_type,
          original_price: Number(discount.original_price),
          discount_amount: Number(discount.discount_amount),
          final_price: Number(discount.final_price),
          savings_percentage: Number(discount.savings_percentage),
          offer_description: discount.offer_description
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

  // Fallback method using direct table queries
  const getProductDiscountFallback = async (
    productId: string, 
    quantity: number, 
    userId?: string
  ): Promise<DiscountInfo | null> => {
    try {
      // Query discount campaigns with rules for the specific product
      const { data: campaigns, error: campaignsError } = await supabase
        .from('discount_campaigns')
        .select(`
          id,
          name,
          type,
          status,
          start_date,
          end_date,
          discount_rules!inner (
            discount_value,
            minimum_quantity,
            maximum_quantity,
            buy_quantity,
            get_quantity,
            product_id
          )
        `)
        .eq('status', 'active')
        .eq('discount_rules.product_id', productId)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .gte('discount_rules.minimum_quantity', quantity);

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        // If campaigns table doesn't exist, try the old discounts table
        return await getProductDiscountLegacy(productId, quantity, userId);
      }

      if (campaigns && campaigns.length > 0) {
        // Sort by discount value and take the best one
        const sortedCampaigns = campaigns.sort((a, b) => {
          const aValue = a.discount_rules[0]?.discount_value || 0;
          const bValue = b.discount_rules[0]?.discount_value || 0;
          return bValue - aValue;
        });

        const campaign = sortedCampaigns[0];
        const rule = campaign.discount_rules[0];

        // Get product price
        const { data: productData } = await supabase
          .from('products')
          .select('price')
          .eq('id', productId)
          .single();

        if (!productData) return null;

        const originalPrice = productData.price;
        let discountAmount = 0;
        let finalPrice = originalPrice;

        switch (campaign.type) {
          case 'percentage':
            discountAmount = originalPrice * (rule.discount_value / 100);
            finalPrice = originalPrice - discountAmount;
            break;
          case 'fixed_amount':
            discountAmount = Math.min(rule.discount_value, originalPrice);
            finalPrice = Math.max(0, originalPrice - discountAmount);
            break;
          case 'buy_x_get_y':
            // For BOGO, calculate effective discount
            if (quantity >= rule.buy_quantity) {
              const freeItems = Math.floor(quantity / rule.buy_quantity) * rule.get_quantity;
              discountAmount = freeItems * originalPrice;
              finalPrice = originalPrice; // Price per item stays same, but effective total is lower
            }
            break;
        }

        return {
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
          }`
        };
      }

      return null;
    } catch (err: any) {
      console.error('Error in fallback discount calculation:', err);
      return await getProductDiscountLegacy(productId, quantity, userId);
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
        .select('id, product_id, percentage, start_date, end_date, created_by')
        .eq('product_id', productId)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        // Sort discounts by percentage in descending order
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
      console.error('Error in legacy discount calculation:', err);
      setError(err.message || 'Failed to calculate discount');
      return null;
    }
  };

  const validateDiscountUsage = async (campaignId: string, userId: string): Promise<boolean> => {
    try {
      // Check if user has exceeded usage limits
      const { data: campaign, error: campaignError } = await supabase
        .from('discount_campaigns')
        .select(`
          id,
          discount_rules (
            maximum_usage_per_customer,
            maximum_total_usage
          )
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError) return true; // Allow if we can't check

      const rule = campaign.discount_rules[0];
      if (!rule) return true;

      // Check per-customer usage limit
      if (rule.maximum_usage_per_customer) {
        const { count: userUsageCount } = await supabase
          .from('discount_usage')
          .select('id', { count: 'exact' })
          .eq('campaign_id', campaignId)
          .eq('user_id', userId);

        if (userUsageCount >= rule.maximum_usage_per_customer) {
          return false;
        }
      }

      // Check total usage limit
      if (rule.maximum_total_usage) {
        const { count: totalUsageCount } = await supabase
          .from('discount_usage')
          .select('id', { count: 'exact' })
          .eq('campaign_id', campaignId);

        if (totalUsageCount >= rule.maximum_total_usage) {
          return false;
        }
      }

      return true;
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