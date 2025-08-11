import { DataTypes, Model, Optional, Sequelize, Op } from 'sequelize';
import { getSequelizeInstance } from '../database/connection';
import { logger } from '../utils/logger';

interface DistributedLockAttributes {
  id: number;
  lockName: string;
  podId: string;
  acquiredAt: Date;
  expiresAt: Date;
  renewedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DistributedLockCreationAttributes extends Optional<DistributedLockAttributes, 'id' | 'renewedAt' | 'createdAt' | 'updatedAt'> {}

class DistributedLock extends Model<DistributedLockAttributes, DistributedLockCreationAttributes> implements DistributedLockAttributes {
  public id!: number;
  public lockName!: string;
  public podId!: string;
  public acquiredAt!: Date;
  public expiresAt!: Date;
  public renewedAt!: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  private static readonly DEFAULT_LOCK_DURATION_MINUTES = 30;
  private static readonly RENEWAL_INTERVAL_MINUTES = 10;

  /**
   * Generate unique pod ID for this instance
   */
  private static generatePodId(): string {
    const hostname = process.env.HOSTNAME || 'unknown';
    const pid = process.pid;
    const timestamp = Date.now();
    return `${hostname}-${pid}-${timestamp}`;
  }

  /**
   * Attempt to acquire a distributed lock
   */
  public static async acquireLock(
    lockName: string,
    durationMinutes: number = DistributedLock.DEFAULT_LOCK_DURATION_MINUTES
  ): Promise<{ acquired: boolean; lock?: DistributedLock; existingLockPodId?: string }> {
    const sequelize = getSequelizeInstance();
    if (!sequelize) {
      throw new Error('Database connection not available');
    }
    
    const transaction = await sequelize.transaction();
    
    try {
      const podId = DistributedLock.generatePodId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (durationMinutes * 60 * 1000));

      // Clean up expired locks first
      await DistributedLock.cleanupExpiredLocks(transaction);

      // Check if lock already exists and is active
      const existingLock = await DistributedLock.findOne({
        where: {
          lockName,
          isActive: true,
        },
        transaction,
        lock: transaction.LOCK.UPDATE, // Use row-level locking
      });

      if (existingLock) {
        // Check if lock is truly expired (double-check due to potential clock skew)
        if (existingLock.expiresAt > now) {
          await transaction.rollback();
          logger.info(`🔒 Lock "${lockName}" already held by pod ${existingLock.podId}, expires at ${existingLock.expiresAt.toISOString()}`);
          return { 
            acquired: false, 
            existingLockPodId: existingLock.podId 
          };
        }

        // Lock is expired, deactivate it
        existingLock.isActive = false;
        await existingLock.save({ transaction });
        logger.info(`🗑️ Deactivated expired lock "${lockName}" from pod ${existingLock.podId}`);
      }

      // Create new lock
      const newLock = await DistributedLock.create({
        lockName,
        podId,
        acquiredAt: now,
        expiresAt,
        renewedAt: now,
        isActive: true,
      }, { transaction });

      await transaction.commit();
      
      logger.info(`🔓 Successfully acquired lock "${lockName}" for pod ${podId}, expires at ${expiresAt.toISOString()}`);
      
      // Start auto-renewal process
      DistributedLock.startAutoRenewal(newLock);

      return { acquired: true, lock: newLock };
    } catch (error) {
      await transaction.rollback();
      logger.error(`💥 Error acquiring lock "${lockName}":`, error);
      throw error;
    }
  }

  /**
   * Release a distributed lock
   */
  public static async releaseLock(lockName: string, podId: string): Promise<boolean> {
    try {
      const lock = await DistributedLock.findOne({
        where: {
          lockName,
          podId,
          isActive: true,
        },
      });

      if (!lock) {
        logger.warn(`⚠️ No active lock found for "${lockName}" with pod ID ${podId}`);
        return false;
      }

      lock.isActive = false;
      await lock.save();

      logger.info(`🔓 Successfully released lock "${lockName}" for pod ${podId}`);
      return true;
    } catch (error) {
      logger.error(`💥 Error releasing lock "${lockName}" for pod ${podId}:`, error);
      throw error;
    }
  }

  /**
   * Renew an existing lock
   */
  public static async renewLock(lockName: string, podId: string, durationMinutes: number = DistributedLock.DEFAULT_LOCK_DURATION_MINUTES): Promise<boolean> {
    try {
      const lock = await DistributedLock.findOne({
        where: {
          lockName,
          podId,
          isActive: true,
        },
      });

      if (!lock) {
        logger.warn(`⚠️ No active lock found for renewal: "${lockName}" with pod ID ${podId}`);
        return false;
      }

      const now = new Date();
      lock.expiresAt = new Date(now.getTime() + (durationMinutes * 60 * 1000));
      lock.renewedAt = now;
      await lock.save();

      logger.debug(`🔄 Renewed lock "${lockName}" for pod ${podId}, new expiry: ${lock.expiresAt.toISOString()}`);
      return true;
    } catch (error) {
      logger.error(`💥 Error renewing lock "${lockName}" for pod ${podId}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock is currently held
   */
  public static async isLockHeld(lockName: string): Promise<{ held: boolean; podId?: string; expiresAt?: Date }> {
    try {
      const lock = await DistributedLock.findOne({
        where: {
          lockName,
          isActive: true,
        },
        order: [['acquiredAt', 'DESC']],
      });

      if (!lock) {
        return { held: false };
      }

      // Double-check expiration
      if (lock.expiresAt <= new Date()) {
        // Lock is expired but still marked as active, deactivate it
        lock.isActive = false;
        await lock.save();
        logger.info(`🗑️ Deactivated expired lock "${lockName}" from pod ${lock.podId}`);
        return { held: false };
      }

      return { 
        held: true, 
        podId: lock.podId, 
        expiresAt: lock.expiresAt 
      };
    } catch (error) {
      logger.error(`💥 Error checking lock status for "${lockName}":`, error);
      return { held: false };
    }
  }

  /**
   * Clean up expired locks
   */
  public static async cleanupExpiredLocks(transaction?: any): Promise<number> {
    try {
      const now = new Date();
      const [affectedCount] = await DistributedLock.update(
        { isActive: false },
        {
          where: {
            isActive: true,
            expiresAt: { [Op.lt]: now },
          },
          transaction,
        }
      );

      if (affectedCount > 0) {
        logger.info(`🧹 Cleaned up ${affectedCount} expired locks`);
      }

      return affectedCount;
    } catch (error) {
      logger.error('💥 Error cleaning up expired locks:', error);
      return 0;
    }
  }

  /**
   * Start auto-renewal process for a lock
   */
  private static startAutoRenewal(lock: DistributedLock): void {
    const renewalIntervalMs = DistributedLock.RENEWAL_INTERVAL_MINUTES * 60 * 1000;
    
    const renewalProcess = setInterval(async () => {
      try {
        const renewed = await DistributedLock.renewLock(
          lock.lockName, 
          lock.podId, 
          DistributedLock.DEFAULT_LOCK_DURATION_MINUTES
        );

        if (!renewed) {
          logger.info(`🛑 Stopping auto-renewal for lock "${lock.lockName}" (pod ${lock.podId}) - lock no longer held`);
          clearInterval(renewalProcess);
        }
      } catch (error) {
        logger.error(`💥 Error in auto-renewal for lock "${lock.lockName}" (pod ${lock.podId}):`, error);
        clearInterval(renewalProcess);
      }
    }, renewalIntervalMs);

    // Clean up interval when process exits
    process.on('exit', () => {
      clearInterval(renewalProcess);
    });

    process.on('SIGINT', async () => {
      clearInterval(renewalProcess);
      await DistributedLock.releaseLock(lock.lockName, lock.podId);
    });

    process.on('SIGTERM', async () => {
      clearInterval(renewalProcess);
      await DistributedLock.releaseLock(lock.lockName, lock.podId);
    });
  }

  /**
   * Get lock history for monitoring
   */
  public static async getLockHistory(lockName?: string, limit: number = 50): Promise<DistributedLock[]> {
    const whereClause: any = {};
    if (lockName) {
      whereClause.lockName = lockName;
    }

    return await DistributedLock.findAll({
      where: whereClause,
      order: [['acquiredAt', 'DESC']],
      limit,
    });
  }

  static initialize(sequelize: Sequelize): void {
    DistributedLock.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        lockName: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'lock_name',
        },
        podId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'pod_id',
        },
        acquiredAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'acquired_at',
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'expires_at',
        },
        renewedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'renewed_at',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'updated_at',
        },
      },
      {
        sequelize,
        modelName: 'DistributedLock',
        tableName: 'distributed_locks',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['lock_name', 'pod_id', 'is_active'],
            where: { is_active: true },
          },
          {
            fields: ['lock_name', 'is_active'],
          },
          {
            fields: ['expires_at'],
          },
          {
            fields: ['acquired_at'],
          },
        ],
      }
    );
  }
}

export { DistributedLock };
