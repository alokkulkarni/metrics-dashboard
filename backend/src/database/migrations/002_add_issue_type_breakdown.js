const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  await queryInterface.addColumn('sprint_metrics', 'issue_type_breakdown', {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  });
};

const down = async (queryInterface) => {
  await queryInterface.removeColumn('sprint_metrics', 'issue_type_breakdown');
};

module.exports = { up, down };
