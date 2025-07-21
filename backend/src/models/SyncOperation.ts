import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { getSequelizeInstance } from '../database/connection';

interface SyncOperationAttributes {
  id: number;
  syncType: 'full' | 'project' | 'board' | 'sprint' | 'issue';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  projectKeys?: string[];
  boardIds?: number[];
  sprintIds?: number[];
  results?: {
    projects?: number;
    boards?: number;
    sprints?: number;
    issues?: number;
    metrics?: number;
    errors?: string[];
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncOperationCreationAttributes extends Optional<SyncOperationAttributes, 'id' | 'endTime' | 'results' | 'error' | 'createdAt' | 'updatedAt'> {}

class SyncOperation extends Model<SyncOperationAttributes, SyncOperationCreationAttributes> implements SyncOperationAttributes {
  public id!: number;
  public syncType!: 'full' | 'project' | 'board' | 'sprint' | 'issue';
  public startTime!: Date;
  public endTime?: Date;
  public status!: 'running' | 'completed' | 'failed';
  public projectKeys?: string[];
  public boardIds?: number[];
  public sprintIds?: number[];
  public results?: {
    projects?: number;
    boards?: number;
    sprints?: number;
    issues?: number;
    metrics?: number;
    errors?: string[];
  };
  public error?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Static method to check if enough time has passed since last sync
  public static async canPerformSync(syncType: string = 'full', minimumIntervalMinutes: number = 30): Promise<{ canSync: boolean; lastSync?: SyncOperation; timeRemaining?: number }> {
    const lastSync = await SyncOperation.findOne({
      where: {
        syncType,
        status: 'completed'
      },
      order: [['endTime', 'DESC']]
    });

    if (!lastSync || !lastSync.endTime) {
      return { canSync: true };
    }

    const timeSinceLastSync = Date.now() - lastSync.endTime.getTime();
    const minimumInterval = minimumIntervalMinutes * 60 * 1000; // Convert to milliseconds

    if (timeSinceLastSync >= minimumInterval) {
      return { canSync: true, lastSync };
    }

    const timeRemaining = Math.ceil((minimumInterval - timeSinceLastSync) / (60 * 1000)); // Convert to minutes
    return { canSync: false, lastSync, timeRemaining };
  }

  // Static method to get the last successful sync
  public static async getLastSuccessfulSync(syncType: string = 'full'): Promise<SyncOperation | null> {
    return await SyncOperation.findOne({
      where: {
        syncType,
        status: 'completed'
      },
      order: [['endTime', 'DESC']]
    });
  }

  // Static method to get sync history
  public static async getHistory(syncType?: string, limit: number = 10): Promise<SyncOperation[]> {
    const whereClause: any = {};
    if (syncType) {
      whereClause.syncType = syncType;
    }

    return await SyncOperation.findAll({
      where: whereClause,
      order: [['startTime', 'DESC']],
      limit,
    });
  }

  // Static method to create a new sync operation
  public static async startSync(syncType: 'full' | 'project' | 'board' | 'sprint' | 'issue', options: {
    projectKeys?: string[];
    boardIds?: number[];
    sprintIds?: number[];
  } = {}): Promise<SyncOperation> {
    return await SyncOperation.create({
      syncType,
      startTime: new Date(),
      status: 'running',
      projectKeys: options.projectKeys,
      boardIds: options.boardIds,
      sprintIds: options.sprintIds
    });
  }

  // Instance method to complete the sync
  public async completeSync(results: {
    projects?: number;
    boards?: number;
    sprints?: number;
    issues?: number;
    metrics?: number;
    errors?: string[];
  }): Promise<void> {
    this.endTime = new Date();
    this.status = 'completed';
    this.results = results;
    await this.save();
  }

  // Instance method to fail the sync
  public async failSync(error: string): Promise<void> {
    this.endTime = new Date();
    this.status = 'failed';
    this.error = error;
    await this.save();
  }

  static initialize(sequelize: Sequelize): void {
    SyncOperation.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        syncType: {
          type: DataTypes.ENUM('full', 'project', 'board', 'sprint', 'issue'),
          allowNull: false,
          field: 'sync_type', // Map camelCase to snake_case
        },
        startTime: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'start_time', // Map camelCase to snake_case
        },
        endTime: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'end_time', // Map camelCase to snake_case
        },
        status: {
          type: DataTypes.ENUM('running', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'running',
        },
        projectKeys: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'project_keys', // Map camelCase to snake_case
        },
        boardIds: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'board_ids', // Map camelCase to snake_case
        },
        sprintIds: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'sprint_ids', // Map camelCase to snake_case
        },
        results: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        error: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at', // Map camelCase to snake_case
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'updated_at', // Map camelCase to snake_case
        },
      },
      {
        sequelize,
        modelName: 'SyncOperation',
        tableName: 'sync_operations',
        timestamps: true,
        underscored: true, // Automatically convert camelCase to snake_case for all fields
        indexes: [
          {
            fields: ['sync_type', 'status', 'end_time'], // Use actual column names
          },
          {
            fields: ['start_time'], // Use actual column name
          },
          {
            fields: ['end_time'], // Use actual column name
          },
        ],
      }
    );
  }
}

export { SyncOperation };
