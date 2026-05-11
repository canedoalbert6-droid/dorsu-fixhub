-- Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('Available', 'Borrowed', 'Maintenance') DEFAULT 'Available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Link Table for Borrowed Equipment
CREATE TABLE IF NOT EXISTS report_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id CHAR(36) NOT NULL,
    equipment_id INT NOT NULL,
    borrowed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    returned_at DATETIME,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);
