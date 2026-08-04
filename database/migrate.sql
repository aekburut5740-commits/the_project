-- Migration Script: เพิ่มคอลัมน์ที่ขาดหายไปในตารางสำหรับเครื่องใหม่
-- รันไฟล์นี้ใน pgAdmin / psql หรือสั่งรันผ่าน `bun run seed-admin.ts`

-- ตาราง users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';

-- ตาราง projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS package TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- ตาราง feedbacks
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- ตรวจสอบผลลัพธ์
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects' ORDER BY ordinal_position;
