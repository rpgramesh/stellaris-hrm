
-- Fix Timesheet RLS policies to use Employee ID associated with auth.uid()
-- The previous policies incorrectly compared projects.manager_id (Employee ID) with auth.uid() (User ID)

-- 1. Drop existing incorrect policies
DROP POLICY IF EXISTS "Managers can view timesheets" ON timesheets;
DROP POLICY IF EXISTS "Managers can update timesheets" ON timesheets;
DROP POLICY IF EXISTS "Managers can view rows" ON timesheet_rows;
DROP POLICY IF EXISTS "Managers can view entries" ON timesheet_entries;

-- 2. Create corrected policies for timesheets
CREATE POLICY "Managers can view timesheets" ON timesheets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheet_rows tr
      JOIN projects p ON p.id = tr.project_id
      JOIN employees e ON e.id = p.manager_id
      WHERE tr.timesheet_id = timesheets.id
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update timesheets" ON timesheets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheet_rows tr
      JOIN projects p ON p.id = tr.project_id
      JOIN employees e ON e.id = p.manager_id
      WHERE tr.timesheet_id = timesheets.id
      AND e.user_id = auth.uid()
    )
  );

-- 3. Create corrected policies for timesheet_rows
CREATE POLICY "Managers can view rows" ON timesheet_rows
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      JOIN timesheet_rows tr ON tr.timesheet_id = t.id
      JOIN projects p ON p.id = tr.project_id
      JOIN employees e ON e.id = p.manager_id
      WHERE t.id = timesheet_rows.timesheet_id
      AND e.user_id = auth.uid()
    )
  );

-- 4. Create corrected policies for timesheet_entries
CREATE POLICY "Managers can view entries" ON timesheet_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheet_rows tr
      WHERE tr.id = timesheet_entries.row_id
      AND EXISTS (
          SELECT 1 FROM timesheets t
          JOIN timesheet_rows tr2 ON tr2.timesheet_id = t.id
          JOIN projects p ON p.id = tr2.project_id
          JOIN employees e ON e.id = p.manager_id
          WHERE t.id = tr.timesheet_id
          AND e.user_id = auth.uid()
      )
    )
  );
