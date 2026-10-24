import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
mkdirSync('data/u0', { recursive: true });
if (existsSync('data/u0/before.sqlite'))
  throw Error('Baseline already exists; preserve it');
const db = new DatabaseSync('data/creative-flow.sqlite');
db.exec("VACUUM INTO 'data/u0/before.sqlite'");
db.close();
console.log('U0 baseline SQLite snapshot preserved locally');
