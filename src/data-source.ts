import { DataSource, DataSourceOptions } from 'typeorm';

// Baca konfigurasi DB dari environment variable.
// Nilai default sebagai fallback saat development lokal.
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'libraries',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Disarankan false di production, kita pakai migrations
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10), // Connection Pooling
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
