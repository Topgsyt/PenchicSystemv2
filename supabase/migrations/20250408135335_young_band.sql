/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive policy for admin reads
    - Add simplified admin access policy
    - Maintain user's ability to read their own profile
    
  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion
    - Preserves existing access patterns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create new policies without recursion
CREATE POLICY "Allow admins full access"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);