import {
  PeriodType,
  PeriodAggregatedReport,
  DailyOperationalReport,
} from '../types';
import { StorageService } from './storage';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  periodLabel: string;
}

export class ReportingService {
  static getStandardRanges(anchorDateStr = '2026-10-22'): {
    daily: DateRange;
    weekly: DateRange;
    monthly: DateRange;
    quarterly: DateRange;
    semiAnnual: DateRange;
    annual: DateRange;
  } {
    const anchor = new Date(anchorDateStr);
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const d = anchor.getDate();

    const dailyStr = anchor.toISOString().slice(0, 10);
    const daily: DateRange = {
      startDate: dailyStr,
      endDate: dailyStr,
      periodLabel: `Daily (${dailyStr})`,
    };

    const weekStart = new Date(anchor);
    weekStart.setDate(d - 6);
    const weekly: DateRange = {
      startDate: weekStart.toISOString().slice(0, 10),
      endDate: dailyStr,
      periodLabel: `Weekly (${weekStart.toISOString().slice(0, 10)} to ${dailyStr})`,
    };

    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0);
    const monthly: DateRange = {
      startDate: monthStart.toISOString().slice(0, 10),
      endDate: monthEnd.toISOString().slice(0, 10),
      periodLabel: `Monthly (${monthStart.toLocaleString('default', { month: 'long', year: 'numeric' })})`,
    };

    const currentQuarter = Math.floor(m / 3);
    const qStart = new Date(y, currentQuarter * 3, 1);
    const qEnd = new Date(y, (currentQuarter + 1) * 3, 0);
    const quarterly: DateRange = {
      startDate: qStart.toISOString().slice(0, 10),
      endDate: qEnd.toISOString().slice(0, 10),
      periodLabel: `Q${currentQuarter + 1} (${qStart.toISOString().slice(0, 10)} to ${qEnd.toISOString().slice(0, 10)})`,
    };

    const isH1 = m < 6;
    const hStart = new Date(y, isH1 ? 0 : 6, 1);
    const hEnd = new Date(y, isH1 ? 6 : 12, 0);
    const semiAnnual: DateRange = {
      startDate: hStart.toISOString().slice(0, 10),
      endDate: hEnd.toISOString().slice(0, 10),
      periodLabel: `${isH1 ? 'H1' : 'H2'} (${hStart.toISOString().slice(0, 10)} to ${hEnd.toISOString().slice(0, 10)})`,
    };

    const aStart = new Date(y, 0, 1);
    const aEnd = new Date(y, 11, 31);
    const annual: DateRange = {
      startDate: aStart.toISOString().slice(0, 10),
      endDate: aEnd.toISOString().slice(0, 10),
      periodLabel: `Annual (${y})`,
    };

    return { daily, weekly, monthly, quarterly, semiAnnual, annual };
  }

  static generatePeriodReport(periodType: PeriodType, anchorDateStr = '2026-10-22'): PeriodAggregatedReport {
    return StorageService.getAggregatedPeriodReport(periodType, anchorDateStr);
  }
}
