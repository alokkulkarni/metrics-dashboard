import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SprintAttributes {
  id: number;
  jiraId: string;
  boardId: number;
  name: string;
  state: 'future' | 'active' | 'closed';
  startDate?: Date;
  endDate?: Date;
  completeDate?: Date;
  goal?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastSyncAt?: Date;
}

export interface SprintCreationAttributes extends Omit<SprintAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Sprint extends Model<SprintAttributes, SprintCreationAttributes> implements SprintAttributes {
  public id!: number;
  public jiraId!: string;
  public boardId!: number;
  public name!: string;
  public state!: 'future' | 'active' | 'closed';
  public startDate?: Date;
  public endDate?: Date;
  public completeDate?: Date;
  public goal?: string;
  public isActive!: boolean;
  public createdAt?: Date;
  public updatedAt?: Date;
  public lastSyncAt?: Date;

  // Associations
  public board?: any;
  public issues?: any[];
  public metrics?: any;

  static initialize(sequelize: Sequelize): void {
    Sprint.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        jiraId: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          field: 'jira_id',
        },
        boardId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'board_id',
          references: {
            model: 'boards',
            key: 'id',
          },
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        state: {
          type: DataTypes.ENUM('future', 'active', 'closed'),
          allowNull: false,
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'start_date',
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'end_date',
        },
        completeDate: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'complete_date',
        },
        goal: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
        },
        lastSyncAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'last_sync_at',
        },
      },
      {
        sequelize,
        modelName: 'Sprint',
        tableName: 'sprints',
        indexes: [
          {
            fields: ['jira_id'],
            unique: true,
          },
          {
            fields: ['board_id'],
          },
          {
            fields: ['state'],
          },
          {
            fields: ['is_active'],
          },
        ],
      }
    );
  }
}

export default Sprint;
