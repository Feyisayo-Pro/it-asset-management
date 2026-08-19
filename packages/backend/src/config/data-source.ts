import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { loadConfiguration } from './configuration';

const config = loadConfiguration();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...(config.database.url
    ? { url: config.database.url }
    : {
        host: config.database.host,
        port: config.database.port,
        username: config.database.username,
        password: config.database.password,
        database: config.database.database,
      }),
  ssl: config.database.ssl,
  // Some modules' files are named *.orm-entity.ts (singular), others
  // *.orm-entities.ts (plural, when a file exports multiple entity
  // classes) — match both so every module actually gets registered
  // with the runtime connection (a singular-only glob here previously
  // meant assessment/disposal/repair entities were silently never
  // loaded, and any write into those tables 500'd).
  entities: [__dirname + '/../modules/**/typeorm-entities/*.orm-entit*.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: config.app.env === 'development' ? ['error', 'warn'] : ['error'],
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
