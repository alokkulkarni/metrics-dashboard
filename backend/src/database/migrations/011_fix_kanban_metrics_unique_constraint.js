'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔧 Starting Kanban metrics unique constraint fix...');

      // Step 1: Remove duplicates, keeping only the most recent record for each kanban_board_id
      console.log('🧹 Removing duplicate kanban metrics records...');
      await queryInterface.sequelize.query(`
        DELETE FROM kanban_metrics 
        WHERE id NOT IN (
          SELECT DISTINCT ON (kanban_board_id) id
          FROM kanban_metrics 
          ORDER BY kanban_board_id, calculated_at DESC, id DESC
        )
      `, { transaction });
      
      // Check how many records remain
      const [results] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as total_records,
               COUNT(DISTINCT kanban_board_id) as unique_boards
        FROM kanban_metrics
      `, { transaction });
      console.log(`📊 After cleanup: ${results[0].total_records} total records, ${results[0].unique_boards} unique boards`);

      // Step 2: Add unique constraint on kanban_board_id
      console.log('🔒 Adding unique constraint on kanban_board_id...');
      await queryInterface.addIndex('kanban_metrics', ['kanban_board_id'], {
        unique: true,
        name: 'kanban_metrics_kanban_board_id_unique',
        transaction
      });

      console.log('✅ Kanban metrics unique constraint fix completed successfully!');
      await transaction.commit();
      
    } catch (error) {
      console.error('❌ Error fixing kanban metrics unique constraint:', error);
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Reverting Kanban metrics unique constraint fix...');
      
      // Remove the unique constraint
      await queryInterface.removeIndex('kanban_metrics', 'kanban_metrics_kanban_board_id_unique', { transaction });
      
      console.log('✅ Kanban metrics unique constraint fix reverted successfully!');
      await transaction.commit();
      
    } catch (error) {
      console.error('❌ Error reverting kanban metrics unique constraint fix:', error);
      await transaction.rollback();
      throw error;
    }
  }
};
