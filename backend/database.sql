-- DOrSU FixHub Database Schema
-- Run this in your MySQL (e.g., via PHPMyAdmin or MySQL Workbench)

CREATE DATABASE IF NOT EXISTS dorsu_fixhub;
USE dorsu_fixhub;

-- 1. Locations Table
CREATE TABLE IF NOT EXISTS locations (
    location_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- 2. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id CHAR(36) PRIMARY KEY,
    location_id VARCHAR(50) NOT NULL,
    issue VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255),
    status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- 3. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Use hashed passwords in production
    full_name VARCHAR(100)
);

-- Seed Initial Data
INSERT IGNORE INTO locations (location_id, name) VALUES 
('BLDG-A-101', 'Building A - Room 101'),
('BLDG-B-LAB', 'Building B - Computer Lab'),
('CANTEEN', 'University Canteen'),
('GYM', 'DOrSU Gymnasium');

INSERT IGNORE INTO admins (username, password, full_name) VALUES 
('admin', 'password123', 'Maintenance Manager');
