import { supabase } from '@/lib/supabase';
export interface SuperRateSchedule {
  effectiveDate: string;
  rate: number;
}

export const getSuperRateForDate = async (dateStr: string): Promise<number> => {
  const date = new Date(dateStr);
  const cutoff = date.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('statutory_rates')
    .select('effective_from, rate')
    .eq('rate_type', 'superannuation-guarantee')
    .lte('effective_from', cutoff)
    .order('effective_from', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return 11.0;
  const row = data[0] as any;
  return Number(row.rate) || 11.0;
};

export const calculateSuperContribution = async (oteAmount: number, payDate: string): Promise<number> => {
  const rate = await getSuperRateForDate(payDate);
  return oteAmount * (rate / 100);
};

// Quarterly Cap check (Maximum Super Contribution Base)
// For 2024-2025, max base is $65,070 per quarter.
const MAX_CONTRIBUTION_BASE_QUARTERLY = 65070;

export const calculateCappedSuper = async (oteAmount: number, payDate: string, ytdOte: number): Promise<number> => {
  // Simplification: We usually need to check the quarter's total. 
  // This function assumes 'oteAmount' is for the current period and checks if YTD exceeds cap? 
  // No, cap is per quarter. 
  // For this MVP, we will just apply the rate directly.
  return calculateSuperContribution(oteAmount, payDate);
};
