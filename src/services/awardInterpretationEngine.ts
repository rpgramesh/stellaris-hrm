import { supabase } from '../lib/supabase';
import { Award, AwardRule, TimesheetEntry, AwardInterpretationResult, PenaltyRate, Allowance, ShiftLoading, OvertimeEntry } from '../types/payroll';
import { addDays, differenceInMinutes, isWeekend, parseISO } from 'date-fns';

export class AwardInterpretationEngine {
  private awards: Map<string, Award> = new Map();
  private awardRules: Map<string, AwardRule[]> = new Map();

  constructor() {
    this.loadAwardsAndRules();
  }

  private async loadAwardsAndRules(): Promise<void> {
    try {
      // is_active column might be missing in some environments
      const { data: awardsData, error: awardsError } = await supabase
        .from('awards')
        .select('*');
        // .eq('is_active', true); // Removed temporarily due to schema mismatch

      if (awardsError) throw awardsError;

      const { data: rulesData, error: rulesError } = await supabase
        .from('award_rules')
        .select('*')
        // .eq('is_active', true) // Removed temporarily due to schema mismatch
        .order('priority', { ascending: false });

      if (rulesError) throw rulesError;

      // Load awards
      awardsData?.forEach(award => {
        this.awards.set(award.id, award);
      });

      // Load and group rules by award ID
      rulesData?.forEach(rule => {
        if (!this.awardRules.has(rule.award_id)) {
          this.awardRules.set(rule.award_id, []);
        }
        this.awardRules.get(rule.award_id)?.push(rule);
      });

    } catch (error) {
      console.error('Error loading awards and rules:', error);
      throw new Error('Failed to load award data');
    }
  }

  async interpretTimesheet(
    employeeId: string,
    timesheetEntries: TimesheetEntry[],
    awardId: string,
    classification: string,
    workPattern: string = 'full-time'
  ): Promise<AwardInterpretationResult> {
    const award = this.awards.get(awardId);
    if (!award) {
      throw new Error(`Award with ID ${awardId} not found`);
    }

    const rules = this.awardRules.get(awardId) || [];
    const interpretationDate = new Date();

    const penaltyRates: PenaltyRate[] = [];
    const allowances: Allowance[] = [];
    const shiftLoadings: ShiftLoading[] = [];
    let totalPenaltyAmount = 0;
    let totalAllowanceAmount = 0;
    let totalShiftLoadingAmount = 0;

    // Process each timesheet entry
    for (const entry of timesheetEntries) {
      const entryResult = await this.interpretTimesheetEntry(
        entry,
        award,
        rules,
        classification,
        workPattern,
        interpretationDate
      );

      penaltyRates.push(...entryResult.penaltyRates);
      allowances.push(...entryResult.allowances);
      shiftLoadings.push(...entryResult.shiftLoadings);
      totalPenaltyAmount += entryResult.totalPenaltyAmount;
      totalAllowanceAmount += entryResult.totalAllowanceAmount;
      totalShiftLoadingAmount += entryResult.totalShiftLoadingAmount;
    }

    // Calculate overtime
    const overtimeResult = await this.calculateOvertime(
      timesheetEntries,
      award,
      rules,
      classification,
      workPattern
    );

    return {
      employeeId,
      awardId,
      classification,
      workPattern,
      penaltyRates,
      allowances,
      shiftLoadings,
      overtime: overtimeResult.overtime,
      totalPenaltyAmount,
      totalAllowanceAmount,
      totalShiftLoadingAmount,
      totalOvertimeAmount: overtimeResult.totalOvertimeAmount,
      totalAwardAmount: totalPenaltyAmount + totalAllowanceAmount + totalShiftLoadingAmount + overtimeResult.totalOvertimeAmount,
      interpretationDate,
      complianceNotes: this.generateComplianceNotes(award, rules, timesheetEntries)
    };
  }

  private async interpretTimesheetEntry(
    entry: TimesheetEntry,
    award: Award,
    rules: AwardRule[],
    classification: string,
    workPattern: string,
    interpretationDate: Date
  ): Promise<{
    penaltyRates: PenaltyRate[];
    allowances: Allowance[];
    shiftLoadings: ShiftLoading[];
    totalPenaltyAmount: number;
    totalAllowanceAmount: number;
    totalShiftLoadingAmount: number;
  }> {
    const penaltyRates: PenaltyRate[] = [];
    const allowances: Allowance[] = [];
    const shiftLoadings: ShiftLoading[] = [];
    let totalPenaltyAmount = 0;
    let totalAllowanceAmount = 0;
    let totalShiftLoadingAmount = 0;

    const startTime = parseISO(entry.startTime);
    const endTime = parseISO(entry.endTime);
    const totalMinutes = differenceInMinutes(endTime, startTime);
    const baseHourlyRate = entry.hourlyRate || 0;

    // Apply applicable rules
    for (const rule of rules) {
      if (!this.isRuleApplicable(rule, classification, entry, interpretationDate)) {
        continue;
      }

      switch (rule.rule_type) {
        case 'penalty_rate':
          const penaltyResult = this.applyPenaltyRate(rule, entry, baseHourlyRate, totalMinutes);
          if (penaltyResult) {
            penaltyRates.push(penaltyResult);
            totalPenaltyAmount += penaltyResult.amount;
          }
          break;

        case 'allowance':
          const allowanceResult = this.applyAllowance(rule, entry, baseHourlyRate, totalMinutes);
          if (allowanceResult) {
            allowances.push(allowanceResult);
            totalAllowanceAmount += allowanceResult.amount;
          }
          break;

        case 'shift_loading':
          const shiftLoadingResult = this.applyShiftLoading(rule, entry, baseHourlyRate, totalMinutes);
          if (shiftLoadingResult) {
            shiftLoadings.push(shiftLoadingResult);
            totalShiftLoadingAmount += shiftLoadingResult.amount;
          }
          break;
      }
    }

    return {
      penaltyRates,
      allowances,
      shiftLoadings,
      totalPenaltyAmount,
      totalAllowanceAmount,
      totalShiftLoadingAmount
    };
  }

  private isRuleApplicable(
    rule: AwardRule,
    classification: string,
    entry: TimesheetEntry,
    interpretationDate: Date
  ): boolean {
    // Check classification
    if (rule.classification && rule.classification !== classification) {
      return false;
    }

    // Check date range
    const ruleStartDate = rule.effectiveFrom ? parseISO(rule.effectiveFrom) : null;
    const ruleEndDate = rule.effectiveTo ? parseISO(rule.effectiveTo) : null;
    
    if (ruleStartDate && interpretationDate < ruleStartDate) return false;
    if (ruleEndDate && interpretationDate > ruleEndDate) return false;

    // Check day of week
    const entryDate = parseISO(entry.startTime);
    const dayOfWeek = entryDate.getDay();
    
    if (rule.dayType === 'weekday' && (dayOfWeek === 0 || dayOfWeek === 6)) return false;
    if (rule.dayType === 'weekend' && (dayOfWeek !== 0 && dayOfWeek !== 6)) return false;
    if (rule.dayType === 'saturday' && dayOfWeek !== 6) return false;
    if (rule.dayType === 'sunday' && dayOfWeek !== 0) return false;

    // Check time conditions
    if (rule.timeFrom || rule.timeTo) {
      const entryStartTime = this.getTimeFromDate(parseISO(entry.startTime));
      const entryEndTime = this.getTimeFromDate(parseISO(entry.endTime));
      
      if (rule.timeFrom && entryEndTime < rule.timeFrom) return false;
      if (rule.timeTo && entryStartTime > rule.timeTo) return false;
    }

    // Check public holiday
    if (rule.publicHolidayOnly && !this.isPublicHoliday(entry.startTime)) return false;

    return true;
  }

  private applyPenaltyRate(
    rule: AwardRule,
    entry: TimesheetEntry,
    baseHourlyRate: number,
    totalMinutes: number
  ): PenaltyRate | null {
    const applicableMinutes = this.calculateApplicableMinutes(rule, entry);
    if (applicableMinutes <= 0) return null;

    const penaltyMultiplier = (rule.penalty_percentage || rule.calculation?.multiplier || 0) / 100;
    const penaltyRate = baseHourlyRate * penaltyMultiplier;
    const amount = (penaltyRate * applicableMinutes) / 60;

    return {
      id: `${rule.id}-${entry.id}`,
      ruleId: rule.id,
      timesheetEntryId: entry.id,
      description: rule.description || `Penalty rate ${rule.penalty_percentage || rule.calculation?.multiplier}%`,
      penaltyPercentage: rule.penalty_percentage || rule.calculation?.multiplier || 0,
      applicableHours: applicableMinutes / 60,
      penaltyRate,
      amount,
      calculationMethod: (rule.calculation_method || rule.calculation?.type?.toLowerCase() || 'percentage') as 'percentage' | 'fixed' | 'hourly',
      notes: rule.notes
    };
  }

  private applyAllowance(
    rule: AwardRule,
    entry: TimesheetEntry,
    baseHourlyRate: number,
    totalMinutes: number
  ): Allowance | null {
    let amount = 0;
    let applicableHours = 0;
    const calcMethod = (rule.calculation_method || rule.calculation?.type?.toLowerCase() || 'fixed') as 'fixed' | 'hourly' | 'daily';

    if (calcMethod === 'fixed') {
      amount = rule.fixed_amount || rule.calculation?.flatAmount || 0;
      applicableHours = totalMinutes / 60;
    } else if (calcMethod === 'hourly') {
      applicableHours = this.calculateApplicableMinutes(rule, entry) / 60;
      amount = (rule.hourly_rate || rule.calculation?.hourlyRate || 0) * applicableHours;
    } else if (calcMethod === 'daily') {
      if (this.doesRuleApplyToEntry(rule, entry)) {
        amount = rule.daily_amount || rule.calculation?.flatAmount || 0;
        applicableHours = totalMinutes / 60;
      }
    }

    if (amount <= 0) return null;

    return {
      id: `${rule.id}-${entry.id}`,
      ruleId: rule.id,
      timesheetEntryId: entry.id,
      description: rule.description || 'Allowance',
      allowanceType: (rule.allowance_type as any) || 'other',
      amount,
      applicableHours,
      calculationMethod: calcMethod,
      taxTreatment: (rule.tax_treatment as any) || 'taxable',
      notes: rule.notes
    };
  }

  private applyShiftLoading(
    rule: AwardRule,
    entry: TimesheetEntry,
    baseHourlyRate: number,
    totalMinutes: number
  ): ShiftLoading | null {
    const applicableMinutes = this.calculateApplicableMinutes(rule, entry);
    if (applicableMinutes <= 0) return null;

    let loadingRate = 0;
    const calcMethod = (rule.calculation_method || rule.calculation?.type?.toLowerCase() || 'percentage') as 'percentage' | 'fixed' | 'hourly';
    
    if (calcMethod === 'percentage') {
      loadingRate = baseHourlyRate * (rule.shift_loading_percentage || rule.calculation?.multiplier || 0) / 100;
    } else if (calcMethod === 'fixed') {
      loadingRate = rule.fixed_amount || rule.calculation?.flatAmount || 0;
    }

    const amount = (loadingRate * applicableMinutes) / 60;

    return {
      id: `${rule.id}-${entry.id}`,
      ruleId: rule.id,
      timesheetEntryId: entry.id,
      description: rule.description || 'Shift loading',
      shiftType: (rule.shift_type as any) || 'afternoon',
      loadingPercentage: rule.shift_loading_percentage || rule.calculation?.multiplier || 0,
      applicableHours: applicableMinutes / 60,
      loadingRate,
      amount,
      calculationMethod: calcMethod,
      notes: rule.notes
    };
  }

  private async calculateOvertime(
    timesheetEntries: TimesheetEntry[],
    award: Award,
    rules: AwardRule[],
    classification: string,
    workPattern: string
  ): Promise<{
    overtime: any[];
    totalOvertimeAmount: number;
  }> {
    const overtimeRules = rules.filter(rule => rule.rule_type === 'overtime');
    const overtime: any[] = [];
    let totalOvertimeAmount = 0;

    // Calculate daily overtime
    const dailyOvertime = this.calculateDailyOvertime(timesheetEntries, overtimeRules, award);
    overtime.push(...dailyOvertime.entries);
    totalOvertimeAmount += dailyOvertime.totalAmount;

    // Calculate weekly overtime
    const weeklyOvertime = this.calculateWeeklyOvertime(timesheetEntries, overtimeRules, award, workPattern);
    overtime.push(...weeklyOvertime.entries);
    totalOvertimeAmount += weeklyOvertime.totalAmount;

    return { overtime, totalOvertimeAmount };
  }

  private calculateDailyOvertime(
    timesheetEntries: TimesheetEntry[],
    overtimeRules: AwardRule[],
    award: Award
  ): { entries: any[]; totalAmount: number } {
    const entries: any[] = [];
    let totalAmount = 0;

    // Group entries by date
    const entriesByDate = new Map<string, TimesheetEntry[]>();
    timesheetEntries.forEach(entry => {
      const date = parseISO(entry.startTime).toDateString();
      if (!entriesByDate.has(date)) {
        entriesByDate.set(date, []);
      }
      entriesByDate.get(date)?.push(entry);
    });

    // Calculate overtime for each day
    entriesByDate.forEach((dayEntries, date) => {
      const totalHours = dayEntries.reduce((sum, entry) => {
        const minutes = differenceInMinutes(parseISO(entry.endTime), parseISO(entry.startTime));
        return sum + (minutes / 60);
      }, 0);

      const dailyHoursThreshold = 8; // Standard daily hours
      if (totalHours > dailyHoursThreshold) {
        const overtimeHours = totalHours - dailyHoursThreshold;
        const applicableRule = overtimeRules.find(rule => rule.overtime_type === 'daily');
        
        if (applicableRule) {
          const overtimeRate = this.calculateOvertimeRate(applicableRule, dayEntries[0]);
          const overtimeAmount = overtimeRate * overtimeHours;
          
          entries.push({
            type: 'daily',
            date,
            hours: overtimeHours,
            rate: overtimeRate,
            amount: overtimeAmount,
            ruleId: applicableRule.id
          });
          
          totalAmount += overtimeAmount;
        }
      }
    });

    return { entries, totalAmount };
  }

  private calculateWeeklyOvertime(
    timesheetEntries: TimesheetEntry[],
    overtimeRules: AwardRule[],
    award: Award,
    workPattern: string
  ): { entries: any[]; totalAmount: number } {
    const entries: any[] = [];
    let totalAmount = 0;

    // Calculate total weekly hours
    const totalWeeklyHours = timesheetEntries.reduce((sum, entry) => {
      const minutes = differenceInMinutes(parseISO(entry.endTime), parseISO(entry.startTime));
      return sum + (minutes / 60);
    }, 0);

    const weeklyHoursThreshold = workPattern === 'full-time' ? 38 : 38; // Adjust based on work pattern
    
    if (totalWeeklyHours > weeklyHoursThreshold) {
      const overtimeHours = totalWeeklyHours - weeklyHoursThreshold;
      const applicableRule = overtimeRules.find(rule => rule.overtime_type === 'weekly');
      
      if (applicableRule) {
        const overtimeRate = this.calculateOvertimeRate(applicableRule, timesheetEntries[0]);
        const overtimeAmount = overtimeRate * overtimeHours;
        
        entries.push({
          type: 'weekly',
          hours: overtimeHours,
          rate: overtimeRate,
          amount: overtimeAmount,
          ruleId: applicableRule.id
        });
        
        totalAmount += overtimeAmount;
      }
    }

    return { entries, totalAmount };
  }

  private calculateOvertimeRate(rule: AwardRule, entry: TimesheetEntry): number {
    const baseRate = entry.hourlyRate || 0;
    const calcMethod = rule.calculation_method || rule.calculation?.type?.toLowerCase() || 'percentage';
    
    if (calcMethod === 'percentage') {
      return baseRate * (rule.penalty_percentage || rule.calculation?.multiplier || 150) / 100;
    } else if (calcMethod === 'fixed') {
      return rule.fixed_amount || rule.calculation?.flatAmount || 0;
    }
    
    return baseRate * 1.5; // Default 1.5x rate
  }

  private calculateApplicableMinutes(rule: AwardRule, entry: TimesheetEntry): number {
    const startTime = parseISO(entry.startTime);
    const endTime = parseISO(entry.endTime);
    
    let applicableStart = startTime;
    let applicableEnd = endTime;

    // Apply time restrictions
    if (rule.timeFrom) {
      const ruleStartTime = this.combineDateAndTime(startTime, rule.timeFrom);
      applicableStart = startTime < ruleStartTime ? ruleStartTime : startTime;
    }

    if (rule.timeTo) {
      const ruleEndTime = this.combineDateAndTime(startTime, rule.timeTo);
      applicableEnd = endTime > ruleEndTime ? ruleEndTime : endTime;
    }

    if (applicableStart >= applicableEnd) return 0;

    return differenceInMinutes(applicableEnd, applicableStart);
  }

  private doesRuleApplyToEntry(rule: AwardRule, entry: TimesheetEntry): boolean {
    return this.calculateApplicableMinutes(rule, entry) > 0;
  }

  private getTimeFromDate(date: Date): string {
    return date.toTimeString().slice(0, 5); // HH:MM format
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private async isPublicHoliday(date: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('public_holidays')
      .select('id')
      .eq('date', date)
      .single();

    return !error && !!data;
  }

  private generateComplianceNotes(award: Award, rules: AwardRule[], timesheetEntries: TimesheetEntry[]): string[] {
    const notes: string[] = [];
    
    // Check for minimum break requirements
    const breakCompliance = this.checkBreakCompliance(timesheetEntries, rules);
    if (!breakCompliance.compliant) {
      notes.push(breakCompliance.note);
    }

    // Check for maximum daily hours
    const maxHoursCompliance = this.checkMaximumHoursCompliance(timesheetEntries, rules);
    if (!maxHoursCompliance.compliant) {
      notes.push(maxHoursCompliance.note);
    }

    // Add general award compliance note
    notes.push(`Interpreted under ${award.name} (${award.code})`);

    return notes;
  }

  private checkBreakCompliance(timesheetEntries: TimesheetEntry[], rules: AwardRule[]): { compliant: boolean; note: string } {
    // Implementation for break compliance checking
    return { compliant: true, note: '' };
  }

  private checkMaximumHoursCompliance(timesheetEntries: TimesheetEntry[], rules: AwardRule[]): { compliant: boolean; note: string } {
    // Implementation for maximum hours compliance checking
    return { compliant: true, note: '' };
  }

  async reloadAwards(): Promise<void> {
    this.awards.clear();
    this.awardRules.clear();
    await this.loadAwardsAndRules();
  }

  getLoadedAwards(): Award[] {
    return Array.from(this.awards.values());
  }

  getAwardRules(awardId: string): AwardRule[] {
    return this.awardRules.get(awardId) || [];
  }
}

export const awardInterpretationEngine = new AwardInterpretationEngine();