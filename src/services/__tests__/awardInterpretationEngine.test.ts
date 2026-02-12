import { AwardInterpretationEngine } from '../awardInterpretationEngine';
import { Award, AwardRule, TimesheetEntry, AwardInterpretationResult } from '../../types/payroll';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

describe('AwardInterpretationEngine', () => {
  let engine: AwardInterpretationEngine;
  let mockAward: Award;
  let mockAwardRules: AwardRule[];
  let mockTimesheetEntries: TimesheetEntry[];

  beforeEach(() => {
    engine = new AwardInterpretationEngine();
    
    // Mock award data
    mockAward = {
      id: 'award-001',
      code: 'MA000002',
      name: 'Manufacturing and Associated Industries and Occupations Award 2020',
      version: '1.0',
      effectiveFrom: '2020-01-01',
      effectiveTo: undefined,
      isActive: true,
      createdAt: '2020-01-01T00:00:00Z'
    };

    // Mock award rules
    mockAwardRules = [
      // Saturday penalty rate
      {
        id: 'rule-001',
        awardId: 'award-001',
        ruleType: 'PenaltyRate',
        name: 'Saturday Penalty Rate',
        description: '150% penalty rate for Saturday work',
        conditions: {
          dayOfWeek: [6], // Saturday
        },
        calculation: {
          type: 'Multiplier',
          multiplier: 1.5
        },
        priority: 1,
        effectiveFrom: '2020-01-01',
        isActive: true,
        // Award Interpretation Engine compatibility
        rule_type: 'penalty_rate',
        dayType: 'saturday',
        penalty_percentage: 150,
        calculation_method: 'percentage'
      },
      // Sunday penalty rate
      {
        id: 'rule-002',
        awardId: 'award-001',
        ruleType: 'PenaltyRate',
        name: 'Sunday Penalty Rate',
        description: '200% penalty rate for Sunday work',
        conditions: {
          dayOfWeek: [0], // Sunday
        },
        calculation: {
          type: 'Multiplier',
          multiplier: 2.0
        },
        priority: 1,
        effectiveFrom: '2020-01-01',
        isActive: true,
        // Award Interpretation Engine compatibility
        rule_type: 'penalty_rate',
        dayType: 'sunday',
        penalty_percentage: 200,
        calculation_method: 'percentage'
      },
      // Night shift loading
      {
        id: 'rule-003',
        awardId: 'award-001',
        ruleType: 'ShiftLoading',
        name: 'Night Shift Loading',
        description: '15% loading for night shift work',
        conditions: {
          timeRange: { start: '22:00', end: '06:00' }
        },
        calculation: {
          type: 'Multiplier',
          multiplier: 0.15
        },
        priority: 2,
        effectiveFrom: '2020-01-01',
        isActive: true,
        // Award Interpretation Engine compatibility
        rule_type: 'shift_loading',
        timeFrom: '22:00',
        timeTo: '06:00',
        shift_loading_percentage: 15,
        calculation_method: 'percentage',
        shift_type: 'night'
      },
      // Tool allowance
      {
        id: 'rule-004',
        awardId: 'award-001',
        ruleType: 'Allowance',
        name: 'Tool Allowance',
        description: 'Daily tool allowance',
        conditions: {},
        calculation: {
          type: 'FlatAmount',
          flatAmount: 15.00
        },
        priority: 3,
        effectiveFrom: '2020-01-01',
        isActive: true,
        // Award Interpretation Engine compatibility
        rule_type: 'allowance',
        calculation_method: 'daily',
        daily_amount: 15.00,
        allowance_type: 'tool',
        tax_treatment: 'taxable'
      }
    ];

    // Mock timesheet entries
    mockTimesheetEntries = [
      // Saturday work
      {
        id: 'entry-001',
        employeeId: 'emp-001',
        startTime: '2024-02-10T08:00:00Z', // Saturday
        endTime: '2024-02-10T16:00:00Z',
        hourlyRate: 25.00,
        isBillable: true,
        status: 'Approved',
        createdAt: '2024-02-10T16:30:00Z',
        updatedAt: '2024-02-10T16:30:00Z'
      },
      // Sunday work
      {
        id: 'entry-002',
        employeeId: 'emp-001',
        startTime: '2024-02-11T08:00:00Z', // Sunday
        endTime: '2024-02-11T16:00:00Z',
        hourlyRate: 25.00,
        isBillable: true,
        status: 'Approved',
        createdAt: '2024-02-11T16:30:00Z',
        updatedAt: '2024-02-11T16:30:00Z'
      },
      // Night shift work
      {
        id: 'entry-003',
        employeeId: 'emp-001',
        startTime: '2024-02-12T22:00:00Z', // Monday night
        endTime: '2024-02-13T06:00:00Z',
        hourlyRate: 25.00,
        isBillable: true,
        status: 'Approved',
        createdAt: '2024-02-13T06:30:00Z',
        updatedAt: '2024-02-13T06:30:00Z'
      }
    ];
  });

  describe('Basic Award Interpretation', () => {
    it('should correctly calculate Saturday penalty rate', async () => {
      // Manually set up the engine with mock data
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [mockTimesheetEntries[0]], // Saturday entry
        mockAward.id,
        'Level 1',
        'full-time'
      );

      expect(result.totalPenaltyAmount).toBeGreaterThan(0);
      expect(result.penaltyRates).toHaveLength(1);
      expect(result.penaltyRates[0].penaltyPercentage).toBe(150);
      expect(result.penaltyRates[0].applicableHours).toBe(8); // 8 hours worked
    });

    it('should correctly calculate Sunday penalty rate', async () => {
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [mockTimesheetEntries[1]], // Sunday entry
        mockAward.id,
        'Level 1',
        'full-time'
      );

      expect(result.totalPenaltyAmount).toBeGreaterThan(0);
      expect(result.penaltyRates).toHaveLength(1);
      expect(result.penaltyRates[0].penaltyPercentage).toBe(200);
      expect(result.penaltyRates[0].applicableHours).toBe(8);
    });

    it('should correctly calculate night shift loading', async () => {
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [mockTimesheetEntries[2]], // Night shift entry
        mockAward.id,
        'Level 1',
        'full-time'
      );

      expect(result.totalShiftLoadingAmount).toBeGreaterThan(0);
      expect(result.shiftLoadings).toHaveLength(1);
      expect(result.shiftLoadings[0].loadingPercentage).toBe(15);
      expect(result.shiftLoadings[0].shiftType).toBe('night');
    });

    it('should correctly calculate tool allowance', async () => {
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [mockTimesheetEntries[0]], // Any entry for daily allowance
        mockAward.id,
        'Level 1',
        'full-time'
      );

      expect(result.totalAllowanceAmount).toBeGreaterThan(0);
      expect(result.allowances).toHaveLength(1);
      expect(result.allowances[0].allowanceType).toBe('tool');
      expect(result.allowances[0].calculationMethod).toBe('daily');
    });
  });

  describe('Overtime Calculations', () => {
    it('should calculate daily overtime correctly', async () => {
      const overtimeEntry: TimesheetEntry = {
        id: 'entry-004',
        employeeId: 'emp-001',
        startTime: '2024-02-12T08:00:00Z', // Monday
        endTime: '2024-02-12T19:00:00Z', // 11 hours (3 hours overtime)
        hourlyRate: 25.00,
        isBillable: true,
        status: 'Approved',
        createdAt: '2024-02-12T19:30:00Z',
        updatedAt: '2024-02-12T19:30:00Z'
      };

      // Add overtime rule
      const overtimeRule: AwardRule = {
        id: 'rule-005',
        awardId: 'award-001',
        ruleType: 'Overtime',
        name: 'Daily Overtime',
        description: '150% rate for daily overtime',
        conditions: {
          hoursThreshold: 8
        },
        calculation: {
          type: 'Multiplier',
          multiplier: 1.5
        },
        priority: 1,
        effectiveFrom: '2020-01-01',
        isActive: true,
        // Award Interpretation Engine compatibility
        rule_type: 'overtime',
        overtime_type: 'daily',
        penalty_percentage: 150,
        calculation_method: 'percentage'
      };

      const rulesWithOvertime = [...mockAwardRules, overtimeRule];
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, rulesWithOvertime);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [overtimeEntry],
        mockAward.id,
        'Level 1',
        'full-time'
      );

      expect(result.overtime).toHaveLength(1);
      expect(result.overtime[0].hours).toBe(3); // 3 hours overtime
      expect(result.overtime[0].type).toBe('daily');
      expect(result.totalOvertimeAmount).toBeGreaterThan(0);
    });
  });

  describe('Rule Applicability', () => {
    it('should only apply rules for correct classification', async () => {
      const classificationSpecificRule: AwardRule = {
        id: 'rule-006',
        awardId: 'award-001',
        ruleType: 'PenaltyRate',
        name: 'Level 2 Only Penalty',
        description: 'Only applies to Level 2 employees',
        conditions: {},
        calculation: {
          type: 'Multiplier',
          multiplier: 1.25
        },
        priority: 1,
        effectiveFrom: '2020-01-01',
        isActive: true,
        // Award Interpretation Engine compatibility
        rule_type: 'penalty_rate',
        classification: 'Level 2',
        penalty_percentage: 125,
        calculation_method: 'percentage'
      };

      const rulesWithClassification = [...mockAwardRules, classificationSpecificRule];
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, rulesWithClassification);

      // Test with Level 1 classification (should not apply Level 2 rule)
      const resultLevel1 = await engine.interpretTimesheet(
        'emp-001',
        [mockTimesheetEntries[0]],
        mockAward.id,
        'Level 1', // Level 1 classification
        'full-time'
      );

      // Test with Level 2 classification (should apply Level 2 rule)
      const resultLevel2 = await engine.interpretTimesheet(
        'emp-001',
        [mockTimesheetEntries[0]],
        mockAward.id,
        'Level 2', // Level 2 classification
        'full-time'
      );

      expect(resultLevel1.penaltyRates.filter(r => r.ruleId === 'rule-006')).toHaveLength(0);
      expect(resultLevel2.penaltyRates.filter(r => r.ruleId === 'rule-006')).toHaveLength(1);
    });

    it('should respect effective date ranges', async () => {
      const dateSpecificRule: AwardRule = {
        id: 'rule-007',
        awardId: 'award-001',
        ruleType: 'PenaltyRate',
        name: 'Future Penalty Rate',
        description: 'Only effective from 2025',
        conditions: {},
        calculation: {
          type: 'Multiplier',
          multiplier: 1.75
        },
        priority: 1,
        effectiveFrom: '2025-01-01',
        effectiveTo: '2025-12-31',
        isActive: true,
        // Award Interpretation Engine compatibility
        rule_type: 'penalty_rate',
        penalty_percentage: 175,
        calculation_method: 'percentage'
      };

      const rulesWithDateRange = [...mockAwardRules, dateSpecificRule];
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, rulesWithDateRange);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [mockTimesheetEntries[0]],
        mockAward.id,
        'Level 1',
        'full-time'
      );

      // Rule should not apply because it's not yet effective
      expect(result.penaltyRates.filter(r => r.ruleId === 'rule-007')).toHaveLength(0);
    });
  });

  describe('Complex Calculations', () => {
    it('should handle multiple rules applying to same entry', async () => {
      // Create an entry that should trigger multiple rules
      const complexEntry: TimesheetEntry = {
        id: 'entry-005',
        employeeId: 'emp-001',
        startTime: '2024-02-10T20:00:00Z', // Saturday night
        endTime: '2024-02-11T04:00:00Z', // Ends Sunday early morning
        hourlyRate: 25.00,
        isBillable: true,
        status: 'Approved',
        createdAt: '2024-02-11T04:30:00Z',
        updatedAt: '2024-02-11T04:30:00Z'
      };

      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [complexEntry],
        mockAward.id,
        'Level 1',
        'full-time'
      );

      // Should apply Saturday penalty, Sunday penalty, night loading, and allowance
      expect(result.penaltyRates.length).toBeGreaterThan(0);
      expect(result.shiftLoadings.length).toBeGreaterThan(0);
      expect(result.allowances.length).toBeGreaterThan(0);
      expect(result.totalAwardAmount).toBeGreaterThan(0);
    });

    it('should calculate total award amount correctly', async () => {
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        mockTimesheetEntries, // All entries
        mockAward.id,
        'Level 1',
        'full-time'
      );

      const expectedTotal = result.totalPenaltyAmount + result.totalAllowanceAmount + result.totalShiftLoadingAmount + result.totalOvertimeAmount;
      expect(result.totalAwardAmount).toBe(expectedTotal);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent award', async () => {
      await expect(engine.interpretTimesheet(
        'emp-001',
        mockTimesheetEntries,
        'non-existent-award',
        'Level 1',
        'full-time'
      )).rejects.toThrow('Award with ID non-existent-award not found');
    });

    it('should handle empty timesheet entries', async () => {
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        [], // Empty entries
        mockAward.id,
        'Level 1',
        'full-time'
      );

      expect(result.totalAwardAmount).toBe(0);
      expect(result.penaltyRates).toHaveLength(0);
      expect(result.allowances).toHaveLength(0);
      expect(result.shiftLoadings).toHaveLength(0);
      expect(result.overtime).toHaveLength(0);
    });
  });

  describe('Compliance Notes', () => {
    it('should generate compliance notes', async () => {
      (engine as any).awards.set(mockAward.id, mockAward);
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);

      const result = await engine.interpretTimesheet(
        'emp-001',
        mockTimesheetEntries,
        mockAward.id,
        'Level 1',
        'full-time'
      );

      expect(result.complianceNotes).toBeDefined();
      expect(result.complianceNotes.length).toBeGreaterThan(0);
      expect(result.complianceNotes.some(note => note.includes(mockAward.name))).toBe(true);
    });
  });

  describe('Award Management', () => {
    it('should return loaded awards', () => {
      (engine as any).awards.set(mockAward.id, mockAward);
      
      const loadedAwards = engine.getLoadedAwards();
      expect(loadedAwards).toHaveLength(1);
      expect(loadedAwards[0]).toEqual(mockAward);
    });

    it('should return award rules for specific award', () => {
      (engine as any).awardRules.set(mockAward.id, mockAwardRules);
      
      const awardRules = engine.getAwardRules(mockAward.id);
      expect(awardRules).toHaveLength(mockAwardRules.length);
      expect(awardRules).toEqual(mockAwardRules);
    });

    it('should return empty array for non-existent award rules', () => {
      const awardRules = engine.getAwardRules('non-existent-award');
      expect(awardRules).toHaveLength(0);
    });
  });
});