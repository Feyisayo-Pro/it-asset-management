import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { loadConfiguration } from './configuration';

const config = loadConfiguration();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  ssl: config.database.ssl,
  entities: [__dirname + '/../modules/**/typeorm-entities/*.orm-entity.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: config.app.env === 'development' ? ['error', 'warn'] : ['error'],
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
