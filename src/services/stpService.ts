import { supabase } from '@/lib/supabase';
import { STPPayEvent, STPPayeePayload } from '@/types/payroll';
import { Payslip } from '@/types';
import { generatePayEvent as generateLogic } from '@/lib/payroll/stpService';

export const stpService = {
  async getEvents(): Promise<STPPayEvent[]> {
    const { data, error } = await supabase
      .from('stp_events')
      .select(`
        *,
        payees:stp_payees(*)
      `)
      .order('submission_date', { ascending: false });

    if (error) {
      console.error('Error fetching STP events:', error);
      return [];
    }

    return data.map(transformEvent);
  },

  async createEvent(event: STPPayEvent) {
    // 1. Create Event
    const { error: eventError } = await supabase
      .from('stp_events')
      .insert({
        id: event.id,
        submission_date: event.submissionDate,
        run_date: event.runDate,
        transaction_id: event.transactionId,
        status: event.status,
        employee_count: event.employeeCount,
        total_gross: event.totalGross,
        total_tax: event.totalTax,
        total_super: event.totalSuper,
        response_message: event.responseMessage
      });

    if (eventError) {
      console.error('Error creating STP event:', eventError);
      throw eventError;
    }

    // 2. Create Payees
    const payeesToInsert = event.payees.map(p => ({
      event_id: event.id,
      employee_id: p.employeeId,
      ytd_gross: p.ytdGross,
      ytd_tax: p.ytdTax,
      ytd_super: p.ytdSuper,
      pay_period_gross: p.payPeriodGross,
      pay_period_tax: p.payPeriodTax,
      pay_period_super: p.payPeriodSuper
    }));

    const { error: payeesError } = await supabase
      .from('stp_payees')
      .insert(payeesToInsert);

    if (payeesError) {
      console.error('Error creating STP payees:', payeesError);
      throw payeesError;
    }

    return event;
  },

  async updateEventStatus(id: string, status: 'Submitted' | 'Accepted' | 'Rejected', message?: string) {
    const { error } = await supabase
      .from('stp_events')
      .update({
        status,
        response_message: message,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating STP event status:', error);
      throw error;
    }
  },

  // Helper to generate event using existing logic but fetching real previous events
  async generateEvent(payRunId: string, payslips: Payslip[]): Promise<STPPayEvent> {
    const previousEvents = await this.getEvents();
    return generateLogic(payRunId, payslips, previousEvents);
  }
};

function transformEvent(data: any): STPPayEvent {
  return {
    id: data.id,
    submissionDate: data.submission_date,
    runDate: data.run_date,
    transactionId: data.transaction_id,
    status: data.status,
    employeeCount: data.employee_count,
    totalGross: data.total_gross,
    totalTax: data.total_tax,
    totalSuper: data.total_super,
    responseMessage: data.response_message,
    payees: (data.payees || []).map((p: any) => ({
      employeeId: p.employee_id,
      ytdGross: p.ytd_gross,
      ytdTax: p.ytd_tax,
      ytdSuper: p.ytd_super,
      payPeriodGross: p.pay_period_gross,
      payPeriodTax: p.pay_period_tax,
      payPeriodSuper: p.pay_period_super
    }))
  };
}
