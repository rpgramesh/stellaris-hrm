-- ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    location JSONB, -- { lat, lng, address }
    status TEXT, -- 'Present', 'Late', 'Absent'
    worker_type TEXT, -- 'Permanent', 'Casual'
    project_code TEXT,
    notes TEXT,
    breaks JSONB DEFAULT '[]'::jsonb, -- Array of break objects
    total_break_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    is_field_work BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
