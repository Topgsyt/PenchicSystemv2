/*
  # Consolidated Schema for Penchic Farm

  1. Tables
    - profiles: User profiles with roles
    - products: Product information
    - product_variants: Size variants for products
    - orders: Customer orders
    - order_items: Individual items in orders
    - notifications: System notifications for stock alerts
    - mpesa_configs: M-Pesa API configuration
    - mpesa_transactions: M-Pesa payment tracking

  2. Functions
    - update_stock_for_order: Safely updates product stock levels
    
  3. Security
    - Enable RLS on all tables
    - Set up access policies for different user roles
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'worker')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  total decimal(10,2) NOT NULL CHECK (total >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL CHECK (price >= 0)
);

-- Create mpesa_configs table
CREATE TABLE IF NOT EXISTS public.mpesa_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_shortcode text NOT NULL,
  passkey text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mpesa_transactions table
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  checkout_request_id text,
  merchant_request_id text,
  phone_number text NOT NULL,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  reference_number text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_code text,
  result_desc text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_order_id ON mpesa_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_user_id ON mpesa_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON mpesa_transactions(status);

-- Create stock update function
CREATE OR REPLACE FUNCTION public.update_stock_for_order(
  cart_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  current_stock integer;
  requested_quantity integer;
  product_id uuid;
  variant_id uuid;
BEGIN
  -- Validate input
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RAISE EXCEPTION 'Invalid cart items';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    product_id := (item->>'product_id')::uuid;
    variant_id := (item->>'variant_id')::uuid;
    requested_quantity := (item->>'quantity')::integer;
    
    IF requested_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', product_id;
    END IF;
    
    -- Handle variant stock if variant_id is provided
    IF variant_id IS NOT NULL THEN
      -- Get current variant stock level
      SELECT stock INTO current_stock
      FROM public.product_variants
      WHERE id = variant_id
      FOR UPDATE;  -- Lock the row
      
      IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Variant % not found', variant_id;
      END IF;
      
      IF current_stock < requested_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for variant %', variant_id;
      END IF;
      
      -- Update variant stock
      UPDATE public.product_variants
      SET stock = stock - requested_quantity
      WHERE id = variant_id;
      
    ELSE
      -- Get current product stock level
      SELECT stock INTO current_stock
      FROM public.products
      WHERE id = product_id
      FOR UPDATE;  -- Lock the row
      
      IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product % not found', product_id;
      END IF;
      
      IF current_stock < requested_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %', product_id;
      END IF;
      
      -- Update product stock
      UPDATE public.products
      SET stock = stock - requested_quantity
      WHERE id = product_id;
    END IF;
  END LOOP;
END;
$$;

-- Set up function permissions
REVOKE ALL ON FUNCTION public.update_stock_for_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_stock_for_order(jsonb) TO authenticated;

-- Create RLS policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow public read access to products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to products"
  ON public.products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can view own transactions"
  ON public.mpesa_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow insert for authenticated users"
  ON public.mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for system and admins"
  ON public.mpesa_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage mpesa_configs"
  ON public.mpesa_configs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));