-- Avatar support: pick one of a fixed set of animal avatars (no upload, no
-- storage needed) or upload a real photo to the new public "avatars" bucket.
-- Replaces the hardcoded mock avatarUrl that used to ship for every user.

ALTER TABLE public.profiles
  ADD COLUMN avatar_type TEXT CHECK (avatar_type IN ('animal', 'photo')),
  ADD COLUMN avatar_animal TEXT,
  ADD COLUMN avatar_photo_key TEXT,
  ADD COLUMN avatar_photo_url TEXT;

-- "avatars" bucket was created public via `storage create-bucket avatars`.
-- Public buckets bypass RLS on direct GETs, but list/metadata calls through
-- the user API still need an explicit SELECT policy — add one scoped to this
-- bucket without touching the owner-only policies that already exist for
-- checkin-photos (private, body photos).
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY storage_objects_avatars_public_select ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket = 'avatars');

GRANT SELECT ON storage.objects TO anon;
GRANT USAGE ON SCHEMA storage TO anon;
