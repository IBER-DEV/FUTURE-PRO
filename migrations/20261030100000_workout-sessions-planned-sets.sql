-- Workout history (Progreso → Historial): store how many sets the session had
-- planned, so a past session's "completadas / planeadas" is real. Without it
-- the history could only show completed sets, and a ratio of completed/completed
-- would always read 100% (the D-06 defect, again). Nullable: sessions closed
-- before this column existed simply don't show a ratio.
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS planned_sets SMALLINT CHECK (planned_sets >= 0);
