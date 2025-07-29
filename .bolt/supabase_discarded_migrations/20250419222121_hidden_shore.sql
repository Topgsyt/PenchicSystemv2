/*
  # Revert Order Status Changes

  1. Changes
    - Update orders table status check constraint to include 'processing'
    - Maintain existing order statuses
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing check constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new check constraint with all status options
ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'processing', 'completed'));