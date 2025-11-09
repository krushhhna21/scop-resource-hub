-- Migration to extend legacy users table for Google Sign-In
-- Run this if Google auth fails with unknown column 'email' or similar.

-- NOTE: MySQL 5.7 does not support "ADD COLUMN IF NOT EXISTS". Use the following
-- statements; ignore duplicate column errors if columns already exist.

ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE NULL AFTER id;
ALTER TABLE users ADD COLUMN display_name VARCHAR(255) NULL AFTER email;
ALTER TABLE users ADD COLUMN role ENUM('admin','faculty','student') DEFAULT 'student' AFTER password_hash;
ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER role;
ALTER TABLE users ADD COLUMN is_approved TINYINT(1) DEFAULT 0 AFTER is_active;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Make username nullable to support Google-only accounts
ALTER TABLE users MODIFY COLUMN username VARCHAR(64) NULL;

-- If any ALTER fails because the column exists, that's OK; proceed with the rest.
