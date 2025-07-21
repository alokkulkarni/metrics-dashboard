import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, getSequelizeInstance } from './database/connection';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import apiRoutes from './routes/index';
import debugRoutes from './routes/debug';

const app = express();

// Security middleware
app.use(helmet());

// CORS
const getAllowedOrigins = () => {
  const origins = [];
  
  // Add FRONTEND_URL
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Add ALLOWED_ORIGINS (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()));
  }
  
  // Add localhost as fallback for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
  }
  
  return [...new Set(origins)]; // Remove duplicates
};

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, also allow any devtunnels.ms origin
    if (process.env.NODE_ENV === 'development' && origin.includes('devtunnels.ms')) {
      return callback(null, true);
    }
    
    logger.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
    const msg = 'The CORS policy for this site does not allow access from the specified origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
}));

// Compression
app.use(compression() as any);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// API routes
app.use('/api', apiRoutes);

// Debug routes 
app.use('/api/debug', debugRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Comprehensive health status endpoint
app.get('/api/health/status', async (req, res) => {
  try {
    const services = {
      frontend: {
        service: 'frontend',
        status: 'healthy', // Frontend is serving this request
        lastChecked: new Date()
      },
      backend: {
        service: 'backend',
        status: 'healthy', // Backend is handling this request
        lastChecked: new Date()
      },
      database: {
        service: 'database',
        status: 'unknown',
        lastChecked: new Date()
      }
    };

    // Check database connectivity
    try {
      const sequelizeInstance = getSequelizeInstance();
      if (sequelizeInstance) {
        await sequelizeInstance.authenticate();
        services.database.status = 'healthy';
      } else {
        services.database.status = 'unhealthy';
      }
    } catch (error) {
      logger.error('Database health check failed:', error);
      services.database.status = 'unhealthy';
    }

    res.json({ services });
  } catch (error) {
    logger.error('Health status check failed:', error);
    res.status(500).json({
      error: 'Health status check failed',
      services: {
        frontend: { service: 'frontend', status: 'unknown', lastChecked: new Date() },
        backend: { service: 'backend', status: 'unhealthy', lastChecked: new Date() },
        database: { service: 'database', status: 'unknown', lastChecked: new Date() }
      }
    });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

const PORT = config.port;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API endpoints: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
