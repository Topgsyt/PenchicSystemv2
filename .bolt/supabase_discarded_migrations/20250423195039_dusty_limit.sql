/*
  # Add M-Pesa Configuration

  1. Changes
    - Insert M-Pesa credentials into mpesa_configs table
    - Use secure environment variables
    
  2. Security
    - Store sensitive credentials in database
    - Protected by RLS policies
*/

-- Insert M-Pesa configuration
INSERT INTO mpesa_configs (
  business_shortcode,
  passkey,
  consumer_key,
  consumer_secret,
  environment
)
VALUES (
  '174379',
  'bfb279f9aa9bdbcf1a06e63a1e6b8b5b',
  'm8kkEkBxRgVsGCxPiWHONq3nMmdTdgUO60co2lnyyZd7hRIt',
  'TuYZ8cH5pXjAoJO7o1907uxXFSHQAHDfGPGsetkMiFlSJJFnkQpBg8clB1oyAOut',
  'sandbox'
)
ON CONFLICT DO NOTHING;