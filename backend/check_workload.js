const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkWorkload() {
  let db;
  try {
    const config = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    };
    
    console.log(`Connecting to ${config.host} / ${config.database}...`);
    db = await mysql.createConnection(config);
    
    const [rows] = await db.query(`
      SELECT a.id, a.username, a.full_name, 
        (SELECT COUNT(*) FROM reports WHERE assigned_to = a.id AND status = 'In Progress') as active_tasks
      FROM admins a 
      WHERE a.role IN ("Technician", "Admin")
    `);
    
    console.log('Technician Workload:');
    console.table(rows);

    const [reports] = await db.query('SELECT id, status, assigned_to FROM reports WHERE status = "In Progress"');
    console.log('\nActive Reports:');
    console.table(reports);

  } catch (err) {
    console.error(err.message);
  } finally {
    if (db) await db.end();
  }
}

checkWorkload();
