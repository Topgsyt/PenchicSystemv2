/*
  # Add Admin Policies for User Management

  1. Changes
    - Add policies for admin users to manage profiles table
    - Grant full CRUD access to admin users
    
  2. Security
    - Policies ensure only admin users can manage other users
    - Maintains existing user self-access policies
*/

-- Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Add admin policies for profiles table with corrected permissions
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));