import { connectDatabase } from './database/connection';
import { logger } from './utils/logger';

async function setupDatabase() {
  try {
    logger.info('Setting up database...');
    
    // Connect to database and initialize models
    await connectDatabase();
    logger.info('Database connection established successfully');
    
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
