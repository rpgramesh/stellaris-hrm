
-- Fix RLS Infinite Recursion by using SECURITY DEFINER function

-- 1. Create a secure function to check manager access (bypassing RLS on joined tables)
CREATE OR REPLACE FUNCTION public.has_manager_access_to_timesheet(target_timesheet_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user (auth.uid()) is a manager of ANY project in the timesheet
  RETURN EXISTS (
    SELECT 1
    FROM timesheet_rows tr
    JOIN projects p ON p.id = tr.project_id
    JOIN employees e ON e.id = p.manager_id
    WHERE tr.timesheet_id = target_timesheet_id
    AND e.user_id = auth.uid()
  );
END;
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Managers can view timesheets" ON timesheets;
DROP POLICY IF EXISTS "Managers can update timesheets" ON timesheets;
DROP POLICY IF EXISTS "Managers can view rows" ON timesheet_rows;
DROP POLICY IF EXISTS "Managers can view entries" ON timesheet_entries;

-- 3. Re-create policies using the secure function

-- Timesheets: Use function to avoid recursion
CREATE POLICY "Managers can view timesheets" ON timesheets
  FOR SELECT TO authenticated
  USING (
    has_manager_access_to_timesheet(id)
  );

CREATE POLICY "Managers can update timesheets" ON timesheets
  FOR UPDATE TO authenticated
  USING (
    has_manager_access_to_timesheet(id)
  );

-- Timesheet Rows: Use function on parent timesheet
-- Since the function is SECURITY DEFINER, it won't trigger RLS on timesheet_rows internally
CREATE POLICY "Managers can view rows" ON timesheet_rows
  FOR SELECT TO authenticated
  USING (
    has_manager_access_to_timesheet(timesheet_id)
  );

-- Timesheet Entries: Use function on grandparent timesheet (via row)
CREATE POLICY "Managers can view entries" ON timesheet_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheet_rows tr
      WHERE tr.id = timesheet_entries.row_id
      AND has_manager_access_to_timesheet(tr.timesheet_id)
    )
  );
