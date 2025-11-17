import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { initDatabase } from './database/init.js';
import attendanceRoutes from './routes/attendance.js';
import authRoutes from './routes/auth.js';
import crashLogRoutes from './routes/crash-logs.js';
import debugRoutes from './routes/debug-env.js';
import travelRoutes from './routes/travel.js';
import userRoutes from './routes/users.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database on startup
initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Church in Cerritos API Server', status: 'running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/crash-logs', crashLogRoutes);
app.use('/api', debugRoutes); // Temporary debug route

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error(`Please stop the process using port ${PORT} or change the PORT in .env file.`);
    console.error(`\nTo find and kill the process, run:`);
    console.error(`  lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
