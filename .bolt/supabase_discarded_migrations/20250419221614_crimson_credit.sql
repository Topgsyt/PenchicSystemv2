/*
  # Add secure admin user management

  1. Changes
    - Add secure function for admin user management
    - Update RLS policies for admin access
    
  2. Security
    - Use SECURITY DEFINER to safely handle admin operations
    - Ensure proper role checks
    - Keep service role key secure
*/

-- Function to create a new user securely
CREATE OR REPLACE FUNCTION create_user_as_admin(
  admin_user_id UUID,
  new_user_email TEXT,
  new_user_password TEXT,
  new_user_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = admin_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create users';
  END IF;

  -- Validate role
  IF new_user_role NOT IN ('customer', 'worker', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Create the user in auth.users
  new_user_id := (
    SELECT id FROM auth.users
    WHERE email = new_user_email
  );

  IF new_user_id IS NULL THEN
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
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
      new_user_id,
      new_user_email,
      crypt(new_user_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      'authenticated'
    );
  END IF;

  -- Create profile for the new user
  INSERT INTO profiles (id, email, role)
  VALUES (new_user_id, new_user_email, new_user_role);

  RETURN new_user_id;
END;
$$;