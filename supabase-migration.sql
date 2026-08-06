-- Run this in Supabase SQL Editor

CREATE TABLE public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  phone      TEXT,
  role       TEXT NOT NULL DEFAULT 'NORMAL_USER' CHECK (role IN ('NORMAL_USER', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own non-role fields
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- Backend service_role key bypasses RLS for inserts and admin reads


-- ==================== WINNER IMAGES ====================

CREATE TABLE IF NOT EXISTS public.winner_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url  TEXT NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.winner_images ENABLE ROW LEVEL SECURITY;

-- Public can read (to display the winner on homepage)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read winner images' AND tablename = 'winner_images') THEN
    CREATE POLICY "Public read winner images"
      ON public.winner_images FOR SELECT
      USING (true);
  END IF;
END $$;

-- Only admins can insert winner images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin insert winner images' AND tablename = 'winner_images') THEN
    CREATE POLICY "Admin insert winner images"
      ON public.winner_images FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
      );
  END IF;
END $$;

-- Only admins can update winner images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin update winner images' AND tablename = 'winner_images') THEN
    CREATE POLICY "Admin update winner images"
      ON public.winner_images FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
      );
  END IF;
END $$;

-- Only admins can delete winner images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin delete winner images' AND tablename = 'winner_images') THEN
    CREATE POLICY "Admin delete winner images"
      ON public.winner_images FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
      );
  END IF;
END $$;


-- ==================== SUPABASE STORAGE ====================

-- Create the storage bucket for winner images (ignore if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('winner-images', 'winner-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to winner images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read for winner images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public read for winner images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'winner-images');
  END IF;
END $$;

-- Only authenticated users can upload to winner images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated upload for winner images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated upload for winner images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'winner-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Only authenticated users can delete from winner images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete for winner images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated delete for winner images"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'winner-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Drop the old is_admin function if it exists (replaced by inline RLS checks)
DROP FUNCTION IF EXISTS public.is_admin();
