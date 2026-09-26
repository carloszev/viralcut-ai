import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

export const ROOT_DIR = process.cwd();
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
export const EXPORTS_DIR = path.join(ROOT_DIR, 'exports');

// User standard folders for direct desktop saves
export const USER_HOME_DIR = os.homedir();
export const USER_DOCUMENTS_DIR = path.join(USER_HOME_DIR, 'Documents');
export const USER_DOCUMENTS_VIDEOS_DIR = path.join(USER_DOCUMENTS_DIR, 'Videos');
export const USER_VIDEOS_DIR = path.join(USER_HOME_DIR, 'Videos');

// Ensure storage directories exist
[DATA_DIR, UPLOADS_DIR, EXPORTS_DIR, USER_DOCUMENTS_VIDEOS_DIR, USER_VIDEOS_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create directory:', dir, e);
  }
});

export const DB_FILE = path.join(DATA_DIR, 'db.json');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
