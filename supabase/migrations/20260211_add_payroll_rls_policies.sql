-- Add RLS Policies for Payroll Tables

-- Salary Adjustments Policies
CREATE POLICY "Users can view salary adjustments for their company" ON salary_adjustments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = salary_adjustments.employee_id
            AND e.company_id = (SELECT current_setting('app.current_company_id')::uuid)
        )
    );

CREATE POLICY "Managers can create salary adjustments" ON salary_adjustments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.user_id = auth.uid()
            AND e.company_id = (SELECT current_setting('app.current_company_id')::uuid)
            AND e.role IN ('Manager', 'HR', 'Admin')
        )
    );

CREATE POLICY "Managers can update salary adjustments" ON salary_adjustments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.user_id = auth.uid()
            AND e.company_id = (SELECT current_setting('app.current_company_id')::uuid)
            AND e.role IN ('Manager', 'HR', 'Admin')
        )
    );

-- Payroll Employees Policies
CREATE POLICY "Users can view payroll employees for their company" ON payroll_employees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = payroll_employees.employee_id
            AND e.company_id = (SELECT current_setting('app.current_company_id')::uuid)
        )
    );

CREATE POLICY "Managers can manage payroll employees" ON payroll_employees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.user_id = auth.uid()
            AND e.company_id = (SELECT current_setting('app.current_company_id')::uuid)
            AND e.role IN ('Manager', 'HR', 'Admin')
        )
    );

-- Payroll Runs Policies
CREATE POLICY "Users can view payroll runs for their company" ON payroll_runs
    FOR SELECT
    USING (
        company_id = (SELECT current_setting('app.current_company_id')::uuid)
    );

CREATE POLICY "Managers can manage payroll runs" ON payroll_runs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.user_id = auth.uid()
            AND e.company_id = payroll_runs.company_id
            AND e.role IN ('Manager', 'HR', 'Admin')
        )
    );

-- Payslips Policies
CREATE POLICY "Users can view their own payslips" ON payslips
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM payroll_employees pe
            JOIN employees e ON e.id = pe.employee_id
            WHERE pe.employee_id = payslips.employee_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can view all payslips for their company" ON payslips
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            JOIN payroll_employees pe ON pe.employee_id = e.id
            WHERE pe.employee_id = payslips.employee_id
            AND e.company_id = (SELECT current_setting('app.current_company_id')::uuid)
            AND e.role IN ('Manager', 'HR', 'Admin')
        )
    );

-- Grant basic permissions to anon and authenticated roles
GRANT SELECT ON salary_adjustments TO anon, authenticated;
GRANT INSERT, UPDATE ON salary_adjustments TO authenticated;
GRANT SELECT ON payroll_employees TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON payroll_employees TO authenticated;
GRANT SELECT ON payroll_runs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON payroll_runs TO authenticated;
GRANT SELECT ON payslips TO anon, authenticated;
GRANT INSERT, UPDATE ON payslips TO authenticated;