import { validateProjectAddition, validateDailyLimit, validateWeeklyLimit, validateWeeklyMinimum, MAX_DAILY_HOURS, MAX_WEEKLY_HOURS, MIN_WEEKLY_HOURS } from './timesheetValidation';
import { Project, TimesheetRow } from '@/types';

// Mock data helpers
const createProject = (id: string, name: string, code: string): Project => ({
  id,
  name,
  code,
  color: '#000000',
  active: true,
  managerId: 'manager-1'
});

const createRow = (id: string, projectId: string): TimesheetRow => ({
  id,
  timesheetId: 'ts-1',
  projectId,
  type: 'Project',
  entries: []
});

describe('validateTimeLimits', () => {
  test('should pass daily limit <= 8 hours', () => {
    const result = validateDailyLimit(8);
    if (!result.isValid) throw new Error('8 hours should be valid');
    const result2 = validateDailyLimit(5);
    if (!result2.isValid) throw new Error('5 hours should be valid');
    console.log('Test passed: Daily limit <= 8');
  });

  test('should fail daily limit > 8 hours', () => {
    const result = validateDailyLimit(8.1);
    if (result.isValid) throw new Error('8.1 hours should be invalid');
    if (result.type !== 'error') throw new Error('Should be error type');
    console.log('Test passed: Daily limit > 8');
  });

  test('should pass weekly limit <= 40 hours', () => {
    const result = validateWeeklyLimit(40);
    if (!result.isValid) throw new Error('40 hours should be valid');
    const result2 = validateWeeklyLimit(35);
    if (!result2.isValid) throw new Error('35 hours should be valid');
    console.log('Test passed: Weekly limit <= 40');
  });

  test('should fail weekly limit > 40 hours', () => {
    const result = validateWeeklyLimit(40.5);
    if (result.isValid) throw new Error('40.5 hours should be invalid');
    if (result.type !== 'error') throw new Error('Should be error type');
    console.log('Test passed: Weekly limit > 40');
  });

  test('should fail weekly minimum < 40 hours', () => {
    const result = validateWeeklyMinimum(39.9);
    if (result.isValid) throw new Error('39.9 hours should be invalid (min 40)');
    if (result.type !== 'error') throw new Error('Should be error type');
    console.log('Test passed: Weekly minimum < 40');
  });

  test('should pass weekly minimum >= 40 hours', () => {
    const result = validateWeeklyMinimum(40);
    if (!result.isValid) throw new Error('40 hours should be valid (min 40)');
    const result2 = validateWeeklyMinimum(45);
    if (!result2.isValid) throw new Error('45 hours should be valid (min 40)');
    console.log('Test passed: Weekly minimum >= 40');
  });
});

describe('validateProjectAddition', () => {
  const projectA = createProject('1', 'WebPortal', 'WP-001');
  const projectB = createProject('2', 'Internal', 'INT-001');
  const projectC = createProject('3', 'WebPortal', 'WP-002'); // Same Name
  const projectD = createProject('4', 'Different', 'WP-001'); // Same Code
  const projectE = createProject('5', 'Unique', 'UNQ-001');

  const allProjects = [projectA, projectB, projectC, projectD, projectE];
  const existingRows = [
    createRow('row-1', projectA.id),
    createRow('row-2', projectB.id)
  ];

  test('should return error for exact ID match', () => {
    const result = validateProjectAddition(projectA, existingRows, allProjects);
    if (result.isValid || result.type !== 'error') {
        throw new Error(`Expected error for exact match, got ${JSON.stringify(result)}`);
    }
    console.log('Test passed: Exact ID match');
  });

  test('should return warning for name duplicate', () => {
    const result = validateProjectAddition(projectC, existingRows, allProjects);
    if (!result.isValid || result.type !== 'warning' || !result.message?.includes('name')) {
        throw new Error(`Expected warning for name duplicate, got ${JSON.stringify(result)}`);
    }
    console.log('Test passed: Name duplicate warning');
  });

  test('should return warning for code duplicate', () => {
    const result = validateProjectAddition(projectD, existingRows, allProjects);
    if (!result.isValid || result.type !== 'warning' || !result.message?.includes('code')) {
        throw new Error(`Expected warning for code duplicate, got ${JSON.stringify(result)}`);
    }
    console.log('Test passed: Code duplicate warning');
  });

  test('should return success for unique project', () => {
    const result = validateProjectAddition(projectE, existingRows, allProjects);
    if (!result.isValid || result.type !== 'success') {
        throw new Error(`Expected success for unique project, got ${JSON.stringify(result)}`);
    }
    console.log('Test passed: Unique project success');
  });
  
  test('should handle case insensitivity', () => {
    const projectF = createProject('6', 'webportal', 'WP-999');
    const result = validateProjectAddition(projectF, existingRows, allProjects);
    if (result.type !== 'warning') {
        throw new Error(`Expected warning for case-insensitive name match, got ${JSON.stringify(result)}`);
    }
    console.log('Test passed: Case insensitivity');
  });

  test('should handle whitespace', () => {
    const projectG = createProject('7', '  WebPortal  ', 'WP-888');
    const result = validateProjectAddition(projectG, existingRows, allProjects);
    if (result.type !== 'warning') {
        throw new Error(`Expected warning for whitespace name match, got ${JSON.stringify(result)}`);
    }
    console.log('Test passed: Whitespace handling');
  });
});

// Simple test runner since no test framework is installed
function describe(name: string, fn: () => void) {
  console.log(`\nRunning ${name}...`);
  try {
    fn();
  } catch (e) {
    console.error(e);
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
  } catch (e) {
    console.error(`❌ ${name} FAILED:`, e);
    throw e;
  }
}
