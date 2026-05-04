const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  let db;
  try {
    db = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'dorsu_fixhub'
    });
    console.log('Connected to DB');
    const [rows] = await db.query("DESCRIBE reports;");
    console.log('Table structure:');
    rows.forEach(row => console.log(`${row.Field}: ${row.Type}`));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    if (db) await db.end();
  }
}

check();
