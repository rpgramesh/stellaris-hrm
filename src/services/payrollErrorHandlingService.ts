import { supabase } from '@/lib/supabase';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export interface PayrollError {
  id: string;
  payrollRunId?: string;
  employeeId?: string;
  errorType: 'Validation' | 'Calculation' | 'Data' | 'System' | 'Compliance';
  errorCode: string;
  message: string;
  details?: any;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Resolved' | 'Ignored';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface PayrollErrorHandlingOptions {
  autoRetry?: boolean;
  maxRetries?: number;
  notifyOnError?: boolean;
  escalateOnCritical?: boolean;
}

export const payrollErrorHandlingService = {
  async handlePayrollError(
    error: Error,
    context: {
      payrollRunId?: string;
      employeeId?: string;
      operation: string;
      details?: any;
    },
    options: PayrollErrorHandlingOptions = {}
  ): Promise<PayrollError> {
    try {
      // Classify the error
      const errorClassification = this.classifyError(error, context);
      
      // Create error record
      const errorRecord: PayrollError = {
        id: crypto.randomUUID(),
        payrollRunId: context.payrollRunId,
        employeeId: context.employeeId,
        errorType: errorClassification.type,
        errorCode: errorClassification.code,
        message: error.message,
        details: context.details,
        severity: errorClassification.severity,
        status: 'Open',
        createdAt: new Date().toISOString()
      };

      // Store error in database
      const { data, error: dbError } = await supabase
        .from('payroll_errors')
        .insert({
          id: errorRecord.id,
          payroll_run_id: errorRecord.payrollRunId,
          employee_id: errorRecord.employeeId,
          error_type: errorRecord.errorType,
          error_code: errorRecord.errorCode,
          message: errorRecord.message,
          details: errorRecord.details,
          severity: errorRecord.severity,
          status: errorRecord.status,
          created_at: errorRecord.createdAt
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error storing payroll error:', dbError);
      }

      // Create audit log
      await auditService.logAction(
        'payroll_errors',
        errorRecord.id,
        'INSERT',
        null,
        errorRecord,
        'system'
      );

      // Send notifications based on severity
      if (options.notifyOnError !== false) {
        await this.sendErrorNotifications(errorRecord, context);
      }

      // Auto-retry if configured and appropriate
      if (options.autoRetry && this.shouldAutoRetry(errorClassification)) {
        await this.scheduleRetry(errorRecord, options.maxRetries || 3);
      }

      // Escalate critical errors
      if (options.escalateOnCritical && errorClassification.severity === 'Critical') {
        await this.escalateError(errorRecord);
      }

      return errorRecord;
    } catch (handlingError) {
      console.error('Error handling payroll error:', handlingError);
      // Don't throw - we don't want error handling to cause more errors
      return null as any;
    }
  },

  async resolveError(
    errorId: string,
    resolutionNotes: string,
    resolvedBy: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_errors')
        .update({
          status: 'Resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes
        })
        .eq('id', errorId);

      if (error) throw error;

      // Create audit log
      await auditService.logAction(
        'payroll_errors',
        errorId,
        'UPDATE',
        { status: 'Open' },
        { status: 'Resolved', resolutionNotes },
        resolvedBy
      );
    } catch (error) {
      console.error('Error resolving payroll error:', error);
      throw error;
    }
  },

  async getErrors(
    filters: {
      payrollRunId?: string;
      employeeId?: string;
      errorType?: string;
      severity?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<PayrollError[]> {
    try {
      let query = supabase
        .from('payroll_errors')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.payrollRunId) {
        query = query.eq('payroll_run_id', filters.payrollRunId);
      }
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters.errorType) {
        query = query.eq('error_type', filters.errorType);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(this.mapErrorFromDb);
    } catch (error) {
      console.error('Error fetching payroll errors:', error);
      throw error;
    }
  },

  async getErrorStats(): Promise<{
    totalErrors: number;
    openErrors: number;
    criticalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: PayrollError[];
  }> {
    try {
      const { data, error } = await supabase
        .from('payroll_errors')
        .select('*');

      if (error) throw error;

      const errors: PayrollError[] = (data || []).map((d: any) => this.mapErrorFromDb(d));
      const openErrors = errors.filter(e => e.status === 'Open');
      const criticalErrors = errors.filter(e => e.severity === 'Critical');

      const errorsByType = errors.reduce((acc, error) => {
        acc[error.errorType] = (acc[error.errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const errorsBySeverity = errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentErrors = errors
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return {
        totalErrors: errors.length,
        openErrors: openErrors.length,
        criticalErrors: criticalErrors.length,
        errorsByType,
        errorsBySeverity,
        recentErrors
      };
    } catch (error) {
      console.error('Error getting error stats:', error);
      throw error;
    }
  },

  // Error handling strategies
  classifyError(
    error: Error,
    context: { payrollRunId?: string; employeeId?: string; operation: string }
  ): {
    type: 'Validation' | 'Calculation' | 'Data' | 'System' | 'Compliance';
    code: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
  } {
    const message = error.message.toLowerCase();
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        type: 'Validation',
        code: 'VALIDATION_ERROR',
        severity: message.includes('critical') ? 'Critical' : 'Medium'
      };
    }

    // Calculation errors
    if (message.includes('calculation') || message.includes('formula') || message.includes('division by zero')) {
      return {
        type: 'Calculation',
        code: 'CALCULATION_ERROR',
        severity: 'High'
      };
    }

    // Data errors
    if (message.includes('data') || message.includes('database') || message.includes('not found')) {
      return {
        type: 'Data',
        code: 'DATA_ERROR',
        severity: message.includes('critical') ? 'Critical' : 'High'
      };
    }

    // System errors
    if (message.includes('system') || message.includes('network') || message.includes('timeout')) {
      return {
        type: 'System',
        code: 'SYSTEM_ERROR',
        severity: 'Medium'
      };
    }

    // Compliance errors
    if (message.includes('compliance') || message.includes('minimum wage') || message.includes('tax')) {
      return {
        type: 'Compliance',
        code: 'COMPLIANCE_ERROR',
        severity: 'Critical'
      };
    }

    // Default classification
    return {
      type: 'System',
      code: 'UNKNOWN_ERROR',
      severity: 'Medium'
    };
  },

  shouldAutoRetry(classification: {
    type: string;
    code: string;
    severity: string;
  }): boolean {
    // Only auto-retry system errors and some data errors
    return classification.type === 'System' || 
           (classification.type === 'Data' && classification.severity !== 'Critical');
  },

  async sendErrorNotifications(
    error: PayrollError,
    context: { payrollRunId?: string; employeeId?: string; operation: string }
  ): Promise<void> {
    try {
      let message = `Payroll Error: ${error.message}`;
      
      if (context.payrollRunId) {
        message += ` (Payroll Run: ${context.payrollRunId})`;
      }
      
      if (context.employeeId) {
        message += ` (Employee: ${context.employeeId})`;
      }

      // Send notification based on severity (if an employeeId is available)
      if (context.employeeId) {
        if (error.severity === 'Critical') {
          await notificationService.createNotification(
            context.employeeId,
            'Critical Payroll Error',
            message,
            'error'
          );
        } else if (error.severity === 'High') {
          await notificationService.createNotification(
            context.employeeId,
            'High Priority Payroll Error',
            message,
            'warning'
          );
        }
      }
    } catch (notificationError) {
      console.error('Error sending error notification:', notificationError);
    }
  },

  async scheduleRetry(error: PayrollError, maxRetries: number): Promise<void> {
    // In a real implementation, this would schedule a retry job
    // For now, just log the retry scheduling
    console.log(`Scheduling retry for error ${error.id} (max retries: ${maxRetries})`);
  },

  async escalateError(error: PayrollError): Promise<void> {
    // In a real implementation, this would escalate to management or external systems
    console.log(`Escalating critical error ${error.id} to management`);
  },

  mapErrorFromDb(data: any): PayrollError {
    return {
      id: data.id,
      payrollRunId: data.payroll_run_id,
      employeeId: data.employee_id,
      errorType: data.error_type,
      errorCode: data.error_code,
      message: data.message,
      details: data.details,
      severity: data.severity,
      status: data.status,
      createdAt: data.created_at,
      resolvedAt: data.resolved_at,
      resolvedBy: data.resolved_by,
      resolutionNotes: data.resolution_notes
    };
  }
};
