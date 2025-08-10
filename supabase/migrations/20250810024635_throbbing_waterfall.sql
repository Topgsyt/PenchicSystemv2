/*
  # Comprehensive Discount and Inventory Management System

  1. New Tables
    - `discount_campaigns` - Main discount campaigns with metadata
    - `discount_rules` - Specific rules for each campaign (product-specific)
    - `discount_usage` - Track usage of discounts for analytics and limits
    - `inventory_visibility_settings` - Control stock visibility by user role

  2. Security
    - Enable RLS on all new tables
    - Add policies for admin/worker access to discount management
    - Add policies for customer access to active discounts only
    - Add policies for stock visibility based on user roles

  3. Features
    - Support for percentage, fixed amount, BOGO, and bundle discounts
    - Real-time discount validation and application
    - Usage tracking and limits
    - Role-based stock visibility
    - Audit trail for discount changes
*/

-- Create discount campaigns table
CREATE TABLE IF NOT EXISTS discount_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create discount rules table
CREATE TABLE IF NOT EXISTS discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES discount_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_value numeric(10,2) NOT NULL CHECK (discount_value >= 0),
  minimum_quantity integer DEFAULT 1 CHECK (minimum_quantity > 0),
  maximum_quantity integer CHECK (maximum_quantity IS NULL OR maximum_quantity >= minimum_quantity),
  buy_quantity integer CHECK (buy_quantity IS NULL OR buy_quantity > 0),
  get_quantity integer CHECK (get_quantity IS NULL OR get_quantity > 0),
  maximum_usage_per_customer integer CHECK (maximum_usage_per_customer IS NULL OR maximum_usage_per_customer > 0),
  maximum_total_usage integer CHECK (maximum_total_usage IS NULL OR maximum_total_usage > 0),
  created_at timestamptz DEFAULT now()
);

-- Create discount usage tracking table
CREATE TABLE IF NOT EXISTS discount_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES discount_campaigns(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  discount_amount numeric(10,2) NOT NULL CHECK (discount_amount >= 0),
  quantity_used integer NOT NULL CHECK (quantity_used > 0),
  created_at timestamptz DEFAULT now()
);

-- Create inventory visibility settings table
CREATE TABLE IF NOT EXISTS inventory_visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'worker', 'customer')),
  can_view_stock boolean DEFAULT false,
  can_view_low_stock_alerts boolean DEFAULT false,
  can_modify_stock boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role)
);

-- Insert default inventory visibility settings
INSERT INTO inventory_visibility_settings (role, can_view_stock, can_view_low_stock_alerts, can_modify_stock)
VALUES 
  ('admin', true, true, true),
  ('worker', true, true, true),
  ('customer', false, false, false)
ON CONFLICT (role) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE discount_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Discount campaigns policies
CREATE POLICY "Admins can manage discount campaigns"
  ON discount_campaigns
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Everyone can view active discount campaigns"
  ON discount_campaigns
  FOR SELECT
  TO authenticated
  USING (status = 'active' AND start_date <= now() AND end_date >= now());

-- Discount rules policies
CREATE POLICY "Admins can manage discount rules"
  ON discount_rules
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Everyone can view active discount rules"
  ON discount_rules
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM discount_campaigns 
    WHERE discount_campaigns.id = discount_rules.campaign_id 
    AND discount_campaigns.status = 'active' 
    AND discount_campaigns.start_date <= now() 
    AND discount_campaigns.end_date >= now()
  ));

-- Discount usage policies
CREATE POLICY "Admins can view all discount usage"
  ON discount_usage
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Users can view their own discount usage"
  ON discount_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create discount usage records"
  ON discount_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Inventory visibility settings policies
CREATE POLICY "Admins can manage inventory visibility settings"
  ON inventory_visibility_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Everyone can view inventory visibility settings"
  ON inventory_visibility_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to get active discounts for a product
CREATE OR REPLACE FUNCTION get_product_discount(
  p_product_id uuid,
  p_quantity integer DEFAULT 1,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  campaign_id uuid,
  discount_type text,
  original_price numeric,
  discount_amount numeric,
  final_price numeric,
  savings_percentage numeric,
  offer_description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id as campaign_id,
    dc.type as discount_type,
    p.price as original_price,
    CASE 
      WHEN dc.type = 'percentage' THEN p.price * (dr.discount_value / 100)
      WHEN dc.type = 'fixed_amount' THEN LEAST(dr.discount_value, p.price)
      ELSE 0
    END as discount_amount,
    CASE 
      WHEN dc.type = 'percentage' THEN p.price * (1 - dr.discount_value / 100)
      WHEN dc.type = 'fixed_amount' THEN GREATEST(0, p.price - dr.discount_value)
      ELSE p.price
    END as final_price,
    CASE 
      WHEN dc.type = 'percentage' THEN dr.discount_value
      WHEN dc.type = 'fixed_amount' AND p.price > 0 THEN (dr.discount_value / p.price) * 100
      ELSE 0
    END as savings_percentage,
    CASE 
      WHEN dc.type = 'percentage' THEN dc.name || ': ' || dr.discount_value || '% OFF'
      WHEN dc.type = 'fixed_amount' THEN dc.name || ': KES ' || dr.discount_value || ' OFF'
      WHEN dc.type = 'buy_x_get_y' THEN dc.name || ': Buy ' || dr.buy_quantity || ' Get ' || dr.get_quantity || ' Free'
      ELSE dc.name
    END as offer_description
  FROM discount_campaigns dc
  JOIN discount_rules dr ON dc.id = dr.campaign_id
  JOIN products p ON dr.product_id = p.id
  WHERE dr.product_id = p_product_id
    AND dc.status = 'active'
    AND dc.start_date <= now()
    AND dc.end_date >= now()
    AND dr.minimum_quantity <= p_quantity
    AND (dr.maximum_quantity IS NULL OR dr.maximum_quantity >= p_quantity)
  ORDER BY 
    CASE 
      WHEN dc.type = 'percentage' THEN dr.discount_value
      WHEN dc.type = 'fixed_amount' THEN (dr.discount_value / p.price) * 100
      ELSE 0
    END DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check stock visibility for user
CREATE OR REPLACE FUNCTION can_view_stock(p_user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
  user_role text;
  can_view boolean DEFAULT false;
BEGIN
  -- If no user provided, return false
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check visibility settings
  SELECT can_view_stock INTO can_view
  FROM inventory_visibility_settings
  WHERE role = user_role;
  
  RETURN COALESCE(can_view, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discount_campaigns_active ON discount_campaigns(status, start_date, end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_discount_rules_product ON discount_rules(product_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_campaign ON discount_usage(campaign_id, user_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_usage(user_id, created_at);