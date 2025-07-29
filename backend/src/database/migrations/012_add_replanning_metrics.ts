import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add replanning metrics to sprint_metrics table
 * Adds columns for tracking issues moved between sprints and replanning rates
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add replanning rate column
  await queryInterface.addColumn('sprint_metrics', 'replanning_rate', {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Percentage of issues that were moved between sprints'
  });

  // Add replanning count column
  await queryInterface.addColumn('sprint_metrics', 'replanning_count', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total number of issues moved to/from this sprint'
  });

  // Add replanning from current sprint column
  await queryInterface.addColumn('sprint_metrics', 'replanning_from_current_sprint', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of issues moved out of this sprint'
  });

  // Add replanning to current sprint column
  await queryInterface.addColumn('sprint_metrics', 'replanning_to_current_sprint', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of issues moved into this sprint'
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove replanning columns
  await queryInterface.removeColumn('sprint_metrics', 'replanning_rate');
  await queryInterface.removeColumn('sprint_metrics', 'replanning_count');
  await queryInterface.removeColumn('sprint_metrics', 'replanning_from_current_sprint');
  await queryInterface.removeColumn('sprint_metrics', 'replanning_to_current_sprint');
}
