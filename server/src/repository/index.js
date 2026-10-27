import { config } from '../config.js';
import { DemoRepository } from './demo-repository.js';
import { SqlRepository } from './sql-repository.js';

export function createRepository() {
  return config.demoMode ? new DemoRepository() : new SqlRepository();
}
