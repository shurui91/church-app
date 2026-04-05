import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/init.js';
import attendanceRoutes from './routes/attendance.js';
import authRoutes from './routes/auth.js';
import crashLogRoutes from './routes/crash-logs.js';
import debugRoutes from './routes/debug-env.js';
import travelRoutes from './routes/travel.js';
import userRoutes from './routes/users.js';
import gymRoutes from './routes/gym.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/** Expo Web 静态导出目录（见根目录 package.json 脚本 `export:web:admin`） */
const ADMIN_WEB_DIR = path.join(__dirname, 'public', 'admin');
/** 难猜的管理路径前缀 */
const ADMIN_BASE_PATH = '/admin-xt7f9z';

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

// API root - 避免 "Cannot GET /api/" 或 "Cannot GET /api"
app.get(['/api', '/api/'], (req, res) => {
  res.json({
    message: 'Church in Cerritos API',
    status: 'running',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/attendance',
      '/api/travel',
      '/api/gym',
      '/api/gym/days-with-reservations',
      '/api/crash-logs',
    ],
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/crash-logs', crashLogRoutes);
app.use('/api', debugRoutes); // Temporary debug route
app.use('/api', gymRoutes);

// Admin Web：先尝试静态文件，其余回退到 index.html（Expo Router SPA）
// 构建：在项目根目录运行 `npm run export:web:admin`（输出到 server/public/admin）
app.use(
  ADMIN_BASE_PATH,
  express.static(ADMIN_WEB_DIR, {
    index: false,
    fallthrough: true,
  })
);
app.use(ADMIN_BASE_PATH, (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const indexHtml = path.join(ADMIN_WEB_DIR, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      next();
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Admin Web (after export): http://localhost:${PORT}/admin`);
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
