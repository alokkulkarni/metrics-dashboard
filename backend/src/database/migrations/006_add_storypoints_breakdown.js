const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists before adding it
    const tableInfo = await queryInterface.describeTable('sprint_metrics');
    if (!tableInfo.story_points_breakdown) {
      await queryInterface.addColumn('sprint_metrics', 'story_points_breakdown', {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Breakdown of story points by size categories (Small: 0-3, Medium: >3-5, Large: >5)'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('sprint_metrics');
    if (tableInfo.story_points_breakdown) {
      await queryInterface.removeColumn('sprint_metrics', 'story_points_breakdown');
    }
  }
};
