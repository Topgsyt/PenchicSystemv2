/*
  # Update Payment Info

  1. Changes
    - Update payment_info table with correct values from image
    - Business number: 073593
    - Paybill number: 247247
    - Account number: 073593
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update payment info with correct values
UPDATE payment_info
SET 
  paybill_number = '247247',
  account_number = '073593',
  updated_at = now()
WHERE id = (
  SELECT id FROM payment_info 
  ORDER BY created_at 
  LIMIT 1
);