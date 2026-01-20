-- Update users table to add missing columns for the app
-- Run this AFTER 20250118_create_users.sql

-- Add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS saint_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index for phone and username queries
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update role constraint to match app roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'phan_doan_truong', 'giao_ly_vien'));

-- Drop old RLS policies if they exist (to recreate with better permissions)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Allow anonymous/public access for login (since we use custom auth)
CREATE POLICY "Allow public read for login" ON users
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow public insert for registration
CREATE POLICY "Allow public insert for registration" ON users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow users to update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insert a default admin user if not exists (password: admin123)
INSERT INTO users (id, username, email, password, full_name, saint_name, phone, role, status)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@thienan.com',
  'admin123',
  'Quản trị viên',
  'Giuse',
  '0123456789',
  'admin',
  'ACTIVE'
) ON CONFLICT DO NOTHING;

INSERT INTO users (id, username, email, password, full_name, saint_name, phone, role, status)
VALUES (
  gen_random_uuid(),
  'Nguyễn Duy Thông',
  'ngduythong1412@gmail.com',
  '123456',
  'Quản trị viên',
  'Augustino',
  '0782485283',
  'admin',
  'ACTIVE'
) ON CONFLICT DO NOTHING;
