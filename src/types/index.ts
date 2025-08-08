export interface User {
  id: string;
  email: string;
  role: 'admin' | 'worker' | 'customer';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image_url: string;
  variants: ProductVariant[];
  created_at: string;
  discount?: Discount;
  barcode?: string;
  sku?: string;
  cost_price?: number;
  minimum_stock?: number;
  location?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  price: number;
  stock: number;
  barcode?: string;
  sku?: string;
}

export interface Discount {
  id: string;
  product_id: string;
  percentage: number;
  start_date: string;
  end_date: string;
}

export interface DiscountCampaign {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle';
  status: 'active' | 'inactive' | 'expired';
  start_date: string;
  end_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DiscountRule {
  id: string;
  campaign_id: string;
  product_id: string;
  discount_value: number;
  minimum_quantity: number;
  maximum_quantity?: number;
  buy_quantity?: number;
  get_quantity?: number;
  maximum_usage_per_customer?: number;
  maximum_total_usage?: number;
  created_at: string;
}

export interface DiscountUsage {
  id: string;
  campaign_id: string;
  order_id: string;
  user_id?: string;
  discount_amount: number;
  quantity_used: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total: number;
  created_at: string;
  items: OrderItem[];
  payment?: Payment;
  cashier_id?: string;
  register_id?: string;
  receipt_number?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  price: number;
  discount_amount?: number;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: 'cash' | 'mpesa' | 'card';
  status: 'pending' | 'completed' | 'failed';
  mpesa_reference?: string;
  card_reference?: string;
  authorized_by?: string;
  created_at: string;
}

export interface StockLog {
  id: string;
  product_id: string;
  variant_id: string | null;
  previous_stock: number;
  new_stock: number;
  change_type: 'sale' | 'restock' | 'adjustment' | 'loss' | 'return';
  reason?: string;
  changed_by: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export interface Register {
  id: string;
  name: string;
  location: string;
  status: 'open' | 'closed';
  opened_at?: string;
  closed_at?: string;
  opened_by?: string;
  cash_float?: number;
}

export interface CashDrawer {
  id: string;
  register_id: string;
  opening_amount: number;
  closing_amount: number;
  difference: number;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
  notes?: string;
}

export interface Employee {
  id: string;
  profile_id: string;
  name: string;
  role: 'admin' | 'worker';
  pin: string;
  active: boolean;
  last_login?: string;
}