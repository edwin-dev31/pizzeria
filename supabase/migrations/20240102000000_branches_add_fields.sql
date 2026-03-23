-- Add address, description, and cover_image_url columns to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS cover_image_url text;
