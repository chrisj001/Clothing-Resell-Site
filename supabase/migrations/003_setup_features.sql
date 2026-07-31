-- 1. Add is_seller boolean to profiles (default false)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT false;

-- 2. Add seller_id and status to products table
-- We assume products table already exists.
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- 3. Add drop_timer_enabled and next_drop_date to store_settings table
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS drop_timer_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_drop_date TIMESTAMP WITH TIME ZONE;
