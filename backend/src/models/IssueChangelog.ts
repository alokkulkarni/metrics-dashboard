import { DataTypes, Model, Sequelize } from 'sequelize';

export interface IssueChangelogAttributes {
  id: number;
  issueId: number;
  jiraIssueKey: string;
  changeDate: Date;
  field: string;
  fromValue?: string;
  toValue?: string;
  fromSprintId?: number;
  toSprintId?: number;
  changeType: 'sprint_added' | 'sprint_removed' | 'sprint_changed' | 'status_changed' | 'story_points_changed' | 'other';
  author?: string;
  storyPointsChange?: number; // positive for added, negative for removed
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IssueChangelogCreationAttributes extends Omit<IssueChangelogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class IssueChangelog extends Model<IssueChangelogAttributes, IssueChangelogCreationAttributes> implements IssueChangelogAttributes {
  public id!: number;
  public issueId!: number;
  public jiraIssueKey!: string;
  public changeDate!: Date;
  public field!: string;
  public fromValue?: string;
  public toValue?: string;
  public fromSprintId?: number;
  public toSprintId?: number;
  public changeType!: 'sprint_added' | 'sprint_removed' | 'sprint_changed' | 'status_changed' | 'story_points_changed' | 'other';
  public author?: string;
  public storyPointsChange?: number;
  public createdAt?: Date;
  public updatedAt?: Date;

  // Associations
  public issue?: any;
  public fromSprint?: any;
  public toSprint?: any;

  static initialize(sequelize: Sequelize): void {
    IssueChangelog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        issueId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'issue_id',
        },
        jiraIssueKey: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'jira_issue_key',
        },
        changeDate: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'change_date',
        },
        field: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        fromValue: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'from_value',
        },
        toValue: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'to_value',
        },
        fromSprintId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'from_sprint_id',
        },
        toSprintId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'to_sprint_id',
        },
        changeType: {
          type: DataTypes.ENUM('sprint_added', 'sprint_removed', 'sprint_changed', 'status_changed', 'story_points_changed', 'other'),
          allowNull: false,
          field: 'change_type',
        },
        author: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        storyPointsChange: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          field: 'story_points_change',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'updated_at',
        },
      },
      {
        sequelize,
        tableName: 'issue_changelog',
        timestamps: true,
        indexes: [
          {
            fields: ['issue_id'],
          },
          {
            fields: ['jira_issue_key'],
          },
          {
            fields: ['change_date'],
          },
          {
            fields: ['from_sprint_id'],
          },
          {
            fields: ['to_sprint_id'],
          },
          {
            fields: ['change_type'],
          },
          {
            fields: ['change_date', 'from_sprint_id'],
          },
          {
            fields: ['change_date', 'to_sprint_id'],
          },
        ],
      }
    );
  }

  static associate(models: any): void {
    // Many-to-one with Issue
    IssueChangelog.belongsTo(models.Issue, {
      foreignKey: 'issueId',
      as: 'issue',
    });

    // Many-to-one with Sprint (from)
    IssueChangelog.belongsTo(models.Sprint, {
      foreignKey: 'fromSprintId',
      as: 'fromSprint',
    });

    // Many-to-one with Sprint (to)
    IssueChangelog.belongsTo(models.Sprint, {
      foreignKey: 'toSprintId',
      as: 'toSprint',
    });
  }
}
