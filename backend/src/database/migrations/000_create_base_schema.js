const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  // Create enum types
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN 
      CREATE TYPE enum_board_metrics_velocity_trend AS ENUM ('up', 'down', 'stable'); 
    EXCEPTION WHEN duplicate_object THEN 
      null; 
    END
    $$;
  `);

  // Create projects table if it doesn't exist
  const projectsTableExists = await queryInterface.showAllTables().then(tables => 
    tables.includes('projects')
  );

  if (!projectsTableExists) {
    await queryInterface.createTable('projects', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      jira_project_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'jira_project_key',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      project_type: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'project_type',
      },
      lead: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'avatar_url',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    await queryInterface.addIndex('projects', ['jira_project_key'], {
      name: 'projects_jira_project_key',
      unique: true,
    });
  }

  // Create boards table if it doesn't exist
  const boardsTableExists = await queryInterface.showAllTables().then(tables => 
    tables.includes('boards')
  );

  if (!boardsTableExists) {
    await queryInterface.createTable('boards', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      jira_board_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'jira_board_id',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      project_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'project_id',
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      can_edit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'can_edit',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    await queryInterface.addIndex('boards', ['jira_board_id'], {
      name: 'boards_jira_board_id',
      unique: true,
    });

    await queryInterface.addIndex('boards', ['project_id'], {
      name: 'boards_project_id',
    });
  }

  // Create sprints table if it doesn't exist
  const sprintsTableExists = await queryInterface.showAllTables().then(tables => 
    tables.includes('sprints')
  );

  if (!sprintsTableExists) {
    await queryInterface.createTable('sprints', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      jira_id: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'jira_id',
      },
      board_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'board_id',
        references: {
          model: 'boards',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'start_date',
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'end_date',
      },
      complete_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'complete_date',
      },
      goal: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_active',
      },
      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_sync_at',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    await queryInterface.addIndex('sprints', ['jira_id', 'board_id'], {
      name: 'sprints_jira_id_board_id',
      unique: true,
    });

    await queryInterface.addIndex('sprints', ['board_id'], {
      name: 'sprints_board_id',
    });
  }

  // Create issues table if it doesn't exist
  const issuesTableExists = await queryInterface.showAllTables().then(tables => 
    tables.includes('issues')
  );

  if (!issuesTableExists) {
    await queryInterface.createTable('issues', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      jira_id: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'jira_id',
      },
      jira_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'jira_key',
      },
      sprint_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'sprint_id',
        references: {
          model: 'sprints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
        field: 'issue_type',
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      priority: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      assignee_id: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'assignee_id',
      },
      assignee_name: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'assignee_name',
      },
      reporter_id: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'reporter_id',
      },
      reporter_name: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'reporter_name',
      },
      story_points: {
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
      parent_id: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'parent_id',
      },
      parent_key: {
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
      fix_versions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'fix_versions',
      },
      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_sync_at',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    await queryInterface.addIndex('issues', ['jira_key'], {
      name: 'issues_jira_key',
      unique: true,
    });

    await queryInterface.addIndex('issues', ['sprint_id'], {
      name: 'issues_sprint_id',
    });

    await queryInterface.addIndex('issues', ['jira_id'], {
      name: 'issues_jira_id',
    });
  }

  // Create sprint_metrics table if it doesn't exist
  const sprintMetricsTableExists = await queryInterface.showAllTables().then(tables => 
    tables.includes('sprint_metrics')
  );

  if (!sprintMetricsTableExists) {
    await queryInterface.createTable('sprint_metrics', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      sprint_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'sprint_id',
        references: {
          model: 'sprints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      velocity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      churn_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'churn_rate',
      },
      completion_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'completion_rate',
      },
      team_members: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'team_members',
      },
      total_story_points: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_story_points',
      },
      completed_story_points: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'completed_story_points',
      },
      added_story_points: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'added_story_points',
      },
      removed_story_points: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'removed_story_points',
      },
      total_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_issues',
      },
      completed_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'completed_issues',
      },
      added_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'added_issues',
      },
      removed_issues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'removed_issues',
      },
      average_cycle_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'average_cycle_time',
      },
      average_lead_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'average_lead_time',
      },
      scope_change_percent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'scope_change_percent',
      },
      calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'calculated_at',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    await queryInterface.addIndex('sprint_metrics', ['sprint_id'], {
      name: 'sprint_metrics_sprint_id',
      unique: true,
    });
  }

  // Create board_metrics table if it doesn't exist
  const boardMetricsTableExists = await queryInterface.showAllTables().then(tables => 
    tables.includes('board_metrics')
  );

  if (!boardMetricsTableExists) {
    await queryInterface.createTable('board_metrics', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      board_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'board_id',
        references: {
          model: 'boards',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      average_velocity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'average_velocity',
      },
      average_churn_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'average_churn_rate',
      },
      average_completion_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'average_completion_rate',
      },
      total_sprints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_sprints',
      },
      active_sprints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'active_sprints',
      },
      completed_sprints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'completed_sprints',
      },
      total_story_points: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_story_points',
      },
      average_cycle_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'average_cycle_time',
      },
      average_lead_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'average_lead_time',
      },
      team_members: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'team_members',
      },
      predicted_velocity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'predicted_velocity',
      },
      velocity_trend: {
        type: DataTypes.ENUM('up', 'down', 'stable'),
        allowNull: false,
        defaultValue: 'stable',
        field: 'velocity_trend',
      },
      calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'calculated_at',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    await queryInterface.addIndex('board_metrics', ['board_id'], {
      name: 'board_metrics_board_id',
      unique: true,
    });
  }
};

const down = async (queryInterface) => {
  // Drop tables in reverse order of dependencies
  await queryInterface.dropTable('board_metrics');
  await queryInterface.dropTable('sprint_metrics');
  await queryInterface.dropTable('issues');
  await queryInterface.dropTable('sprints');
  await queryInterface.dropTable('boards');
  await queryInterface.dropTable('projects');
  
  // Drop enum types
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_board_metrics_velocity_trend;');
};

module.exports = { up, down };
