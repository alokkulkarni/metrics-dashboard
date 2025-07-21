import { DataTypes, Model, Sequelize } from 'sequelize';

export interface BoardMetricsAttributes {
  id: number;
  boardId: number;
  averageVelocity: number;
  averageChurnRate: number;
  averageCompletionRate: number;
  totalSprints: number;
  activeSprints: number;
  completedSprints: number;
  totalStoryPoints: number;
  averageCycleTime?: number;
  averageLeadTime?: number;
  teamMembers: string[];
  predictedVelocity: number;
  velocityTrend: 'up' | 'down' | 'stable';
  churnRateTrend: 'up' | 'down' | 'stable';
  averageDefectLeakageRate: number;
  averageQualityRate: number;
  totalDefects: number;
  createdAt?: Date;
  updatedAt?: Date;
  calculatedAt: Date;
}

export interface BoardMetricsCreationAttributes extends Omit<BoardMetricsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class BoardMetrics extends Model<BoardMetricsAttributes, BoardMetricsCreationAttributes> implements BoardMetricsAttributes {
  public id!: number;
  public boardId!: number;
  public averageVelocity!: number;
  public averageChurnRate!: number;
  public averageCompletionRate!: number;
  public totalSprints!: number;
  public activeSprints!: number;
  public completedSprints!: number;
  public totalStoryPoints!: number;
  public averageCycleTime?: number;
  public averageLeadTime?: number;
  public teamMembers!: string[];
  public predictedVelocity!: number;
  public velocityTrend!: 'up' | 'down' | 'stable';
  public churnRateTrend!: 'up' | 'down' | 'stable';
  public averageDefectLeakageRate!: number;
  public averageQualityRate!: number;
  public totalDefects!: number;
  public createdAt?: Date;
  public updatedAt?: Date;
  public calculatedAt!: Date;

  // Associations
  public board?: any;

  static initialize(sequelize: Sequelize): void {
    BoardMetrics.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        boardId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          field: 'board_id',
          references: {
            model: 'boards',
            key: 'id',
          },
        },
        averageVelocity: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'average_velocity',
        },
        averageChurnRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'average_churn_rate',
        },
        averageCompletionRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'average_completion_rate',
        },
        totalSprints: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'total_sprints',
        },
        activeSprints: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'active_sprints',
        },
        completedSprints: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'completed_sprints',
        },
        totalStoryPoints: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'total_story_points',
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
        teamMembers: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
          field: 'team_members',
        },
        predictedVelocity: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'predicted_velocity',
        },
        velocityTrend: {
          type: DataTypes.ENUM('up', 'down', 'stable'),
          allowNull: false,
          defaultValue: 'stable',
          field: 'velocity_trend',
        },
        churnRateTrend: {
          type: DataTypes.ENUM('up', 'down', 'stable'),
          allowNull: false,
          defaultValue: 'stable',
          field: 'churn_rate_trend',
        },
        averageDefectLeakageRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'average_defect_leakage_rate',
        },
        averageQualityRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 100,
          field: 'average_quality_rate',
        },
        totalDefects: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'total_defects',
        },
        calculatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'calculated_at',
        },
      },
      {
        sequelize,
        modelName: 'BoardMetrics',
        tableName: 'board_metrics',
        indexes: [
          {
            fields: ['board_id'],
            unique: true,
          },
        ],
      }
    );
  }
}

export default BoardMetrics;
