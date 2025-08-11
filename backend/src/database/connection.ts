import { Sequelize } from 'sequelize';
import { config } from '../config';
import { logger } from '../utils/logger';

// Import models
import { Project } from '../models/Project';
import { Board } from '../models/Board';
import { Sprint } from '../models/Sprint';
import { Issue } from '../models/Issue';
import { IssueChangelog } from '../models/IssueChangelog';
import { SprintMetrics } from '../models/SprintMetrics';
import { BoardMetrics } from '../models/BoardMetrics';
import { SyncOperation } from '../models/SyncOperation';
import { DistributedLock } from '../models/DistributedLock';
import { KanbanBoard } from '../models/KanbanBoard';
import { KanbanIssue } from '../models/KanbanIssue';
import { KanbanMetrics } from '../models/KanbanMetrics';
import { MigrationRunner } from './migrationRunner';

export let sequelize: Sequelize;

export async function connectDatabase(): Promise<void> {
  try {
    sequelize = new Sequelize(config.database.url, {
      dialect: 'postgres',
      logging: config.env === 'development' ? (sql) => logger.debug(sql) : false,
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    });

    // Test the connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Initialize models
    await initializeModels();

    // Run database migrations
    const migrationRunner = new MigrationRunner(sequelize);
    await migrationRunner.runMigrations();
    logger.info('Database migrations completed');

    // Create tables if they don't exist (but don't alter existing ones)
    await sequelize.sync({ alter: false });
    logger.info('Database models synchronized');

  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
}

async function initializeModels(): Promise<void> {
  // Initialize all models
  logger.debug('Initializing Project model...');
  Project.initialize(sequelize);
  logger.debug('Initializing Board model...');
  Board.initialize(sequelize);
  logger.debug('Initializing Sprint model...');
  Sprint.initialize(sequelize);
  logger.debug('Initializing Issue model...');
  Issue.initialize(sequelize);
  logger.debug('Initializing IssueChangelog model...');
  IssueChangelog.initialize(sequelize);
  logger.debug('Initializing SprintMetrics model...');
  SprintMetrics.initialize(sequelize);
  logger.debug('Initializing BoardMetrics model...');
  BoardMetrics.initialize(sequelize);
  logger.debug('Initializing SyncOperation model...');
  SyncOperation.initialize(sequelize);
  logger.debug('Initializing DistributedLock model...');
  DistributedLock.initialize(sequelize);
  logger.debug('Initializing KanbanBoard model...');
  KanbanBoard.initialize(sequelize);
  logger.debug('Initializing KanbanIssue model...');
  KanbanIssue.initialize(sequelize);
  logger.debug('Initializing KanbanMetrics model...');
  KanbanMetrics.initialize(sequelize);

  // Define associations
  await defineAssociations();
}

async function defineAssociations(): Promise<void> {
  // Project -> Board (one-to-many)
  Project.hasMany(Board, { foreignKey: 'projectId', as: 'boards' });
  Board.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Board -> Sprint (one-to-many)
  Board.hasMany(Sprint, { foreignKey: 'boardId', as: 'sprints' });
  Sprint.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

  // Sprint -> Issue (one-to-many)
  Sprint.hasMany(Issue, { foreignKey: 'sprintId', as: 'issues' });
  Issue.belongsTo(Sprint, { foreignKey: 'sprintId', as: 'sprint' });

  // Issue -> IssueChangelog (one-to-many)
  Issue.hasMany(IssueChangelog, { foreignKey: 'issueId', as: 'changelogs' });
  IssueChangelog.belongsTo(Issue, { foreignKey: 'issueId', as: 'issue' });

  // Sprint -> IssueChangelog (for from/to sprint references)
  Sprint.hasMany(IssueChangelog, { foreignKey: 'fromSprintId', as: 'fromChangelogs' });
  Sprint.hasMany(IssueChangelog, { foreignKey: 'toSprintId', as: 'toChangelogs' });
  IssueChangelog.belongsTo(Sprint, { foreignKey: 'fromSprintId', as: 'fromSprint' });
  IssueChangelog.belongsTo(Sprint, { foreignKey: 'toSprintId', as: 'toSprint' });

  // Sprint -> SprintMetrics (one-to-one)
  Sprint.hasOne(SprintMetrics, { foreignKey: 'sprintId', as: 'metrics' });
  SprintMetrics.belongsTo(Sprint, { foreignKey: 'sprintId', as: 'sprint' });

  // Board -> BoardMetrics (one-to-one)
  Board.hasOne(BoardMetrics, { foreignKey: 'boardId', as: 'metrics' });
  BoardMetrics.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

  // Kanban associations
  // Project -> KanbanBoard (one-to-many)
  Project.hasMany(KanbanBoard, { foreignKey: 'projectId', as: 'kanbanBoards' });
  KanbanBoard.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // KanbanBoard -> KanbanIssue (one-to-many)
  KanbanBoard.hasMany(KanbanIssue, { foreignKey: 'kanbanBoardId', as: 'issues' });
  KanbanIssue.belongsTo(KanbanBoard, { foreignKey: 'kanbanBoardId', as: 'kanbanBoard' });

  // KanbanBoard -> KanbanMetrics (one-to-one)
  KanbanBoard.hasOne(KanbanMetrics, { foreignKey: 'kanbanBoardId', as: 'metrics' });
  KanbanMetrics.belongsTo(KanbanBoard, { foreignKey: 'kanbanBoardId', as: 'kanbanBoard' });

  // Cleanup expired locks on startup
  logger.info('🧹 Cleaning up expired distributed locks...');
  try {
    const cleanedCount = await DistributedLock.cleanupExpiredLocks();
    logger.info(`✅ Cleaned up ${cleanedCount} expired locks during startup`);
  } catch (error) {
    logger.warn('⚠️ Failed to cleanup expired locks during startup:', error);
  }

  // Set up periodic cleanup of expired locks every 10 minutes
  setInterval(async () => {
    try {
      const cleanedCount = await DistributedLock.cleanupExpiredLocks();
      if (cleanedCount > 0) {
        logger.info(`🧹 Periodic cleanup: cleaned up ${cleanedCount} expired locks`);
      }
    } catch (error) {
      logger.warn('⚠️ Periodic lock cleanup failed:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes
}

export function getSequelizeInstance(): Sequelize | null {
  return sequelize || null;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (sequelize) {
    await sequelize.close();
    logger.info('Database connection closed');
  }
}
