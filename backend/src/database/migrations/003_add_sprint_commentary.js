const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  await queryInterface.addColumn('sprint_metrics', 'commentary', {
    type: DataTypes.TEXT,
    allowNull: true,
  });
};

const down = async (queryInterface) => {
  await queryInterface.removeColumn('sprint_metrics', 'commentary');
};

module.exports = { up, down };
