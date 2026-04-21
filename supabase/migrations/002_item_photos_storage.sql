-- ================================================================
-- Migration 002: Storage bucket and policies for item photos
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE POLICY "item_photos_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'item-photos');

CREATE POLICY "item_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = 'items'
  );

CREATE POLICY "item_photos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = 'items'
  )
  WITH CHECK (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = 'items'
  );

CREATE POLICY "item_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = 'items'
  );
