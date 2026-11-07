import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  root,
  publicDir: path.join(root, 'public'),
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data'),
  port: Number(process.env.PORT) || 3000,
  secret: process.env.APP_SECRET || '',
  managerUser: (process.env.MANAGER_USER || 'manager').trim().toLowerCase(),
  managerPass: process.env.MANAGER_PASS || '',
  tokenDays: 14
};
