import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface KanbanIssueAttributes {
  id: number;
  jiraId: string;
  key: string;
  kanbanBoardId: number;
  summary: string;
  description?: string;
  issueType: string;
  status: string;
  statusCategory: string; // To track the status category (To Do, In Progress, Done)
  priority: string;
  assigneeId?: string;
  assigneeName?: string;
  reporterId?: string;
  reporterName?: string;
  storyPoints?: number;
  created: Date;
  updated: Date;
  resolved?: Date;
  parentId?: string;
  parentKey?: string;
  labels: string[];
  components: string[];
  fixVersions: string[];
  columnId?: string; // Kanban column ID
  columnName?: string; // Kanban column name
  swimlaneId?: string; // Swimlane ID if applicable
  swimlaneName?: string; // Swimlane name if applicable
  rank?: string; // Issue rank/order within the column
  flagged?: boolean; // If the issue is flagged in Kanban
  blockedReason?: string; // Reason if the issue is blocked
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
}

interface KanbanIssueCreationAttributes extends Optional<KanbanIssueAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt'> {}

export class KanbanIssue extends Model<KanbanIssueAttributes, KanbanIssueCreationAttributes> implements KanbanIssueAttributes {
  public id!: number;
  public jiraId!: string;
  public key!: string;
  public kanbanBoardId!: number;
  public summary!: string;
  public description?: string;
  public issueType!: string;
  public status!: string;
  public statusCategory!: string;
  public priority!: string;
  public assigneeId?: string;
  public assigneeName?: string;
  public reporterId?: string;
  public reporterName?: string;
  public storyPoints?: number;
  public created!: Date;
  public updated!: Date;
  public resolved?: Date;
  public parentId?: string;
  public parentKey?: string;
  public labels!: string[];
  public components!: string[];
  public fixVersions!: string[];
  public columnId?: string;
  public columnName?: string;
  public swimlaneId?: string;
  public swimlaneName?: string;
  public rank?: string;
  public flagged?: boolean;
  public blockedReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public lastSyncAt?: Date;

  static initialize(sequelize: Sequelize): void {
    KanbanIssue.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        jiraId: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        key: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        kanbanBoardId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'kanban_boards',
            key: 'id',
          },
        },
        summary: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        issueType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        statusCategory: {
          type: DataTypes.STRING,
          allowNull: false,
          comment: 'Status category: To Do, In Progress, Done',
        },
        priority: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        assigneeId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        assigneeName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        reporterId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        reporterName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        storyPoints: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        created: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        resolved: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        parentId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        parentKey: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        labels: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
        components: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
        fixVersions: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
        columnId: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Kanban column ID where the issue is placed',
        },
        columnName: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Kanban column name where the issue is placed',
        },
        swimlaneId: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Swimlane ID if applicable',
        },
        swimlaneName: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Swimlane name if applicable',
        },
        rank: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Issue rank/order within the kanban column',
        },
        flagged: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Whether the issue is flagged in Kanban',
        },
        blockedReason: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Reason if the issue is blocked',
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
          comment: 'Timestamp of the last successful sync for this issue',
        },
      },
      {
        sequelize,
        tableName: 'kanban_issues',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['jira_id'],
          },
          {
            fields: ['key'],
          },
          {
            fields: ['kanban_board_id'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['status_category'],
          },
          {
            fields: ['assignee_id'],
          },
          {
            fields: ['issue_type'],
          },
          {
            fields: ['priority'],
          },
          {
            fields: ['column_id'],
          },
          {
            fields: ['swimlane_id'],
          },
          {
            fields: ['created'],
          },
          {
            fields: ['updated'],
          },
          {
            fields: ['last_sync_at'],
          },
        ],
      }
    );
  }

  static associate(): void {
    // Define associations if needed
    // KanbanIssue.belongsTo(KanbanBoard, { foreignKey: 'kanbanBoardId' });
  }
}
