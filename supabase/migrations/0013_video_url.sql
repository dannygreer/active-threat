-- 0013_video_url.sql
-- Adds video metadata to scenarios. Phase 1 Freeze (0012) + Day 10.5 seed
-- shipped the multi-marker architecture and the 5 new scenarios; this adds
-- the last column needed before video MP4s can be served.
--
-- Note: prompt called this "0010" but 0010 was already taken by the
-- enrollment_scores_view migration. Numbering bumped to next free slot.

alter table scenarios
  add column if not exists video_url text,
  add column if not exists video_duration_seconds integer;

-- Pair constraint: video_url and video_duration_seconds are both null or
-- both set. Catches admin-UI mistakes like pasting a URL without filling
-- duration (or vice versa). Using a uniquely named constraint and
-- conditional add so re-running the migration is safe.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'video_url_requires_duration'
  ) then
    alter table scenarios
      add constraint video_url_requires_duration
      check ((video_url is null) = (video_duration_seconds is null));
  end if;
end$$;
