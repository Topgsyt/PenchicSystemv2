/*
  # Update Order Status Options

  1. Changes
    - Update orders table status check constraint
    - Update existing orders with new status values
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update existing orders to use new status values
UPDATE orders 
SET status = 'completed' 
WHERE status = 'processing';

-- Drop existing check constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new check constraint with updated status options
ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'completed'));