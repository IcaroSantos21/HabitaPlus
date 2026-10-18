import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import path from 'path';

const sourceExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

// Configura a fonte de dados usada pelas ferramentas de migração do TypeORM.
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    path.resolve(__dirname, 'entities', `*.entity.${sourceExtension}`),
  ],
  migrations: [path.resolve(__dirname, 'migrations', `*.${sourceExtension}`)],
  synchronize: false,
});
