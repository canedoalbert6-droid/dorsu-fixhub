-- DOrSU FixHub Database Schema
-- Run this in your MySQL (e.g., via PHPMyAdmin or MySQL Workbench)

CREATE DATABASE IF NOT EXISTS dorsu_fixhub;
USE dorsu_fixhub;

-- 1. Locations Table
CREATE TABLE IF NOT EXISTS locations (
    location_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- 2. Admins Table (with role-based access)
-- MUST BE CREATED BEFORE REPORTS due to Foreign Key reference
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('Admin', 'Technician', 'Viewer') DEFAULT 'Viewer'
);

-- 3. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id CHAR(36) PRIMARY KEY,
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    location_id VARCHAR(50) NOT NULL,
    report_type ENUM('Maintenance', 'Innovation') DEFAULT 'Maintenance',
    issue VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255),
    after_fix_image_url VARCHAR(255),
    assigned_to INT,
    priority ENUM('Low', 'Medium', 'High', 'Emergency') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
    admin_notes TEXT,
    time_spent_minutes INT DEFAULT 0,
    work_started_at DATETIME,
    work_completed_at DATETIME,
    sla_deadline DATETIME,
    sla_breached TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    FOREIGN KEY (assigned_to) REFERENCES admins(id) ON DELETE SET NULL
);

-- 4. Comments Table (for collaboration on reports)
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id CHAR(36) NOT NULL,
    admin_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Seed Initial Data
INSERT IGNORE INTO locations (location_id, name) VALUES 
('BLDG-A-101', 'Building A - Room 101'),
('BLDG-B-LAB', 'Building B - Computer Lab'),
('CANTEEN', 'University Canteen'),
('GYM', 'DOrSU Gymnasium'),
('UNKNOWN', 'General Campus Area');

-- Default admin password is 'password123' (bcrypt hashed)
INSERT IGNORE INTO admins (username, password, full_name, role) VALUES 
('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Maintenance Manager', 'Admin');
