/*
  # Create Storage Bucket for Company Logos and Assets

  1. Storage Setup
    - Create a public storage bucket called 'company-assets'
    - Configure bucket for storing company logos, images, and documents
    - Set up public read access for logo files
    - Configure authenticated write access with proper permissions

  2. Bucket Policies
    - Allow authenticated users to upload files
    - Allow authenticated users to update/delete their uploads
    - Allow public read access for serving logos on invoices and labels
    - Set file size limits and allowed MIME types

  3. Database Settings Update
    - Add storage bucket configuration to app_settings
    - Add logo variant settings (dark, light, invoice, label)
    - Set default logo paths using Supabase Storage URLs

  4. Security
    - RLS policies for authenticated access
    - Public read access for logo serving
    - File type and size validation
*/

-- Create the storage bucket for company assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow public read access for serving logos
CREATE POLICY "Public read access for company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Add storage-related settings to app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('storage_bucket_name', 'company-assets', 'text', 'Name of the Supabase Storage bucket for company assets', 'storage'),
  ('logo_dark_url', '', 'text', 'URL to dark version of company logo (for light backgrounds)', 'branding'),
  ('logo_light_url', '', 'text', 'URL to light version of company logo (for dark backgrounds)', 'branding'),
  ('logo_invoice_url', '', 'text', 'URL to logo used on invoices', 'branding'),
  ('logo_label_url', '', 'text', 'URL to logo used on product labels', 'branding'),
  ('logo_upload_date', '', 'text', 'Last date logos were uploaded', 'branding')
ON CONFLICT (setting_key) DO NOTHING;

-- Update existing company_logo_path to use storage URL format (will be populated after upload)
UPDATE app_settings
SET 
  setting_value = '',
  description = 'Legacy logo path - use logo_invoice_url instead'
WHERE setting_key = 'company_logo_path';
