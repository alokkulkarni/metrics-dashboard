import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  env: string;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    url: string;
  };
  jira: {
    baseUrl: string;
    email: string;
    apiToken: string;
  };
  cors: {
    origin: string | string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    file: string;
  };
  sync: {
    intervalHours: number;
    maxConcurrent: number;
    timeoutMs: number;
  };
  // cache: {
  //   ttlSeconds: number;
  //   redisUrl?: string;
  // };
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'jira_metrics',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/jira_metrics'
  },
  
  jira: {
    baseUrl: process.env.JIRA_BASE_URL || '',
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || ''
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },
  
  sync: {
    intervalHours: parseInt(process.env.SYNC_INTERVAL_HOURS || '24', 10),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SYNC || '5', 10),
    timeoutMs: parseInt(process.env.SYNC_TIMEOUT_MS || '300000', 10)
  }
  
  // cache: {
  //   ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10),
  //   redisUrl: process.env.REDIS_URL
  // }
};

// Validate required configuration
const requiredFields = [
  'jira.baseUrl',
  'jira.email',
  'jira.apiToken'
];

for (const field of requiredFields) {
  const value = field.split('.').reduce((obj, key) => obj?.[key], config as any);
  if (!value) {
    throw new Error(`Missing required configuration: ${field}`);
  }
}
