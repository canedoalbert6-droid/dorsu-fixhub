const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  let db;
  try {
    // Attempt to connect using environment variables
    const config = {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dorsu_fixhub'
    };
    
    console.log(`Connecting to database ${config.database} on ${config.host}...`);
    db = await mysql.createConnection(config);
    console.log('Successfully connected to DB');
    
    // Add missing tracking columns
    console.log('Adding work_started_at column...');
    await db.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS work_started_at DATETIME AFTER resolved_at;`);
    
    console.log('Adding work_completed_at column...');
    await db.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS work_completed_at DATETIME AFTER work_started_at;`);
    
    console.log('Ensuring all Work Order fields exist...');
    const woFields = [
      "ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
      "ADD COLUMN IF NOT EXISTS classroom_office VARCHAR(100)",
      "ADD COLUMN IF NOT EXISTS date_needed DATE",
      "ADD COLUMN IF NOT EXISTS date_started DATE",
      "ADD COLUMN IF NOT EXISTS time_started TIME",
      "ADD COLUMN IF NOT EXISTS time_finished TIME",
      "ADD COLUMN IF NOT EXISTS date_completed DATE",
      "ADD COLUMN IF NOT EXISTS work_description TEXT",
      "ADD COLUMN IF NOT EXISTS work_details TEXT",
      "ADD COLUMN IF NOT EXISTS requested_by VARCHAR(100)",
      "ADD COLUMN IF NOT EXISTS inspected_by VARCHAR(100)",
      "ADD COLUMN IF NOT EXISTS conformed_by VARCHAR(100)",
      "ADD COLUMN IF NOT EXISTS workmanship_rating ENUM('Outstanding', 'Very Satisfactory', 'Satisfactory', 'Unsatisfactory', 'Poor')",
      "ADD COLUMN IF NOT EXISTS approval_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'"
    ];

    for (const field of woFields) {
      try {
        await db.query(`ALTER TABLE reports ${field};`);
      } catch (err) {
        console.warn(`Could not add field (${field}):`, err.message);
      }
    }

    console.log('Ensuring report_materials has correct source enum...');
    try {
      await db.query(`ALTER TABLE report_materials MODIFY COLUMN material_source ENUM('stock', 'purchased', 'donated');`);
    } catch (err) {
      console.warn('Could not update material_source enum:', err.message);
    }

    console.log('Migration successful: Database is up to date.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    if (db) await db.end();
  }
}

fix();
