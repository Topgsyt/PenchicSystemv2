/*
  # Fix recursive RLS policies for profiles table

  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies for profiles table
    
  2. Security
    - Maintain same level of access control but without recursion
    - Enable RLS
    - Add simplified policies for:
      - Admin access
      - User self-access
      - Profile creation during signup
*/

-- First, drop all existing policies
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Enable admin insert access" ON profiles;
DROP POLICY IF EXISTS "Enable admin read access" ON profiles;
DROP POLICY IF EXISTS "Enable admin update access" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users to their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update access for users to their own profile" ON profiles;

-- Create new, simplified policies without recursion
CREATE POLICY "Enable insert for authenticated users" ON profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable read access for user's own profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Enable update for users on their own profile" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  CASE
    WHEN role IS NOT NULL THEN role = 'customer'
    ELSE true
  END
);

-- Admin policies using role check from auth.jwt()
CREATE POLICY "Admin full access" ON profiles
FOR ALL TO authenticated
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');