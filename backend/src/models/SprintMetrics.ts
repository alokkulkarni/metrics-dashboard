import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SprintMetricsAttributes {
  id: number;
  sprintId: number;
  velocity: number;
  churnRate: number;
  completionRate: number;
  teamMembers: string[];
  totalStoryPoints: number;
  completedStoryPoints: number;
  addedStoryPoints: number;
  removedStoryPoints: number;
  totalIssues: number;
  completedIssues: number;
  addedIssues: number;
  removedIssues: number;
  issueTypeBreakdown: Record<string, number>;
  storyPointsBreakdown?: Record<string, number>;
  averageCycleTime?: number;
  averageLeadTime?: number;
  scopeChangePercent: number;
  defectLeakageRate: number;
  qualityRate: number;
  totalDefects: number;
  completedDefects: number;
  commentary?: string;
  createdAt?: Date;
  updatedAt?: Date;
  calculatedAt: Date;
}

export interface SprintMetricsCreationAttributes extends Omit<SprintMetricsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class SprintMetrics extends Model<SprintMetricsAttributes, SprintMetricsCreationAttributes> implements SprintMetricsAttributes {
  public id!: number;
  public sprintId!: number;
  public velocity!: number;
  public churnRate!: number;
  public completionRate!: number;
  public teamMembers!: string[];
  public totalStoryPoints!: number;
  public completedStoryPoints!: number;
  public addedStoryPoints!: number;
  public removedStoryPoints!: number;
  public totalIssues!: number;
  public completedIssues!: number;
  public addedIssues!: number;
  public removedIssues!: number;
  public issueTypeBreakdown!: Record<string, number>;
  public storyPointsBreakdown?: Record<string, number>;
  public averageCycleTime?: number;
  public averageLeadTime?: number;
  public scopeChangePercent!: number;
  public defectLeakageRate!: number;
  public qualityRate!: number;
  public totalDefects!: number;
  public completedDefects!: number;
  public commentary?: string;
  public createdAt?: Date;
  public updatedAt?: Date;
  public calculatedAt!: Date;

  // Associations
  public sprint?: any;

  static initialize(sequelize: Sequelize): void {
    SprintMetrics.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        sprintId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          field: 'sprint_id',
          references: {
            model: 'sprints',
            key: 'id',
          },
        },
        velocity: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        churnRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'churn_rate',
        },
        completionRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'completion_rate',
        },
        teamMembers: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
          field: 'team_members',
        },
        totalStoryPoints: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'total_story_points',
        },
        completedStoryPoints: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'completed_story_points',
        },
        addedStoryPoints: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'added_story_points',
        },
        removedStoryPoints: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'removed_story_points',
        },
        totalIssues: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'total_issues',
        },
        completedIssues: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'completed_issues',
        },
        addedIssues: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'added_issues',
        },
        removedIssues: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'removed_issues',
        },
        issueTypeBreakdown: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
          field: 'issue_type_breakdown',
        },
        storyPointsBreakdown: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'story_points_breakdown',
        },
        averageCycleTime: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          field: 'average_cycle_time',
        },
        averageLeadTime: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          field: 'average_lead_time',
        },
        scopeChangePercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'scope_change_percent',
        },
        defectLeakageRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'defect_leakage_rate',
        },
        qualityRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 100,
          field: 'quality_rate',
        },
        totalDefects: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'total_defects',
        },
        completedDefects: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'completed_defects',
        },
        commentary: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'commentary',
        },
        calculatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'calculated_at',
        },
      },
      {
        sequelize,
        modelName: 'SprintMetrics',
        tableName: 'sprint_metrics',
        indexes: [
          {
            fields: ['sprint_id'],
            unique: true,
          },
        ],
      }
    );
  }
}

export default SprintMetrics;
