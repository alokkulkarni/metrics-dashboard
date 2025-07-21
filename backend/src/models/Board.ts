import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface BoardAttributes {
  id: number;
  jiraBoardId: number;
  name: string;
  type: string;
  projectId: number;
  location: string | null;
  canEdit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface BoardCreationAttributes extends Optional<BoardAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Board extends Model<BoardAttributes, BoardCreationAttributes> implements BoardAttributes {
  public id!: number;
  public jiraBoardId!: number;
  public name!: string;
  public type!: string;
  public projectId!: number;
  public location!: string | null;
  public canEdit!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    Board.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        jiraBoardId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        projectId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'projects',
            key: 'id',
          },
        },
        location: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        canEdit: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Board',
        tableName: 'boards',
        indexes: [
          {
            unique: true,
            fields: ['jira_board_id'],
          },
          {
            fields: ['project_id'],
          },
        ],
      }
    );
  }
}

export default Board;
