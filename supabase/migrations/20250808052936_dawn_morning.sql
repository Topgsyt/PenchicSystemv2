/*
  # Discount and Offers Management System

  1. New Tables
    - discount_campaigns: Main discount/offer campaigns
    - discount_rules: Specific rules for each campaign
    - discount_usage: Track usage and limits
    - product_bundles: Bundle deals configuration
    
  2. Security
    - Enable RLS on all tables
    - Add policies for admin and customer access
    
  3. Functions
    - calculate_discount: Calculate applicable discounts
    - validate_discount_usage: Check usage limits
    - apply_bundle_discount: Handle bundle deals
*/

-- Create discount_campaigns table
CREATE TABLE IF NOT EXISTS discount_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date > start_date)
);

-- Create discount_rules table
CREATE TABLE IF NOT EXISTS discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES discount_campaigns(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  discount_value decimal(10,2) NOT NULL CHECK (discount_value >= 0),
  minimum_quantity int DEFAULT 1 CHECK (minimum_quantity > 0),
  maximum_quantity int CHECK (maximum_quantity IS NULL OR maximum_quantity >= minimum_quantity),
  buy_quantity int CHECK (buy_quantity > 0),
  get_quantity int CHECK (get_quantity >= 0),
  maximum_usage_per_customer int CHECK (maximum_usage_per_customer > 0),
  maximum_total_usage int CHECK (maximum_total_usage > 0),
  created_at timestamptz DEFAULT now()
);

-- Create discount_usage table
CREATE TABLE IF NOT EXISTS discount_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES discount_campaigns(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  discount_amount decimal(10,2) NOT NULL,
  quantity_used int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create product_bundles table
CREATE TABLE IF NOT EXISTS product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES discount_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  bundle_price decimal(10,2) NOT NULL CHECK (bundle_price >= 0),
  original_price decimal(10,2) NOT NULL CHECK (original_price >= bundle_price),
  savings_amount decimal(10,2) GENERATED ALWAYS AS (original_price - bundle_price) STORED,
  savings_percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN original_price > 0 THEN ((original_price - bundle_price) / original_price) * 100
      ELSE 0
    END
  ) STORED,
  minimum_items int DEFAULT 2 CHECK (minimum_items > 1),
  created_at timestamptz DEFAULT now()
);

-- Create bundle_products table
CREATE TABLE IF NOT EXISTS bundle_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  required_quantity int DEFAULT 1 CHECK (required_quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(bundle_id, product_id)
);

-- Enable RLS
ALTER TABLE discount_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_products ENABLE ROW LEVEL SECURITY;

-- Policies for discount_campaigns
CREATE POLICY "Anyone can view active campaigns"
  ON discount_campaigns FOR SELECT
  TO authenticated
  USING (status = 'active' AND start_date <= now() AND end_date >= now());

CREATE POLICY "Admins can manage all campaigns"
  ON discount_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for discount_rules
CREATE POLICY "Anyone can view active discount rules"
  ON discount_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_campaigns
      WHERE discount_campaigns.id = campaign_id
      AND status = 'active'
      AND start_date <= now()
      AND end_date >= now()
    )
  );

CREATE POLICY "Admins can manage discount rules"
  ON discount_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for discount_usage
CREATE POLICY "Users can view own discount usage"
  ON discount_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all discount usage"
  ON discount_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create discount usage records"
  ON discount_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for product_bundles
CREATE POLICY "Anyone can view active bundles"
  ON product_bundles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_campaigns
      WHERE discount_campaigns.id = campaign_id
      AND status = 'active'
      AND start_date <= now()
      AND end_date >= now()
    )
  );

CREATE POLICY "Admins can manage bundles"
  ON product_bundles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for bundle_products
CREATE POLICY "Anyone can view bundle products"
  ON bundle_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage bundle products"
  ON bundle_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to calculate applicable discounts for a product
CREATE OR REPLACE FUNCTION calculate_product_discount(
  p_product_id uuid,
  p_quantity int,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  campaign_id uuid,
  discount_type text,
  original_price decimal(10,2),
  discount_amount decimal(10,2),
  final_price decimal(10,2),
  savings_percentage decimal(5,2),
  offer_description text
) AS $$
DECLARE
  product_price decimal(10,2);
  rule_record RECORD;
  campaign_record RECORD;
  usage_count int;
BEGIN
  -- Get product price
  SELECT price INTO product_price
  FROM products
  WHERE id = p_product_id;

  -- Find applicable discount rules
  FOR rule_record IN
    SELECT dr.*, dc.name, dc.type, dc.description
    FROM discount_rules dr
    JOIN discount_campaigns dc ON dc.id = dr.campaign_id
    WHERE dr.product_id = p_product_id
    AND dc.status = 'active'
    AND dc.start_date <= now()
    AND dc.end_date >= now()
    AND p_quantity >= dr.minimum_quantity
    AND (dr.maximum_quantity IS NULL OR p_quantity <= dr.maximum_quantity)
    ORDER BY dr.discount_value DESC
    LIMIT 1
  LOOP
    -- Check usage limits if user is provided
    IF p_user_id IS NOT NULL THEN
      -- Check per-customer usage limit
      IF rule_record.maximum_usage_per_customer IS NOT NULL THEN
        SELECT COUNT(*) INTO usage_count
        FROM discount_usage
        WHERE campaign_id = rule_record.campaign_id
        AND user_id = p_user_id;
        
        IF usage_count >= rule_record.maximum_usage_per_customer THEN
          CONTINUE;
        END IF;
      END IF;

      -- Check total usage limit
      IF rule_record.maximum_total_usage IS NOT NULL THEN
        SELECT COUNT(*) INTO usage_count
        FROM discount_usage
        WHERE campaign_id = rule_record.campaign_id;
        
        IF usage_count >= rule_record.maximum_total_usage THEN
          CONTINUE;
        END IF;
      END IF;
    END IF;

    -- Calculate discount based on type
    IF rule_record.type = 'percentage' THEN
      RETURN QUERY SELECT
        rule_record.campaign_id,
        rule_record.type,
        product_price,
        (product_price * rule_record.discount_value / 100) * p_quantity,
        product_price - (product_price * rule_record.discount_value / 100),
        rule_record.discount_value,
        format('%s: %s%% OFF', rule_record.name, rule_record.discount_value);
    ELSIF rule_record.type = 'fixed_amount' THEN
      RETURN QUERY SELECT
        rule_record.campaign_id,
        rule_record.type,
        product_price,
        LEAST(rule_record.discount_value * p_quantity, product_price * p_quantity),
        GREATEST(product_price - rule_record.discount_value, 0),
        CASE 
          WHEN product_price > 0 THEN (rule_record.discount_value / product_price) * 100
          ELSE 0
        END,
        format('%s: Save KES %s', rule_record.name, rule_record.discount_value);
    ELSIF rule_record.type = 'buy_x_get_y' THEN
      DECLARE
        free_items int := (p_quantity / rule_record.buy_quantity) * rule_record.get_quantity;
        discount_amt decimal(10,2) := free_items * product_price;
      BEGIN
        RETURN QUERY SELECT
          rule_record.campaign_id,
          rule_record.type,
          product_price,
          discount_amt,
          product_price,
          CASE 
            WHEN product_price > 0 THEN (discount_amt / (product_price * p_quantity)) * 100
            ELSE 0
          END,
          format('%s: Buy %s Get %s Free', rule_record.name, rule_record.buy_quantity, rule_record.get_quantity);
      END;
    END IF;
    
    -- Return first applicable discount
    RETURN;
  END LOOP;
  
  -- No discount found
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to validate discount usage
CREATE OR REPLACE FUNCTION validate_discount_usage(
  p_campaign_id uuid,
  p_user_id uuid,
  p_quantity int DEFAULT 1
)
RETURNS boolean AS $$
DECLARE
  rule_record RECORD;
  usage_count int;
BEGIN
  -- Get discount rule
  SELECT * INTO rule_record
  FROM discount_rules
  WHERE campaign_id = p_campaign_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check per-customer usage limit
  IF rule_record.maximum_usage_per_customer IS NOT NULL THEN
    SELECT COUNT(*) INTO usage_count
    FROM discount_usage
    WHERE campaign_id = p_campaign_id
    AND user_id = p_user_id;
    
    IF usage_count >= rule_record.maximum_usage_per_customer THEN
      RETURN false;
    END IF;
  END IF;

  -- Check total usage limit
  IF rule_record.maximum_total_usage IS NOT NULL THEN
    SELECT COUNT(*) INTO usage_count
    FROM discount_usage
    WHERE campaign_id = p_campaign_id;
    
    IF usage_count >= rule_record.maximum_total_usage THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Insert sample discount campaigns
INSERT INTO discount_campaigns (name, description, type, start_date, end_date) VALUES
('Summer Sale', '50% off selected feed products', 'percentage', now(), now() + interval '30 days'),
('New Customer Offer', 'KES 500 off first purchase', 'fixed_amount', now(), now() + interval '60 days'),
('Buy 1 Get 1 Free', 'Special offer on poultry feed', 'buy_x_get_y', now(), now() + interval '14 days')
ON CONFLICT DO NOTHING;