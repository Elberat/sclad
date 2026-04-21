-- ================================================================
-- Migration 003: Recreate item photo storage policies
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "item_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_delete" ON storage.objects;

CREATE POLICY "item_photos_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'item-photos');

CREATE POLICY "item_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-photos'
    AND name LIKE 'items/%'
    AND get_my_role() IN ('warehouse_manager', 'super_admin')
  );

CREATE POLICY "item_photos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'item-photos'
    AND name LIKE 'items/%'
    AND get_my_role() IN ('warehouse_manager', 'super_admin')
  )
  WITH CHECK (
    bucket_id = 'item-photos'
    AND name LIKE 'items/%'
    AND get_my_role() IN ('warehouse_manager', 'super_admin')
  );

CREATE POLICY "item_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-photos'
    AND name LIKE 'items/%'
    AND get_my_role() IN ('warehouse_manager', 'super_admin')
  );
