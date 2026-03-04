-- Add new fields to user_notes for the notes page
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS note_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS date_end DATE;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS note_time TEXT;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS time_end TEXT;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS reminder TEXT;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS link TEXT;

-- Create index on note_date for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_user_notes_note_date ON user_notes(user_id, note_date);
