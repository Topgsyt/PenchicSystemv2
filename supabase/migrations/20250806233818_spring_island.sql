/*
  # Order Snapshots and Reporting Enhancement

  1. New Tables
    - order_product_snapshots: Store product details at time of order
    - order_calculations: Store detailed calculation breakdowns
    - order_audit_logs: Track order modifications
    
  2. Security
    - Enable RLS on all new tables
    - Add policies for admin and worker access
    
  3. Functions
    - create_order_snapshot: Capture product state at order time
    - calculate_order_totals: Ensure accurate calculations
    - audit_order_changes: Track modifications
*/

-- Create order_product_snapshots table to preserve historical product data
CREATE TABLE IF NOT EXISTS order_product_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  product_description text,
  product_category text NOT NULL,
  product_image_url text,
  price_at_time decimal(10,2) NOT NULL,
  variant_id uuid,
  variant_size text,
  variant_price decimal(10,2),
  created_at timestamptz DEFAULT now()
);

-- Create order_calculations table for detailed calculation tracking
CREATE TABLE IF NOT EXISTS order_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 16.00,
  discount_amount decimal(10,2) NOT NULL DEFAULT 0,
  shipping_fee decimal(10,2) NOT NULL DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  calculation_method text DEFAULT 'standard',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_audit_logs table for tracking changes
CREATE TABLE IF NOT EXISTS order_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  change_type text NOT NULL CHECK (change_type IN ('created', 'status_updated', 'item_added', 'item_removed', 'total_recalculated')),
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE order_product_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for order_product_snapshots
CREATE POLICY "Admins can view all order snapshots"
  ON order_product_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

CREATE POLICY "System can create order snapshots"
  ON order_product_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for order_calculations
CREATE POLICY "Admins can manage order calculations"
  ON order_calculations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

-- Policies for order_audit_logs
CREATE POLICY "Admins can view audit logs"
  ON order_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create audit logs"
  ON order_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create order snapshots
CREATE OR REPLACE FUNCTION create_order_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  product_data RECORD;
  variant_data RECORD;
BEGIN
  -- Get current product data
  SELECT * INTO product_data
  FROM products
  WHERE id = NEW.product_id;

  -- Get variant data if applicable
  IF NEW.variant_id IS NOT NULL THEN
    SELECT * INTO variant_data
    FROM product_variants
    WHERE id = NEW.variant_id;
  END IF;

  -- Create snapshot
  INSERT INTO order_product_snapshots (
    order_item_id,
    product_id,
    product_name,
    product_description,
    product_category,
    product_image_url,
    price_at_time,
    variant_id,
    variant_size,
    variant_price
  ) VALUES (
    NEW.id,
    NEW.product_id,
    product_data.name,
    product_data.description,
    product_data.category,
    product_data.image_url,
    NEW.price,
    NEW.variant_id,
    variant_data.size,
    variant_data.price
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate order totals accurately
CREATE OR REPLACE FUNCTION calculate_order_totals(order_uuid uuid)
RETURNS TABLE(
  subtotal decimal(10,2),
  tax_amount decimal(10,2),
  discount_amount decimal(10,2),
  shipping_fee decimal(10,2),
  total_amount decimal(10,2)
) AS $$
DECLARE
  calc_subtotal decimal(10,2) := 0;
  calc_tax decimal(10,2) := 0;
  calc_discount decimal(10,2) := 0;
  calc_shipping decimal(10,2) := 0;
  calc_total decimal(10,2) := 0;
  tax_rate_value decimal(5,2) := 16.00;
BEGIN
  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(quantity * price), 0)
  INTO calc_subtotal
  FROM order_items
  WHERE order_id = order_uuid;

  -- Get tax rate (default 16% VAT)
  SELECT COALESCE(rate, 16.00)
  INTO tax_rate_value
  FROM tax_rates
  WHERE is_default = true
  LIMIT 1;

  -- Calculate tax
  calc_tax := calc_subtotal * (tax_rate_value / 100);

  -- Calculate discount (if any)
  SELECT COALESCE(SUM(
    CASE 
      WHEN d.percentage IS NOT NULL 
      THEN (oi.quantity * oi.price) * (d.percentage / 100)
      ELSE 0
    END
  ), 0)
  INTO calc_discount
  FROM order_items oi
  LEFT JOIN discounts d ON d.product_id = oi.product_id
    AND CURRENT_TIMESTAMP BETWEEN d.start_date AND d.end_date
  WHERE oi.order_id = order_uuid;

  -- Calculate total
  calc_total := calc_subtotal + calc_tax - calc_discount + calc_shipping;

  -- Return calculated values
  RETURN QUERY SELECT calc_subtotal, calc_tax, calc_discount, calc_shipping, calc_total;
END;
$$ LANGUAGE plpgsql;

-- Function to audit order changes
CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_audit_logs (
    order_id,
    changed_by,
    change_type,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'status_updated'
      WHEN TG_OP = 'UPDATE' THEN 'total_recalculated'
      ELSE 'modified'
    END,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS create_order_snapshot_trigger ON order_items;
CREATE TRIGGER create_order_snapshot_trigger
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION create_order_snapshot();

DROP TRIGGER IF EXISTS audit_order_changes_trigger ON orders;
CREATE TRIGGER audit_order_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_order_changes();

-- Insert default calculation record for existing orders
INSERT INTO order_calculations (order_id, subtotal, tax_amount, total_amount)
SELECT 
  o.id,
  COALESCE(SUM(oi.quantity * oi.price), 0) as subtotal,
  COALESCE(SUM(oi.quantity * oi.price), 0) * 0.16 as tax_amount,
  o.total as total_amount
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE NOT EXISTS (
  SELECT 1 FROM order_calculations WHERE order_id = o.id
)
GROUP BY o.id, o.total
ON CONFLICT DO NOTHING;