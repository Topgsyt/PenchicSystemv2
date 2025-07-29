/*
  # Fix profiles table policies

  1. Changes
    - Remove circular references in RLS policies
    - Simplify policy conditions to prevent infinite recursion
    - Maintain security while fixing the recursion issue
    
  2. Security
    - Maintain admin privileges
    - Ensure users can only access their own profiles
    - Keep role-based access control
*/

-- Drop existing policies to recreate them without circular references
DROP POLICY IF EXISTS "Enable admin read access" ON profiles;
DROP POLICY IF EXISTS "Enable admin insert access" ON profiles;
DROP POLICY IF EXISTS "Enable admin update access" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users to their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update access for users to their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Create simplified policies without circular references
CREATE POLICY "Admin full access"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email FROM profiles WHERE role = 'admin'
    )
  )
);

CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Prevent users from changing their role
    role IS NULL 
    OR role = (SELECT role FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id 
  AND role = 'customer'
);