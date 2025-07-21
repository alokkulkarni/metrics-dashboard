const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sync_operations', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      sync_type: {
        type: DataTypes.ENUM('full', 'project', 'board', 'sprint', 'issue'),
        allowNull: false,
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('running', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'running',
      },
      project_keys: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      board_ids: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      sprint_ids: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      results: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
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
    await queryInterface.addIndex('sync_operations', ['sync_type', 'status', 'end_time'], {
      name: 'idx_sync_operations_type_status_end'
    });
    
    await queryInterface.addIndex('sync_operations', ['start_time'], {
      name: 'idx_sync_operations_start_time'
    });

    await queryInterface.addIndex('sync_operations', ['end_time'], {
      name: 'idx_sync_operations_end_time'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sync_operations');
  }
};