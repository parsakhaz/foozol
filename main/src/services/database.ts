import { DatabaseService } from '../database/database';
import { join } from 'path';
import { getAppDirectory } from '../utils/appDirectory';

// Create and export a singleton instance
const dbPath = join(getAppDirectory(), 'sessions.db');
export const databaseService = new DatabaseService(dbPath);

// Initialize the database schema and run migrations
databaseService.initialize();