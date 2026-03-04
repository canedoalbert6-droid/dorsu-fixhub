const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

const getAutoPriority = (issue, type) => {
  if (type === 'Innovation') return 'Low';
  const highPriority = ['Electrical Problem', 'Plumbing Leak', 'Structural Damage'];
  return highPriority.includes(issue) ? 'High' : 'Medium';
};

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log('Admin connected:', socket.id);
  socket.on('disconnect', () => console.log('Admin disconnected'));
});

// --- API ENDPOINTS ---

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

app.post('/api/reports', upload.single('image'), async (req, res) => {
  const { locationId, issue, description, reportType } = req.body;
  const id = uuidv4();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const priority = getAutoPriority(issue, reportType);
  
  try {
    await db.query(
      'INSERT INTO reports (id, location_id, report_type, issue, description, image_url, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, locationId, reportType || 'Maintenance', issue, description, imageUrl, priority]
    );
    
    // NEW: Notify all connected admins via Socket.io
    io.emit('newReport', { id, locationId, issue, reportType, priority });
    
    res.status(201).json({ message: 'Report submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reports ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  try {
    const query = status 
      ? 'UPDATE reports SET status = ?, admin_notes = ? WHERE id = ?'
      : 'UPDATE reports SET admin_notes = ? WHERE id = ?';
    const params = status ? [status, adminNotes, id] : [adminNotes, id];
    
    await db.query(query, params);
    res.json({ message: 'Report updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.5 Delete a Report (Admin Only)
app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM reports WHERE id = ?', [id]);
    res.json({ message: 'Report deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/locations/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM locations WHERE location_id = ?', [req.params.id]);
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).json({ message: "Location not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/buildings/health', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        location_id, 
        COUNT(*) as total,
        SUM(CASE WHEN status != 'Resolved' THEN 1 ELSE 0 END) as pending_count
      FROM reports 
      GROUP BY location_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// IMPORTANT: use server.listen instead of app.listen for Socket.io
server.listen(PORT, () => {
  console.log(`Real-time API running at http://localhost:${PORT}`);
});
