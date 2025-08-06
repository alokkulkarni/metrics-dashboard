const { DataTypes } = require('sequelize');

/**
 * Migration to create issue_changelog table for tracking issue history
 * This table stores changes to issues including sprint movements and story point changes
 */
async function up(queryInterface) {
  await queryInterface.createTable('issue_changelog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    issue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'issue_id',
      references: {
        model: 'issues',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    jira_issue_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'jira_issue_key',
    },
    change_date: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'change_date',
    },
    field: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    from_value: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'from_value',
    },
    to_value: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'to_value',
    },
    from_sprint_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'from_sprint_id',
      references: {
        model: 'sprints',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    to_sprint_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'to_sprint_id',
      references: {
        model: 'sprints',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    change_type: {
      type: DataTypes.ENUM('sprint_added', 'sprint_removed', 'sprint_changed', 'status_changed', 'story_points_changed', 'other'),
      allowNull: false,
      field: 'change_type',
    },
    author: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    story_points_change: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'story_points_change',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  });

  // Create indexes for performance
  await queryInterface.addIndex('issue_changelog', ['issue_id'], {
    name: 'idx_issue_changelog_issue_id',
  });

  await queryInterface.addIndex('issue_changelog', ['jira_issue_key'], {
    name: 'idx_issue_changelog_jira_issue_key',
  });

  await queryInterface.addIndex('issue_changelog', ['change_date'], {
    name: 'idx_issue_changelog_change_date',
  });

  await queryInterface.addIndex('issue_changelog', ['from_sprint_id'], {
    name: 'idx_issue_changelog_from_sprint_id',
  });

  await queryInterface.addIndex('issue_changelog', ['to_sprint_id'], {
    name: 'idx_issue_changelog_to_sprint_id',
  });

  await queryInterface.addIndex('issue_changelog', ['change_type'], {
    name: 'idx_issue_changelog_change_type',
  });

  await queryInterface.addIndex('issue_changelog', ['change_date', 'from_sprint_id'], {
    name: 'idx_issue_changelog_change_date_from_sprint',
  });

  await queryInterface.addIndex('issue_changelog', ['change_date', 'to_sprint_id'], {
    name: 'idx_issue_changelog_change_date_to_sprint',
  });
}

async function down(queryInterface) {
  // Drop indexes first
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_change_date_to_sprint');
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_change_date_from_sprint');
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_change_type');
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_to_sprint_id');
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_from_sprint_id');
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_change_date');
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_jira_issue_key');
  await queryInterface.removeIndex('issue_changelog', 'idx_issue_changelog_issue_id');

  // Drop the enum type
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_issue_changelog_change_type";');

  // Drop the table
  await queryInterface.dropTable('issue_changelog');
}

module.exports = { up, down };