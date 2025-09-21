import express from 'express';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const app = express();

// ✅ Use strict CORS so only your frontend can call backend
app.use(cors({
  origin: ["https://warm-salamander-24e7ab.netlify.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// 🔹 Helper function: wrap async routes
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ✅ SIGNUP
app.post('/signup', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, hash]
    );
    res.status(200).json({ message: 'Signup successful' });
  } catch (err) {
    console.error('❌ Signup error:', err);
    if (err.code === '23505') {  // unique_violation in Postgres
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Database error during signup' });
    }
  }
}));

// ✅ LOGIN
app.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  console.log(`🔑 Login attempt for user: ${username}`);

  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (valid) {
    res.status(200).json({ message: 'Login successful' });
  } else {
    res.status(400).json({ error: 'Invalid username or password' });
  }
}));

// ✅ GET TASKS
app.get('/tasks', asyncHandler(async (req, res) => {
  const { username } = req.query;
  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

  if (userResult.rows.length === 0) return res.status(400).json({ error: 'User not found' });

  const userId = userResult.rows[0].id;
  const tasks = await pool.query(
    'SELECT id, text, status FROM tasks WHERE user_id = $1',
    [userId]
  );

  res.json(tasks.rows);
}));

// ✅ ADD TASK
app.post('/tasks', asyncHandler(async (req, res) => {
  const { username, text } = req.body;
  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

  if (userResult.rows.length === 0) return res.status(400).json({ error: 'User not found' });

  const userId = userResult.rows[0].id;
  const insertResult = await pool.query(
    'INSERT INTO tasks (user_id, text, status) VALUES ($1, $2, $3) RETURNING id',
    [userId, text, 'todo']
  );

  res.json({ id: insertResult.rows[0].id });
}));

// ✅ UPDATE TASK
app.put('/tasks/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text, status } = req.body;

  await pool.query(
    'UPDATE tasks SET text = $1, status = $2 WHERE id = $3',
    [text, status, id]
  );
  res.json({ message: 'Task updated' });
}));

// ✅ DELETE TASK
app.delete('/tasks/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.json({ message: 'Task deleted' });
}));

// ✅ SHARE TASK
app.post('/tasks/:id/share', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { toUsername } = req.body;

  const taskResult = await pool.query('SELECT text, status FROM tasks WHERE id = $1', [id]);
  if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [toUsername]);
  if (userResult.rows.length === 0) return res.status(400).json({ error: 'User not found' });

  const { text, status } = taskResult.rows[0];
  const toUserId = userResult.rows[0].id;

  await pool.query(
    'INSERT INTO tasks (user_id, text, status) VALUES ($1, $2, $3)',
    [toUserId, text, status]
  );

  res.json({ message: 'Task shared' });
}));

// 🔹 Centralized error handler (last middleware)
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start Server
app.listen(3001, () => {
  console.log('✅ Server running on http://localhost:3001');
});
