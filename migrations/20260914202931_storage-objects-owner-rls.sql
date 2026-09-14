-- Owner-only RLS on storage.objects. Fresh InsForge installs ship with RLS
-- disabled and zero policies on this table, which means every authenticated
-- user can currently read every object across every bucket. Required before
-- wiring real check-in photo uploads (checkin-photos bucket): those are
-- private body photos and must be readable only by their owner.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY storage_objects_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (uploaded_by = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY storage_objects_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY storage_objects_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (uploaded_by = (SELECT auth.jwt() ->> 'sub'))
  WITH CHECK (uploaded_by = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY storage_objects_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (uploaded_by = (SELECT auth.jwt() ->> 'sub'));

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
