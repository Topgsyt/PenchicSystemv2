/*
  # Fix Profiles Table RLS Policies

  1. Changes
    - Ensure profiles table exists with correct structure
    - Add proper RLS policies for profile management
    - Fix foreign key relationship with auth.users
    - Update role check constraint to include all valid roles
    
  2. Security
    - Enable RLS
    - Add policies for profile creation and management
    - Ensure users can only manage their own profiles
    - Allow authenticated users to create their initial profile
*/

-- Ensure the profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop existing role check constraint if it exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add updated role check constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('customer', 'admin', 'worker'));

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
END $$;

-- Create new policies with fixed permissions
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR 
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR 
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);