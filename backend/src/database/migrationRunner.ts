import { Sequelize, QueryInterface, QueryTypes } from 'sequelize';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

interface Migration {
  up: (queryInterface: QueryInterface) => Promise<void>;
  down: (queryInterface: QueryInterface) => Promise<void>;
}

export class MigrationRunner {
  private sequelize: Sequelize;
  private queryInterface: QueryInterface;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.queryInterface = sequelize.getQueryInterface();
  }

  async ensureMigrationTable(): Promise<void> {
    const tableExists = await this.queryInterface.showAllTables().then(tables => 
      tables.includes('migrations')
    );

    if (!tableExists) {
      await this.queryInterface.createTable('migrations', {
        id: {
          type: 'INTEGER',
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: 'VARCHAR(255)',
          allowNull: false,
          unique: true,
        },
        executed_at: {
          type: 'TIMESTAMP',
          allowNull: false,
          defaultValue: 'NOW()',
        },
      });

      logger.info('Created migrations tracking table');
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.sequelize.query(
        'SELECT name FROM migrations ORDER BY executed_at ASC',
        { type: QueryTypes.SELECT }
      ) as { name: string }[];
      
      return result?.map(row => row.name) || [];
    } catch (error) {
      logger.warn('Could not fetch executed migrations, assuming none:', error);
      return [];
    }
  }

  async getPendingMigrations(): Promise<string[]> {
    const migrationsDir = path.join(__dirname, 'migrations');
    const allMigrations = await fs.readdir(migrationsDir);
    const migrationFiles = allMigrations
      .filter(file => file.endsWith('.js'))
      .sort();

    const executedMigrations = await this.getExecutedMigrations();
    
    return migrationFiles.filter(file => {
      const migrationName = path.parse(file).name;
      return !executedMigrations.includes(migrationName);
    });
  }

  async runMigrations(): Promise<void> {
    try {
      await this.ensureMigrationTable();
      
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Running ${pendingMigrations.length} pending migrations`);

      for (const migrationFile of pendingMigrations) {
        const migrationName = path.parse(migrationFile).name;
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        
        logger.info(`Running migration: ${migrationName}`);
        
        try {
          // Clear module cache to ensure fresh import
          delete require.cache[require.resolve(migrationPath)];
          
          // Import the migration module
          const migration = require(migrationPath) as Migration;
          
          // Run the migration
          await migration.up(this.queryInterface);
          
          // Record the migration as executed
          await this.sequelize.query(
            'INSERT INTO migrations (name, executed_at) VALUES ($1, NOW())',
            {
              bind: [migrationName],
              type: QueryTypes.INSERT
            }
          );
          
          logger.info(`Migration completed: ${migrationName}`);
        } catch (error) {
          logger.error(`Migration failed: ${migrationName}`, error);
          throw error;
        }
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration runner failed:', error);
      throw error;
    }
  }

  async rollbackMigration(migrationName?: string): Promise<void> {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const targetMigration = migrationName || executedMigrations[executedMigrations.length - 1];
      
      if (!executedMigrations.includes(targetMigration)) {
        throw new Error(`Migration ${targetMigration} has not been executed`);
      }

      logger.info(`Rolling back migration: ${targetMigration}`);

      const migrationPath = path.join(__dirname, 'migrations', `${targetMigration}.js`);
      const migration = require(migrationPath) as Migration;

      // Run the down migration
      await migration.down(this.queryInterface);

      // Remove from migrations table
      await this.sequelize.query(
        'DELETE FROM migrations WHERE name = $1',
        {
          bind: [targetMigration],
          type: QueryTypes.DELETE
        }
      );

      logger.info(`Migration rolled back: ${targetMigration}`);
    } catch (error) {
      logger.error('Migration rollback failed:', error);
      throw error;
    }
  }

  async getStatus(): Promise<{ executed: string[]; pending: string[] }> {
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();
    
    return {
      executed,
      pending: pending.map(file => path.parse(file).name)
    };
  }
}
