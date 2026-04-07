const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-random-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h';
const BCRYPT_ROUNDS = 10;

const SLA_HOURS = { Emergency: 2, High: 8, Medium: 24, Low: 72 };

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// --- Rate Limiting ---
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { error: 'Too many requests, please try again later.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many login attempts, please try again later.' } });
app.use('/api/', apiLimiter);
app.use('/api/login', authLimiter);

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

// --- Storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- Zod Schemas ---
const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const reportSchema = z.object({
  locationId: z.string().min(1),
  issue: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  reportType: z.enum(['Maintenance', 'Innovation']).optional().default('Maintenance'),
});
const updateReportSchema = z.object({
  status: z.enum(['Pending', 'In Progress', 'Resolved']).optional(),
  adminNotes: z.string().max(500).optional(),
  timeSpentMinutes: z.number().int().min(0).max(1440).optional(),
});
const commentSchema = z.object({ commentText: z.string().min(1).max(1000) });
const assignSchema = z.object({ technicianId: z.number().int().positive() });
const timeSchema = z.object({ minutes: z.number().int().min(0).max(1440) });
const slaOverrideSchema = z.object({ slaDeadline: z.string().datetime() });
const adminUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  fullName: z.string().min(1).max(100),
  role: z.enum(['Admin', 'Technician', 'Viewer']),
});
const locationSchema = z.object({
  locationId: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
});

// --- Helpers ---
const generateTrackingCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FIX-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const getAutoPriority = (issue, type) => {
  if (type === 'Innovation') return 'Low';
  const highPriority = ['Electrical Problem', 'Plumbing Leak', 'Structural Damage'];
  return highPriority.includes(issue) ? 'High' : 'Medium';
};

const calculateSlaDeadline = (priority) => {
  const hours = SLA_HOURS[priority] || SLA_HOURS.Medium;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

// --- JWT Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions.' });
  next();
};

// --- Error Handling Middleware ---
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Duplicate entry detected.' });
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Max 5MB allowed.' });
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
};

// --- SLA Breach Checker (runs every 5 minutes) ---
setInterval(async () => {
  try {
    if (!db) return;
    const [toNotify] = await db.query(`SELECT id, tracking_code, issue, location_id FROM reports WHERE sla_deadline < NOW() AND status != 'Resolved' AND sla_breached = 0`);
    if (toNotify.length > 0) {
      const ids = toNotify.map(r => r.id);
      await db.query(`UPDATE reports SET sla_breached = 1 WHERE id IN (?)`, [ids]);
      toNotify.forEach(r => io.emit('slaBreached', { id: r.id, trackingCode: r.tracking_code, issue: r.issue, locationId: r.location_id }));
    }
  } catch (err) {
    console.error('SLA check error:', err.message);
  }
}, 5 * 60 * 1000);

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// --- API ENDPOINTS ---

// Login
app.post('/api/login', async (req, res, next) => {
  try {
    if (!db) return res.status(503).json({ success: false, message: 'Database connecting, please try again in a moment.' });
    const { username, password } = loginSchema.parse(req.body);
    const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, rows[0].password);
    if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username, role: rows[0].role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ success: true, token, user: { id: rows[0].id, username: rows[0].username, name: rows[0].full_name, role: rows[0].role } });
  } catch (err) { next(err); }
});

// Submit Report
app.post('/api/reports', upload.single('image'), async (req, res, next) => {
  try {
    const { locationId, issue, description, reportType } = reportSchema.parse(req.body);
    const id = uuidv4();
    const trackingCode = generateTrackingCode();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const priority = getAutoPriority(issue, reportType);
    const slaDeadline = calculateSlaDeadline(priority);

    await db.query(
      'INSERT INTO reports (id, tracking_code, location_id, report_type, issue, description, image_url, priority, sla_deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, trackingCode, locationId, reportType, issue, description, imageUrl, priority, slaDeadline]
    );

    io.emit('newReport', { id, trackingCode, locationId, issue, reportType, priority });
    res.status(201).json({ message: 'Report submitted successfully!', trackingCode });
  } catch (err) { next(err); }
});

// Get Reports (with pagination + role filtering)
app.get('/api/reports', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status;
    const typeFilter = req.query.type;

    let whereClause = 'WHERE 1=1';
    const params = [];

    // Technicians only see their assigned reports
    if (req.user.role === 'Technician') {
      whereClause += ' AND (assigned_to = ? OR assigned_to IS NULL)';
      params.push(req.user.id);
    }
    if (statusFilter && statusFilter !== 'All') { whereClause += ' AND status = ?'; params.push(statusFilter); }
    if (typeFilter) { whereClause += ' AND report_type = ?'; params.push(typeFilter); }

    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM reports ${whereClause}`, params);
    const [rows] = await db.query(`SELECT r.*, a.full_name as assigned_name FROM reports r LEFT JOIN admins a ON r.assigned_to = a.id ${whereClause} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

    res.json({ data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) });
  } catch (err) { next(err); }
});

// Track Report by Tracking Code (public)
app.get('/api/reports/track/:trackingCode', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT tracking_code, location_id, report_type, issue, description, priority, status, created_at, resolved_at, admin_notes FROM reports WHERE tracking_code = ?', [req.params.trackingCode]);
    if (rows.length === 0) return res.status(404).json({ message: 'Report not found. Check your tracking code.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Delete Report (Admin Only)
app.delete('/api/reports/:id', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    await db.query('DELETE FROM reports WHERE id = ?', [req.params.id]);
    res.json({ message: 'Report deleted successfully!' });
  } catch (err) { next(err); }
});

// Comments
app.post('/api/reports/:id/comments', authenticateToken, requireRole('Admin', 'Technician'), async (req, res, next) => {
  try {
    const { commentText } = commentSchema.parse(req.body);
    const { id } = req.params;
    await db.query('INSERT INTO comments (report_id, admin_id, comment_text) VALUES (?, ?, ?)', [id, req.user.id, commentText]);
    const [comments] = await db.query('SELECT c.*, a.full_name, a.role FROM comments c JOIN admins a ON c.admin_id = a.id WHERE c.report_id = ? ORDER BY c.created_at ASC', [id]);
    io.emit('commentsUpdated', { reportId: id, comments });
    res.status(201).json({ message: 'Comment added', comments });
  } catch (err) { next(err); }
});

app.get('/api/reports/:id/comments', authenticateToken, async (req, res, next) => {
  try {
    const [comments] = await db.query('SELECT c.*, a.full_name, a.role FROM comments c JOIN admins a ON c.admin_id = a.id WHERE c.report_id = ? ORDER BY c.created_at ASC', [req.params.id]);
    res.json(comments);
  } catch (err) { next(err); }
});

// Location
app.get('/api/locations/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM locations WHERE location_id = ?', [req.params.id]);
    if (rows.length > 0) return res.json(rows[0]);
    res.status(404).json({ message: 'Location not found' });
  } catch (err) { next(err); }
});

// Buildings Health
app.get('/api/buildings/health', async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT location_id, COUNT(*) as total,
        SUM(CASE WHEN status != 'Resolved' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN sla_breached = 1 THEN 1 ELSE 0 END) as breached_count
      FROM reports GROUP BY location_id
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// Recent Reports for Location
app.get('/api/reports/location/:locationId', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT issue, status FROM reports WHERE location_id = ? ORDER BY created_at DESC LIMIT 3', [req.params.locationId]);
    res.json(rows);
  } catch (err) { next(err); }
});

// Update Report (Admin/Technician)
app.patch('/api/reports/:id', authenticateToken, requireRole('Admin', 'Technician'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, timeSpentMinutes } = updateReportSchema.parse(req.body);

    // Technicians can only update their assigned reports
    if (req.user.role === 'Technician') {
      const [existing] = await db.query('SELECT assigned_to FROM reports WHERE id = ?', [id]);
      if (existing.length === 0) return res.status(404).json({ error: 'Report not found.' });
      if (existing[0].assigned_to && existing[0].assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'You can only update your assigned reports.' });
      }
    }

    let query = 'UPDATE reports SET ';
    const params = [];
    const updates = [];

    if (status) { 
      updates.push('status = ?'); 
      params.push(status); 
      if (status === 'Resolved') {
        updates.push('resolved_at = NOW()');
        updates.push('work_completed_at = NOW()');
      } else {
        updates.push('resolved_at = NULL');
        updates.push('work_completed_at = NULL');
      }
      if (status === 'In Progress') {
        updates.push('work_started_at = COALESCE(work_started_at, NOW())');
      }
    }
    if (adminNotes !== undefined) { updates.push('admin_notes = ?'); params.push(adminNotes); }
    if (timeSpentMinutes !== undefined) { updates.push('time_spent_minutes = ?'); params.push(timeSpentMinutes); }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
    const [updated] = await db.query('SELECT * FROM reports WHERE id = ?', [id]);
    io.emit('reportUpdated', updated[0]);
    res.json({ message: 'Report updated successfully!' });
  } catch (err) { next(err); }
});

// Upload After-Fix Photo (Technician/Admin)
app.post('/api/reports/:id/after-fix', authenticateToken, requireRole('Admin', 'Technician'), upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });
    const imageUrl = `/uploads/${req.file.filename}`;
    await db.query('UPDATE reports SET after_fix_image_url = ? WHERE id = ?', [imageUrl, id]);
    const [updated] = await db.query('SELECT * FROM reports WHERE id = ?', [id]);
    io.emit('reportUpdated', updated[0]);
    res.json({ message: 'After-fix photo uploaded!', imageUrl });
  } catch (err) { next(err); }
});

// Assign Report to Technician (Admin Only)
app.post('/api/reports/:id/assign', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const { technicianId } = assignSchema.parse(req.body);
    const [tech] = await db.query('SELECT id FROM admins WHERE id = ? AND role IN ("Technician", "Admin")', [technicianId]);
    if (tech.length === 0) return res.status(404).json({ error: 'Technician/Admin not found.' });
    await db.query('UPDATE reports SET assigned_to = ? WHERE id = ?', [technicianId, req.params.id]);
    const [updated] = await db.query('SELECT r.*, a.full_name as assigned_name FROM reports r LEFT JOIN admins a ON r.assigned_to = a.id WHERE r.id = ?', [req.params.id]);
    io.emit('reportAssigned', { reportId: req.params.id, technicianId, report: updated[0] });
    res.json({ message: 'Report assigned successfully!' });
  } catch (err) { next(err); }
});

// Unassign Report (Admin Only)
app.delete('/api/reports/:id/assign', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    await db.query('UPDATE reports SET assigned_to = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: 'Report unassigned.' });
  } catch (err) { next(err); }
});

// Override SLA Deadline (Admin Only)
app.patch('/api/reports/:id/sla', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const { slaDeadline } = slaOverrideSchema.parse(req.body);
    await db.query('UPDATE reports SET sla_deadline = ?, sla_breached = 0 WHERE id = ?', [slaDeadline, req.params.id]);
    res.json({ message: 'SLA deadline overridden.' });
  } catch (err) { next(err); }
});

// Get Technicians List (Admin Only)
app.get('/api/technicians', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, username, full_name, role FROM admins WHERE role IN ("Technician", "Admin") ORDER BY full_name');
    res.json(rows);
  } catch (err) { next(err); }
});

// Get Technician Stats (Admin Only)
app.get('/api/technicians/stats', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT a.id, a.full_name, a.username,
        COUNT(r.id) as total_assigned,
        SUM(CASE WHEN r.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN r.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN r.status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(r.time_spent_minutes) as total_time_minutes,
        SUM(CASE WHEN r.sla_breached = 1 THEN 1 ELSE 0 END) as sla_breached
      FROM admins a
      LEFT JOIN reports r ON a.id = r.assigned_to
      WHERE a.role IN ('Technician', 'Admin')
      GROUP BY a.id, a.full_name, a.username
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// ─── Admin Management Endpoints ────────────────────────────────────────

// Create Admin User (Admin Only)
app.post('/api/admins', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const { username, password, fullName, role } = adminUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.query('INSERT INTO admins (username, password, full_name, role) VALUES (?, ?, ?, ?)', [username, hashedPassword, fullName, role]);
    res.status(201).json({ message: 'User created successfully!' });
  } catch (err) { next(err); }
});

// Update Admin User (Admin Only)
app.patch('/api/admins/:id', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const { fullName, role, password } = req.body;
    let query = 'UPDATE admins SET ';
    const params = [];
    const updates = [];
    if (fullName) { updates.push('full_name = ?'); params.push(fullName); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (password) { updates.push('password = ?'); params.push(await bcrypt.hash(password, BCRYPT_ROUNDS)); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    query += updates.join(', ') + ' WHERE id = ?';
    params.push(req.params.id);
    await db.query(query, params);
    res.json({ message: 'User updated successfully!' });
  } catch (err) { next(err); }
});

// Delete Admin User (Admin Only)
app.delete('/api/admins/:id', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself.' });
    await db.query('DELETE FROM admins WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully!' });
  } catch (err) { next(err); }
});

// List All Admins (Admin Only)
app.get('/api/admins', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, username, full_name, role FROM admins ORDER BY id');
    res.json(rows);
  } catch (err) { next(err); }
});

// ─── Location Management Endpoints ────────────────────────────────────────

// Create Location (Admin Only)
app.post('/api/locations', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const { locationId, name } = locationSchema.parse(req.body);
    await db.query('INSERT INTO locations (location_id, name) VALUES (?, ?)', [locationId, name]);
    res.status(201).json({ message: 'Location created successfully!' });
  } catch (err) { next(err); }
});

// Update Location (Admin Only)
app.patch('/api/locations/:id', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    await db.query('UPDATE locations SET name = ? WHERE location_id = ?', [name, req.params.id]);
    res.json({ message: 'Location updated successfully!' });
  } catch (err) { next(err); }
});

// Delete Location (Admin Only)
app.delete('/api/locations/:id', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    await db.query('DELETE FROM locations WHERE location_id = ?', [req.params.id]);
    res.json({ message: 'Location deleted successfully!' });
  } catch (err) { next(err); }
});

// List All Locations (Admin Only)
app.get('/api/locations', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM locations ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

// Recurring Issues Detection (Admin Only)
app.get('/api/analytics/recurring', authenticateToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT location_id, issue, COUNT(*) as occurrence_count
      FROM reports
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY location_id, issue
      HAVING occurrence_count >= 2
      ORDER BY occurrence_count DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// Public Status Page Data
app.get('/api/public/status', async (req, res, next) => {
  try {
    const [summary] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN sla_breached = 1 THEN 1 ELSE 0 END) as breached
      FROM reports
    `);
    const [locations] = await db.query(`
      SELECT l.location_id, l.name,
        COUNT(r.id) as total_reports,
        SUM(CASE WHEN r.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_reports
      FROM locations l LEFT JOIN reports r ON l.location_id = r.location_id
      GROUP BY l.location_id, l.name
    `);
    res.json({ summary: summary[0], locations });
  } catch (err) { next(err); }
});

// Error handling middleware (must be last)
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Real-time API running at http://localhost:${PORT}`);
});
