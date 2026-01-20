-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  branch VARCHAR(50) NOT NULL,
  display_order INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for branch queries
CREATE INDEX IF NOT EXISTS idx_classes_branch ON classes(branch);
CREATE INDEX IF NOT EXISTS idx_classes_display_order ON classes(display_order);

-- Insert Chiên Con classes
INSERT INTO classes (name, branch, display_order) VALUES
  ('Khai Tâm A', 'Chiên Con', 1),
  ('Khai Tâm B', 'Chiên Con', 2),
  ('Ấu 1A', 'Chiên Con', 3),
  ('Ấu 1B', 'Chiên Con', 4),
  ('Ấu 1C', 'Chiên Con', 5),
  ('Ấu 1D', 'Chiên Con', 6);

-- Insert Ấu Nhi classes
INSERT INTO classes (name, branch, display_order) VALUES
  ('Ấu 2A', 'Ấu Nhi', 7),
  ('Ấu 2B', 'Ấu Nhi', 8),
  ('Ấu 2C', 'Ấu Nhi', 9),
  ('Ấu 2D', 'Ấu Nhi', 10),
  ('Ấu 2E', 'Ấu Nhi', 11),
  ('Ấu 3A', 'Ấu Nhi', 12),
  ('Ấu 3B', 'Ấu Nhi', 13),
  ('Ấu 3C', 'Ấu Nhi', 14),
  ('Ấu 3D', 'Ấu Nhi', 15),
  ('Ấu 3E', 'Ấu Nhi', 16);

-- Insert Thiếu Nhi classes
INSERT INTO classes (name, branch, display_order) VALUES
  ('Thiếu 1A', 'Thiếu Nhi', 17),
  ('Thiếu 1B', 'Thiếu Nhi', 18),
  ('Thiếu 1C', 'Thiếu Nhi', 19),
  ('Thiếu 1D', 'Thiếu Nhi', 20),
  ('Thiếu 1E', 'Thiếu Nhi', 21),
  ('Thiếu 2A', 'Thiếu Nhi', 22),
  ('Thiếu 2B', 'Thiếu Nhi', 23),
  ('Thiếu 2C', 'Thiếu Nhi', 24),
  ('Thiếu 2D', 'Thiếu Nhi', 25),
  ('Thiếu 2E', 'Thiếu Nhi', 26),
  ('Thiếu 3A', 'Thiếu Nhi', 27),
  ('Thiếu 3B', 'Thiếu Nhi', 28),
  ('Thiếu 3C', 'Thiếu Nhi', 29),
  ('Thiếu 3D', 'Thiếu Nhi', 30),
  ('Thiếu 3E', 'Thiếu Nhi', 31);

-- Insert Nghĩa Sĩ classes
INSERT INTO classes (name, branch, display_order) VALUES
  ('Nghĩa 1A', 'Nghĩa Sĩ', 32),
  ('Nghĩa 1B', 'Nghĩa Sĩ', 33),
  ('Nghĩa 1C', 'Nghĩa Sĩ', 34),
  ('Nghĩa 1D', 'Nghĩa Sĩ', 35),
  ('Nghĩa 2A', 'Nghĩa Sĩ', 36),
  ('Nghĩa 2B', 'Nghĩa Sĩ', 37),
  ('Nghĩa 2C', 'Nghĩa Sĩ', 38),
  ('Nghĩa 3', 'Nghĩa Sĩ', 39),
  ('Hiệp Sĩ 1', 'Nghĩa Sĩ', 40),
  ('Hiệp Sĩ 2', 'Nghĩa Sĩ', 41);
