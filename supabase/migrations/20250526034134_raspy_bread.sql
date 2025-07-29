/*
  # Add Admin User Management Function

  1. Changes
    - Enable pgcrypto extension for password hashing
    - Drop existing function to allow return type change
    - Create admin user management function
    
  2. Security
    - Use SECURITY DEFINER for proper auth schema access
    - Validate admin role, email format, and password strength
    - Proper password hashing with bcrypt
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function first
DROP FUNCTION IF EXISTS create_user_as_admin(uuid, text, text, text);

-- Create function for admin user management
CREATE OR REPLACE FUNCTION create_user_as_admin(
  admin_id uuid,
  new_user_email text,
  new_user_password text,
  new_user_role text DEFAULT 'customer'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Verify the admin user has admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = admin_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create users';
  END IF;

  -- Validate email format
  IF new_user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate password length
  IF length(new_user_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  -- Validate role
  IF new_user_role NOT IN ('admin', 'worker', 'customer') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, worker, or customer';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  )
  VALUES (
    new_user_email,
    crypt(new_user_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    new_user_role
  )
  RETURNING id INTO new_user_id;

  -- Create profile for the new user
  INSERT INTO profiles (id, email, role)
  VALUES (new_user_id, new_user_email, new_user_role);

  RETURN new_user_id;
END;
$$;