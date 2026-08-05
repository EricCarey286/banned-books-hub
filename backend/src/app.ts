import 'dotenv/config';
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import compression from "compression";
const app = express();
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import booksRouter from "./routes/bookRouter";
import suggestedbookRouter from "./routes/suggestedBookRouter";
import contactFormRouter from "./routes/contactFormRouter";
import bookImageRouter from "./routes/imageRouter";
import { initializeCache, closeCache } from './cache';
import healthRouter from './routes/health';
import { createMigrationsTable, getMigrationsTableStatus } from './utils/create-migrations-table';
import { discoverMigrations } from './services/migration-discovery';
import { validateAllMigrations, hasValidationErrors } from './services/migration-validator';
import { executeMigrations, getSummary } from './services/migration-executor';
import { getConnection } from './services/db';

import { PORT } from './utils/config';
import { AppError } from "./utils/helper";
import { authenticate, AuthRequest } from './middleware/auth';

import { Request, Response, NextFunction } from 'express';

const FRONTEND_URL = `${process.env.URL_PREFIX}://${process.env.FRONTEND_URL}`;
const JWT_SECRET = process.env.JWT_SECRET || 'missing-key';
const JWT_EXPIRES_IN = '24h';

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(compression());

app.use(express.static('dist', {
  maxAge: '1y',
  immutable: true
}));


//express-rate-limit for overload prevention
app.set('trust proxy', 1); // or true
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

const allowedOrigins = [FRONTEND_URL].filter((origin): origin is string => Boolean(origin));

const corsOptions = {
  origin: allowedOrigins, 
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
};

app.use(limiter);
app.use(helmet()); //helmet for security middleware
app.use(cors(corsOptions));

app.post("/api/admin/login", (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Generate JWT token
    const token = jwt.sign(
      { username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ 
      success: true, 
      message: "Logged in successfully",
      token
    });
    return;
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// Protected Admin Route
app.get("/api/admin", authenticate, (req: AuthRequest, res: Response) => {
  res.json({ 
    message: "Welcome to the admin panel", 
    user: req.user 
  });
});

// Token validation endpoint
app.get("/api/admin/validate", authenticate, (req: AuthRequest, res: Response) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

app.get("/", (req: Request, res: Response) => {
  res.json({ 
    message: 'Banned Books Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      cacheHealth: '/health/cache',
      cacheStats: '/health/cache/stats',
    }
   });
});

//Route to each table
app.use("/books", booksRouter);
app.use("/suggested_books", suggestedbookRouter);
app.use("/contact_form", contactFormRouter);
app.use("/book-image", bookImageRouter);
app.use('/health', healthRouter);

//Error handler middleware
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  const errorResponse = {
    message: err.message,
    details: err.details || null,
  };

  console.error("Error details: ", errorResponse);
  res.status(statusCode).json(errorResponse);
  return;
});

// Initialize database migrations system
async function initializeMigrations() {
  if (process.env.SKIP_MIGRATIONS === 'true') {
    console.log('⏭️  Migrations disabled (SKIP_MIGRATIONS=true)');
    return;
  }

  let connection;
  try {
    console.log('🔄 Initializing migrations system...');

    // Get database connection from pool with timeout
    const connectionPromise = getConnection();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout (10s) - skipping migrations')), 10000)
    );
    connection = await Promise.race([connectionPromise, timeoutPromise]) as any;

    // Create migrations table if needed
    await createMigrationsTable(connection);

    // Check status
    const status = await getMigrationsTableStatus(connection);
    console.log(`📊 Migrations table: ${status.rowCount} migrations applied`);
    if (status.lastMigration) {
      console.log(
        `   Last: ${status.lastMigration.version} at ${status.lastMigration.executedAt}`
      );
    }

    // Discover pending migrations
    const migrations = await discoverMigrations();

    if (migrations.length === 0) {
      console.log('✓ No pending migrations found');
      return;
    }

    console.log(`🔍 Found ${migrations.length} total migrations:`);
    migrations.forEach((m) => {
      console.log(`   - ${m.version}: ${m.description} (${m.type})`);
    });

    // Validate all migrations
    console.log('✓ Validating migrations...');
    const validationResults = await validateAllMigrations(
      migrations,
      connection,
      process.env.NODE_ENV === 'production' ? 'production' : 'development'
    );

    if (hasValidationErrors(validationResults)) {
      console.warn('⚠️  Validation errors found - migrations will not be executed');
      validationResults
        .filter((r) => !r.valid)
        .forEach((r) => {
          console.warn(`   ERROR in ${r.migration.version}: ${r.errors.join('; ')}`);
        });
      return;
    }

    // Execute migrations
    console.log('▶️  Executing migrations...');
    const executionResults = await executeMigrations(
      migrations,
      connection,
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
      'app-startup',
      parseInt(process.env.MIGRATION_TIMEOUT || '300000')
    );

    const summary = getSummary(executionResults);
    console.log(`✅ Migrations complete: ${summary.successful}/${summary.total} successful`);
    if (summary.failed > 0) {
      console.warn(`   ⚠️  ${summary.failed} migration(s) failed`);
    }
    if (summary.rolledBack > 0) {
      console.warn(`   🔄 ${summary.rolledBack} migration(s) rolled back`);
    }
  } catch (err) {
    console.error('❌ Migrations initialization error:', (err as Error).message);
    // Don't fail startup - log the error but continue
    // This allows the app to start even if migrations fail
    // (e.g., in development with no database access)
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
}

// Start HTTPS server
// http.createServer(app).listen(PORT, '0.0.0.0', () => {
//   console.log(`Secure server is running at ${BACKEND_URL}:${PORT}`);
// });
async function startServer() {
  try {
    console.log('🚀 Starting server...');

    // Initialize Redis cache
    await initializeCache();

    // Initialize migrations system
    await initializeMigrations();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 Cache health: http://localhost:${PORT}/health/cache`);
      console.log(`📍 Cache stats: http://localhost:${PORT}/health/cache/stats`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  await closeCache();
  process.exit(0);
});

// Start the server
startServer();