import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface ProjectAttributes {
  id: number;
  jiraProjectKey: string;
  name: string;
  description: string | null;
  projectType: string;
  lead: string | null;
  url: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: number;
  public jiraProjectKey!: string;
  public name!: string;
  public description!: string | null;
  public projectType!: string;
  public lead!: string | null;
  public url!: string | null;
  public avatarUrl!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    Project.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        jiraProjectKey: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        projectType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lead: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        url: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        avatarUrl: {
          type: DataTypes.STRING,
          allowNull: true,
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
        modelName: 'Project',
        tableName: 'projects',
        indexes: [
          {
            unique: true,
            fields: ['jira_project_key'],
          },
        ],
      }
    );
  }
}

export default Project;
