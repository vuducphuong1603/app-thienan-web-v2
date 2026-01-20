-- Add branch column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(50);

-- Add class_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_name VARCHAR(100);

-- Create index for branch queries
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);

-- Update existing branch data to use Vietnamese with diacritics
UPDATE users SET branch = 'Ấu Nhi' WHERE branch = 'Au nhi';
UPDATE users SET branch = 'Thiếu Nhi' WHERE branch = 'Thieu nhi';
UPDATE users SET branch = 'Nghĩa Sĩ' WHERE branch = 'Nghia si';
UPDATE users SET branch = 'Hiệp Sĩ' WHERE branch = 'Hiep si';
