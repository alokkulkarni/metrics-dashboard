const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sprint_metrics', 'story_points_breakdown', {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Breakdown of story points by size categories (Small: 0-3, Medium: >3-5, Large: >5)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sprint_metrics', 'story_points_breakdown');
  }
};
