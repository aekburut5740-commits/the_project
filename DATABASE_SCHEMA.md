# Nexus Client Portal - Database Schema Documentation

## Overview
This document describes the complete database schema for the Nexus Client Portal system, organized by 8 core modules.

---

## MODULE 1: Authentication & Security

### Purpose
Secure user authentication, role-based access control (RBAC), and JWT token management.

### Tables

#### `users`
- **Existing structure preserved** with additional fields
- `id`: Primary key
- `email`: Unique email for login
- `password`: Hashed password
- `first_name`, `last_name`: User display name
- `avatar_url`: Profile picture
- `phone`: Contact number
- `status`: active/inactive
- `created_at`, `updated_at`: Timestamps

#### `roles`
- `id`: Primary key
- `name`: Role name (admin, project_manager, developer, client, viewer)
- `description`: Role description

#### `user_roles` (Many-to-Many)
- Links users to roles
- `user_id` → users
- `role_id` → roles

#### `permissions`
- `id`: Primary key
- `name`: Permission name (view_projects, create_projects, etc.)
- `description`: What this permission allows

#### `role_permissions` (Many-to-Many)
- Links roles to permissions
- `role_id` → roles
- `permission_id` → permissions

#### `auth_tokens`
- Tracks JWT tokens
- `user_id` → users
- `token`: The JWT token
- `expires_at`: Token expiration time

---

## MODULE 2: Dashboard & Project Health

### Purpose
Display project overview, progress tracking, and team management.

### Tables

#### `companies`
- Represents clients/organizations
- `id`: Primary key
- `name`: Company name
- `email`, `phone`: Contact info
- `logo_url`: Company logo
- `address`: Physical address
- `status`: active/inactive

#### `projects`
- Main project entity
- `id`: Primary key
- `company_id` → companies (which client)
- `name`: Project name
- `description`: Project details
- `status`: planning/in_progress/completed/on_hold
- `progress`: 0-100 percentage
- `start_date`, `end_date`: Timeline
- `estimated_cost`, `actual_cost`: Budget tracking
- `manager_id` → users (Project manager)

#### `project_members` (Many-to-Many)
- Links users to projects
- `project_id` → projects
- `user_id` → users
- `role`: User's role within the project

---

## MODULE 3: Milestone Tracking

### Purpose
Track project phases, deliverables, and task progress.

### Tables

#### `milestones`
- Major project phases/deliverables
- `id`: Primary key
- `project_id` → projects
- `name`: Milestone name
- `description`: What needs to be delivered
- `status`: pending/in_progress/completed/delayed
- `progress`: 0-100 percentage
- `planned_date`: Expected completion
- `actual_date`: When it actually completed

#### `tasks`
- Individual work items within milestones
- `id`: Primary key
- `milestone_id` → milestones (which phase)
- `project_id` → projects
- `name`: Task name
- `description`: Task details
- `status`: todo/in_progress/in_review/completed
- `priority`: low/medium/high/critical
- `assigned_to` → users
- `due_date`: Deadline
- `estimated_hours`, `actual_hours`: Time tracking

#### `task_status_history`
- Audit trail for task status changes
- `task_id` → tasks
- `old_status`: Previous status
- `new_status`: New status
- `changed_by` → users (Who made the change)
- `changed_at`: When it changed

---

## MODULE 4: Status & Notification

### Purpose
Keep users informed of project updates and status changes.

### Tables

#### `notifications`
- User notifications
- `id`: Primary key
- `user_id` → users (Recipient)
- `project_id` → projects (Which project)
- `title`, `message`: Notification content
- `type`: task_update/milestone_complete/feedback_new/document_uploaded
- `is_read`: Read status
- `read_at`: When user read it

#### `notification_preferences`
- User communication preferences
- `user_id` → users (Unique per user)
- `email_notifications`: Enable email alerts
- `sms_notifications`: Enable SMS alerts
- `push_notifications`: Enable app push notifications
- `daily_digest`: Send daily summary

#### `project_status_snapshots`
- Daily/hourly snapshots of project health
- `project_id` → projects
- `overall_status`: healthy/at_risk/critical
- `progress`: Current percentage
- `tasks_completed`, `tasks_total`: Task metrics
- `snapshot_date`: When this snapshot was taken

---

## MODULE 5: Live Feedback Center

### Purpose
Collect client feedback, manage UAT, and track issues.

### Tables

#### `feedback`
- Client feedback items
- `id`: Primary key
- `project_id` → projects
- `user_id` → users (Who submitted)
- `title`: Feedback title
- `description`: Detailed feedback
- `category`: bug/feature_request/question/suggestion
- `priority`: low/medium/high/critical
- `status`: open/in_progress/resolved/closed

#### `feedback_comments`
- Comment threads on feedback
- `feedback_id` → feedback
- `user_id` → users (Who commented)
- `comment`: Comment text
- `created_at`, `updated_at`: Timestamps

#### `feedback_attachments`
- Screenshots, documents, etc.
- `feedback_id` → feedback
- `file_name`, `file_url`: File reference
- `file_size`, `file_type`: File metadata
- `uploaded_by` → users

---

## MODULE 6: Document Vault

### Purpose
Store and manage project documentation with version control and access control.

### Tables

#### `documents`
- Project documents/files
- `id`: Primary key
- `project_id` → projects
- `title`: Document name
- `description`: What this document is for
- `doc_type`: specification/proposal/contract/deliverable
- `file_url`: Where the file is stored
- `file_name`, `file_size`: File metadata
- `is_confidential`: Access restriction flag
- `version`: Current version number
- `uploaded_by` → users

#### `document_versions`
- Version history of documents
- `document_id` → documents
- `version`: Version number
- `file_url`: URL of this version
- `uploaded_by` → users
- `change_log`: What changed in this version

#### `document_access`
- Fine-grained access control
- `document_id` → documents
- `user_id` → users (Optional: specific user)
- `role_id` → roles (Optional: by role)
- `access_type`: view/download/edit

---

## MODULE 7: Git Pulse (Commit Tracking)

### Purpose
Display developer activity, code commits, and branch information from Git repositories.

### Tables

#### `git_integrations`
- Connected Git repositories (GitHub, GitLab, Bitbucket)
- `project_id` → projects
- `provider`: github/gitlab/bitbucket
- `repo_url`: Repository URL
- `repo_name`: Short name
- `branch_name`: Which branch to track
- `access_token`: API access (encrypted)
- `is_active`: Enable/disable tracking

#### `git_commits`
- Individual commits synced from the repository
- `git_integration_id` → git_integrations
- `commit_hash`: Git commit SHA
- `author_name`, `author_email`: Developer info
- `message`: Commit message
- `commit_date`: When the commit was made
- `synced_at`: When we synced it

#### `git_branches`
- Active branches in the repository
- `git_integration_id` → git_integrations
- `branch_name`: Branch name
- `last_commit_hash`: Latest commit on this branch
- `last_update`: Last sync time

---

## MODULE 8: Reporting & Summary

### Purpose
Generate and schedule project reports for stakeholders.

### Tables

#### `reports`
- Generated project reports
- `project_id` → projects
- `title`: Report title
- `description`: What this report covers
- `report_type`: progress/financial/resource/quality
- `generated_by` → users (Who created it)
- `generated_at`: When it was generated
- `data_json`: Report data (JSON format)

#### `report_schedules`
- Automated report generation
- `project_id` → projects
- `report_type`: Which type of report
- `frequency`: daily/weekly/monthly/quarterly
- `recipients`: Email addresses to send to
- `is_active`: Enable/disable
- `last_sent`: When was it last sent

---

## Database Relationships

### User & Access Control
```
users (1) ──→ (M) user_roles ──→ (1) roles ──→ (M) role_permissions ──→ (1) permissions
```

### Project Hierarchy
```
companies (1) ──→ (M) projects ──→ (M) project_members ──→ users
projects (1) ──→ (M) milestones ──→ (M) tasks
```

### Communication
```
projects (1) ──→ (M) feedback ──→ (M) feedback_comments
       ↓
    (M) notifications ──→ users
```

### Documentation
```
projects (1) ──→ (M) documents ──→ (M) document_versions
       ↓
    (M) document_access ──→ users/roles
```

### Development
```
projects (1) ──→ (M) git_integrations ──→ (M) git_commits
                              ↓
                         (M) git_branches
```

---

## Key Design Decisions

1. **User table preserved**: Existing `users` table structure kept intact with additional fields added
2. **RBAC pattern**: Flexible role-based access using role_permissions junction table
3. **Audit trails**: task_status_history, document_versions track all changes
4. **Timestamps**: All tables have created_at/updated_at for temporal tracking
5. **Soft deletes**: Foreign keys use ON DELETE CASCADE, consider soft deletes later
6. **JSON for reports**: Complex report data stored as JSON for flexibility
7. **Indexes**: Strategic indexes on frequently queried columns (FK, status, dates)

---

## Connection Details

Use environment variables:
```
DB_USER=your_user
DB_HOST=localhost
DB_NAME=the_project
DB_PASSWORD=your_password
DB_PORT=5432
```

Or standard CONNECTION_STRING format:
```
DATABASE_URL="postgresql://user:password@localhost:5432/the_project"
```

---

## SQL Migration Steps

1. **First run**: Execute `001_init_schema.sql` to create all tables
2. **Add data**: Insert sample companies, users, projects via backend endpoints
3. **Verify**: Check all tables and indexes created successfully
4. **Backup**: Always backup before schema changes

```bash
# Execute migration
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f sql/001_init_schema.sql

# Verify tables created
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "\dt"
```

---

## Next Steps

1. ✅ **Schema Ready** - All 8 modules defined
2. ⏳ **Backend Routes** - Create API endpoints for each module
3. ⏳ **Frontend Pages** - Build UI for each module
4. ⏳ **Testing** - Integration tests for all CRUD operations
5. ⏳ **Documentation** - API documentation (Swagger/OpenAPI)

---

*Last Updated: June 2024*
*Database Version: 1.0 (Nexus Client Portal)*
