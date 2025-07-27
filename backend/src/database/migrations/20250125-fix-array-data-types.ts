import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to fix array data types for KanbanMetrics
 * Changes cycleTimes and leadTimes from JSON to ARRAY(INTEGER)
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Drop and recreate the columns with correct array types
  await queryInterface.removeColumn('kanban_metrics', 'cycle_times');
  await queryInterface.removeColumn('kanban_metrics', 'lead_times');
  
  await queryInterface.addColumn('kanban_metrics', 'cycle_times', {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: false,
    defaultValue: []
  });
  
  await queryInterface.addColumn('kanban_metrics', 'lead_times', {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: false,
    defaultValue: []
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert back to JSON types
  await queryInterface.removeColumn('kanban_metrics', 'cycle_times');
  await queryInterface.removeColumn('kanban_metrics', 'lead_times');
  
  await queryInterface.addColumn('kanban_metrics', 'cycle_times', {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  });
  
  await queryInterface.addColumn('kanban_metrics', 'lead_times', {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  });
}
