-- Migration to add Work Order Form fields and materials table

USE dorsu_fixhub;

-- 1. Update reports table with new fields
ALTER TABLE reports
ADD COLUMN department VARCHAR(100),
ADD COLUMN classroom_office VARCHAR(100),
ADD COLUMN date_needed DATE,
ADD COLUMN work_description TEXT,
ADD COLUMN work_details TEXT,
ADD COLUMN requested_by VARCHAR(100),
ADD COLUMN inspected_by VARCHAR(100),
ADD COLUMN conformed_by VARCHAR(100),
ADD COLUMN workmanship_rating ENUM('Outstanding', 'Very Satisfactory', 'Satisfactory', 'Unsatisfactory', 'Poor');

-- 2. Create work_order_materials table
CREATE TABLE IF NOT EXISTS report_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id CHAR(36),
    material_name VARCHAR(255),
    material_source ENUM('stock', 'petty cash', 'procurement'),
    qty_in INT DEFAULT 0,
    qty_used INT DEFAULT 0,
    qty_out INT DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);
