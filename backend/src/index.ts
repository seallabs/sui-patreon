// Backend API entry point
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from './lib/prisma';

// Import routers
import creatorsRouter from './routes/creators';
import tiersRouter from './routes/tiers';
import subscriptionsRouter from './routes/subscriptions';
import contentRouter from './routes/content';
import uploadRouter from './routes/upload';
import libraryRouter from './routes/library';
import homeRouter from './routes/home';
import visitsRouter from './routes/visits';
import exploreRouter from './routes/explore';
import dashboardRouter from './routes/dashboard';
import notificationsRouter from './routes/notifications';
import avatarRouter from './routes/avatar';
import faucetRouter from './routes/faucet';
import messagingRouter from './routes/messaging';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - Allow all origins
app.use(cors({
  origin: '*', // Allow all origins
  credentials: false, // Set to false when origin is '*'
}));

// Body parsing middleware with 50MB limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      runtime: 'bun',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      runtime: 'bun',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Mount API routes
app.use('/api/creators', creatorsRouter);
app.use('/api/tiers', tiersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/content', contentRouter);
app.use('/api/library', libraryRouter);
app.use('/api/home', homeRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/avatar', avatarRouter); // Avatar upload/download routes
app.use('/api/faucet', faucetRouter); // Faucet token distribution
app.use('/api/messaging', messagingRouter); // Messaging channel mappings
app.use('/api', uploadRouter); // Upload/download routes

// Global error handler middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

/**
 * Run Prisma migrations automatically on startup
 * In production, uses `prisma migrate deploy`
 * In development, uses `prisma migrate dev`
 */
async function runMigrations(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const command = isProduction
    ? 'bunx prisma migrate deploy'
    : 'bunx prisma migrate dev --skip-generate';

  console.log('🔄 Running database migrations...');

  try {
    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
      console.log(stdout);
    }

    if (stderr && !stderr.includes('migrations')) {
      console.warn('Migration warnings:', stderr);
    }

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Initialize application
 * 1. Run migrations
 * 2. Test database connection
 * 3. Start server
 */
async function startServer(): Promise<void> {
  try {
    // Run migrations
    await runMigrations();

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Backend API running on port ${PORT}`);
      console.log(`📡 Runtime: Bun`);
      console.log(`🌐 CORS enabled for: * (all origins)`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log(`🗄️  Database: PostgreSQL (Prisma ORM)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server only if not imported as module (e.g., not during testing)
if (import.meta.main) {
  startServer();
}

export default app;
