const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let db;
  try {
    const config = {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dorsu_fixhub'
    };
    
    console.log(`Connecting to database ${config.database} on ${config.host}...`);
    db = await mysql.createConnection(config);
    
    console.log('Creating equipment table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS equipment (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          qr_token VARCHAR(255) UNIQUE NOT NULL,
          status ENUM('Available', 'Borrowed', 'Maintenance') DEFAULT 'Available',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating report_equipment table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS report_equipment (
          id INT AUTO_INCREMENT PRIMARY KEY,
          report_id CHAR(36) NOT NULL,
          equipment_id INT NOT NULL,
          borrowed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          returned_at DATETIME,
          FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
          FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Migration successful: Equipment tables are ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    if (db) await db.end();
  }
}

migrate();
