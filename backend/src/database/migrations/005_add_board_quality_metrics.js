const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  const tableInfo = await queryInterface.describeTable('board_metrics');

  if (!tableInfo.average_defect_leakage_rate) {
    await queryInterface.addColumn('board_metrics', 'average_defect_leakage_rate', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
  }

  if (!tableInfo.average_quality_rate) {
    await queryInterface.addColumn('board_metrics', 'average_quality_rate', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 100,
    });
  }

  if (!tableInfo.total_defects) {
    await queryInterface.addColumn('board_metrics', 'total_defects', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  }
};

const down = async (queryInterface) => {
  const tableInfo = await queryInterface.describeTable('board_metrics');
  
  if (tableInfo.average_defect_leakage_rate) {
    await queryInterface.removeColumn('board_metrics', 'average_defect_leakage_rate');
  }
  if (tableInfo.average_quality_rate) {
    await queryInterface.removeColumn('board_metrics', 'average_quality_rate');
  }
  if (tableInfo.total_defects) {
    await queryInterface.removeColumn('board_metrics', 'total_defects');
  }
};

module.exports = { up, down };
