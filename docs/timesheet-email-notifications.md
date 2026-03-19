# Timesheet Email Notifications

## Overview
The payroll validation modal supports sending email notifications to an employee’s direct manager for:
- Missing weekly timesheets
- Unapproved (including Draft/Submitted) weekly timesheets

Notifications are deduplicated per employee + pay period + notification type for 24 hours.

## Email Types
- `TIMESHEET_MISSING`
- `TIMESHEET_APPROVAL_REQUIRED`

Templates and enable/disable toggles are managed in the Admin UI:
- Settings → Email Templates

## Template Placeholders
### Timesheet Missing Notification (`TIMESHEET_MISSING`)
- `{{employee_name}}`
- `{{employee_code}}`
- `{{period}}` (e.g. `2026-03-03 to 2026-03-15`)
- `{{missing_weeks}}` (comma-separated)
- `{{manager_name}}`
- `{{timesheet_link}}`

### Timesheet Approval Required (`TIMESHEET_APPROVAL_REQUIRED`)
- `{{employee_name}}`
- `{{employee_code}}`
- `{{period}}`
- `{{pending_count}}`
- `{{pending_weeks}}` (comma-separated with statuses)
- `{{manager_name}}`
- `{{approval_link}}`

## API
### Send notifications
`POST /api/payroll/timesheets/send-notification`

Body:
```json
{
  "kind": "MISSING" | "UNAPPROVED",
  "employeeIds": ["<employee_uuid>", "..."],
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

Returns:
```json
{
  "results": [
    { "employeeId": "<uuid>", "status": "SENT" | "FAILED" | "SKIPPED_DUPLICATE" | "SKIPPED", "error": "..." }
  ]
}
```

### Read recent statuses (24h)
`GET /api/payroll/timesheets/notification-status?employeeIds=<csv>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

## Database
Uses existing email tables:
- `email_templates`
- `email_template_assignments`
- `email_audit_log`

Migration `20260319_timesheet_email_notifications.sql` adds:
- `email_audit_log.metadata` (jsonb)
- `email_audit_log.dedupe_key` (text)

## Security / Access Control
- Endpoints require an authenticated user with an HR-admin role.
- UI hides “Send Email” actions for non-admin users.

