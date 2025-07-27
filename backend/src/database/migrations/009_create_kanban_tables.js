/**
 * Create Kanban tables for managing Kanban boards and their issues
 */

const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  console.log('Creating Kanban tables...');

  // Create kanban_boards table
  await queryInterface.createTable('kanban_boards', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      jira_board_id: {
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
      project_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      can_edit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      column_config: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      swimlane_config: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Create kanban_issues table
    await queryInterface.createTable('kanban_issues', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      jira_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kanban_board_id: {
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
      issue_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status_category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      priority: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      assignee_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      assignee_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reporter_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reporter_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      story_points: {
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
      parent_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      parent_key: {
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
      fix_versions: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      column_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      column_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      swimlane_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      swimlane_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rank: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      flagged: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      blocked_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Create kanban_metrics table
    await queryInterface.createTable('kanban_metrics', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      kanban_board_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'kanban_boards',
          key: 'id',
        },
      },
      calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      total_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      todo_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      in_progress_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      done_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      blocked_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      flagged_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      column_metrics: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      average_cycle_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      median_cycle_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      cycle_times: {
        type: DataTypes.ARRAY(DataTypes.DECIMAL),
        allowNull: false,
        defaultValue: [],
      },
      average_lead_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      median_lead_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      lead_times: {
        type: DataTypes.ARRAY(DataTypes.DECIMAL),
        allowNull: false,
        defaultValue: [],
      },
      weekly_throughput: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: [],
      },
      monthly_throughput: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: [],
      },
      wip_violations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      wip_utilization: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      average_age_in_progress: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      oldest_issue_age: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      flow_efficiency: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      issue_type_breakdown: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      priority_breakdown: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      assignee_breakdown: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Create indexes for kanban_boards
    await queryInterface.addIndex('kanban_boards', ['jira_board_id'], {
      unique: true,
      name: 'kanban_boards_jira_board_id_unique',
    });
    await queryInterface.addIndex('kanban_boards', ['project_id']);
    await queryInterface.addIndex('kanban_boards', ['type']);
    await queryInterface.addIndex('kanban_boards', ['last_sync_at']);

    // Create indexes for kanban_issues
    await queryInterface.addIndex('kanban_issues', ['jira_id'], {
      unique: true,
      name: 'kanban_issues_jira_id_unique',
    });
    await queryInterface.addIndex('kanban_issues', ['key']);
    await queryInterface.addIndex('kanban_issues', ['kanban_board_id']);
    await queryInterface.addIndex('kanban_issues', ['status']);
    await queryInterface.addIndex('kanban_issues', ['status_category']);
    await queryInterface.addIndex('kanban_issues', ['assignee_id']);
    await queryInterface.addIndex('kanban_issues', ['issue_type']);
    await queryInterface.addIndex('kanban_issues', ['priority']);
    await queryInterface.addIndex('kanban_issues', ['column_id']);
    await queryInterface.addIndex('kanban_issues', ['swimlane_id']);
    await queryInterface.addIndex('kanban_issues', ['created']);
    await queryInterface.addIndex('kanban_issues', ['updated']);
    await queryInterface.addIndex('kanban_issues', ['last_sync_at']);

    // Create indexes for kanban_metrics
    await queryInterface.addIndex('kanban_metrics', ['kanban_board_id']);
    await queryInterface.addIndex('kanban_metrics', ['calculated_at']);
    await queryInterface.addIndex('kanban_metrics', ['kanban_board_id', 'calculated_at']);

    console.log('Kanban tables created successfully');
};

const down = async (queryInterface) => {
  console.log('Dropping Kanban tables...');

  await queryInterface.dropTable('kanban_metrics');
  await queryInterface.dropTable('kanban_issues');
  await queryInterface.dropTable('kanban_boards');

  console.log('Kanban tables dropped successfully');
};

module.exports = { up, down };
