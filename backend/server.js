const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MySQL Connection ---
let db;
async function connectDB() {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('Successfully connected to MySQL');
  } catch (error) {
    console.error('MySQL Connection Error:', error);
  }
}
connectDB();

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// --- API ENDPOINTS ---

// 0. Admin Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
      res.json({ success: true, token: 'mock-jwt-token', user: { username: rows[0].username, name: rows[0].full_name } });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Submit a Report (User)
app.post('/api/reports', upload.single('image'), async (req, res) => {
  const { locationId, issue, description } = req.body;
  const id = uuidv4();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  
  try {
    await db.query(
      'INSERT INTO reports (id, location_id, issue, description, image_url) VALUES (?, ?, ?, ?, ?)',
      [id, locationId, issue, description, imageUrl]
    );
    res.status(201).json({ message: 'Report submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch All Reports (Admin)
app.get('/api/reports', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reports ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Report Status (Admin)
app.patch('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Status updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Fetch Locations
app.get('/api/locations/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM locations WHERE location_id = ?', [req.params.id]);
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).json({ message: "Location not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Fetch Reports for Specific Location (User Tracker)
app.get('/api/reports/location/:locationId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT issue, status FROM reports WHERE location_id = ? ORDER BY created_at DESC LIMIT 3',
      [req.params.locationId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Professional API running at http://localhost:${PORT}`);
});
