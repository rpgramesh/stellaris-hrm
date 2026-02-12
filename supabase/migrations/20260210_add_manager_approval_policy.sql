-- Allow managers to VIEW timesheets containing their projects
CREATE POLICY "Managers can view timesheets" ON timesheets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheet_rows tr
      JOIN projects p ON p.id = tr.project_id
      WHERE tr.timesheet_id = timesheets.id
      AND p.manager_id = auth.uid()
    )
  );

-- Allow managers to UPDATE timesheets containing their projects (e.g. approve/reject)
CREATE POLICY "Managers can update timesheets" ON timesheets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheet_rows tr
      JOIN projects p ON p.id = tr.project_id
      WHERE tr.timesheet_id = timesheets.id
      AND p.manager_id = auth.uid()
    )
  );

-- Allow managers to VIEW rows if they manage ANY project in the timesheet
CREATE POLICY "Managers can view rows" ON timesheet_rows
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      JOIN timesheet_rows tr ON tr.timesheet_id = t.id
      JOIN projects p ON p.id = tr.project_id
      WHERE t.id = timesheet_rows.timesheet_id
      AND p.manager_id = auth.uid()
    )
  );

-- Allow managers to VIEW entries if they can view the row
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
          WHERE t.id = tr.timesheet_id
          AND p.manager_id = auth.uid()
      )
    )
  );
