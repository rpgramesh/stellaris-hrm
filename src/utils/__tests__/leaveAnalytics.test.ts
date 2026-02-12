import { calculateLeaveDistribution } from '../leaveAnalytics';
import { LeaveRequest } from '@/types';

describe('calculateLeaveDistribution', () => {
  const currentYear = 2024;
  const holidays = [
    new Date('2024-01-01'), // New Year's Day
    new Date('2024-12-25')  // Christmas
  ];

  it('should calculate correct working days for single leave request', () => {
    const leaves: LeaveRequest[] = [{
      id: '1',
      type: 'Annual',
      status: 'Approved',
      startDate: '2024-06-03', // Monday
      endDate: '2024-06-07',   // Friday
      employeeId: 'emp1',
      employeeName: 'John',
      days: 5,
      reason: 'Vacation',
      createdAt: '2024-01-01'
    }];

    const result = calculateLeaveDistribution(leaves, holidays, currentYear);
    expect(result['Annual']).toBe(5);
  });

  it('should ignore non-approved leaves', () => {
    const leaves: LeaveRequest[] = [{
      id: '1',
      type: 'Annual',
      status: 'Pending',
      startDate: '2024-06-03',
      endDate: '2024-06-07',
      employeeId: 'emp1',
      employeeName: 'John',
      days: 5,
      reason: 'Vacation',
      createdAt: '2024-01-01'
    }];

    const result = calculateLeaveDistribution(leaves, holidays, currentYear);
    expect(result['Annual']).toBeUndefined();
  });

  it('should exclude weekends', () => {
    const leaves: LeaveRequest[] = [{
      id: '1',
      type: 'Sick',
      status: 'Approved',
      startDate: '2024-06-07', // Friday
      endDate: '2024-06-10',   // Monday (Fri, Sat, Sun, Mon) -> 2 working days
      employeeId: 'emp1',
      employeeName: 'John',
      days: 4,
      reason: 'Sick',
      createdAt: '2024-01-01'
    }];

    const result = calculateLeaveDistribution(leaves, holidays, currentYear);
    expect(result['Sick']).toBe(2);
  });

  it('should exclude holidays', () => {
    const leaves: LeaveRequest[] = [{
      id: '1',
      type: 'Annual',
      status: 'Approved',
      startDate: '2024-12-24', // Tue
      endDate: '2024-12-26',   // Thu (Wed is Xmas) -> 2 working days
      employeeId: 'emp1',
      employeeName: 'John',
      days: 3,
      reason: 'Xmas',
      createdAt: '2024-01-01'
    }];

    const result = calculateLeaveDistribution(leaves, holidays, currentYear);
    expect(result['Annual']).toBe(2);
  });

  it('should aggregate multiple requests of same type', () => {
    const leaves: LeaveRequest[] = [
      {
        id: '1',
        type: 'Annual',
        status: 'Approved',
        startDate: '2024-01-02', // Tue (Jan 1 is holiday)
        endDate: '2024-01-02',
        employeeId: 'emp1',
        employeeName: 'John',
        days: 1,
        reason: 'Recov',
        createdAt: '2024-01-01'
      },
      {
        id: '2',
        type: 'Annual',
        status: 'Approved',
        startDate: '2024-02-01',
        endDate: '2024-02-02', // 2 days
        employeeId: 'emp1',
        employeeName: 'John',
        days: 2,
        reason: 'Trip',
        createdAt: '2024-01-01'
      }
    ];

    const result = calculateLeaveDistribution(leaves, holidays, currentYear);
    expect(result['Annual']).toBe(3);
  });

  it('should ignore leaves from other years', () => {
    const leaves: LeaveRequest[] = [{
      id: '1',
      type: 'Annual',
      status: 'Approved',
      startDate: '2023-12-20',
      endDate: '2023-12-25',
      employeeId: 'emp1',
      employeeName: 'John',
      days: 5,
      reason: 'Old',
      createdAt: '2023-01-01'
    }];

    const result = calculateLeaveDistribution(leaves, holidays, currentYear);
    expect(result['Annual']).toBeUndefined();
  });
});
