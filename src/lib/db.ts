
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src', 'lib', 'db.json');

interface Database {
  stpEvents: any[];
  awardInterpretations: any[];
}

const defaultDb: Database = {
  stpEvents: [],
  awardInterpretations: []
};

export const getDb = (): Database => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return defaultDb;
  }
};

export const saveDb = (db: Database) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

export const db = {
  get: getDb,
  save: saveDb
};
