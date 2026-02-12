
-- Migration to add partial day support to leave_requests
-- 20260210_add_partial_leave_support.sql

ALTER TABLE leave_requests
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN total_hours NUMERIC(5, 2);

-- Add comment
COMMENT ON COLUMN leave_requests.start_time IS 'Start time for partial day leave (only applicable if start_date == end_date)';
COMMENT ON COLUMN leave_requests.end_time IS 'End time for partial day leave (only applicable if start_date == end_date)';
COMMENT ON COLUMN leave_requests.total_hours IS 'Total hours of leave taken (useful for partial days)';
