-- Fix infinite recursion in RLS policies by using a SECURITY DEFINER function
-- This breaks the circular dependency between timesheets and timesheet_rows

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION is_project_manager_for_timesheet(lookup_timesheet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial: it bypasses RLS on the tables queried inside
SET search_path = public -- Best practice for security definer
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM timesheet_rows tr
    JOIN projects p ON p.id = tr.project_id
    WHERE tr.timesheet_id = lookup_timesheet_id
    AND p.manager_id = (select auth.uid())
  );
END;
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Managers can view timesheets" ON timesheets;
DROP POLICY IF EXISTS "Managers can update timesheets" ON timesheets;
DROP POLICY IF EXISTS "Managers can view rows" ON timesheet_rows;
DROP POLICY IF EXISTS "Managers can view entries" ON timesheet_entries;

-- 3. Re-create policies using the function

-- Timesheets
CREATE POLICY "Managers can view timesheets" ON timesheets
  FOR SELECT TO authenticated
  USING (
    is_project_manager_for_timesheet(id)
  );

CREATE POLICY "Managers can update timesheets" ON timesheets
  FOR UPDATE TO authenticated
  USING (
    is_project_manager_for_timesheet(id)
  );

-- Rows (Allow seeing ALL rows in the timesheet if they manage ANY project in it)
CREATE POLICY "Managers can view rows" ON timesheet_rows
  FOR SELECT TO authenticated
  USING (
    is_project_manager_for_timesheet(timesheet_id)
  );

-- Entries
CREATE POLICY "Managers can view entries" ON timesheet_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheet_rows tr
      WHERE tr.id = timesheet_entries.row_id
      AND is_project_manager_for_timesheet(tr.timesheet_id)
    )
  );
