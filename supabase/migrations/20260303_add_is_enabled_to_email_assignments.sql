-- Migration to add is_enabled column to email_template_assignments
alter table if exists email_template_assignments 
add column if not exists is_enabled boolean not null default true;

-- Update existing assignments to be enabled by default
update email_template_assignments set is_enabled = true where is_enabled is null;
