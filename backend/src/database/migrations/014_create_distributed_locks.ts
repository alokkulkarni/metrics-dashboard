import { DataTypes, Sequelize } from 'sequelize';

export const up = async (sequelize: Sequelize): Promise<void> => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('distributed_locks', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    lock_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    pod_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    acquired_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    renewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Create indexes for efficient querying
  await queryInterface.addIndex('distributed_locks', {
    fields: ['lock_name', 'pod_id', 'is_active'],
    unique: true,
    where: { is_active: true },
    name: 'distributed_locks_unique_active_lock',
  });

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
};

export const down = async (sequelize: Sequelize): Promise<void> => {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable('distributed_locks');
};
