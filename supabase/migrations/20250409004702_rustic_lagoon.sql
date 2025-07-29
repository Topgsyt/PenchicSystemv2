/*
  # Fix profiles RLS policies

  1. Changes
    - Remove recursive admin policy that was causing infinite recursion
    - Add separate policies for different operations with proper checks
    - Ensure admins can manage all profiles
    - Ensure users can only read and update their own profiles
  
  2. Security
    - Enable RLS on profiles table (already enabled)
    - Add specific policies for each operation type
    - Prevent users from changing their own role
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admins full access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create new policies
CREATE POLICY "Enable read access for users to their own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Enable update access for users to their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    CASE WHEN role IS NOT NULL 
    THEN role = (SELECT role FROM profiles WHERE id = auth.uid())
    ELSE true
    END
  )
);

CREATE POLICY "Enable admin read access"
ON profiles FOR SELECT
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

CREATE POLICY "Enable admin insert access"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email FROM profiles WHERE role = 'admin'
    )
  )
);

CREATE POLICY "Enable admin update access"
ON profiles FOR UPDATE
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