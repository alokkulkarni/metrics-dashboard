const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  // First, create the enum type for churn rate trend
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN 
      CREATE TYPE enum_board_metrics_churn_rate_trend AS ENUM ('up', 'down', 'stable'); 
    EXCEPTION WHEN duplicate_object THEN 
      null; 
    END
    $$;
  `);

  // Check if the column already exists
  try {
    const tableDesc = await queryInterface.describeTable('board_metrics');
    if (!tableDesc.churn_rate_trend) {
      // Add the churn_rate_trend column to board_metrics table
      await queryInterface.addColumn('board_metrics', 'churn_rate_trend', {
        type: DataTypes.ENUM('up', 'down', 'stable'),
        allowNull: false,
        defaultValue: 'stable',
        field: 'churn_rate_trend',
      });
    }
  } catch (error) {
    console.log('Column churn_rate_trend may already exist or table not found:', error.message || error);
  }
};

const down = async (queryInterface) => {
  // Remove the column
  try {
    await queryInterface.removeColumn('board_metrics', 'churn_rate_trend');
  } catch (error) {
    console.log('Could not remove column churn_rate_trend:', error.message || error);
  }
  
  // Drop the enum type
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_board_metrics_churn_rate_trend;');
};

module.exports = { up, down };
