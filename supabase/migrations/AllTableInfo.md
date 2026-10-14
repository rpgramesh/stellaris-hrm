## Table `departments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `manager_id` | `uuid` |  Nullable |
| `location` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `branch_id` | `uuid` |  Nullable |

## Table `job_positions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `department` | `text` |  Nullable |
| `department_id` | `uuid` |  Nullable |
| `level` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `first_name` | `text` |  |
| `last_name` | `text` |  |
| `email` | `text` |  Unique |
| `phone` | `text` |  Nullable |
| `role` | `text` |  |
| `department_id` | `uuid` |  Nullable |
| `position_id` | `uuid` |  Nullable |
| `start_date` | `date` |  Nullable |
| `employment_status` | `text` |  Nullable |
| `gender` | `text` |  Nullable |
| `date_of_birth` | `date` |  Nullable |
| `nationality` | `text` |  Nullable |
| `national_id` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `salary` | `numeric` |  Nullable |
| `bank_name` | `text` |  Nullable |
| `bank_account_number` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `probation_end_date` | `date` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `line_manager_id` | `uuid` |  Nullable |
| `branch` | `text` |  Nullable |
| `salary_effective_date` | `date` |  Nullable |
| `next_review_date` | `date` |  Nullable |
| `currency` | `text` |  Nullable |
| `payment_method` | `text` |  Nullable |
| `pay_cycle` | `text` |  Nullable |
| `marital_status` | `text` |  Nullable |
| `children_count` | `int4` |  Nullable |
| `spouse_first_name` | `text` |  Nullable |
| `spouse_last_name` | `text` |  Nullable |
| `spouse_birth_date` | `date` |  Nullable |
| `spouse_middle_name` | `text` |  Nullable |
| `spouse_working` | `bool` |  Nullable |
| `spouse_nationality` | `text` |  Nullable |
| `spouse_national_id` | `text` |  Nullable |
| `spouse_passport` | `text` |  Nullable |
| `spouse_ethnicity` | `text` |  Nullable |
| `spouse_religion` | `text` |  Nullable |
| `blog_url` | `text` |  Nullable |
| `office_phone` | `text` |  Nullable |
| `mobile_phone` | `text` |  Nullable |
| `home_phone` | `text` |  Nullable |
| `health_data` | `jsonb` |  Nullable |
| `privacy_settings` | `jsonb` |  Nullable |
| `system_access_role` | `text` |  Nullable |
| `middle_name` | `text` |  Nullable |
| `passport` | `text` |  Nullable |
| `ethnicity` | `text` |  Nullable |
| `religion` | `text` |  Nullable |
| `remark` | `text` |  Nullable |
| `is_password_change_required` | `bool` |  Nullable |
| `emergency_contact_name` | `text` |  Nullable |
| `emergency_contact_relationship` | `text` |  Nullable |
| `emergency_contact_phone` | `text` |  Nullable |
| `emergency_contact_address` | `text` |  Nullable |
| `bank_bsb` | `text` |  Nullable |
| `employee_code` | `text` |  Nullable |
| `profile_photo_url` | `text` |  Nullable |
| `tfn` | `text` |  Nullable |
| `abn` | `text` |  Nullable |
| `superannuation_fund_name` | `text` |  Nullable |
| `superannuation_member_number` | `text` |  Nullable |
| `medicare_number` | `text` |  Nullable |
| `work_rights_status` | `text` |  Nullable |
| `visa_type` | `text` |  Nullable |
| `visa_expiry_date` | `date` |  Nullable |
| `police_clearance_status` | `text` |  Nullable |
| `wwcc_number` | `text` |  Nullable |
| `drivers_license_number` | `text` |  Nullable |
| `drivers_license_expiry` | `date` |  Nullable |
| `client_name` | `text` |  Nullable |
| `client_email` | `text` |  Nullable |
| `client_line_manager` | `text` |  Nullable |
| `client_department` | `text` |  Nullable |
| `client_branch` | `text` |  Nullable |
| `employment_type` | `text` |  Nullable |
| `hourly_rate` | `numeric` |  Nullable |
| `super_fund_id` | `uuid` |  Nullable |
| `super_rate` | `numeric` |  Nullable |
| `is_mfa_required` | `bool` |  Nullable |
| `preferred_mfa_method` | `text` |  Nullable |
| `last_seen` | `timestamptz` |  Nullable |

## Table `onboarding_workflows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `status` | `text` |  Nullable |
| `progress` | `int4` |  Nullable |
| `current_stage` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `type` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `onboarding_tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `completed` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `trainers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `type` | `text` |  Nullable |
| `contact` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `branches`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `address` | `text` |  Nullable |
| `contact_number` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `job_levels`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `grade` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `banks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `swift_code` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `courses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `skills_covered` | `_text` |  Nullable |
| `duration_minutes` | `int4` |  Nullable |

## Table `document_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `ethnicities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `religions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `modules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `key` | `text` |  Unique |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `enabled` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `company_information`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_name` | `text` |  Nullable |
| `registration_number` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `website` | `text` |  Nullable |
| `tax_id` | `text` |  Nullable |
| `primary_contact` | `text` |  Nullable |
| `founded_year` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `system_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `date_format` | `text` |  Nullable |
| `time_zone` | `text` |  Nullable |
| `currency` | `text` |  Nullable |
| `email_notifications` | `bool` |  Nullable |
| `push_notifications` | `bool` |  Nullable |
| `two_factor_auth` | `bool` |  Nullable |
| `session_timeout` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `company_name` | `text` |  Nullable |
| `tax_id` | `text` |  Nullable |
| `company_address` | `text` |  Nullable |
| `singleton` | `bool` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `default_holiday_hours` | `numeric` |  Nullable |

## Table `legal_documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `document_type` | `text` |  |
| `document_number` | `text` |  Nullable |
| `issue_date` | `date` |  Nullable |
| `expiry_date` | `date` |  Nullable |
| `issuing_authority` | `text` |  Nullable |
| `attachment` | `_text` |  Nullable |
| `remark` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `training_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `date` | `date` |  Nullable |
| `course` | `text` |  Nullable |
| `trainer` | `text` |  Nullable |
| `result` | `text` |  Nullable |
| `attachment` | `_text` |  Nullable |
| `remark` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `course_id` | `uuid` |  Nullable |
| `trainer_id` | `uuid` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `awards`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `code` | `text` |  Unique |
| `name` | `text` |  |
| `version` | `date` |  |
| `is_active` | `bool` |  Nullable |

## Table `pay_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `award_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `multiplier` | `numeric` |  Nullable |
| `flat_rate` | `numeric` |  Nullable |
| `condition_description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `payroll_runs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pay_period_start` | `date` |  |
| `pay_period_end` | `date` |  |
| `payment_date` | `date` |  |
| `status` | `text` |  Nullable |
| `total_gross_pay` | `numeric` |  Nullable |
| `total_tax` | `numeric` |  Nullable |
| `total_super` | `numeric` |  Nullable |
| `total_net_pay` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `stp_submission_id` | `text` |  Nullable |
| `stp_status` | `text` |  Nullable |
| `processed_by` | `uuid` |  Nullable |
| `pay_frequency` | `text` |  |
| `employee_count` | `int4` |  Nullable |
| `processed_at` | `timestamptz` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `month_year` | `text` |  |

## Table `payslips`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payroll_run_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `gross_earnings` | `numeric` |  Nullable |
| `income_tax` | `numeric` |  Nullable |
| `superannuation` | `numeric` |  Nullable |
| `net_pay` | `numeric` |  Nullable |
| `ytd_gross` | `numeric` |  Nullable |
| `ytd_tax` | `numeric` |  Nullable |
| `generated_at` | `timestamptz` |  Nullable |
| `pay_period_start` | `date` |  Nullable |
| `pay_period_end` | `date` |  Nullable |
| `allowances` | `numeric` |  Nullable |
| `overtime` | `numeric` |  Nullable |
| `payg_tax` | `numeric` |  Nullable |
| `payment_date` | `date` |  Nullable |
| `status` | `text` |  Nullable |
| `taxable_income` | `numeric` |  Nullable |
| `ytd_super` | `numeric` |  Nullable |
| `hours_worked` | `numeric` |  Nullable |
| `corrected_from` | `uuid` |  Nullable |
| `basic_pay` | `numeric` |  |
| `working_days` | `int4` |  |
| `paid_days` | `int4` |  |
| `total_deductions` | `numeric` |  |
| `payslip_number` | `varchar` |  |
| `tax_withheld` | `numeric` |  Nullable |
| `pay_frequency` | `text` |  Nullable |
| `period_start` | `date` |  Nullable |
| `period_end` | `date` |  Nullable |
| `gross_pay` | `numeric` |  Nullable |
| `payment_reference` | `text` |  Nullable |
| `employer_email` | `text` |  Nullable |
| `pdf_bucket` | `text` |  Nullable |
| `pdf_path` | `text` |  Nullable |
| `pdf_generated_at` | `timestamptz` |  Nullable |

## Table `stp_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payroll_run_id` | `uuid` |  Nullable |
| `submission_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `response_message` | `text` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |

## Table `attendance_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `date` | `date` |  |
| `clock_in` | `timestamptz` |  Nullable |
| `clock_out` | `timestamptz` |  Nullable |
| `location` | `jsonb` |  Nullable |
| `status` | `text` |  Nullable |
| `worker_type` | `text` |  Nullable |
| `project_code` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `breaks` | `jsonb` |  Nullable |
| `total_break_minutes` | `int4` |  Nullable |
| `overtime_minutes` | `int4` |  Nullable |
| `is_field_work` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employment_terms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `effective_date` | `date` |  Nullable |
| `term_start` | `date` |  Nullable |
| `term_end` | `date` |  Nullable |
| `job_type` | `text` |  Nullable |
| `job_status` | `text` |  Nullable |
| `leave_workflow` | `text` |  Nullable |
| `workday` | `text` |  Nullable |
| `holiday` | `text` |  Nullable |
| `remark` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `placements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `effective_date` | `date` |  Nullable |
| `job_position_id` | `uuid` |  Nullable |
| `department_id` | `uuid` |  Nullable |
| `branch_id` | `uuid` |  Nullable |
| `level_id` | `uuid` |  Nullable |
| `line_manager_id` | `uuid` |  Nullable |
| `remark` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `experiences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `employer` | `text` |  Nullable |
| `job_title` | `text` |  Nullable |
| `from_date` | `date` |  Nullable |
| `to_date` | `date` |  Nullable |
| `salary` | `numeric` |  Nullable |
| `currency` | `text` |  Nullable |
| `country` | `text` |  Nullable |
| `remark` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `educations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `school` | `text` |  Nullable |
| `field_of_study` | `text` |  Nullable |
| `degree` | `text` |  Nullable |
| `grade` | `text` |  Nullable |
| `from_year` | `text` |  Nullable |
| `to_year` | `text` |  Nullable |
| `remark` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `leave_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `type` | `text` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `status` | `text` |  Nullable |
| `reason` | `text` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `start_time` | `time` |  Nullable |
| `end_time` | `time` |  Nullable |
| `total_hours` | `numeric` |  Nullable |

## Table `leave_entitlements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `leave_type` | `text` |  |
| `year` | `int4` |  |
| `total_days` | `numeric` |  Nullable |
| `carried_over` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `offboarding_workflows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `exit_date` | `date` |  Nullable |
| `reason` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `offboarding_tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `completed` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `web_accounts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `platform` | `text` |  |
| `username` | `text` |  |
| `status` | `text` |  Nullable |
| `last_login` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employee_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `type` | `text` |  |
| `description` | `text` |  Nullable |
| `request_date` | `date` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `jobs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `department` | `text` |  |
| `location` | `text` |  |
| `job_type` | `text` |  |
| `location_type` | `text` |  |
| `description` | `text` |  Nullable |
| `requirements` | `_text` |  Nullable |
| `responsibilities` | `_text` |  Nullable |
| `salary_min` | `numeric` |  Nullable |
| `salary_max` | `numeric` |  Nullable |
| `salary_currency` | `text` |  Nullable |
| `experience_level` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `priority` | `text` |  Nullable |
| `posted_date` | `date` |  Nullable |
| `closing_date` | `date` |  Nullable |
| `hiring_manager_id` | `uuid` |  Nullable |
| `tags` | `_text` |  Nullable |
| `remote` | `bool` |  Nullable |
| `urgent` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `applicants`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `job_id` | `uuid` |  Nullable |
| `first_name` | `text` |  |
| `last_name` | `text` |  |
| `email` | `text` |  |
| `phone` | `text` |  Nullable |
| `resume_url` | `text` |  Nullable |
| `cover_letter_url` | `text` |  Nullable |
| `linkedin_url` | `text` |  Nullable |
| `portfolio_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `source` | `text` |  Nullable |
| `referrer_id` | `uuid` |  Nullable |
| `applied_date` | `date` |  Nullable |
| `rating` | `numeric` |  Nullable |
| `experience` | `text` |  Nullable |
| `current_company` | `text` |  Nullable |
| `current_position` | `text` |  Nullable |
| `expected_salary` | `numeric` |  Nullable |
| `notice_period` | `text` |  Nullable |
| `available_date` | `date` |  Nullable |
| `tags` | `_text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `interviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `applicant_id` | `uuid` |  Nullable |
| `type` | `text` |  |
| `scheduled_date` | `timestamptz` |  |
| `duration` | `int4` |  Nullable |
| `interviewer_id` | `uuid` |  Nullable |
| `status` | `text` |  Nullable |
| `feedback` | `text` |  Nullable |
| `rating` | `numeric` |  Nullable |
| `recommendation` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `meeting_link` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `job_offers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `job_id` | `uuid` |  Nullable |
| `applicant_id` | `uuid` |  Nullable |
| `salary_base` | `numeric` |  Nullable |
| `salary_currency` | `text` |  Nullable |
| `salary_frequency` | `text` |  Nullable |
| `benefits` | `_text` |  Nullable |
| `start_date` | `date` |  Nullable |
| `status` | `text` |  Nullable |
| `response_deadline` | `date` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `base_salary` | `numeric` |  Nullable |
| `currency` | `text` |  Nullable |
| `frequency` | `text` |  Nullable |
| `probation_period` | `text` |  Nullable |
| `notice_period` | `text` |  Nullable |
| `sent_date` | `timestamptz` |  Nullable |
| `response_date` | `timestamptz` |  Nullable |
| `approved_by` | `text` |  Nullable |

## Table `expenses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `date_submitted` | `date` |  Nullable |
| `status` | `text` |  Nullable |
| `total_amount` | `numeric` |  Nullable |
| `workflow_id` | `uuid` |  Nullable |
| `current_approver_id` | `uuid` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `expense_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `claim_id` | `uuid` |  Nullable |
| `category_id` | `uuid` |  Nullable |
| `type_id` | `uuid` |  Nullable |
| `date` | `date` |  Nullable |
| `amount` | `numeric` |  Nullable |
| `description` | `text` |  Nullable |
| `receipt_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `stp_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `submission_date` | `timestamptz` |  Nullable |
| `run_date` | `date` |  Nullable |
| `transaction_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `employee_count` | `int4` |  Nullable |
| `total_gross` | `numeric` |  Nullable |
| `total_tax` | `numeric` |  Nullable |
| `total_super` | `numeric` |  Nullable |
| `response_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `stp_payees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `event_id` | `text` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `ytd_gross` | `numeric` |  Nullable |
| `ytd_tax` | `numeric` |  Nullable |
| `ytd_super` | `numeric` |  Nullable |
| `pay_period_gross` | `numeric` |  Nullable |
| `pay_period_tax` | `numeric` |  Nullable |
| `pay_period_super` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `performance_reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `reviewer_id` | `uuid` |  Nullable |
| `cycle` | `text` |  |
| `start_date` | `date` |  Nullable |
| `end_date` | `date` |  Nullable |
| `status` | `text` |  Nullable |
| `self_assessment` | `jsonb` |  Nullable |
| `manager_assessment` | `jsonb` |  Nullable |
| `final_rating` | `numeric` |  Nullable |
| `recommendations` | `_text` |  Nullable |
| `development_plan` | `_text` |  Nullable |
| `promotion_recommendation` | `text` |  Nullable |
| `completed_date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `kpis`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `category` | `text` |  Nullable |
| `target` | `text` |  Nullable |
| `current_value` | `text` |  Nullable |
| `unit` | `text` |  Nullable |
| `weight` | `numeric` |  Nullable |
| `progress` | `numeric` |  Nullable |
| `due_date` | `date` |  Nullable |
| `status` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `okrs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `quarter` | `text` |  Nullable |
| `objective` | `text` |  |
| `description` | `text` |  Nullable |
| `progress` | `numeric` |  Nullable |
| `status` | `text` |  Nullable |
| `start_date` | `date` |  Nullable |
| `end_date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `key_results`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `okr_id` | `uuid` |  Nullable |
| `description` | `text` |  |
| `target` | `numeric` |  Nullable |
| `current` | `numeric` |  Nullable |
| `unit` | `text` |  Nullable |
| `progress` | `numeric` |  Nullable |
| `confidence` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `feedback_360`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `reviewer_id` | `uuid` |  Nullable |
| `relationship` | `text` |  Nullable |
| `period_start` | `date` |  Nullable |
| `period_end` | `date` |  Nullable |
| `status` | `text` |  Nullable |
| `competencies` | `jsonb` |  Nullable |
| `overall_comments` | `text` |  Nullable |
| `strengths` | `_text` |  Nullable |
| `improvements` | `_text` |  Nullable |
| `submitted_date` | `date` |  Nullable |
| `anonymous` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `expense_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `limit` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `expense_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `expense_workflows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `steps` | `_text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `compliance_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `category` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `last_checked` | `timestamptz` |  Nullable |
| `next_check_due` | `timestamptz` |  Nullable |
| `assignee` | `uuid` |  Nullable |
| `priority` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `compliance_checklists`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `standard` | `text` |  |
| `last_updated` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `compliance_checklist_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `checklist_id` | `uuid` |  Nullable |
| `question` | `text` |  |
| `is_compliant` | `bool` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `course_enrollments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `course_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `status` | `text` |  Nullable |
| `enrolled_date` | `timestamptz` |  Nullable |
| `started_date` | `timestamptz` |  Nullable |
| `completed_date` | `timestamptz` |  Nullable |
| `progress` | `numeric` |  Nullable |
| `score` | `numeric` |  Nullable |
| `certificate_url` | `text` |  Nullable |
| `feedback` | `text` |  Nullable |
| `rating` | `int4` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `due_date` | `timestamptz` |  Nullable |
| `assigned_by` | `uuid` |  Nullable |
| `instructions` | `text` |  Nullable |

## Table `training_programs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `type` | `text` |  Nullable |
| `target_audience` | `_text` |  Nullable |
| `courses` | `_uuid` |  Nullable |
| `duration` | `numeric` |  Nullable |
| `mandatory` | `bool` |  Nullable |
| `status` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `incident_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `code` | `text` |  |
| `description` | `text` |  Nullable |
| `active` | `bool` |  Nullable |
| `color` | `text` |  Nullable |
| `allow_causeless` | `bool` |  Nullable |
| `reporter_allowed` | `text` |  Nullable |
| `investigation_access` | `text` |  Nullable |
| `team_access` | `jsonb` |  Nullable |
| `custom_role_access` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `incident_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `code` | `text` |  |
| `description` | `text` |  Nullable |
| `active` | `bool` |  Nullable |
| `category_id` | `uuid` |  Nullable |
| `weight` | `int4` |  Nullable |
| `rule` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `incident_decisions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `incidents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `category_id` | `uuid` |  Nullable |
| `type_id` | `uuid` |  Nullable |
| `from_date` | `timestamptz` |  Nullable |
| `to_date` | `timestamptz` |  Nullable |
| `summary` | `text` |  Nullable |
| `story` | `text` |  Nullable |
| `attachment` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `is_open` | `bool` |  Nullable |
| `explain_by` | `text` |  Nullable |
| `decision_id` | `uuid` |  Nullable |
| `decision_from` | `date` |  Nullable |
| `decision_to` | `date` |  Nullable |
| `management_remark` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `workflow_tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `code` | `text` |  Nullable |
| `color` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `manager_id` | `uuid` |  Nullable |

## Table `timesheets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `week_start_date` | `date` |  |
| `status` | `text` |  Nullable |
| `total_hours` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `timesheet_rows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `timesheet_id` | `uuid` |  |
| `project_id` | `uuid` |  Nullable |
| `type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `timesheet_entries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `row_id` | `uuid` |  |
| `date` | `date` |  |
| `hours` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `timesheet_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `name` | `text` |  |
| `project_ids` | `_uuid` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `table_name` | `text` |  |
| `record_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `old_data` | `jsonb` |  Nullable |
| `new_data` | `jsonb` |  Nullable |
| `performed_by` | `uuid` |  Nullable |
| `performed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `resource` | `varchar` |  Nullable |
| `resource_id` | `varchar` |  Nullable |
| `details` | `jsonb` |  Nullable |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `type` | `text` |  Nullable |
| `is_read` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `public_holidays`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `date` | `date` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `type` | `text` |  Nullable |
| `is_recurring` | `bool` |  Nullable |

## Table `payroll_employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `base_salary` | `numeric` |  |
| `pay_frequency` | `text` |  |
| `tax_file_number` | `varchar` |  Nullable |
| `tax_scale` | `text` |  |
| `residency_status` | `text` |  |
| `employment_type` | `text` |  |
| `super_fund_id` | `uuid` |  Nullable |
| `super_member_number` | `varchar` |  Nullable |
| `award_classification` | `text` |  Nullable |
| `is_salary_sacrifice` | `bool` |  Nullable |
| `effective_from` | `date` |  |
| `effective_to` | `date` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `hourly_rate` | `numeric` |  Nullable |
| `casual_loading_rate` | `numeric` |  Nullable |
| `has_help_debt` | `bool` |  Nullable |
| `has_sfss_debt` | `bool` |  Nullable |
| `has_private_health_insurance` | `bool` |  Nullable |
| `is_exempt_from_payroll_tax` | `bool` |  Nullable |
| `job_classification` | `text` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `industry_code` | `varchar` |  Nullable |
| `state` | `varchar` |  Nullable |

## Table `salary_adjustments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `adjustment_type` | `text` |  |
| `amount` | `numeric` |  |
| `adjustment_reason` | `text` |  |
| `effective_date` | `date` |  |
| `end_date` | `date` |  Nullable |
| `is_permanent` | `bool` |  Nullable |
| `is_processed` | `bool` |  Nullable |
| `status` | `text` |  |
| `requested_by` | `uuid` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `rejection_reason` | `text` |  Nullable |
| `back_pay_calculated` | `bool` |  Nullable |
| `back_pay_amount` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `pay_components`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payslip_id` | `uuid` |  Nullable |
| `component_type` | `text` |  |
| `description` | `text` |  |
| `units` | `numeric` |  |
| `rate` | `numeric` |  |
| `amount` | `numeric` |  |
| `tax_treatment` | `text` |  |
| `stp_category` | `text` |  |
| `is_ytd` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `deductions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `deduction_type` | `text` |  |
| `category` | `text` |  |
| `description` | `text` |  |
| `amount` | `numeric` |  |
| `is_fixed` | `bool` |  Nullable |
| `is_percentage` | `bool` |  Nullable |
| `percentage` | `numeric` |  Nullable |
| `priority` | `int4` |  |
| `effective_from` | `date` |  |
| `effective_to` | `date` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `deduction_applications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payslip_id` | `uuid` |  Nullable |
| `deduction_id` | `uuid` |  Nullable |
| `amount` | `numeric` |  |
| `ytd_amount` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `super_funds`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `fund_name` | `text` |  |
| `fund_abn` | `varchar` |  |
| `usi` | `varchar` |  |
| `contact_address` | `text` |  Nullable |
| `contact_phone` | `varchar` |  Nullable |
| `contact_email` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `product_name` | `text` |  Nullable |
| `contribution_restrictions` | `jsonb` |  Nullable |

## Table `superannuation_contributions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `fund_id` | `uuid` |  Nullable |
| `payslip_id` | `uuid` |  Nullable |
| `contribution_type` | `text` |  |
| `amount` | `numeric` |  |
| `period_start` | `date` |  |
| `period_end` | `date` |  |
| `payment_date` | `date` |  |
| `is_paid` | `bool` |  Nullable |
| `payment_reference` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `super_member_number` | `varchar` |  Nullable |
| `compliance_checked` | `bool` |  Nullable |
| `compliance_notes` | `_text` |  Nullable |

## Table `stp_submissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payroll_run_id` | `uuid` |  Nullable |
| `submission_type` | `text` |  |
| `submission_id` | `text` |  Nullable |
| `status` | `text` |  |
| `submission_date` | `timestamptz` |  |
| `employee_count` | `int4` |  |
| `total_gross` | `numeric` |  |
| `total_tax` | `numeric` |  |
| `total_super` | `numeric` |  |
| `response_message` | `text` |  Nullable |
| `error_details` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `stp_payee_data`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `stp_submission_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `income_type` | `text` |  |
| `country_code` | `varchar` |  Nullable |
| `tax_treatment_code` | `text` |  |
| `gross_amount` | `numeric` |  |
| `tax_amount` | `numeric` |  |
| `super_amount` | `numeric` |  |
| `ytd_gross` | `numeric` |  |
| `ytd_tax` | `numeric` |  |
| `ytd_super` | `numeric` |  |
| `pay_period_start` | `date` |  |
| `pay_period_end` | `date` |  |
| `payment_date` | `date` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `award_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `award_id` | `uuid` |  Nullable |
| `rule_type` | `text` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `conditions` | `jsonb` |  |
| `calculation` | `jsonb` |  |
| `priority` | `int4` |  |
| `effective_from` | `date` |  |
| `effective_to` | `date` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `tax_tables`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `financial_year` | `varchar` |  |
| `tax_scale` | `text` |  |
| `residency_status` | `text` |  |
| `pay_frequency` | `text` |  |
| `income_thresholds` | `jsonb` |  |
| `effective_from` | `date` |  |
| `effective_to` | `date` |  |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `statutory_rates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `rate_type` | `text` |  |
| `financial_year` | `varchar` |  |
| `rate` | `numeric` |  |
| `threshold` | `numeric` |  Nullable |
| `effective_from` | `date` |  |
| `effective_to` | `date` |  |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `name` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `calculation_base` | `numeric` |  Nullable |
| `maximum_amount` | `numeric` |  Nullable |
| `applicable_states` | `_text` |  Nullable |
| `applicable_industries` | `_text` |  Nullable |
| `applicable_employment_types` | `_text` |  Nullable |
| `liability_account` | `text` |  Nullable |
| `expense_account` | `text` |  Nullable |
| `is_reportable` | `bool` |  Nullable |

## Table `bonus_payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `bonus_type` | `text` |  |
| `amount` | `numeric` |  |
| `payment_date` | `date` |  |
| `tax_method` | `text` |  |
| `is_processed` | `bool` |  Nullable |
| `processed_at` | `timestamptz` |  Nullable |
| `payslip_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `annual_salary_statements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `financial_year` | `varchar` |  |
| `gross_payments` | `numeric` |  Nullable |
| `tax_withheld` | `numeric` |  Nullable |
| `superannuation` | `numeric` |  Nullable |
| `reportable_fringe_benefits` | `numeric` |  Nullable |
| `reportable_super_contributions` | `numeric` |  Nullable |
| `workplace_giving` | `numeric` |  Nullable |
| `allowances` | `numeric` |  Nullable |
| `lump_sum_payments` | `numeric` |  Nullable |
| `termination_payments` | `numeric` |  Nullable |
| `is_final` | `bool` |  Nullable |
| `generated_at` | `timestamptz` |  Nullable |
| `amended_from` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `user_roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Unique |
| `description` | `text` |  Nullable |
| `permissions` | `_text` |  Nullable |
| `level` | `int4` |  |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `permissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Unique |
| `description` | `text` |  Nullable |
| `resource` | `varchar` |  |
| `action` | `varchar` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `role_permissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `role_id` | `uuid` |  |
| `permission_id` | `uuid` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_role_assignments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `role_id` | `uuid` |  |
| `is_active` | `bool` |  Nullable |
| `assigned_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `approval_workflows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  |
| `description` | `text` |  Nullable |
| `module` | `varchar` |  |
| `approval_levels` | `jsonb` |  |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `approval_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_id` | `uuid` |  |
| `requester_id` | `uuid` |  |
| `entity_type` | `varchar` |  |
| `entity_id` | `varchar` |  |
| `current_level` | `int4` |  |
| `status` | `varchar` |  |
| `requested_amount` | `numeric` |  Nullable |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `approvals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `request_id` | `uuid` |  |
| `approver_id` | `uuid` |  |
| `level` | `int4` |  |
| `status` | `varchar` |  |
| `comments` | `text` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `hardware_onboarding`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `client_name` | `text` |  |
| `client_manager_email` | `text` |  |
| `status` | `text` |  |
| `submitted_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `remark` | `text` |  Nullable |

## Table `hardware_onboarding_assets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `onboarding_id` | `uuid` |  |
| `asset_tag` | `text` |  |
| `asset_type` | `text` |  |
| `serial_number` | `text` |  Nullable |
| `model` | `text` |  Nullable |
| `status` | `text` |  |
| `asset_code` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `assessments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `applicant_id` | `uuid` |  |
| `type` | `text` |  |
| `name` | `text` |  |
| `scheduled_date` | `timestamptz` |  Nullable |
| `completed_date` | `timestamptz` |  Nullable |
| `duration` | `int4` |  Nullable |
| `score` | `numeric` |  Nullable |
| `max_score` | `numeric` |  Nullable |
| `status` | `text` |  |
| `result` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `attachment_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `employee_experience`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `company_name` | `text` |  |
| `job_title` | `text` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  Nullable |
| `reason_for_leaving` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `payroll_errors`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payroll_run_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `error_type` | `text` |  |
| `error_code` | `varchar` |  |
| `message` | `text` |  |
| `details` | `jsonb` |  Nullable |
| `severity` | `text` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `uuid` |  Nullable |
| `resolution_notes` | `text` |  Nullable |

## Table `payroll_audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payroll_run_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `operation` | `text` |  |
| `table_name` | `text` |  |
| `record_id` | `uuid` |  Nullable |
| `old_values` | `jsonb` |  Nullable |
| `new_values` | `jsonb` |  Nullable |
| `performed_by` | `uuid` |  Nullable |
| `performed_at` | `timestamptz` |  Nullable |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |

## Table `payroll_processing_queue`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payroll_run_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  |
| `status` | `text` |  |
| `priority` | `int4` |  |
| `retry_count` | `int4` |  Nullable |
| `max_retries` | `int4` |  Nullable |
| `error_message` | `text` |  Nullable |
| `processing_started_at` | `timestamptz` |  Nullable |
| `processing_completed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `payroll_validation_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `rule_name` | `varchar` |  Unique |
| `rule_type` | `text` |  |
| `description` | `text` |  Nullable |
| `validation_logic` | `jsonb` |  |
| `error_message` | `text` |  |
| `severity` | `text` |  |
| `is_active` | `bool` |  Nullable |
| `applies_to_employment_types` | `_text` |  Nullable |
| `applies_to_pay_frequencies` | `_text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |

## Table `statutory_thresholds`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `contribution_type` | `text` |  |
| `threshold_type` | `text` |  |
| `threshold_value` | `numeric` |  |
| `comparison_operator` | `text` |  |
| `applicable_year` | `varchar` |  |
| `effective_from` | `timestamptz` |  |
| `effective_to` | `timestamptz` |  Nullable |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `statutory_exemptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `contribution_type` | `text` |  |
| `exemption_type` | `text` |  |
| `exemption_criteria` | `jsonb` |  |
| `exemption_amount` | `numeric` |  Nullable |
| `exemption_percentage` | `numeric` |  Nullable |
| `effective_from` | `timestamptz` |  |
| `effective_to` | `timestamptz` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `statutory_payment_schedules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  Nullable |
| `contribution_type` | `text` |  |
| `payment_frequency` | `text` |  |
| `payment_day` | `int4` |  |
| `payment_method` | `text` |  |
| `bank_account_details` | `jsonb` |  Nullable |
| `contact_details` | `jsonb` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `effective_from` | `timestamptz` |  |
| `effective_to` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## RLS Policies

### `onboarding_workflows`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `trainers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `document_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `courses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `placements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `pay_components`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Employees can view their own pay components` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (payslips p      JOIN employees e ON ((e.id = p.employee_id)))   WHERE ((p.id = pay_components.payslip_id) AND (e.user_id = auth.uid()))))` | — |
| `HR can manage pay components` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` |
| `HR can view pay components` | SELECT | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text, 'Manager'::text]))))) OR (EXISTS ( SELECT 1    FROM (payslips p      JOIN employees e ON ((e.id = p.employee_id)))   WHERE ((p.id = pay_components.payslip_id) AND (e.user_id = auth.uid())))))` | — |

### `company_information`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `hardware_onboarding`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Hardware onboarding access` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `interviews`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `jobs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `applicants`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `deductions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Employees can view their own deductions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees e   WHERE ((e.id = deductions.employee_id) AND (e.user_id = auth.uid()))))` | — |
| `HR can manage deductions` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` |

### `training_records`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `hardware_onboarding_assets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Hardware assets access` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `super_funds`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | public | PERMISSIVE | `true` | — |

### `offboarding_workflows`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `offboarding_tasks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `attendance_records`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `stp_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `stp_payees`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `expenses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `expense_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `stp_submissions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `okrs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for all authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for all authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for all authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `key_results`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for all authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for all authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for all authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `performance_reviews`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for all authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for all authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for all authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `feedback_360`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for all authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for all authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for all authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `expense_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `expense_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `expense_workflows`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `kpis`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for all authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for all authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for all authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `assessments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `compliance_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for all authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for all authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for all authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for all authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `incident_decisions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `incidents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `training_programs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `course_enrollments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `incident_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `incident_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `system_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `deduction_applications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Employees can view their own deduction applications` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (payslips p      JOIN employees e ON ((e.id = p.employee_id)))   WHERE ((p.id = deduction_applications.payslip_id) AND (e.user_id = auth.uid()))))` | — |
| `HR can manage deduction applications` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` |
| `HR can view deduction applications` | SELECT | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text, 'Manager'::text]))))) OR (EXISTS ( SELECT 1    FROM (payslips p      JOIN employees e ON ((e.id = p.employee_id)))   WHERE ((p.id = deduction_applications.payslip_id) AND (e.user_id = auth.uid())))))` | — |

### `workflow_tasks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `job_offers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete access for authenticated users` | DELETE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable update access for authenticated users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `employee_experience`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `channels`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Channel admins can update channel` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM channel_members   WHERE ((channel_members.channel_id = channels.id) AND (channel_members.user_id = auth.uid()) AND (channel_members.role = 'admin'::text))))` | — |
| `Users can create channels` | INSERT | public | PERMISSIVE | — | `(auth.uid() = created_by)` |
| `Users can view channels they are members of` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM channel_members   WHERE ((channel_members.channel_id = channels.id) AND (channel_members.user_id = auth.uid()))))` | — |

### `channel_members`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Channel admins can add members` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM channel_members channel_members_1   WHERE ((channel_members_1.channel_id = channel_members_1.channel_id) AND (channel_members_1.user_id = auth.uid()) AND (channel_members_1.role = 'admin'::text))))` |
| `Channel admins can remove members` | DELETE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM channel_members channel_members_1   WHERE ((channel_members_1.channel_id = channel_members_1.channel_id) AND (channel_members_1.user_id = auth.uid()) AND (channel_members_1.role = 'admin'::text))))` | — |
| `Users can view members of their channels` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM channel_members cm   WHERE ((cm.channel_id = channel_members.channel_id) AND (cm.user_id = auth.uid()))))` | — |

### `menu_item_configurations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow admins to update menu configs` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees e   WHERE ((e.user_id = auth.uid()) AND (COALESCE(e.role, e.system_access_role) = ANY (ARRAY['Super Admin'::text, 'Administrator'::text, 'HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text])))))` | `(EXISTS ( SELECT 1    FROM employees e   WHERE ((e.user_id = auth.uid()) AND (COALESCE(e.role, e.system_access_role) = ANY (ARRAY['Super Admin'::text, 'Administrator'::text, 'HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text])))))` |
| `Allow public read access` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `timesheet_entries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Managers can view entries` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM timesheet_rows tr   WHERE ((tr.id = timesheet_entries.row_id) AND has_manager_access_to_timesheet(tr.timesheet_id))))` | — |
| `Users can delete own entries` | DELETE | authenticated | PERMISSIVE | `(row_id IN ( SELECT timesheet_rows.id    FROM timesheet_rows   WHERE (timesheet_rows.timesheet_id IN ( SELECT timesheets.id            FROM timesheets           WHERE (timesheets.employee_id IN ( SELECT employees.id                    FROM employees                   WHERE (employees.user_id = auth.uid())))))))` | — |
| `Users can insert own entries` | INSERT | authenticated | PERMISSIVE | — | `(row_id IN ( SELECT timesheet_rows.id    FROM timesheet_rows   WHERE (timesheet_rows.timesheet_id IN ( SELECT timesheets.id            FROM timesheets           WHERE (timesheets.employee_id IN ( SELECT employees.id                    FROM employees                   WHERE (employees.user_id = auth.uid())))))))` |
| `Users can update own entries` | UPDATE | authenticated | PERMISSIVE | `(row_id IN ( SELECT timesheet_rows.id    FROM timesheet_rows   WHERE (timesheet_rows.timesheet_id IN ( SELECT timesheets.id            FROM timesheets           WHERE (timesheets.employee_id IN ( SELECT employees.id                    FROM employees                   WHERE (employees.user_id = auth.uid())))))))` | — |
| `Users can view own entries` | SELECT | authenticated | PERMISSIVE | `(row_id IN ( SELECT timesheet_rows.id    FROM timesheet_rows   WHERE (timesheet_rows.timesheet_id IN ( SELECT timesheets.id            FROM timesheets           WHERE (timesheets.employee_id IN ( SELECT employees.id                    FROM employees                   WHERE (employees.user_id = auth.uid())))))))` | — |

### `messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can delete their own messages` | DELETE | public | PERMISSIVE | `(sender_id = auth.uid())` | — |
| `Users can send messages to their channels` | INSERT | public | PERMISSIVE | — | `((sender_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM channel_members   WHERE ((channel_members.channel_id = messages.channel_id) AND (channel_members.user_id = auth.uid())))))` |
| `Users can update their own messages` | UPDATE | public | PERMISSIVE | `(sender_id = auth.uid())` | — |
| `Users can view messages in their channels` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM channel_members   WHERE ((channel_members.channel_id = messages.channel_id) AND (channel_members.user_id = auth.uid()))))` | — |

### `projects`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete for authenticated users` | DELETE | authenticated | PERMISSIVE | `true` | — |
| `Enable insert for authenticated users` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for authenticated users` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Enable update for authenticated users` | UPDATE | authenticated | PERMISSIVE | `true` | — |

### `timesheet_rows`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Managers can view rows` | SELECT | authenticated | PERMISSIVE | `has_manager_access_to_timesheet(timesheet_id)` | — |
| `Users can delete own rows` | DELETE | authenticated | PERMISSIVE | `(timesheet_id IN ( SELECT timesheets.id    FROM timesheets   WHERE (timesheets.employee_id IN ( SELECT employees.id            FROM employees           WHERE (employees.user_id = auth.uid())))))` | — |
| `Users can insert own rows` | INSERT | authenticated | PERMISSIVE | — | `(timesheet_id IN ( SELECT timesheets.id    FROM timesheets   WHERE (timesheets.employee_id IN ( SELECT employees.id            FROM employees           WHERE (employees.user_id = auth.uid())))))` |
| `Users can update own rows` | UPDATE | authenticated | PERMISSIVE | `(timesheet_id IN ( SELECT timesheets.id    FROM timesheets   WHERE (timesheets.employee_id IN ( SELECT employees.id            FROM employees           WHERE (employees.user_id = auth.uid())))))` | — |
| `Users can view own rows` | SELECT | authenticated | PERMISSIVE | `(timesheet_id IN ( SELECT timesheets.id    FROM timesheets   WHERE (timesheets.employee_id IN ( SELECT employees.id            FROM employees           WHERE (employees.user_id = auth.uid())))))` | — |

### `timesheets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Managers can update timesheets` | UPDATE | authenticated | PERMISSIVE | `has_manager_access_to_timesheet(id)` | — |
| `Managers can view timesheets` | SELECT | authenticated | PERMISSIVE | `has_manager_access_to_timesheet(id)` | — |
| `Users can insert own timesheets` | INSERT | authenticated | PERMISSIVE | — | `(employee_id IN ( SELECT employees.id    FROM employees   WHERE (employees.user_id = auth.uid())))` |
| `Users can update own timesheets` | UPDATE | authenticated | PERMISSIVE | `(employee_id IN ( SELECT employees.id    FROM employees   WHERE (employees.user_id = auth.uid())))` | — |
| `Users can view own timesheets` | SELECT | authenticated | PERMISSIVE | `(employee_id IN ( SELECT employees.id    FROM employees   WHERE (employees.user_id = auth.uid())))` | — |

### `audit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert access for authenticated users` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Enable read/write for auth users` | ALL | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `HR Managers can view all audit logs` | SELECT | public | PERMISSIVE | `(has_role(auth.uid(), 'HR Manager'::text) OR has_role(auth.uid(), 'Administrator'::text))` | — |
| `Users can view audit logs for their actions` | SELECT | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `payslips`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can view their own payslips` | SELECT | authenticated | PERMISSIVE | `(employee_id = ( SELECT employees.id    FROM employees   WHERE (employees.user_id = auth.uid())))` | — |
| `Employees can view their own payslips` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees e   WHERE ((e.id = payslips.employee_id) AND (e.user_id = auth.uid()))))` | — |
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |
| `HR Admins can manage all payslips` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` | — |
| `HR can delete payslips` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` | — |
| `HR can insert payslips` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` |
| `HR can manage payslips` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` |
| `HR can update payslips` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` |
| `HR can view all payslips` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text, 'Manager'::text])))))` | — |

### `chat_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all authenticated users to insert chat_messages` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Allow all authenticated users to read chat_messages` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Allow all authenticated users to update chat_messages` | UPDATE | authenticated | PERMISSIVE | `true` | — |

### `notifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can insert notifications` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Users can update their own notifications` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own notifications` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `public_holidays`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can manage holidays` | ALL | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Everyone can view holidays` | SELECT | public | PERMISSIVE | `true` | — |

### `user_role_assignments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Administrators can manage role assignments` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'Administrator'::text)` | — |
| `Users can view their own role assignments` | SELECT | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `payroll_employees`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Managers can manage payroll employees` | ALL | authenticated | PERMISSIVE | `(has_role(auth.uid(), 'Administrator'::text) OR has_role(auth.uid(), 'Manager'::text) OR has_role(auth.uid(), 'HR Admin'::text))` | `(has_role(auth.uid(), 'Administrator'::text) OR has_role(auth.uid(), 'Manager'::text) OR has_role(auth.uid(), 'HR Admin'::text))` |

### `approval_workflows`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `HR Managers can manage workflows` | ALL | public | PERMISSIVE | `(has_role(auth.uid(), 'HR Manager'::text) OR has_role(auth.uid(), 'Administrator'::text))` | — |
| `Users can view active workflows` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |

### `approval_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Approvers can view requests they need to approve` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM approvals a   WHERE ((a.request_id = approval_requests.id) AND (a.approver_id = auth.uid()) AND ((a.status)::text = 'pending'::text))))` | — |
| `HR Managers can view all requests` | SELECT | public | PERMISSIVE | `(has_role(auth.uid(), 'HR Manager'::text) OR has_role(auth.uid(), 'Administrator'::text))` | — |
| `Users can create approval requests` | INSERT | public | PERMISSIVE | — | `(requester_id = auth.uid())` |
| `Users can view their own requests` | SELECT | public | PERMISSIVE | `(requester_id = auth.uid())` | — |

### `approvals`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Approvers can update their approvals` | UPDATE | public | PERMISSIVE | `((approver_id = auth.uid()) AND ((status)::text = 'pending'::text))` | — |
| `Approvers can view their approvals` | SELECT | public | PERMISSIVE | `(approver_id = auth.uid())` | — |
| `Requesters can view approvals for their requests` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM approval_requests ar   WHERE ((ar.id = approvals.request_id) AND (ar.requester_id = auth.uid()))))` | — |

### `permissions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can view permissions` | SELECT | public | PERMISSIVE | `true` | — |

### `role_permissions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Administrators can manage role permissions` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = 'Administrator'::text) AND (ura.is_active = true))))` | — |
| `Users can view role permissions` | SELECT | public | PERMISSIVE | `true` | — |

### `salary_structures`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can view salary structures` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `HR Admins can manage salary structures` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` | — |

### `employee_salaries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can view their own salaries` | SELECT | authenticated | PERMISSIVE | `(employee_id = ( SELECT employees.id    FROM employees   WHERE (employees.user_id = auth.uid())))` | — |
| `HR Admins can manage all employee salaries` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` | — |

### `user_roles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Administrators can manage roles` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'Administrator'::text)` | — |
| `Users can view active roles` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |

### `superannuation_contributions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `payroll_runs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow authenticated users to insert payroll runs` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `Allow authenticated users to update payroll runs` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Allow authenticated users to view payroll runs` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `HR Admins can manage payroll runs` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` | — |

### `employee_loans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can view their own loans` | SELECT | authenticated | PERMISSIVE | `(employee_id = ( SELECT employees.id    FROM employees   WHERE (employees.user_id = auth.uid())))` | — |
| `HR Admins can manage all loans` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` | — |

### `legal_documents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `payroll_audit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow authenticated users to insert payroll audit logs` | INSERT | public | PERMISSIVE | — | `(auth.role() = 'authenticated'::text)` |
| `HR/Admins can view all payroll audit logs` | SELECT | public | PERMISSIVE | `true` | — |

### `payroll_processing_queue`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `HR/Admins can update payroll queue items` | UPDATE | public | PERMISSIVE | `true` | — |
| `HR/Admins can view all payroll queue items` | SELECT | public | PERMISSIVE | `true` | — |

### `payroll_validation_rules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `HR/Admins can manage validation rules` | ALL | public | PERMISSIVE | `true` | — |
| `HR/Admins can view all validation rules` | SELECT | public | PERMISSIVE | `true` | — |

### `payroll_errors`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Employees can view their own payroll errors` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees   WHERE ((employees.id = payroll_errors.employee_id) AND (employees.user_id = auth.uid()))))` | — |
| `HR/Admins can insert payroll errors` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` |
| `HR/Admins can update payroll errors` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` |
| `HR/Admins can view all payroll errors` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees me   WHERE ((me.user_id = auth.uid()) AND (COALESCE(me.role, me.system_access_role) = ANY (ARRAY['HR Admin'::text, 'HR Manager'::text, 'Employer Admin'::text, 'Administrator'::text, 'Super Admin'::text])))))` | — |

### `statutory_thresholds`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow authenticated users to view statutory tables` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `statutory_exemptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow authenticated users to view statutory exemptions` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `statutory_payment_schedules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow authenticated users to view payment schedules` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `statutory_reporting_requirements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow authenticated users to view reporting requirements` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `payroll_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow read access for authenticated users` | SELECT | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `Allow update access for admin users` | UPDATE | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |

### `workday_configurations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert access for authenticated users` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for authenticated users` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Enable update access for authenticated users` | UPDATE | authenticated | PERMISSIVE | `true` | — |

### `payroll_audit_log`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow authenticated users to insert audit logs` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `HR Admins can view audit logs` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (user_role_assignments ura      JOIN user_roles ur ON ((ura.role_id = ur.id)))   WHERE ((ura.user_id = auth.uid()) AND ((ur.name)::text = ANY ((ARRAY['HR Admin'::character varying, 'HR Manager'::character varying, 'Administrator'::character varying])::text[])))))` | — |

### `email_templates`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable delete for admin roles` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees   WHERE ((employees.user_id = auth.uid()) AND (employees.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text, 'Employer Admin'::text, 'HR Manager'::text])))))` | — |
| `Enable insert for admin roles` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM employees   WHERE ((employees.user_id = auth.uid()) AND (employees.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text, 'Employer Admin'::text, 'HR Manager'::text])))))` |
| `Enable read access for authenticated users` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Enable update for admin roles` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM employees   WHERE ((employees.user_id = auth.uid()) AND (employees.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text, 'Employer Admin'::text, 'HR Manager'::text])))))` | — |

