/**
 * Migration: Add issue_changelog table for tracking issue changes
 * This table tracks all changes to issues, especially sprint movements for churn rate calculations
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('issue_changelog', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      issue_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      },
      change_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      field: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      from_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      to_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      from_sprint_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      },
      author: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      story_points_change: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
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
