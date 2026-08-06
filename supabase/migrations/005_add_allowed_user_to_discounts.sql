-- Migration to add allowed_user_id to discount_codes to prevent code farming
ALTER TABLE public.discount_codes 
ADD COLUMN IF NOT EXISTS allowed_user_id UUID REFERENCES auth.users(id);

-- Optional: Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_discount_codes_allowed_user ON public.discount_codes(allowed_user_id);
