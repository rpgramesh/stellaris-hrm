# Stellaris HRM Project Description

**Stellaris HRM** is a comprehensive Human Resource Management Web Portal and Mobile App designed to centralize, streamline, and automate hr processes for organizations. Built on a modern tech stack (Next.js, React, TailwindCSS, Supabase) and augmented for mobile devices via Capacitor, the application aims to elevate workforce management, improve data accuracy, and foster a transparent environment for both administrative staff and employees.

## Core Architecture and Tech Stack
- **Frontend Framework:** Next.js (React) utilizing Server-Side Rendering (SSR) and Client-Side rendering.
- **Styling:** TailwindCSS for a modern, responsive, and robust UI.
- **Backend & Database:** Supabase for authentication, real-time database capabilities, and secure storage. PostgreSQL relational database underneath.
- **Mobile Packaging:** Capacitor to wrap the Next.js web application into a native Android (and potentially iOS) application, granting the mobile workforce access anywhere.

---

## Detailed Module Functionalities

### 1. Dashboard & Analytics
- **Admin/Manager Dashboard:** Provides a high-level overview of key metrics such as headcount, leave requests pending approval, recent announcements, upcoming holidays, and current payroll status.
- **Analytics:** Data-driven visualizations and reports summarizing employee demographics, retention tracking, payroll distributions, and attendance metrics to assist stakeholders in making informed decisions.

### 2. Employee Management
- **Employee Directory:** Centralized list of all active/inactive personnel.
- **Profiles:** Detailed profiles storing personal information, job history, contact details, emergency contacts, and assigned roles.
- **Lifecycle Management:** Dedicated flows for onboarding new hires and offboarding departing staff securely.
- **Role-Based Access Control (RBAC):** Restrict access based on granular permission models (e.g., Admin, Manager, Employee, Payroll Admin).

### 3. Payroll Management
- **Payroll Processing:** Tools for processing regular pay runs, extracting data from timesheets, and calculating gross pay, taxes, superannuation, and net pay.
- **Salary Adjustments:** Capable of logging bonuses, deductions, and specific salary adjustments securely.
- **Payslip Generation:** Auto-generation of PDF payslips which can be downloaded by employees.
- **Superannuation & Taxation:** Storage of tax file numbers (TFN), super fund details, and automated calculation parameters to ensure compliance.

### 4. Time & Attendance
- **Timesheets:** Employees can submit timesheets detailing their hours worked.
- **Approval Workflow:** Managers can review, approve, or reject timesheets. 
- **Auto-filling:** Functionality to automatically populate hours based on standard schedules, public holidays, or approved leave.

### 5. Leave & Holiday Management
- **Leave Requests:** Employees can request different types of leave (Annual, Sick, Unpaid, etc.) and view their current balances.
- **Leave Approvals:** Managers receive notifications and can easily manage pending leave requests.
- **Company Holidays:** A centralized calendar mapping out company-wide public holidays globally or localized to branches.

### 6. Organization & Employer Settings
- **Company Structure:** Defines the company hierarchy, branches, and departments.
- **Employer Data:** Consolidated area to manage the company's financial and business details (e.g., Bank Details, ABN, Tax settings).
- **Compliance & Documents:** Uploading and tracking of company-wide policies, compliance forms, and specific employee certifications.

### 7. Self-Service Portal
- **Employee Access:** A dedicated self-service area where employees can independently view their payslips, update personal information, submit expenses, and request leaves without needing to consult HR directly.
- **Profile Updates:** Workflow for employees to initiate changes to their bank details or contact information.

### 8. Expenses & Incidents
- **Expense Claims:** Allow staff to submit reimbursable expenses with receipt attachments. Financial admins can review and approve these for payout.
- **Incident Reporting:** Securely log workplace incidents, health and safety hazards, or policy violations for compliance and resolution tracking.

### 9. Talent Management & Recruitment
- **Job Postings:** Outline open roles, internal mobility opportunities, and application tracking.
- **Candidate Tracking / Applicant Management (ATS):** Process applications, track interview stages, and convert successful candidates into hires.
- **Learning & Performance:** Assign training certificates, track course completions, and conduct performance reviews.

### 10. Communication & Team Engagement
- **Announcements:** Broadcast company-wide or department-specific news and alerts.
- **Notifications:** In-app real-time alerts and email notifications (via Nodemailer) for critical events (timesheet approvals, new payslips, leave updates).
- **Discussions & Sharing:** Collaborative spaces for team-specific chat or document sharing.

### 11. System Security & Platform Settings
- **Authentication:** MFA (Multi-Factor Authentication) powered by Supabase for sensitive roles (Administrators/Payroll).
- **Security Audit Logs:** Tracking system changes and user sign-ins for compliance.
- **Email Configurations:** Settings for custom SMTP servers and managing system email templates.

---
## Summary
The Stellaris HRM platform combines essential daily HR tasks (Timesheets, Payroll, Leaves) with high-level administrative functions (Analytics, Compliance, Recruitment). By consolidating these functions into a single responsive web, Android application with mobile-friendly workflows, the app drastically reduces administrative overhead and empowers the workforce.
