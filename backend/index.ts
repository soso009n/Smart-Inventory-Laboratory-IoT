/**
 * Main Server File - Express API
 * Smart Inventory Laboratory IoT System
 * Computer Engineering - Tugas Akhir
 */
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import loanRoutes from './routes/loanRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import database configuration
import { testConnection, closePool } from './config/db';

dotenv.config();

// Import routes (akan dibuat nanti)
// import inventoryRoutes from './routes/inventory.routes';
// import loanRoutes from './routes/loan.routes';
// import userRoutes from './routes/user.routes';
// import authRoutes from './routes/auth.routes';

// Inisialisasi Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;

// ========== MIDDLEWARE SETUP ==========

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// ========== ROUTES ==========

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is running smoothly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Smart Inventory Laboratory IoT - API Server',
    version: '1.0.0',
    description: 'Backend API untuk Sistem Manajemen Inventaris Laboratorium',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      inventory: '/api/inventory',
      loans: '/api/loans',
      users: '/api/users',
      trash: '/api/trash'
    }
  });
});

// Register routes (uncomment setelah routes dibuat)
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/users', userRoutes);

// 404 handler - route tidak ditemukan
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
interface CustomError extends Error {
  status?: number;
}

app.use((err: CustomError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Server Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== SERVER STARTUP ==========

/**
 * Start server dengan database connection check
 */
const startServer = async (): Promise<void> => {
  try {
    console.log('\n🚀 Starting Smart Inventory Lab API Server...\n');

    // Test database connection
    console.log('🔍 Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('\n⚠️  Server started but DATABASE CONNECTION FAILED!');
      console.error('⚠️  Please check your PostgreSQL server and .env configuration\n');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log(`✨ Server is running on port ${PORT}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(60) + '\n');

      if (dbConnected) {
        console.log('✅ All systems operational!\n');
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('\n❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

  try {
    await closePool();
    console.log('✅ Server closed gracefully');
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Error during shutdown:', err.message);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export default app;
