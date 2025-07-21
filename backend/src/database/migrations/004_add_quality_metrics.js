const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  const tableInfo = await queryInterface.describeTable('sprint_metrics');

  if (!tableInfo.defect_leakage_rate) {
    await queryInterface.addColumn('sprint_metrics', 'defect_leakage_rate', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
  }

  if (!tableInfo.quality_rate) {
    await queryInterface.addColumn('sprint_metrics', 'quality_rate', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 100,
    });
  }

  if (!tableInfo.total_defects) {
    await queryInterface.addColumn('sprint_metrics', 'total_defects', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  }

  if (!tableInfo.completed_defects) {
    await queryInterface.addColumn('sprint_metrics', 'completed_defects', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  }
};

const down = async (queryInterface) => {
  const tableInfo = await queryInterface.describeTable('sprint_metrics');
  
  if (tableInfo.defect_leakage_rate) {
    await queryInterface.removeColumn('sprint_metrics', 'defect_leakage_rate');
  }
  if (tableInfo.quality_rate) {
    await queryInterface.removeColumn('sprint_metrics', 'quality_rate');
  }
  if (tableInfo.total_defects) {
    await queryInterface.removeColumn('sprint_metrics', 'total_defects');
  }
  if (tableInfo.completed_defects) {
    await queryInterface.removeColumn('sprint_metrics', 'completed_defects');
  }
};

module.exports = { up, down };
