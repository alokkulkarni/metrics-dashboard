import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Interface for KanbanMetrics attributes
interface KanbanMetricsAttributes {
  id: number;
  kanbanBoardId: number;
  calculatedAt: Date;
  totalIssues: number;
  todoIssues: number;
  inProgressIssues: number;
  doneIssues: number;
  blockedIssues: number;
  flaggedIssues: number;
  columnMetrics: any; // JSON field for column-specific metrics
  
  // Cycle Time Metrics
  averageCycleTime?: number; // In days
  medianCycleTime?: number; // In days
  cycleTimes: number[]; // Array of cycle times for completed issues
  
  // Lead Time Metrics
  averageLeadTime?: number; // In days
  medianLeadTime?: number; // In days
  leadTimes: number[]; // Array of lead times for completed issues
  
  // Throughput Metrics
  weeklyThroughput: number[]; // Array of weekly throughput numbers
  monthlyThroughput: number[]; // Array of monthly throughput numbers
  
  // WIP Metrics
  wipViolations: number; // Number of WIP limit violations
  wipUtilization: any; // JSON field for WIP utilization per column
  
  // Age Metrics
  averageAgeInProgress?: number; // Average age of items in progress (days)
  oldestIssueAge?: number; // Age of the oldest issue in progress (days)
  
  // Flow Efficiency
  flowEfficiency?: number; // Percentage of time items are actively worked on
  
  // Breakdown Metrics
  issueTypeBreakdown: any; // JSON field for breakdown by issue type
  priorityBreakdown: any; // JSON field for breakdown by priority
  assigneeBreakdown: any; // JSON field for breakdown by assignee
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Interface for KanbanMetrics creation attributes (optional fields during creation)
interface KanbanMetricsCreationAttributes extends Optional<KanbanMetricsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// KanbanMetrics Model class
export class KanbanMetrics extends Model<KanbanMetricsAttributes, KanbanMetricsCreationAttributes> implements KanbanMetricsAttributes {
  public id!: number;
  public kanbanBoardId!: number;
  public calculatedAt!: Date;
  public totalIssues!: number;
  public todoIssues!: number;
  public inProgressIssues!: number;
  public doneIssues!: number;
  public blockedIssues!: number;
  public flaggedIssues!: number;
  public columnMetrics!: any;
  public averageCycleTime?: number;
  public medianCycleTime?: number;
  public cycleTimes!: number[];
  public averageLeadTime?: number;
  public medianLeadTime?: number;
  public leadTimes!: number[];
  public weeklyThroughput!: number[];
  public monthlyThroughput!: number[];
  public wipViolations!: number;
  public wipUtilization!: any;
  public averageAgeInProgress?: number;
  public oldestIssueAge?: number;
  public flowEfficiency?: number;
  public issueTypeBreakdown!: any;
  public priorityBreakdown!: any;
  public assigneeBreakdown!: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async calculateMetrics(): Promise<void> {
    // This method can be implemented to recalculate metrics for this board
    // Implementation would be done by the KanbanMetricsCalculationService
  }

  // Static methods
  public static async findByKanbanBoard(kanbanBoardId: number): Promise<KanbanMetrics | null> {
    return this.findOne({
      where: { kanbanBoardId },
      order: [['calculatedAt', 'DESC']]
    });
  }

  public static async findLatestMetrics(limit: number = 10): Promise<KanbanMetrics[]> {
    return this.findAll({
      order: [['calculatedAt', 'DESC']],
      limit
    });
  }

  public static initialize(sequelize: Sequelize): void {
    initKanbanMetrics(sequelize);
  }

  static associate(): void {
    // Define associations
    const { KanbanBoard } = require('./KanbanBoard');
    KanbanMetrics.belongsTo(KanbanBoard, { foreignKey: 'kanbanBoardId', as: 'board' });
  }
}

// Initialize the model
export const initKanbanMetrics = (sequelize: Sequelize): typeof KanbanMetrics => {
  KanbanMetrics.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      kanbanBoardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'kanban_boards',
          key: 'id'
        }
      },
      calculatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      totalIssues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      todoIssues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      inProgressIssues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      doneIssues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      blockedIssues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      flaggedIssues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      columnMetrics: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
      },
      averageCycleTime: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      medianCycleTime: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      cycleTimes: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: []
      },
      averageLeadTime: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      medianLeadTime: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      leadTimes: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: []
      },
      weeklyThroughput: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: []
      },
      monthlyThroughput: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: []
      },
      wipViolations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      wipUtilization: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
      },
      averageAgeInProgress: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      oldestIssueAge: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      flowEfficiency: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      issueTypeBreakdown: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
      },
      priorityBreakdown: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
      },
      assigneeBreakdown: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: 'kanban_metrics',
      modelName: 'KanbanMetrics',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['kanban_board_id']
        },
        {
          fields: ['calculated_at']
        }
      ]
    }
  );

  return KanbanMetrics;
};

export default KanbanMetrics;
export type { KanbanMetricsAttributes, KanbanMetricsCreationAttributes };
