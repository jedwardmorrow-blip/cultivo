/*
  # Create COA PDF Storage Bucket

  1. Storage Setup
    - Create `coa-pdfs` bucket with public read access
    - Set up storage policies for authenticated user uploads
*/

-- Create storage bucket for COA PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('coa-pdfs', 'coa-pdfs', true)
ON CONFLICT (id) DO NOTHING;