-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON email_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for admin roles" ON email_templates
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() 
        AND role IN ('Administrator', 'Super Admin', 'Employer Admin', 'HR Manager')
    ));

CREATE POLICY "Enable update for admin roles" ON email_templates
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() 
        AND role IN ('Administrator', 'Super Admin', 'Employer Admin', 'HR Manager')
    ));

CREATE POLICY "Enable delete for admin roles" ON email_templates
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() 
        AND role IN ('Administrator', 'Super Admin', 'Employer Admin', 'HR Manager')
    ));

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial templates
INSERT INTO email_templates (name, subject, body, category, variables) VALUES
('Welcome Email', 'Welcome to Stellaris HRM', 'Hi {{fullName}}, Welcome to the team!', 'Onboarding', '["fullName", "username", "temporaryPassword"]'),
('Reset Password', 'Password Reset Request', 'Click here to reset your password: {{resetLink}}', 'Auth', '["fullName", "resetLink"]'),
('Approve Timesheet', 'Timesheet Approved', 'Your timesheet for {{period}} has been approved.', 'Payroll', '["fullName", "period"]'),
('Document Submission Reminder', 'Action Required: Document Submission', 'Please upload your {{documentType}} to complete your profile.', 'Compliance', '["fullName", "documentType"]'),
('Leave Request Approval', 'Leave Request Approved', 'Your leave request for {{startDate}} to {{endDate}} has been approved.', 'Leave', '["fullName", "startDate", "endDate"]'),
('Leave Request Rejection', 'Leave Request Rejected', 'Your leave request for {{startDate}} to {{endDate}} was not approved.', 'Leave', '["fullName", "startDate", "endDate", "reason"]'),
('Payslip Notification', 'Your Payslip is Ready', 'Your payslip for {{period}} is now available in Self Service.', 'Payroll', '["fullName", "period"]'),
('Payroll Clarification Request', 'Payroll Clarification Needed', 'We need more information regarding your payroll for {{period}}.', 'Payroll', '["fullName", "period", "details"]'),
('Performance Review Notification', 'Performance Review Scheduled', 'Your performance review has been scheduled for {{reviewDate}}.', 'Performance', '["fullName", "reviewDate"]'),
('Policy Update Notification', 'Important: Policy Update', 'The following policy has been updated: {{policyName}}.', 'Compliance', '["fullName", "policyName"]'),
('Resignation Acknowledgement', 'Resignation Acknowledged', 'We have received and acknowledged your resignation.', 'Offboarding', '["fullName", "exitDate"]'),
('Exit Interview Invitation', 'Exit Interview Invitation', 'We would like to invite you to an exit interview on {{interviewDate}}.', 'Offboarding', '["fullName", "interviewDate"]'),
('Account Creation', 'Your Account has been Created', 'Your employee account is ready. Username: {{username}}', 'Auth', '["fullName", "username"]'),
('Job Application Received', 'Application Received: {{jobTitle}}', 'Thank you for applying for the {{jobTitle}} position.', 'Recruitment', '["fullName", "jobTitle"]'),
('Interview Invitation', 'Interview Invitation: {{jobTitle}}', 'You have been invited to an interview for {{jobTitle}}.', 'Recruitment', '["fullName", "jobTitle", "interviewDate"]'),
('Interview Rejection', 'Update on your application: {{jobTitle}}', 'Thank you for your interest in the {{jobTitle}} position. Unfortunately...', 'Recruitment', '["fullName", "jobTitle"]'),
('Offer Letter Email', 'Job Offer: {{jobTitle}}', 'We are pleased to offer you the position of {{jobTitle}}.', 'Recruitment', '["fullName", "jobTitle", "salary"]');
