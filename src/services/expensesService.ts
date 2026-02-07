import { supabase } from '@/lib/supabase';
import { ExpenseClaim, ExpenseItem } from '@/types';

export const expensesService = {
  async getExpenses(): Promise<ExpenseClaim[]> {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }

    if (!expenses.length) return [];

    const expenseIds = expenses.map(e => e.id);
    const { data: items, error: itemsError } = await supabase
      .from('expense_items')
      .select('*')
      .in('claim_id', expenseIds);

    if (itemsError) {
      console.error('Error fetching expense items:', itemsError);
    }

    const expensesWithItems = expenses.map(expense => {
      const expenseItems = items?.filter(item => item.claim_id === expense.id) || [];
      return { ...expense, items: expenseItems };
    });

    return expensesWithItems.map(transformExpense);
  },

  async getExpenseById(id: string): Promise<ExpenseClaim | null> {
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching expense ${id}:`, error);
      return null;
    }

    const { data: items, error: itemsError } = await supabase
      .from('expense_items')
      .select('*')
      .eq('claim_id', id);

    if (itemsError) {
      console.error(`Error fetching items for expense ${id}:`, itemsError);
    }

    return transformExpense({ ...expense, items: items || [] });
  },

  async createExpense(expense: Omit<ExpenseClaim, 'id' | 'status' | 'dateSubmitted' | 'items'>, items: Omit<ExpenseItem, 'id' | 'claimId'>[]) {
    // 1. Create Expense
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        employee_id: expense.employeeId,
        title: expense.title,
        total_amount: expense.totalAmount,
        status: 'Submitted',
        date_submitted: new Date().toISOString()
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Error creating expense:', expenseError);
      throw expenseError;
    }

    // 2. Create Items
    const itemsToInsert = items.map(item => ({
      claim_id: expenseData.id,
      category_id: item.categoryId,
      type_id: item.typeId,
      date: item.date,
      amount: item.amount,
      description: item.description,
      receipt_url: item.receiptUrl
    }));

    const { error: itemsError } = await supabase
      .from('expense_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating expense items:', itemsError);
      // Ideally we would rollback here, but Supabase HTTP API doesn't support transactions easily without RPC
      throw itemsError;
    }

    return transformExpense({ ...expenseData, items: itemsToInsert });
  },

  async updateExpenseStatus(id: string, status: 'Approved' | 'Rejected', approverId: string) {
    const { error } = await supabase
      .from('expenses')
      .update({
        status,
        approved_by: approverId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating expense status:', error);
      throw error;
    }
  }
};

function transformExpense(data: any): ExpenseClaim {
  return {
    id: data.id,
    employeeId: data.employee_id,
    title: data.title,
    dateSubmitted: data.date_submitted,
    status: data.status,
    totalAmount: data.total_amount,
    approvedBy: data.approved_by,
    items: (data.items || []).map((item: any) => ({
      id: item.id,
      claimId: item.claim_id,
      categoryId: item.category_id,
      typeId: item.type_id,
      date: item.date,
      amount: item.amount,
      description: item.description,
      receiptUrl: item.receipt_url
    }))
  };
}
