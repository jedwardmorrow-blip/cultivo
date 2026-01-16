/*
  # Fix COA Storage Bucket Policies

  ## Overview
  Adds missing Row Level Security policies for the coa-pdfs storage bucket.
  The bucket was created but policies were never added, causing 403 errors on upload.

  ## Changes

  1. **Storage Policies for coa-pdfs bucket**
     - Allow authenticated users to upload COA PDFs (INSERT)
     - Allow authenticated users to update COA PDFs (UPDATE)
     - Allow authenticated users to delete COA PDFs (DELETE)
     - Allow public read access to COA PDFs (SELECT)

  ## Security
  - Public can only read (view/download) COAs
  - Only authenticated users can create, update, or delete COAs
  - This matches the security model of the certificates_of_analysis table
*/

-- =====================================================
-- Storage policies for coa-pdfs bucket
-- =====================================================

-- Allow authenticated users to upload COA PDFs
CREATE POLICY "Authenticated users can upload COA PDFs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'coa-pdfs');

-- Allow authenticated users to update COA PDFs
CREATE POLICY "Authenticated users can update COA PDFs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'coa-pdfs');

-- Allow authenticated users to delete COA PDFs
CREATE POLICY "Authenticated users can delete COA PDFs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'coa-pdfs');

-- Allow public read access to COA PDFs
CREATE POLICY "Public read access for COA PDFs"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'coa-pdfs');
