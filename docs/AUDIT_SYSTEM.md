# Audit System Documentation

## Overview
The Audit System in the Master Data Management (MDM) module provides a comprehensive trail of all changes made to the organizational hierarchy (Branches, Departments, and Managers). It tracks who made the change, when it was made, and what exactly changed (old vs. new values).

## Features

### 1. Activity Logging
Every Create (INSERT), Update (UPDATE), and Delete (DELETE) operation is automatically logged to the `audit_logs` table.
- **Insert**: Records the new data created.
- **Update**: Records both the state before the update (`old_data`) and the state after (`new_data`).
- **Delete**: Records the data that was deleted (`old_data`).

### 2. User Interface
The Audit tab in the MDM page offers a user-friendly interface to view logs:
- **Tabular View**: Shows Time, Action Type, Entity Name, and User.
- **Color-Coded Actions**: 
  - Green: CREATE
  - Blue: UPDATE
  - Red: DELETE
- **Details View**: Clicking "View Changes" opens a modal showing the raw JSON difference between old and new data.

### 3. Filtering
Users can filter audit logs by:
- **Entity Type**: Branches, Departments, Managers.
- **Action Type**: CREATE, UPDATE, DELETE.
- **Refresh**: A manual refresh button to load the latest logs.

## Technical Implementation

### Database Schema
The system relies on the `audit_logs` table:
```sql
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references auth.users(id),
  performed_at timestamp with time zone default now()
);
```

### Service Layer (`organizationService.ts`)
- **`logAction` helper**: Handles the insertion of logs into Supabase.
- **`getAuditLogs`**: Fetches logs with support for filtering by `tableName` and `action`. It joins with `auth.users` (via a helper view or direct relationship if configured) to display the user's email.

### Frontend (`organization/page.tsx`)
- **State Management**: Uses React state to manage filters (`auditFilterEntity`, `auditFilterAction`).
- **Data Fetching**: Reloads audit logs whenever filters change using `useEffect`.
- **Modals**: `AuditDetailsModal` renders the JSON diff.

## Usage Guide

1. **Viewing Logs**: Navigate to the "Audit" tab in the Master Data Management page.
2. **Filtering**: Use the dropdowns at the top to filter by Entity (e.g., "Branches") or Action (e.g., "UPDATE").
3. **Inspecting Changes**: Click the "View Changes" link on any row to see exactly what fields were modified.

## Troubleshooting

- **"Audit logs table does not exist"**: Ensure migration `20260210_org_hierarchy_updates.sql` has been applied to your Supabase instance.
- **Missing User Emails**: Ensure the `performed_by` column is correctly linked to `auth.users` and your query has access to read user data (RLS policies).
