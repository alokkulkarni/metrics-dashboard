const { DataTypes } = require('sequelize');

/**
 * Migration to create distributed_locks table for pod coordination
 * This table ensures only one pod performs sync operations at a time
 */
async function up(queryInterface) {
  await queryInterface.createTable('distributed_locks', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    lock_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'lock_name',
    },
    pod_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'pod_id',
    },
    acquired_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'acquired_at',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    renewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'renewed_at',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  });

  // Create unique index for active locks to prevent duplicate locks
  await queryInterface.addIndex('distributed_locks', {
    fields: ['lock_name', 'pod_id', 'is_active'],
    unique: true,
    where: { is_active: true },
    name: 'distributed_locks_unique_active_lock',
  });

  // Create indexes for efficient querying
  await queryInterface.addIndex('distributed_locks', {
    fields: ['lock_name', 'is_active'],
    name: 'distributed_locks_name_active_idx',
  });

  await queryInterface.addIndex('distributed_locks', {
    fields: ['expires_at'],
    name: 'distributed_locks_expires_at_idx',
  });

  await queryInterface.addIndex('distributed_locks', {
    fields: ['acquired_at'],
    name: 'distributed_locks_acquired_at_idx',
  });
}

async function down(queryInterface) {
  // Drop indexes first
  await queryInterface.removeIndex('distributed_locks', 'distributed_locks_acquired_at_idx');
  await queryInterface.removeIndex('distributed_locks', 'distributed_locks_expires_at_idx');
  await queryInterface.removeIndex('distributed_locks', 'distributed_locks_name_active_idx');
  await queryInterface.removeIndex('distributed_locks', 'distributed_locks_unique_active_lock');

  // Drop the table
  await queryInterface.dropTable('distributed_locks');
}

module.exports = { up, down };
