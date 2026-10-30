-- D-14 (QA 2026-10-30): storage_objects_avatars_public_select let `anon` (and
-- any user) list every object in the avatars bucket, exposing keys and
-- uploaded_by (user ids). Nothing needs it: avatars render from the public URL
-- saved in profiles.avatar_photo_url (public buckets serve direct GETs without
-- RLS), and owners keep reading/removing their own objects through
-- storage_objects_owner_select/delete.
DROP POLICY IF EXISTS storage_objects_avatars_public_select ON storage.objects;
