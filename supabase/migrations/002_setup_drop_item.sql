-- Add is_drop_item boolean to products table (default false)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_drop_item BOOLEAN DEFAULT false;
