/*
  # Add Storage Policies for Products Bucket

  1. Changes
    - Add storage policies for products bucket
    - Allow authenticated users to upload images
    - Allow public read access to product images
    
  2. Security
    - Enable RLS for storage
    - Restrict uploads to authenticated users
    - Allow public read access
*/

-- Enable storage policies
BEGIN;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = 'images'
);

-- Policy to allow public read access
CREATE POLICY "Allow public read access to product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

COMMIT;