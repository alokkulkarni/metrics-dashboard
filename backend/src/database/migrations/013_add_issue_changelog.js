/**
 * Migration: Add issue_changelog table for tracking issue changes
 * This table tracks all changes to issues, especially sprint movements for churn rate calculations
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('issue_changelog', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      issue_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'issues',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      jira_issue_key: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      change_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      field: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      from_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      to_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      from_sprint_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sprints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      to_sprint_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sprints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      change_type: {
        type: Sequelize.ENUM('sprint_added', 'sprint_removed', 'sprint_changed', 'status_changed', 'story_points_changed', 'other'),
        allowNull: false,
      },
      author: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      story_points_change: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes for performance
    await queryInterface.addIndex('issue_changelog', ['issue_id']);
    await queryInterface.addIndex('issue_changelog', ['jira_issue_key']);
    await queryInterface.addIndex('issue_changelog', ['change_date']);
    await queryInterface.addIndex('issue_changelog', ['from_sprint_id']);
    await queryInterface.addIndex('issue_changelog', ['to_sprint_id']);
    await queryInterface.addIndex('issue_changelog', ['change_type']);
    await queryInterface.addIndex('issue_changelog', ['change_date', 'from_sprint_id']);
    await queryInterface.addIndex('issue_changelog', ['change_date', 'to_sprint_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('issue_changelog');
  },
};
