-- Add missing fields for L&D module
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS skills_covered TEXT[],
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Create policies for new columns if needed (existing policies cover update/select on table level)

-- Function to update training_records on course completion
CREATE OR REPLACE FUNCTION update_training_record_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        INSERT INTO training_records (
            employee_id,
            date,
            course,
            course_id,
            result,
            remark,
            created_at,
            updated_at
        )
        SELECT
            NEW.employee_id,
            NEW.completed_date,
            c.name,
            c.id,
            'Completed',
            'Auto-generated from Course Completion',
            NOW(),
            NOW()
        FROM courses c
        WHERE c.id = NEW.course_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-update
DROP TRIGGER IF EXISTS on_course_completion ON course_enrollments;
CREATE TRIGGER on_course_completion
AFTER UPDATE ON course_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_training_record_on_completion();

-- Seed Data for Courses (if empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM courses LIMIT 1) THEN
        INSERT INTO courses (name, description, category, level, duration, duration_minutes, skills_covered, active, provider, format, cost, currency)
        VALUES
        ('Advanced React Patterns', 'Master advanced React concepts including HOCs, Render Props, and Custom Hooks.', 'Technical', 'Advanced', '4 hours', 240, ARRAY['React', 'JavaScript', 'Frontend'], true, 'Internal', 'Online', 0, 'AUD'),
        ('Effective Communication', 'Learn how to communicate effectively in a remote team environment.', 'Soft Skills', 'Beginner', '2 hours', 120, ARRAY['Communication', 'Teamwork'], true, 'HR Dept', 'Workshop', 0, 'AUD'),
        ('Cybersecurity Awareness', 'Essential security practices for all employees.', 'Compliance', 'Beginner', '1 hour', 60, ARRAY['Security', 'Phishing', 'Data Protection'], true, 'IT Security', 'Online', 0, 'AUD'),
        ('Project Management Fundamentals', 'Introduction to PMBOK and Agile methodologies.', 'Management', 'Intermediate', '6 hours', 360, ARRAY['Project Management', 'Agile', 'Scrum'], true, 'External', 'Online', 500, 'AUD');
    END IF;
END $$;
