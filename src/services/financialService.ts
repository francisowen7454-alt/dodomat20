/**
 * BF Suma PV Profit & Financial Management Service
 * Strict Business Formula Enforcement:
 * 1. Commission = 4.5% of Total PV (commissionUnits = totalPV * 0.045)
 * 2. Conversion Factor = TSh 2,800 per commission unit
 * 3. Store Profit = totalPV * 0.045 * 2800 (or commissionUnits * 2800)
 * 4. Net Amount = Store Profit - Total Expenses
 * 5. Status: PROFIT (net > 0), LOSS (net < 0), BREAK EVEN (net === 0)
 */

import { DailyOperationalReport, Expense, FinancialPeriod, FinancialStatus, FinancialSummary } from '../types';

export const COMMISSION_RATE = 0.045; // 4.5%
export const CONVERSION_FACTOR = 2800; // TSh 2,800 per commission unit

/**
 * Standalone calculation function: Store Profit based on total PV
 * Formula: totalPV * 0.045 * 2800
 */
export function calculateStoreProfit(totalPV: number): number {
  const safePV = Math.max(0, Number(totalPV) || 0);
  return Math.round(safePV * COMMISSION_RATE * CONVERSION_FACTOR);
}

/**
 * Standalone calculation function: Net Amount
 * Formula: profit - expenses
 */
export function calculateNetAmount(profit: number, expenses: number): number {
  const safeProfit = Number(profit) || 0;
  const safeExpenses = Number(expenses) || 0;
  return Math.round(safeProfit - safeExpenses);
}

export const EXPENSE_CATEGORIES = [
  'Salaries',
  'Rent',
  'Electricity and Utilities',
  'Transport',
  'Office Expenses',
  'Other Operating Expenses',
] as const;

export class FinancialService {
  /**
   * Calculate Store Profit from Point Value (PV)
   * Formula: totalPV * 0.045 * 2800
   * Returns breakdown object including numeric storeProfit
   */
  public static calculateStoreProfit(totalPV: number): {
    totalPV: number;
    commissionUnits: number;
    storeProfit: number;
  } {
    const safePV = Math.max(0, Number(totalPV) || 0);
    // Round commission units to 4 decimal places for floating point safety
    const commissionUnits = Math.round(safePV * COMMISSION_RATE * 10000) / 10000;
    const storeProfit = Math.round(safePV * COMMISSION_RATE * CONVERSION_FACTOR);
    return {
      totalPV: safePV,
      commissionUnits,
      storeProfit,
    };
  }

  /**
   * Calculate Store Profit directly as number
   * Formula: totalPV * 0.045 * 2800
   */
  public static calculateProfit(totalPV: number): number {
    return calculateStoreProfit(totalPV);
  }

  /**
   * Calculate Net Amount (profit - expenses)
   * Formula: profit - expenses
   */
  public static calculateNetAmount(profit: number, expenses: number): number {
    return calculateNetAmount(profit, expenses);
  }

  /**
   * Calculate Net Position from PV and Expenses
   */
  public static calculateNetPosition(totalPV: number, expenses: number): {
    totalPV: number;
    commissionUnits: number;
    storeProfit: number;
    totalExpenses: number;
    netAmount: number;
    status: FinancialStatus;
  } {
    const { commissionUnits, storeProfit } = this.calculateStoreProfit(totalPV);
    const safeExpenses = Math.max(0, Number(expenses) || 0);
    const netAmount = calculateNetAmount(storeProfit, safeExpenses);
    let status: FinancialStatus = 'BREAK EVEN';
    if (netAmount > 0) {
      status = 'PROFIT';
    } else if (netAmount < 0) {
      status = 'LOSS';
    } else {
      status = 'BREAK EVEN';
    }

    return {
      totalPV: Math.max(0, Number(totalPV) || 0),
      commissionUnits,
      storeProfit,
      totalExpenses: safeExpenses,
      netAmount,
      status,
    };
  }

  /**
   * Format number as Tanzanian Shillings: e.g. "TSh 730,800"
   */
  public static formatCurrency(amount: number): string {
    const safeAmount = Math.round(Number(amount) || 0);
    const absStr = Math.abs(safeAmount).toLocaleString('en-US');
    if (safeAmount < 0) {
      return `-TSh ${absStr}`;
    }
    return `TSh ${absStr}`;
  }

  /**
   * Determine date range for financial periods
   * Period boundaries strictly aligned with YYYY-MM-DD
   */
  public static getPeriodDateRange(
    period: FinancialPeriod,
    anchorDateStr: string = new Date().toISOString().slice(0, 10)
  ): { startDate: string; endDate: string; label: string } {
    const anchor = new Date(anchorDateStr);
    const validAnchor = isNaN(anchor.getTime()) ? new Date() : anchor;

    const year = validAnchor.getFullYear();
    const month = validAnchor.getMonth(); // 0-indexed

    const pad = (n: number) => String(n).padStart(2, '0');

    let startDate: string;
    let endDate: string;
    let label: string;

    switch (period) {
      case 'monthly': {
        // First day of current month to last day of current month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        startDate = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-01`;
        endDate = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
        label = `Monthly Financial Period (${firstDay.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
        break;
      }
      case 'quarterly': {
        // 3 calendar months window up to end of current month
        const startMonthIndex = Math.max(0, month - 2);
        const firstDay = new Date(year, startMonthIndex, 1);
        const lastDay = new Date(year, month + 1, 0);
        startDate = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-01`;
        endDate = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
        label = `Quarterly Financial Period (3 Months: ${firstDay.toLocaleString('default', { month: 'short' })} - ${lastDay.toLocaleString('default', { month: 'short', year: 'numeric' })})`;
        break;
      }
      case 'semi-annual': {
        // 6 calendar months window up to end of current month
        const startMonthIndex = Math.max(0, month - 5);
        const firstDay = new Date(year, startMonthIndex, 1);
        const lastDay = new Date(year, month + 1, 0);
        startDate = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-01`;
        endDate = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
        label = `Semi-Annual Financial Period (6 Months: ${firstDay.toLocaleString('default', { month: 'short' })} - ${lastDay.toLocaleString('default', { month: 'short', year: 'numeric' })})`;
        break;
      }
      case 'annual': {
        // 12 calendar months window: full calendar year
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
        label = `Annual Financial Period (Calendar Year ${year})`;
        break;
      }
    }

    return { startDate, endDate, label };
  }

  /**
   * Filter records and calculate financial summary
   */
  public static calculateSummary(
    reports: DailyOperationalReport[],
    expenses: Expense[],
    period: FinancialPeriod,
    anchorDateStr: string = new Date().toISOString().slice(0, 10)
  ): FinancialSummary {
    const { startDate, endDate } = this.getPeriodDateRange(period, anchorDateStr);

    // 1. Filter daily reports in range without double counting (unique by reportDate)
    const seenDates = new Set<string>();
    const periodReports = reports.filter((r) => {
      const date = r.reportDate;
      if (!date || date < startDate || date > endDate) return false;
      if (seenDates.has(date)) return false;
      seenDates.add(date);
      return true;
    });

    const totalPV = periodReports.reduce((sum, r) => sum + (Number(r.totalPv) || 0), 0);
    const { commissionUnits, storeProfit } = this.calculateStoreProfit(totalPV);

    // 2. Filter expenses within exact same date range
    const periodExpenses = expenses.filter((e) => {
      const date = e.expenseDate;
      return date && date >= startDate && date <= endDate;
    });

    // 3. Category breakdown
    const expensesByCategory: Record<string, number> = {
      Salaries: 0,
      Rent: 0,
      'Electricity and Utilities': 0,
      Transport: 0,
      'Office Expenses': 0,
      'Other Operating Expenses': 0,
    };

    let totalExpenses = 0;
    periodExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      const cat = exp.category || 'Other Operating Expenses';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
    });

    // 4. Net Amount and Status
    const netAmount = storeProfit - totalExpenses;
    let status: FinancialStatus = 'BREAK EVEN';
    if (netAmount > 0) {
      status = 'PROFIT';
    } else if (netAmount < 0) {
      status = 'LOSS';
    } else {
      status = 'BREAK EVEN';
    }

    return {
      period,
      startDate,
      endDate,
      totalPV,
      commissionUnits,
      commissionRate: COMMISSION_RATE,
      conversionFactor: CONVERSION_FACTOR,
      storeProfit,
      totalExpenses,
      netAmount,
      status,
      expensesByCategory,
      expenseCount: periodExpenses.length,
      reportCount: periodReports.length,
    };
  }

  /**
   * Generates a 30-day consecutive daily profit & expense trend ledger ending on anchorDate
   */
  public static get30DayTrend(
    reports: DailyOperationalReport[],
    expenses: Expense[],
    anchorDateStr: string = new Date().toISOString().slice(0, 10)
  ): {
    days: DailyFinancialRecord[];
    summary: {
      total30DayPV: number;
      total30DayProfit: number;
      total30DayExpenses: number;
      net30DayAmount: number;
      status: FinancialStatus;
      profitableDaysCount: number;
      lossDaysCount: number;
      breakEvenDaysCount: number;
      activeReportingDaysCount: number;
      expenseRecordsCount: number;
    };
  } {
    // Parse anchor date components strictly to avoid timezone shifts
    const parts = anchorDateStr.split('-').map(Number);
    const year = parts[0] || new Date().getFullYear();
    const month = (parts[1] || 1) - 1;
    const day = parts[2] || 1;
    const anchorDate = new Date(Date.UTC(year, month, day));

    // Map reports by date for O(1) lookup
    const reportMap = new Map<string, DailyOperationalReport>();
    reports.forEach((r) => {
      if (r.reportDate) reportMap.set(r.reportDate, r);
    });

    // Map expenses by date
    const expenseMap = new Map<string, Expense[]>();
    expenses.forEach((e) => {
      if (e.expenseDate) {
        const list = expenseMap.get(e.expenseDate) || [];
        list.push(e);
        expenseMap.set(e.expenseDate, list);
      }
    });

    const days: DailyFinancialRecord[] = [];
    let total30DayPV = 0;
    let total30DayProfit = 0;
    let total30DayExpenses = 0;
    let profitableDaysCount = 0;
    let lossDaysCount = 0;
    let breakEvenDaysCount = 0;
    let activeReportingDaysCount = 0;
    let expenseRecordsCount = 0;

    const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setUTCDate(d.getUTCDate() - i);
      const yStr = d.getUTCFullYear();
      const mStr = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getUTCDate()).padStart(2, '0');
      const dateKey = `${yStr}-${mStr}-${dayStr}`;

      const rep = reportMap.get(dateKey);
      const dayExpenses = expenseMap.get(dateKey) || [];

      const dayPV = rep ? (Number(rep.totalPv) || 0) : 0;
      const { commissionUnits, storeProfit } = this.calculateStoreProfit(dayPV);
      const dayTotalExpenses = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const netAmount = storeProfit - dayTotalExpenses;

      let status: FinancialStatus = 'BREAK EVEN';
      if (netAmount > 0) {
        status = 'PROFIT';
        profitableDaysCount++;
      } else if (netAmount < 0) {
        status = 'LOSS';
        lossDaysCount++;
      } else {
        status = 'BREAK EVEN';
        breakEvenDaysCount++;
      }

      if (rep && (rep.totalSalesAmount > 0 || dayPV > 0)) {
        activeReportingDaysCount++;
      }
      expenseRecordsCount += dayExpenses.length;

      total30DayPV += dayPV;
      total30DayProfit += storeProfit;
      total30DayExpenses += dayTotalExpenses;

      const dayName = weekdayShort[d.getUTCDay()];
      const monthName = monthShort[d.getUTCMonth()];
      const dayLabel = `${dayName}, ${monthName} ${d.getUTCDate()}`;

      days.push({
        date: dateKey,
        dayLabel,
        totalPV: dayPV,
        commissionUnits,
        storeProfit,
        totalExpenses: dayTotalExpenses,
        netAmount,
        status,
        expenses: dayExpenses,
        report: rep,
      });
    }

    const net30DayAmount = total30DayProfit - total30DayExpenses;
    let overallStatus: FinancialStatus = 'BREAK EVEN';
    if (net30DayAmount > 0) {
      overallStatus = 'PROFIT';
    } else if (net30DayAmount < 0) {
      overallStatus = 'LOSS';
    }

    return {
      days,
      summary: {
        total30DayPV,
        total30DayProfit,
        total30DayExpenses,
        net30DayAmount,
        status: overallStatus,
        profitableDaysCount,
        lossDaysCount,
        breakEvenDaysCount,
        activeReportingDaysCount,
        expenseRecordsCount,
      },
    };
  }
}

export interface DailyFinancialRecord {
  date: string;
  dayLabel: string;
  totalPV: number;
  commissionUnits: number;
  storeProfit: number;
  totalExpenses: number;
  netAmount: number;
  status: FinancialStatus;
  expenses: Expense[];
  report?: DailyOperationalReport;
}

export const financialService = FinancialService;
export default FinancialService;


