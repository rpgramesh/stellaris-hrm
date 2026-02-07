-- Seed dashboard data for admin user
-- This ensures the ESS dashboard has data to display

DO $$
DECLARE
    v_employee_id UUID;
    v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    v_last_month_start DATE := date_trunc('month', CURRENT_DATE - INTERVAL '1 month');
    v_last_month_end DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
    v_payment_date DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '14 days')::DATE; -- 15th of current month
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Get the admin employee
    SELECT id INTO v_employee_id FROM employees WHERE email = 'admin@stellaris.com' LIMIT 1;
    
    IF v_employee_id IS NOT NULL THEN
        
        -- 1. Ensure Leave Entitlements exist (if not already seeded)
        IF NOT EXISTS (SELECT 1 FROM leave_entitlements WHERE employee_id = v_employee_id AND year = v_current_year AND leave_type = 'Annual') THEN
            INSERT INTO leave_entitlements (employee_id, year, leave_type, total_days, carried_over)
            VALUES (v_employee_id, v_current_year, 'Annual', 20, 0);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM leave_entitlements WHERE employee_id = v_employee_id AND year = v_current_year AND leave_type = 'Sick') THEN
            INSERT INTO leave_entitlements (employee_id, year, leave_type, total_days, carried_over)
            VALUES (v_employee_id, v_current_year, 'Sick', 10, 0);
        END IF;

        -- 2. Seed a Payslip for last month
        -- Check if payslip exists for this period
        IF NOT EXISTS (SELECT 1 FROM payslips WHERE employee_id = v_employee_id AND period_start = v_last_month_start) THEN
            INSERT INTO payslips (
                employee_id, period_start, period_end, 
                gross_pay, allowances, overtime, payg_tax, net_pay, superannuation, 
                payment_date, status
            )
            VALUES (
                v_employee_id, v_last_month_start, v_last_month_end,
                5000.00, 200.00, 0.00, 1200.00, 4000.00, 550.00,
                v_payment_date, 'Paid'
            );
        END IF;

        -- 3. Seed Attendance for Today (Clocked In)
        IF NOT EXISTS (SELECT 1 FROM attendance_records WHERE employee_id = v_employee_id AND date = v_today) THEN
            INSERT INTO attendance_records (
                employee_id, date, clock_in, status, worker_type, location
            )
            VALUES (
                v_employee_id, v_today, NOW(), 'Present', 'Permanent', 
                '{"lat": -33.8688, "lng": 151.2093, "address": "Sydney HQ"}'::jsonb
            );
        END IF;

    END IF;
END $$;
