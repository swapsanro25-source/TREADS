-- TREADS TRACKER: administrator-only deletion of one completed submission.
-- Expected Supabase warning: this function contains DELETE by design.
-- Run only after reviewing and testing with fictional records.
-- It deletes only the requested row when its status is 'completed'.

CREATE OR REPLACE FUNCTION public.delete_completed_submission(
  p_submission_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  DELETE FROM public.submissions
  WHERE id = p_submission_id
    AND status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completed submission not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_completed_submission(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.delete_completed_submission(uuid)
TO authenticated;
