/*
  # Add Admin User Creation Function

  1. New Function
    - create_user_as_admin: Allows admins to create new users with specified roles
    
  2. Security
    - Function can only be executed by admin users
    - Validates input parameters
    - Creates both auth user and profile
*/

-- Create function for admin user creation
CREATE OR REPLACE FUNCTION create_user_as_admin(
  admin_user_id uuid,
  new_user_email text,
  new_user_password text,
  new_user_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  admin_role text;
BEGIN
  -- Check if the executing user is an admin
  SELECT role INTO admin_role
  FROM profiles
  WHERE id = admin_user_id;

  IF admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can create users';
  END IF;

  -- Validate role
  IF new_user_role NOT IN ('admin', 'worker', 'customer') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Create auth user
  new_user_id := extensions.uuid_generate_v4();
  
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

  -- Create profile
  INSERT INTO profiles (id, email, role)
  VALUES (new_user_id, new_user_email, new_user_role);

  RETURN json_build_object(
    'id', new_user_id,
    'email', new_user_email,
    'role', new_user_role
  );
END;
$$;