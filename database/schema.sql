-- ============================================================
-- KITCHEN — legacy SQL schema
-- The application now uses MongoDB. Use database/seed.php instead.
--
-- HOW TO USE (XAMPP):
--   1. Start Apache + MySQL in the XAMPP control panel.
--   2. Open http://localhost/phpmyadmin
--   3. Click the "SQL" tab (no need to create a database first —
--      this script creates it for you).
--   4. Paste the ENTIRE contents of this file and click "Go".
--
-- HOW TO USE (mysql command line):
--   mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS kitchen_pickleball
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kitchen_pickleball;

-- ------------------------------------------------------------
-- Users  (User & Account Management)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,      -- stored with PHP password_hash()
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150),
  phone      VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Courts  (Court & Time Slot Management)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courts (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  address  VARCHAR(150),
  indoor   TINYINT(1) NOT NULL DEFAULT 0,
  fee      DECIMAL(6,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Bookings  (Scheduling Service)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  court_id      INT NOT NULL,
  user_id       INT NOT NULL,
  booking_date  DATE NOT NULL,
  booking_time  VARCHAR(20) NOT NULL,     -- e.g. "7:00 AM"
  status        ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  paid          TINYINT(1) NOT NULL DEFAULT 0,
  fee           DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (court_id) REFERENCES courts(id),
  FOREIGN KEY (user_id)  REFERENCES users(id),
  INDEX idx_court_date_time (court_id, booking_date, booking_time)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Notifications  (Notification Service)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  message    VARCHAR(255) NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed data — starter courts so the app has something to book
-- ------------------------------------------------------------
INSERT INTO courts (name, location, address, indoor, fee) VALUES
  ('Riverside Court A',  'Riverside Park',       '210 River Rd', 0, 0.00),
  ('Riverside Court B',  'Riverside Park',       '210 River Rd', 0, 0.00),
  ('Downtown Court 1',   'Downtown Rec Center',  '88 Main St',   1, 12.00),
  ('Downtown Court 2',   'Downtown Rec Center',  '88 Main St',   1, 12.00),
  ('Sunset Court A',     'Sunset Fields',        '4 Sunset Ave', 0, 8.00),
  ('Sunset Court B',     'Sunset Fields',        '4 Sunset Ave', 0, 8.00);
