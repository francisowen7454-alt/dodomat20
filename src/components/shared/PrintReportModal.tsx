import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyOperationalReport, PeriodType } from '../../types';
import { usePrintReport, PrintReportScope } from '../../hooks/usePrintReport';
import { BF_SUMA_CATEGORIES } from '../../services/geminiService';
import { FinancialService } from '../../services/financialService';
import {
  Printer,
  X,
  Calendar,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  UserCheck,
  ShieldCheck,
  DollarSign,
  Activity,
  Layers,
  RotateCcw,
  Download,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Expense } from '../../types';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DailyOperationalReport[];
  expenses?: Expense[];
  defaultDate?: string;
  defaultScope?: PrintReportScope;
  userRole?: 'staff' | 'manager';
  currentUsername?: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  reports,
  expenses,
  defaultDate = '2026-10-22',
  defaultScope = 'daily',
  userRole = 'staff',
  currentUsername,
}) => {
  const {
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
    triggerPrint,
    resetFilters,
  } = usePrintReport({
    initialReports: reports,
    defaultDate,
    defaultScope,
  });

  // Load expenses and calculate financial position based on report scope
  const allExpenses = expenses && expenses.length > 0 ? expenses : StorageService.getExpenses();
  const relevantExpenses = allExpenses.filter((e) => {
    if (scope === 'daily') {
      return e.expenseDate === (singleDate || defaultDate);
    }
    if (scope === 'date_range') {
      return e.expenseDate >= startDate && e.expenseDate <= endDate;
    }
    if (scope === 'period') {
      if (filteredReports.length > 0) {
        const dates = filteredReports.map((r) => r.reportDate).sort();
        return e.expenseDate >= dates[0] && e.expenseDate <= dates[dates.length - 1];
      }
      return true;
    }
    return true;
  });

  const totalScopeExpenses = relevantExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const financialPosition = FinancialService.calculateNetPosition(totals.pv, totalScopeExpenses);

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Brand Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 55, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('T20 SERVER OPERATIONS', 30, 26);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(52, 211, 153); // emerald-400
      doc.text('BF SUMA TANZANIA HEALTHCARE NETWORK', 30, 42);

      const genTime = new Date().toLocaleString('en-GB');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Generated: ${genTime} | User: @${currentUsername || userRole}`, pageWidth - 30, 34, { align: 'right' });

      // Report Title block
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(reportTitle.toUpperCase(), 30, 78);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(reportSubtitle, 30, 92);

      // Summary KPI boxes (5 metrics)
      const boxY = 104;
      const boxGap = 6;
      const boxWidth = (pageWidth - 60 - boxGap * 4) / 5;
      const boxHeight = 42;

      const metrics = [
        { label: 'TOTAL REVENUE', val: `TSh ${totals.revenue.toLocaleString()}` },
        { label: 'TOTAL PV', val: `${totals.pv.toLocaleString()} PV` },
        { label: 'STORE PROFIT (4.5%)', val: `TSh ${financialPosition.storeProfit.toLocaleString()}` },
        { label: 'EXPENSES', val: `TSh ${financialPosition.totalExpenses.toLocaleString()}` },
        { label: `NET: ${financialPosition.status}`, val: `TSh ${financialPosition.netAmount.toLocaleString()}` },
      ];

      metrics.forEach((m, idx) => {
        const x = 30 + idx * (boxWidth + boxGap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, boxY, boxWidth, boxHeight, 4, 4, 'FD');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(m.label, x + 6, boxY + 13);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(m.val, x + 6, boxY + 30);
      });

      // Product items table
      const activeProducts = aggregatedProductItems.filter((i) => i.quantity > 0);
      const productRows = (activeProducts.length > 0 ? activeProducts : aggregatedProductItems.slice(0, 15)).map((item, idx) => [
        String(idx + 1),
        item.productName,
        item.category || 'General',
        item.productPrice.toLocaleString(),
        item.pv ? item.pv.toFixed(1) : '0.0',
        String(item.quantity),
        item.totalPv ? item.totalPv.toFixed(1) : '0.0',
        item.totalAmount.toLocaleString(),
      ]);

      // Add Product Table using autoTable
      autoTable(doc, {
        startY: boxY + boxHeight + 14,
        head: [['#', 'Product Name', 'Category', 'Price (TSh)', 'PV', 'Qty', 'Total PV', 'Amount (TSh)']],
        body: productRows,
        foot: [
          [
            '',
            'TOTAL RECONCILED',
            '',
            '',
            '',
            String(totals.quantity),
            totals.pv.toLocaleString(),
            totals.revenue.toLocaleString(),
          ],
        ],
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 20 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 30, right: 30 },
      });

      // Financial Reconciliation Table (Store Profit Formula & Net Calculation)
      const afterProductY = (doc as any).lastAutoTable?.finalY || 300;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('FINANCIAL RECONCILIATION & STORE PV PROFIT (Formula: Total PV x 4.5% x 2,800)', 30, afterProductY + 20);

      autoTable(doc, {
        startY: afterProductY + 26,
        head: [['Financial Parameter', 'Calculation Formula / Multiplier', 'Reconciled Amount (TSh)']],
        body: [
          ['Total Point Value (PV)', 'Sum of all sold product PVs', `${totals.pv.toLocaleString()} PV`],
          ['BF Suma Commission Rate', '4.5% of Total PV', `${financialPosition.commissionUnits.toLocaleString()} Units`],
          ['Conversion Factor', 'Fixed Business Calculation Factor', 'TSh 2,800 / Unit'],
          ['Store Profit from PV', 'Total PV x 0.045 x 2800', `TSh ${financialPosition.storeProfit.toLocaleString()}`],
          ['Total Operating Expenses', `${relevantExpenses.length} Expense Record(s)`, `TSh ${financialPosition.totalExpenses.toLocaleString()}`],
          [`Net Amount (Profit - Expenses) [${financialPosition.status}]`, 'Store Profit - Operating Expenses', `TSh ${financialPosition.netAmount.toLocaleString()}`],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 30, right: 30 },
      });

      // Daily summaries table if more than 1 report
      if (filteredReports.length > 1) {
        const finalY = (doc as any).lastAutoTable?.finalY || 450;
        if (finalY + 120 < pageHeight) {
          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text('DAILY OPERATIONAL SUBMISSIONS BREAKDOWN', 30, finalY + 20);

          const reportRows = filteredReports.map((r) => [
            r.reportDate,
            `@${r.staffUsername}`,
            String(r.totalQuantitySold),
            (r.totalPv || 0).toLocaleString(),
            `Q:${r.quantumTestCount || 0} | B:${r.bodyAnalyzerTestCount || 0}`,
            String(r.kitRegisteredCount || 0),
            r.status.toUpperCase(),
            r.totalSalesAmount.toLocaleString(),
          ]);

          autoTable(doc, {
            startY: finalY + 26,
            head: [['Date', 'Staff', 'Units', 'Total PV', 'Diagnostics', 'Kits', 'Status', 'Sales Amount (TSh)']],
            body: reportRows,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 3.5 },
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
              7: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 30, right: 30 },
          });
        }
      }

      // Add Page Numbers to all pages
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `T20 Server Healthcare Operations | Confidential Audit Report | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 15,
          { align: 'center' }
        );
      }

      const fileName = `T20_Report_${scope}_${(singleDate || defaultDate).replace(/-/g, '')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  if (!isOpen) return null;

  // Unique staff list for filtering (primarily for manager)
  const staffList = Array.from(new Set(reports.map((r) => r.staffUsername))).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Control Bar (Hidden when printing via print:hidden) */}
        <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Print & Export Operational Report</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                  {userRole} portal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Filter by date, range, category, and staff before sending to printer or exporting to PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors min-h-[38px]"
              title="Download clean formatted PDF document"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={triggerPrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Hidden when printing via print:hidden) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Report & Print Filters</span>
            </span>
            <button
              onClick={resetFilters}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Scope Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Report Scope:
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as PrintReportScope)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="daily">Single Day Report</option>
                <option value="date_range">Custom Date Range</option>
                <option value="period">Periodic Report (Weekly / Monthly)</option>
                <option value="all">All Historical Reports</option>
              </select>
            </div>

            {/* Scope Details Inputs */}
            {scope === 'daily' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Select Report Date:
                </label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>
            )}

            {scope === 'date_range' && (
              <div className="sm:col-span-1 lg:col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date (From):</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date (To):</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>
            )}

            {scope === 'period' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Report Period:
                </label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                >
                  <option value="weekly">Weekly (Last 7 Days)</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            )}

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Product Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Product Categories</option>
                {BF_SUMA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Filter (For Manager) */}
            {userRole === 'manager' && staffList.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Submitted By (Staff):
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Staff Members</option>
                  {staffList.map((s) => (
                    <option key={s} value={s}>
                      @{s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* PRINTABLE PREVIEW CANVAS (This part prints cleanly) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white print:p-0 print:overflow-visible">
          <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">
            {/* Document Official Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
                    T20
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                      T20 SERVER OPERATIONS
                    </h1>
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-widest block mt-0.5">
                      BF Suma Tanzania Healthcare Network
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <p>Official Sales, Clinical Diagnostics & Member Kit Reconciliation Ledger</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    System Anchor Date: {defaultDate} | Status: Official Audit Document
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Report Identification
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 block mt-0.5">
                  {scope.toUpperCase()}-REP-{Date.now().toString().slice(-6)}
                </span>
                <span className="text-xs text-slate-500 block mt-1">
                  Printed By: <strong>@{currentUsername || userRole}</strong>
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {new Date().toLocaleString('en-GB')}
                </span>
              </div>
            </div>

            {/* Report Title & Subtitle banner */}
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-slate-900">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                {reportTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-1">{reportSubtitle}</p>
            </div>

            {/* Key Totals Summary Cards (5 Metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Sales Revenue
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-emerald-700 block mt-1">
                  TZS {totals.revenue.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">Tanzania Shillings</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Point Value (PV)
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-amber-700 block mt-1">
                  {totals.pv.toLocaleString()} PV
                </span>
                <span className="text-[10px] text-slate-400">Accumulated PV Points</span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Store Profit (4.5% PV)
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-emerald-800 block mt-1">
                  TZS {financialPosition.storeProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 font-mono">PV × 0.045 × 2,800</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Operating Expenses
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-slate-800 block mt-1">
                  TZS {financialPosition.totalExpenses.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">{relevantExpenses.length} expense record(s)</span>
              </div>

              <div className={`p-3 rounded-xl border ${
                financialPosition.status === 'PROFIT'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : financialPosition.status === 'LOSS'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    Net Position
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                    financialPosition.status === 'PROFIT'
                      ? 'bg-emerald-200 text-emerald-900'
                      : financialPosition.status === 'LOSS'
                      ? 'bg-rose-200 text-rose-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {financialPosition.status}
                  </span>
                </div>
                <span className="text-base sm:text-lg font-mono font-bold block mt-1">
                  TZS {financialPosition.netAmount.toLocaleString()}
                </span>
                <span className="text-[10px] opacity-80">Profit - Expenses</span>
              </div>
            </div>

            {/* Dedicated Financial Performance & PV Profit Reconciliation Section */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      Financial Reconciliation & Store PV Profit Ledger
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Official Formula: <code>Store Profit = Total PV × 4.5% × TSh 2,800</code> | <code>Net Amount = Store Profit - Operating Expenses</code>
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-auto ${
                  financialPosition.status === 'PROFIT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : financialPosition.status === 'LOSS'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  Status: {financialPosition.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">1. Total Point Value (PV)</span>
                  <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                    {totals.pv.toLocaleString()} PV
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Commission: <strong className="text-white font-mono">{financialPosition.commissionUnits.toLocaleString()}</strong> units (4.5%)
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-emerald-500/40 p-3 rounded-xl">
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">2. Calculated Store Profit</span>
                  <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                    TZS {financialPosition.storeProfit.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Factor: <strong className="text-white font-mono">TSh 2,800</strong> / unit
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">3. Operating Expenses</span>
                  <div className="text-base font-bold font-mono text-rose-300 mt-0.5">
                    TZS {financialPosition.totalExpenses.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {relevantExpenses.length} operational record(s)
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">4. Net Amount (Profit - Expenses)</span>
                  <div className={`text-base font-bold font-mono mt-0.5 ${
                    financialPosition.netAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    TZS {financialPosition.netAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {financialPosition.status === 'PROFIT' ? 'Net Store Surplus' : financialPosition.status === 'LOSS' ? 'Net Operating Deficit' : 'Balanced Operations'}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Breakdown Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  BF Suma Products Sales Breakdown
                </h3>
                <span className="text-[11px] text-slate-500">
                  {aggregatedProductItems.filter((i) => i.quantity > 0).length} product(s) sold
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-right">Unit Price (TZS)</th>
                      <th className="py-2.5 px-3 text-center">PV</th>
                      <th className="py-2.5 px-3 text-center font-bold">Qty</th>
                      <th className="py-2.5 px-3 text-right">Line PV</th>
                      <th className="py-2.5 px-3 text-right font-bold">Total Amount (TZS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aggregatedProductItems.filter((i) => i.quantity > 0).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          No product sales recorded for the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      aggregatedProductItems
                        .filter((i) => i.quantity > 0)
                        .map((item, idx) => (
                          <tr key={item.productId} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-900 block">{item.productName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.productId}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {item.productPrice.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600">{item.pv}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">
                              {item.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-amber-700">
                              {item.totalPv.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {item.totalAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                      <td colSpan={4} className="py-3 px-3 text-left">
                        GRAND TOTALS:
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-blue-300">
                        {totals.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300">
                        {totals.pv.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-300">
                        TZS {totals.revenue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Daily Reports Breakdown (If multi-day) */}
            {filteredReports.length > 1 && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Daily Reports Breakdown
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Staff Submitter</th>
                        <th className="py-2 px-3 text-center">Tests (Quantum/Body)</th>
                        <th className="py-2 px-3 text-center">Kits</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-right">Sales (TZS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {filteredReports.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 font-bold text-slate-800">{r.reportDate}</td>
                          <td className="py-2 px-3 text-slate-600 font-sans">
                            {r.staffName} (@{r.staffUsername})
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            {r.quantumTestCount ?? '-'} / {r.bodyAnalyzerTestCount ?? '-'}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">{r.kitRegisteredCount}</td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                r.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {r.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {r.totalSalesAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Official Certification & Signatures Block */}
            <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-700">
              <div className="space-y-6">
                <span className="font-bold text-slate-900 uppercase tracking-wider block">
                  Staff Submitter Certification:
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  I hereby verify that all product quantities, cash reconciliation slips, and clinical diagnostic registers recorded above reflect actual daily operations.
                </p>
                <div className="pt-8 border-b border-slate-400">
                  <span className="text-[10px] text-slate-400 block">Staff Signature & Date</span>
                </div>
              </div>

              <div className="space-y-6">
                <span className="font-bold text-slate-900 uppercase tracking-wider block">
                  Executive Manager Audit Approval:
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  I have audited the submitted financial totals, point values (PV), and clinic logs against bank deposits and approve this official operational ledger.
                </p>
                <div className="pt-8 border-b border-slate-400">
                  <span className="text-[10px] text-slate-400 block">Manager Signature, Stamp & Date</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden when printing via print:hidden) */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 print:hidden">
          <div className="text-slate-500 text-[11px]">
            Report includes <strong>{filteredReports.length}</strong> submission(s), <strong>{aggregatedProductItems.filter(i => i.quantity > 0).length}</strong> product item(s), totaling <strong>TZS {totals.revenue.toLocaleString()}</strong>.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={triggerPrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
