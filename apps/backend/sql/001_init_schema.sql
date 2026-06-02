-- ============================================================
-- Nexus Client Portal - Database Schema
-- Modules: 8 core features for project tracking & client management
-- ============================================================

-- ============================================================
-- MODULE 1: Authentication & Security
-- ============================================================

-- Users table (keep existing structure, add new fields)
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name  VARCHAR(100),
  avatar_url VARCHAR(500),
  phone      VARCHAR(20),
  status     VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table (for RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
  id        SERIAL PRIMARY KEY,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id   INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role permissions (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  id            SERIAL PRIMARY KEY,
  role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- JWT/Auth tokens
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 2: Dashboard & Project Health
-- ============================================================

-- Companies/Clients table
CREATE TABLE IF NOT EXISTS companies (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255),
  phone      VARCHAR(20),
  logo_url   VARCHAR(500),
  address    TEXT,
  status     VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id             SERIAL PRIMARY KEY,
  company_id     INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  status         VARCHAR(50) DEFAULT 'planning',
  progress       INT DEFAULT 0,
  start_date     DATE,
  end_date       DATE,
  estimated_cost DECIMAL(15, 2),
  actual_cost    DECIMAL(15, 2),
  manager_id     INT REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- Project members (many-to-many)
CREATE TABLE IF NOT EXISTS project_members (
  id         SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- MODULE 3: Milestone Tracking
-- ============================================================

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id             SERIAL PRIMARY KEY,
  project_id     INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  status         VARCHAR(50) DEFAULT 'pending',
  progress       INT DEFAULT 0,
  planned_date   DATE NOT NULL,
  actual_date    DATE,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id             SERIAL PRIMARY KEY,
  milestone_id   INT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  project_id     INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  status         VARCHAR(50) DEFAULT 'todo',
  priority       VARCHAR(50) DEFAULT 'medium',
  assigned_to    INT REFERENCES users(id),
  due_date       DATE,
  estimated_hours INT,
  actual_hours    INT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Task status history (for audit trail)
CREATE TABLE IF NOT EXISTS task_status_history (
  id         SERIAL PRIMARY KEY,
  task_id    INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 4: Status & Notification
-- ============================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INT REFERENCES projects(id) ON DELETE SET NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  type       VARCHAR(50),
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at    TIMESTAMP
);

-- Notification preferences (user settings)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications   BOOLEAN DEFAULT FALSE,
  push_notifications  BOOLEAN DEFAULT TRUE,
  daily_digest        BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project status snapshots (for dashboard)
CREATE TABLE IF NOT EXISTS project_status_snapshots (
  id              SERIAL PRIMARY KEY,
  project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  overall_status  VARCHAR(50),
  progress        INT,
  tasks_completed INT,
  tasks_total     INT,
  snapshot_date   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 5: Live Feedback Center
-- ============================================================

-- Feedback/UAT table
CREATE TABLE IF NOT EXISTS feedback (
  id         SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id),
  title      VARCHAR(255) NOT NULL,
  description TEXT,
  category   VARCHAR(100),
  priority   VARCHAR(50) DEFAULT 'medium',
  status     VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Feedback comments/thread
CREATE TABLE IF NOT EXISTS feedback_comments (
  id          SERIAL PRIMARY KEY,
  feedback_id INT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id),
  comment     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Feedback attachments
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id          SERIAL PRIMARY KEY,
  feedback_id INT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  file_size   INT,
  file_type   VARCHAR(100),
  uploaded_by INT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 6: Document Vault
-- ============================================================

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id             SERIAL PRIMARY KEY,
  project_id     INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  doc_type       VARCHAR(100),
  file_url       VARCHAR(500) NOT NULL,
  file_name      VARCHAR(255),
  file_size      INT,
  is_confidential BOOLEAN DEFAULT FALSE,
  version        INT DEFAULT 1,
  uploaded_by    INT NOT NULL REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- Document versions (history)
CREATE TABLE IF NOT EXISTS document_versions (
  id          SERIAL PRIMARY KEY,
  document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version     INT,
  file_url    VARCHAR(500) NOT NULL,
  uploaded_by INT NOT NULL REFERENCES users(id),
  change_log  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Document access control
CREATE TABLE IF NOT EXISTS document_access (
  id          SERIAL PRIMARY KEY,
  document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  role_id     INT REFERENCES roles(id) ON DELETE CASCADE,
  access_type VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, user_id, role_id)
);

-- ============================================================
-- MODULE 7: Git Pulse (Commit Tracking)
-- ============================================================

-- Git integrations (GitHub, GitLab, Bitbucket)
CREATE TABLE IF NOT EXISTS git_integrations (
  id          SERIAL PRIMARY KEY,
  project_id  INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider    VARCHAR(50),
  repo_url    VARCHAR(500) NOT NULL,
  repo_name   VARCHAR(255),
  branch_name VARCHAR(255),
  access_token VARCHAR(500),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Git commits (synced from repository)
CREATE TABLE IF NOT EXISTS git_commits (
  id           SERIAL PRIMARY KEY,
  git_integration_id INT NOT NULL REFERENCES git_integrations(id) ON DELETE CASCADE,
  commit_hash  VARCHAR(255) NOT NULL UNIQUE,
  author_name  VARCHAR(255),
  author_email VARCHAR(255),
  message      TEXT,
  commit_date  TIMESTAMP,
  synced_at    TIMESTAMP DEFAULT NOW()
);

-- Git branches
CREATE TABLE IF NOT EXISTS git_branches (
  id                 SERIAL PRIMARY KEY,
  git_integration_id INT NOT NULL REFERENCES git_integrations(id) ON DELETE CASCADE,
  branch_name        VARCHAR(255) NOT NULL,
  last_commit_hash   VARCHAR(255),
  last_update        TIMESTAMP,
  created_at         TIMESTAMP DEFAULT NOW(),
  UNIQUE(git_integration_id, branch_name)
);

-- ============================================================
-- MODULE 8: Reporting & Summary
-- ============================================================

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id               SERIAL PRIMARY KEY,
  project_id       INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  report_type      VARCHAR(100),
  generated_by     INT NOT NULL REFERENCES users(id),
  generated_at     TIMESTAMP DEFAULT NOW(),
  data_json        TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Report schedules (for automated reports)
CREATE TABLE IF NOT EXISTS report_schedules (
  id             SERIAL PRIMARY KEY,
  project_id     INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_type    VARCHAR(100),
  frequency      VARCHAR(50),
  recipients     VARCHAR(500),
  is_active      BOOLEAN DEFAULT TRUE,
  last_sent      TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================

-- Auth indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Milestone & Task indexes
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id ON feedback_comments(feedback_id);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);

-- Git indexes
CREATE INDEX IF NOT EXISTS idx_git_integrations_project_id ON git_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_integration_id ON git_commits(git_integration_id);

-- Report indexes
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_project_id ON report_schedules(project_id);

-- ============================================================
-- SEED DATA (Optional)
-- ============================================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access to system'),
  ('project_manager', 'Manage projects and milestones'),
  ('developer', 'Development team member'),
  ('client', 'Client access'),
  ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Insert basic permissions
INSERT INTO permissions (name, description) VALUES
  ('view_projects', 'Can view projects'),
  ('create_projects', 'Can create projects'),
  ('edit_projects', 'Can edit projects'),
  ('delete_projects', 'Can delete projects'),
  ('manage_users', 'Can manage users'),
  ('view_documents', 'Can view documents'),
  ('upload_documents', 'Can upload documents'),
  ('view_feedback', 'Can view feedback'),
  ('create_feedback', 'Can create feedback'),
  ('approve_feedback', 'Can approve feedback')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- NOTE: DATABASE READY FOR NEXUS CLIENT PORTAL
-- ============================================================
