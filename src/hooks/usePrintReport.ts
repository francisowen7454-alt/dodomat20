import { useState, useMemo, useCallback } from 'react';
import { DailyOperationalReport, DailyReportItem, PeriodType } from '../types';

export type PrintReportScope = 'daily' | 'date_range' | 'period' | 'all';

export interface UsePrintReportOptions {
  initialReports?: DailyOperationalReport[];
  defaultDate?: string;
  defaultScope?: PrintReportScope;
  defaultPeriodType?: PeriodType;
}

export interface UsePrintReportReturn {
  // Filter states
  scope: PrintReportScope;
  setScope: (scope: PrintReportScope) => void;
  singleDate: string;
  setSingleDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  periodType: PeriodType;
  setPeriodType: (period: PeriodType) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedStaff: string;
  setSelectedStaff: (staff: string) => void;

  // Filtered calculation outputs
  filteredReports: DailyOperationalReport[];
  aggregatedProductItems: Array<DailyReportItem & { category?: string; countOfReports: number }>;
  totals: {
    revenue: number;
    quantity: number;
    pv: number;
    quantumTests: number;
    bodyAnalyzerTests: number;
    kitsRegistered: number;
    reportsCount: number;
  };

  // Metadata
  reportTitle: string;
  reportSubtitle: string;
  isPrinting: boolean;
  triggerPrint: () => void;
  resetFilters: () => void;
}

export const usePrintReport = ({
  initialReports = [],
  defaultDate = new Date().toISOString().slice(0, 10),
  defaultScope = 'daily',
  defaultPeriodType = 'weekly',
}: UsePrintReportOptions = {}): UsePrintReportReturn => {
  const [scope, setScope] = useState<PrintReportScope>(defaultScope);
  const [singleDate, setSingleDate] = useState<string>(defaultDate);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(defaultDate);
    d.setDate(d.getDate() - 6);
    return isNaN(d.getTime()) ? defaultDate : d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(defaultDate);
  const [periodType, setPeriodType] = useState<PeriodType>(defaultPeriodType);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // 1. Filter reports based on chosen scope
  const filteredReports = useMemo(() => {
    return initialReports.filter((report) => {
      // Staff filter
      if (selectedStaff !== 'all' && report.staffUsername !== selectedStaff) {
        return false;
      }

      // Scope date logic
      if (scope === 'daily') {
        return report.reportDate === singleDate;
      }

      if (scope === 'date_range') {
        return report.reportDate >= startDate && report.reportDate <= endDate;
      }

      if (scope === 'period') {
        const anchor = new Date(endDate);
        const y = anchor.getFullYear();
        const m = anchor.getMonth();
        const d = anchor.getDate();
        let pStart = '';
        let pEnd = endDate;

        if (periodType === 'weekly') {
          const w = new Date(anchor);
          w.setDate(d - 6);
          pStart = w.toISOString().slice(0, 10);
        } else if (periodType === 'monthly') {
          pStart = new Date(y, m, 1).toISOString().slice(0, 10);
          pEnd = new Date(y, m + 1, 0).toISOString().slice(0, 10);
        } else if (periodType === 'quarterly') {
          const q = Math.floor(m / 3);
          pStart = new Date(y, q * 3, 1).toISOString().slice(0, 10);
          pEnd = new Date(y, (q + 1) * 3, 0).toISOString().slice(0, 10);
        } else if (periodType === 'semi-annual') {
          const isH1 = m < 6;
          pStart = new Date(y, isH1 ? 0 : 6, 1).toISOString().slice(0, 10);
          pEnd = new Date(y, isH1 ? 6 : 12, 0).toISOString().slice(0, 10);
        } else if (periodType === 'annual') {
          pStart = new Date(y, 0, 1).toISOString().slice(0, 10);
          pEnd = new Date(y, 11, 31).toISOString().slice(0, 10);
        } else {
          pStart = endDate;
        }

        return report.reportDate >= pStart && report.reportDate <= pEnd;
      }

      // 'all' scope
      return true;
    });
  }, [initialReports, scope, singleDate, startDate, endDate, periodType, selectedStaff]);

  // 2. Aggregate line items and apply category filter
  const aggregatedProductItems = useMemo(() => {
    const itemMap = new Map<string, DailyReportItem & { category?: string; countOfReports: number }>();

    filteredReports.forEach((report) => {
      report.items.forEach((item) => {
        // If category filter is applied, we will match if item category matches (or keep if unknown)
        const existing = itemMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalAmount += item.totalAmount;
          existing.totalPv += item.totalPv;
          if (item.quantity > 0) {
            existing.countOfReports += 1;
          }
        } else {
          itemMap.set(item.productId, {
            ...item,
            countOfReports: item.quantity > 0 ? 1 : 0,
          });
        }
      });
    });

    const items = Array.from(itemMap.values());

    // Filter by category if specified and category is known or attached
    if (selectedCategory !== 'all') {
      return items.filter((it) => {
        // Match product category
        return (it as any).category === selectedCategory;
      });
    }

    // Sort alphabetically by product name
    return items.sort((a, b) => a.productName.localeCompare(b.productName));
  }, [filteredReports, selectedCategory]);

  // 3. Compute grand totals
  const totals = useMemo(() => {
    let revenue = 0;
    let quantity = 0;
    let pv = 0;
    let quantumTests = 0;
    let bodyAnalyzerTests = 0;
    let kitsRegistered = 0;

    // Revenue, quantity, PV calculated from aggregated items to respect category filter
    aggregatedProductItems.forEach((it) => {
      revenue += it.totalAmount;
      quantity += it.quantity;
      pv += it.totalPv;
    });

    // Clinical diagnostics calculated across the matching reports
    filteredReports.forEach((rep) => {
      quantumTests += rep.quantumTestCount || 0;
      bodyAnalyzerTests += rep.bodyAnalyzerTestCount || 0;
      kitsRegistered += rep.kitRegisteredCount || 0;
    });

    return {
      revenue,
      quantity,
      pv: Number(pv.toFixed(2)),
      quantumTests,
      bodyAnalyzerTests,
      kitsRegistered,
      reportsCount: filteredReports.length,
    };
  }, [aggregatedProductItems, filteredReports]);

  // 4. Readable titles
  const reportTitle = useMemo(() => {
    if (scope === 'daily') {
      return `BF SUMA TANZANIA - DAILY OPERATIONAL REPORT (${singleDate})`;
    }
    if (scope === 'date_range') {
      return `BF SUMA TANZANIA - PERIOD AUDIT REPORT (${startDate} to ${endDate})`;
    }
    if (scope === 'period') {
      return `BF SUMA TANZANIA - ${periodType.toUpperCase()} CONSOLIDATED REPORT`;
    }
    return 'BF SUMA TANZANIA - COMPLETE ACCUMULATED OPERATIONAL REPORT';
  }, [scope, singleDate, startDate, endDate, periodType]);

  const reportSubtitle = useMemo(() => {
    const catStr = selectedCategory === 'all' ? 'All BF Suma Categories' : `Category: ${selectedCategory}`;
    const staffStr = selectedStaff === 'all' ? 'All Staff Submissions' : `Staff: @${selectedStaff}`;
    return `${catStr} | ${staffStr} | Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }, [selectedCategory, selectedStaff]);

  // 5. Trigger browser print dialog
  const triggerPrint = useCallback(() => {
    setIsPrinting(true);
    // Short timeout to let the print media layout settle in DOM
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  }, []);

  const resetFilters = useCallback(() => {
    setScope('daily');
    setSingleDate(defaultDate);
    setSelectedCategory('all');
    setSelectedStaff('all');
  }, [defaultDate]);

  return {
    scope,
    setScope,
    singleDate,
    setSingleDate,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    periodType,
    setPeriodType,
    selectedCategory,
    setSelectedCategory,
    selectedStaff,
    setSelectedStaff,
    filteredReports,
    aggregatedProductItems,
    totals,
    reportTitle,
    reportSubtitle,
    isPrinting,
    triggerPrint,
    resetFilters,
  };
};
