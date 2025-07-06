import express from 'express';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// ✅ SIGNUP
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, hash]
    );
    res.status(200).send('Signup successful');
  } catch (err) {
    console.error('Signup error:', err);
    res.status(400).send('Username already exists or DB error');
  }
});

// ✅ LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).send('Invalid credentials');
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (valid) {
      res.status(200).send('Login successful');
    } else {
      res.status(400).send('Invalid credentials');
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error during login');
  }
});

// ✅ GET TASKS (fixed)
app.get('/tasks', async (req, res) => {
  const { username } = req.query;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    if (userResult.rows.length === 0) return res.status(400).send('User not found');

    const userId = userResult.rows[0].id;

    const tasks = await pool.query(
      'SELECT id, text, status FROM tasks WHERE user_id = $1',
      [userId]
    );

    res.json(tasks.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).send('Server error while fetching tasks');
  }
});

// ✅ ADD TASK (fixed)
app.post('/tasks', async (req, res) => {
  const { username, text } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    if (userResult.rows.length === 0) return res.status(400).send('User not found');

    const userId = userResult.rows[0].id;

    const insertResult = await pool.query(
      'INSERT INTO tasks (user_id, text, status) VALUES ($1, $2, $3) RETURNING id',
      [userId, text, 'todo']
    );

    res.send(insertResult.rows[0].id.toString());
  } catch (err) {
    console.error('Error adding task:', err);
    res.status(500).send('Server error while adding task');
  }
});

// ✅ UPDATE TASK
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { text, status } = req.body;

  try {
    await pool.query(
      'UPDATE tasks SET text = $1, status = $2 WHERE id = $3',
      [text, status, id]
    );
    res.send('Task updated');
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).send('Server error while updating task');
  }
});

// ✅ DELETE TASK
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.send('Task deleted');
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).send('Server error while deleting task');
  }
});

// ✅ SHARE TASK (duplicate the task for another user)
app.post('/tasks/:id/share', async (req, res) => {
  const { id } = req.params;
  const { toUsername } = req.body;

  try {
    const taskResult = await pool.query('SELECT text, status FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) return res.status(404).send('Task not found');

    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [toUsername]);
    if (userResult.rows.length === 0) return res.status(400).send('User not found');

    const { text, status } = taskResult.rows[0];
    const toUserId = userResult.rows[0].id;

    // Duplicate task for the other user
    await pool.query(
      'INSERT INTO tasks (user_id, text, status) VALUES ($1, $2, $3)',
      [toUserId, text, status]
    );

    res.send('Task shared');
  } catch (err) {
    console.error('Error sharing task:', err);
    res.status(500).send('Server error while sharing task');
  }
});

// ✅ Start Server
app.listen(3001, () => {
  console.log('✅ Server running on http://localhost:3001');
});
