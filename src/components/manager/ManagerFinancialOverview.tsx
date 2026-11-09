import React, { useState, useMemo } from 'react';
import { DailyOperationalReport, Expense, FinancialPeriod, User } from '../../types';
import { FinancialService, EXPENSE_CATEGORIES } from '../../services/financialService';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Search,
  UserCheck,
  UserPlus,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Building2,
  Zap,
  Car,
  Briefcase,
  HelpCircle,
} from 'lucide-react';

interface ManagerFinancialOverviewProps {
  reports: DailyOperationalReport[];
  expenses: Expense[];
  systemDate: string;
  onOpenPrintModal?: () => void;
  onOpenRegisterModal?: () => void;
}

export const ManagerFinancialOverview: React.FC<ManagerFinancialOverviewProps> = ({
  reports,
  expenses,
  systemDate,
  onOpenPrintModal,
  onOpenRegisterModal,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod>('monthly');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Calculate financial summary using the formal business rules
  const summary = useMemo(() => {
    return FinancialService.calculateSummary(reports, expenses, selectedPeriod, systemDate);
  }, [reports, expenses, selectedPeriod, systemDate]);

  // Expenses filtered by selected period and search
  const periodExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const inRange = e.expenseDate >= summary.startDate && e.expenseDate <= summary.endDate;
      if (!inRange) return false;
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesSearch =
        !expenseSearch.trim() ||
        e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.enteredBy.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.expenseDate.includes(expenseSearch);
      return matchesCategory && matchesSearch;
    });
  }, [expenses, summary.startDate, summary.endDate, categoryFilter, expenseSearch]);

  const periods: { id: FinancialPeriod; label: string; desc: string }[] = [
    { id: 'monthly', label: 'Monthly', desc: 'Current calendar month' },
    { id: 'quarterly', label: 'Quarterly', desc: '3 Months window' },
    { id: 'semi-annual', label: 'Semi-Annual', desc: '6 Months window' },
    { id: 'annual', label: 'Annual', desc: '12 Months (Full Year)' },
  ];

  // Helper icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Salaries':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'Rent':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case 'Electricity and Utilities':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'Transport':
        return <Car className="w-4 h-4 text-blue-600" />;
      case 'Office Expenses':
        return <Briefcase className="w-4 h-4 text-teal-600" />;
      default:
        return <Receipt className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Header & Period Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              <span>BF Suma Tanzania Financial Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
              Store Profit & Financial Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Automated store commission calculations (<strong>4.5% of Point Value (PV)</strong> @ fixed{' '}
              <strong>TSh 2,800 conversion factor</strong>) balanced against recorded business expenditures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenRegisterModal && (
              <button
                type="button"
                onClick={onOpenRegisterModal}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 min-h-[40px] border border-slate-700"
                title="Create Authorized Manager or Staff Account"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Register User</span>
              </button>
            )}

            {onOpenPrintModal && (
              <button
                type="button"
                onClick={onOpenPrintModal}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 min-h-[40px]"
                title="Print or Download PDF Financial & Operational Report"
              >
                <Printer className="w-4 h-4" />
                <span>Print & Export PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Reporting Period Selector Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Financial Reporting Period:</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {periods.map((p) => {
                const isActive = selectedPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all text-center min-h-[38px] ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20 dark:bg-emerald-600 dark:ring-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Period Boundaries:</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {summary.startDate}
            </span>
            <span>to</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {summary.endDate}
            </span>
            <span className="text-slate-400">({summary.reportCount} daily operational reports reconciled)</span>
          </div>
        </div>
      </div>

      {/* 4 Core Financial Summary Cards (Exact Spec Requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total PV Generated */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>1. Total PV Generated</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {summary.totalPV.toLocaleString()} <span className="text-sm font-bold text-blue-600">PV</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Accumulated Point Value from authenticated product sales across {summary.reportCount} reports.
          </p>
        </div>

        {/* 2. Store Profit */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <span>2. Store Profit (Gross)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
            {FinancialService.formatCurrency(summary.storeProfit)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <span>{summary.commissionUnits.toLocaleString()} units @ 4.5%</span>
            <span>× 2,800</span>
          </div>
        </div>

        {/* 3. Total Expenses */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <span>3. Total Expenses</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 font-mono">
            {FinancialService.formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            {summary.expenseCount} recorded operating expense entries in this period.
          </p>
        </div>

        {/* 4. Remaining Net Amount & Status */}
        <div
          className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
            summary.status === 'PROFIT'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : summary.status === 'LOSS'
              ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span
              className={
                summary.status === 'PROFIT'
                  ? 'text-emerald-800 dark:text-emerald-300'
                  : summary.status === 'LOSS'
                  ? 'text-rose-800 dark:text-rose-300'
                  : 'text-slate-700 dark:text-slate-300'
              }
            >
              4. Remaining Net Amount
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                summary.status === 'PROFIT'
                  ? 'bg-emerald-600 text-white'
                  : summary.status === 'LOSS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-600 text-white'
              }`}
            >
              {summary.status}
            </span>
          </div>

          <div
            className={`text-2xl sm:text-3xl font-black font-mono ${
              summary.status === 'PROFIT'
                ? 'text-emerald-900 dark:text-emerald-200'
                : summary.status === 'LOSS'
                ? 'text-rose-900 dark:text-rose-200'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {FinancialService.formatCurrency(summary.netAmount)}
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            {summary.status === 'PROFIT' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />}
            {summary.status === 'LOSS' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />}
            {summary.status === 'BREAK EVEN' && <Scale className="w-3.5 h-3.5 text-slate-600" />}
            <span>
              Net Result: <strong>{summary.status}</strong> (Store Profit − Total Expenses)
            </span>
          </div>
        </div>
      </div>

      {/* Business Formula Verification Box */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>BF Suma Tanzania Financial Formula Verification</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Commission Calculation</span>
            <div className="font-mono font-bold text-slate-200">
              {summary.totalPV.toLocaleString()} PV × 4.5% = {summary.commissionUnits.toLocaleString()} Units
            </div>
            <p className="text-[11px] text-slate-400">Calculated strictly as 4.5% of total Point Value (PV).</p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Fixed Conversion Factor</span>
            <div className="font-mono font-bold text-slate-200">
              {summary.commissionUnits.toLocaleString()} × TSh 2,800 = {FinancialService.formatCurrency(summary.storeProfit)}
            </div>
            <p className="text-[11px] text-slate-400">Fixed business rate: 1 commission unit = TSh 2,800.</p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Net Position</span>
            <div className="font-mono font-bold text-slate-200">
              {FinancialService.formatCurrency(summary.storeProfit)} − {FinancialService.formatCurrency(summary.totalExpenses)} = {FinancialService.formatCurrency(summary.netAmount)}
            </div>
            <p className="text-[11px] text-slate-400">Status: {summary.status} (automatically derived).</p>
          </div>
        </div>
      </div>

      {/* Expense Breakdown by Category */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Operating Expense Breakdown by Category</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review distribution of costs across official categories for the selected period.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Period Expenses</span>
            <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {FinancialService.formatCurrency(summary.totalExpenses)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPENSE_CATEGORIES.map((cat) => {
            const catAmount = summary.expensesByCategory[cat] || 0;
            const pct =
              summary.totalExpenses > 0 ? ((catAmount / summary.totalExpenses) * 100).toFixed(1) : '0';
            return (
              <div
                key={cat}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(cat)}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {FinancialService.formatCurrency(catAmount)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Share of total:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual Expense Records Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Expense Ledger: Individual Records ({periodExpenses.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Detailed transaction records entered by store staff with dates, descriptions, and amounts.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search description, staff..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-48 sm:w-56 min-h-[34px]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[34px]"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {periodExpenses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No expense records found for this period</p>
            <p className="text-slate-400">
              Staff have not entered any operating expenditures matching this filter range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Entered By</th>
                  <th className="py-3 px-4 text-right">Amount (TSh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {periodExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {exp.expenseDate}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {exp.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>@{exp.enteredBy}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {FinancialService.formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
