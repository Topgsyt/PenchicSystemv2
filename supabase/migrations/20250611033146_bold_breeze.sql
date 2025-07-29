/*
  # Fix stock logs RLS policy for database triggers

  1. Security Changes
    - Add INSERT policy for stock_logs table to allow database triggers to create log entries
    - The policy allows inserts when the changed_by field matches the current user ID
    - This enables the log_stock_change() trigger function to work properly

  2. Background
    - The stock_logs table is populated by database triggers when product stock changes
    - Previously only had SELECT policies, missing INSERT policy for the trigger to work
    - This fix allows admins and workers to update stock while maintaining audit trail
*/

-- Add INSERT policy for stock_logs to allow database triggers to create log entries
CREATE POLICY "Allow stock log inserts for authenticated users"
  ON stock_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow insert if the user is admin or worker and the changed_by matches current user
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'worker')
    )
    AND changed_by = auth.uid()
  );