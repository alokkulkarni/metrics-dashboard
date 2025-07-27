import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface KanbanBoardAttributes {
  id: number;
  jiraBoardId: number;
  name: string;
  type: string;
  projectId: number;
  location: string | null;
  canEdit: boolean;
  columnConfig: any; // Store kanban column configuration
  swimlaneConfig: any; // Store swimlane configuration
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;
}

interface KanbanBoardCreationAttributes extends Optional<KanbanBoardAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt'> {}

export class KanbanBoard extends Model<KanbanBoardAttributes, KanbanBoardCreationAttributes> implements KanbanBoardAttributes {
  public id!: number;
  public jiraBoardId!: number;
  public name!: string;
  public type!: string;
  public projectId!: number;
  public location!: string | null;
  public canEdit!: boolean;
  public columnConfig!: any;
  public swimlaneConfig!: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public lastSyncAt!: Date | null;

  static initialize(sequelize: Sequelize): void {
    KanbanBoard.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        jiraBoardId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'kanban',
        },
        projectId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        location: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        canEdit: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        columnConfig: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Kanban board column configuration including column names, WIP limits, etc.',
        },
        swimlaneConfig: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Kanban board swimlane configuration',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        lastSyncAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp of the last successful sync for this kanban board',
        },
      },
      {
        sequelize,
        tableName: 'kanban_boards',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['jira_board_id'],
          },
          {
            fields: ['project_id'],
          },
          {
            fields: ['type'],
          },
          {
            fields: ['last_sync_at'],
          },
        ],
      }
    );
  }

  static associate(): void {
    // Define associations
    const { Project } = require('./Project');
    const { KanbanMetrics } = require('./KanbanMetrics');
    KanbanBoard.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
    KanbanBoard.hasMany(KanbanMetrics, { foreignKey: 'kanbanBoardId', as: 'metrics' });
    // KanbanBoard.hasMany(KanbanIssue, { foreignKey: 'kanbanBoardId' });
  }
}
