import { Project, TimesheetRow } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  type: 'success' | 'error' | 'warning';
  message?: string;
}

export const validateProjectAddition = (
  newProject: Project,
  existingRows: TimesheetRow[],
  allProjects: Project[]
): ValidationResult => {
  // 1. Check for Exact ID Match (Strict Duplicate)
  // This is a hard error - we don't want the exact same row twice
  if (existingRows.some(row => row.projectId === newProject.id)) {
    return {
      isValid: false,
      type: 'error',
      message: `Project "${newProject.name}" is already in the timesheet.`
    };
  }

  // 2. Check for Name or Code Match (Soft Duplicate)
  // This is a warning - user might want to proceed
  const existingProjects = existingRows
    .filter(row => row.type === 'Project' && row.projectId)
    .map(row => allProjects.find(p => p.id === row.projectId))
    .filter((p): p is Project => !!p);

  const duplicateName = existingProjects.find(p => 
    p.name.trim().toLowerCase() === newProject.name.trim().toLowerCase()
  );
  
  const duplicateCode = existingProjects.find(p => 
    p.code && newProject.code && 
    p.code.trim().toLowerCase() === newProject.code.trim().toLowerCase()
  );

  if (duplicateName) {
    return {
      isValid: true, // Valid to proceed but requires confirmation
      type: 'warning',
      message: `Warning: A project with the same name "${duplicateName.name}" already exists in this timesheet.`
    };
  }

  if (duplicateCode) {
    return {
      isValid: true,
      type: 'warning',
      message: `Warning: A project with the same code "${duplicateCode.code}" already exists in this timesheet.`
    };
  }

  return {
    isValid: true,
    type: 'success'
  };
};

export const MAX_DAILY_HOURS = 8;
export const MAX_WEEKLY_HOURS = 40;
export const MIN_WEEKLY_HOURS = 40;

export const validateDailyLimit = (totalHours: number): ValidationResult => {
  if (totalHours > MAX_DAILY_HOURS) {
    return {
      isValid: false,
      type: 'error',
      message: `Daily limit exceeded: ${totalHours}h / ${MAX_DAILY_HOURS}h`
    };
  }
  return { isValid: true, type: 'success' };
};

export const validateWeeklyLimit = (totalHours: number): ValidationResult => {
  if (totalHours > MAX_WEEKLY_HOURS) {
    return {
      isValid: false,
      type: 'error',
      message: `Weekly limit exceeded: ${totalHours}h / ${MAX_WEEKLY_HOURS}h`
    };
  }
  return { isValid: true, type: 'success' };
};

export const validateWeeklyMinimum = (totalHours: number): ValidationResult => {
  if (totalHours < MIN_WEEKLY_HOURS) {
    return {
      isValid: false,
      type: 'error',
      message: `Minimum weekly hours not met: ${totalHours}h / ${MIN_WEEKLY_HOURS}h`
    };
  }
  return { isValid: true, type: 'success' };
};
