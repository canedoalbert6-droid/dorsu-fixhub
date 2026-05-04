const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function ensureTokens() {
  let db;
  try {
    const config = {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dorsu_fixhub'
    };
    
    console.log(`Connecting to database ${config.database}...`);
    db = await mysql.createConnection(config);

    // Find users with missing or empty qr_token
    const [users] = await db.query('SELECT id, username FROM admins WHERE qr_token IS NULL OR qr_token = ""');
    
    if (users.length === 0) {
      console.log('All users already have QR tokens.');
      return;
    }

    console.log(`Found ${users.length} users with missing QR tokens. Updating...`);

    for (const user of users) {
      const newToken = uuidv4();
      await db.query('UPDATE admins SET qr_token = ? WHERE id = ?', [newToken, user.id]);
      console.log(`- Assigned token to user: ${user.username}`);
    }

    console.log('Update successful. Please ask affected users to log out and log back in.');
  } catch (err) {
    console.error('Error updating tokens:', err.message);
  } finally {
    if (db) await db.end();
  }
}

ensureTokens();
