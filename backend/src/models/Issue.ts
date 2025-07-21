import { DataTypes, Model, Sequelize } from 'sequelize';

export interface IssueAttributes {
  id: number;
  jiraId: string;
  key: string;
  sprintId?: number;
  summary: string;
  description?: string;
  issueType: string;
  status: string;
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
  createdAt?: Date;
  updatedAt?: Date;
  lastSyncAt?: Date;
}

export interface IssueCreationAttributes extends Omit<IssueAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Issue extends Model<IssueAttributes, IssueCreationAttributes> implements IssueAttributes {
  public id!: number;
  public jiraId!: string;
  public key!: string;
  public sprintId?: number;
  public summary!: string;
  public description?: string;
  public issueType!: string;
  public status!: string;
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
  public createdAt?: Date;
  public updatedAt?: Date;
  public lastSyncAt?: Date;

  // Associations
  public board?: any;
  public sprint?: any;

  static initialize(sequelize: Sequelize): void {
    Issue.init(
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
        key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'jira_key',
      validate: {
        notEmpty: true,
      },
    },
        sprintId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'sprint_id',
          references: {
            model: 'sprints',
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
          field: 'issue_type',
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        priority: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        assigneeId: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'assignee_id',
        },
        assigneeName: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'assignee_name',
        },
        reporterId: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'reporter_id',
        },
        reporterName: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'reporter_name',
        },
        storyPoints: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          field: 'story_points',
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
          field: 'parent_id',
        },
        parentKey: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'parent_key',
        },
        labels: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        components: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        fixVersions: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
          field: 'fix_versions',
        },
        lastSyncAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'last_sync_at',
        },
      },
      {
        sequelize,
        modelName: 'Issue',
        tableName: 'issues',
        indexes: [
          {
            fields: ['jira_id'],
            unique: true,
          },
          {
            fields: ['jira_key'],
            unique: true,
          },
          {
            fields: ['sprint_id'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['issue_type'],
          },
          {
            fields: ['assignee_id'],
          },
        ],
      }
    );
  }
}

export default Issue;
