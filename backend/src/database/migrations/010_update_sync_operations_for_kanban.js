'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'kanban' to the sync_type enum values
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_sync_operations_sync_type" ADD VALUE 'kanban';
    `);

    console.log('✅ Updated sync_operations table to support kanban sync type');
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type and updating the table
    // For simplicity, we'll leave this as a no-op
    console.log('⚠️  Rollback not implemented - PostgreSQL does not support removing enum values');
  }
};
