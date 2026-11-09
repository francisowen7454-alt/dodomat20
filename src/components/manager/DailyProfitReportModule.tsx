import React, { useState, useMemo } from 'react';
import {
  DailyOperationalReport,
  Expense,
  FinancialStatus,
} from '../../types';
import {
  FinancialService,
  DailyFinancialRecord,
  EXPENSE_CATEGORIES,
} from '../../services/financialService';
import { StorageService } from '../../services/storage';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Plus,
  AlertCircle,
  CheckCircle2,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Receipt,
  Scale,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Filter,
  Lock,
  Unlock,
  Mail,
  ArrowRight,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface DailyProfitReportModuleProps {
  reports: DailyOperationalReport[];
  expenses: Expense[];
  systemDate: string;
  onExpenseRecorded?: () => void;
  onOpenPrintModal?: () => void;
  onNavigateToWeeklyReports?: () => void;
}

export const DailyProfitReportModule: React.FC<DailyProfitReportModuleProps> = ({
  reports,
  expenses,
  systemDate,
  onExpenseRecorded,
  onOpenPrintModal,
  onNavigateToWeeklyReports,
}) => {
  // Anchor date for the 30-day window (defaults to system date)
  const [anchorDate, setAnchorDate] = useState<string>(systemDate || StorageService.getSystemDate());
  const [statusFilter, setStatusFilter] = useState<'all' | 'profit' | 'loss' | 'with-expenses'>('all');
  const [selectedDayDetail, setSelectedDayDetail] = useState<DailyFinancialRecord | null>(null);
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  // Set of dates where manager has requested to unlock staff expenses
  const [unlockedDates, setUnlockedDates] = useState<Set<string>>(new Set());

  // Request Expenses from Staff Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTargetDate, setRequestTargetDate] = useState<string>(anchorDate);
  const [requestScope, setRequestScope] = useState<'single' | 'all'>('single');
  const [requestNote, setRequestNote] = useState<string>('');
  const [isDispatchingRequest, setIsDispatchingRequest] = useState(false);

  // Manager Expense Quick-Entry Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFormDate, setExpenseFormDate] = useState<string>(systemDate);
  const [expenseCategory, setExpenseCategory] = useState<string>('Other Operating Expenses');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4500);
  };

  // Calculate 30-day trend data using FinancialService
  const { days, summary } = useMemo(() => {
    return FinancialService.get30DayTrend(reports, expenses, anchorDate);
  }, [reports, expenses, anchorDate]);

  // Filtered rows for the day-by-day ledger
  const filteredDays = useMemo(() => {
    return days.filter((d) => {
      if (statusFilter === 'profit') return d.status === 'PROFIT';
      if (statusFilter === 'loss') return d.status === 'LOSS';
      if (statusFilter === 'with-expenses') return d.expenses.length > 0;
      return true;
    });
  }, [days, statusFilter]);

  // Chart dimension calculations
  const maxDayValue = useMemo(() => {
    let max = 10000;
    days.forEach((d) => {
      if (d.storeProfit > max) max = d.storeProfit;
      if (d.totalExpenses > max) max = d.totalExpenses;
      if (Math.abs(d.netAmount) > max) max = Math.abs(d.netAmount);
    });
    return max;
  }, [days]);

  // Open Request Modal for a date
  const handleOpenRequestModal = (dateStr: string) => {
    setRequestTargetDate(dateStr);
    setRequestScope('single');
    setRequestNote('');
    setIsRequestModalOpen(true);
  };

  // Dispatch request to staff to unlock daily expenses
  const handleDispatchExpenseRequest = () => {
    setIsDispatchingRequest(true);
    setTimeout(() => {
      const nextUnlocked = new Set(unlockedDates);
      if (requestScope === 'all') {
        days.forEach((d) => nextUnlocked.add(d.date));
        StorageService.addAuditLog(
          'EXPENSE_DETAILS_REQUESTED',
          `Executive Manager requested and accessed staff daily expense records for all 30 days in window (${anchorDate})`,
          'manager',
          'manager'
        );
        showNotice(
          'success',
          `Expense request dispatched to staff. Daily expense records for all 30 days unlocked for administrative review.`
        );
      } else {
        nextUnlocked.add(requestTargetDate);
        StorageService.addAuditLog(
          'EXPENSE_DETAILS_REQUESTED',
          `Executive Manager requested staff daily expenses for date ${requestTargetDate}${requestNote ? `: "${requestNote}"` : ''}`,
          'manager',
          'manager'
        );
        showNotice(
          'success',
          `Expense request dispatched to staff. Daily expense records for ${requestTargetDate} unlocked for administrative review.`
        );
      }
      setUnlockedDates(nextUnlocked);
      setIsDispatchingRequest(false);
      setIsRequestModalOpen(false);
    }, 300);
  };

  // Re-lock an unlocked date
  const handleRelockDate = (dateStr: string) => {
    const next = new Set(unlockedDates);
    next.delete(dateStr);
    setUnlockedDates(next);
    showNotice('success', `Daily expense records for ${dateStr} returned to staff custody.`);
  };

  // Open modal prefilled for a specific date
  const handleOpenExpenseModal = (prefillDate?: string) => {
    setExpenseFormDate(prefillDate || anchorDate || StorageService.getSystemDate());
    setExpenseCategory('Other Operating Expenses');
    setExpenseDescription('');
    setExpenseAmount('');
    setModalError(null);
    setIsExpenseModalOpen(true);
  };

  // Submit expense record
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const amt = parseFloat(expenseAmount.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) {
      setModalError('Please enter a valid expense amount in Tanzanian Shillings (TSh).');
      return;
    }
    if (!expenseDescription.trim()) {
      setModalError('Please enter a description for this operational expense.');
      return;
    }
    if (!expenseFormDate) {
      setModalError('Please select a valid date for this expense.');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const res = await StorageService.recordExpense({
        expenseDate: expenseFormDate,
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount: Math.round(amt),
      });

      if (res.success) {
        showNotice(
          'success',
          `Recorded expense of ${FinancialService.formatCurrency(amt)} for ${expenseFormDate} successfully.`
        );
        // Automatically unlock this day since manager just recorded it
        const next = new Set(unlockedDates);
        next.add(expenseFormDate);
        setUnlockedDates(next);
        setIsExpenseModalOpen(false);
        if (onExpenseRecorded) onExpenseRecorded();
      } else {
        setModalError(res.error || 'Failed to record expense. Please try again.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="text-sm font-semibold">{notice.message}</span>
        </div>
      )}

      {/* Header Banner & Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md">
              BF Suma Financial Module
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-500">
              30-Day Operational Profit & Expense Reconciliation
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>Daily Profit Report & 30-Day Net Trend</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Calculates daily store profit from recorded operational sales PV using the formula{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">
              PV × 0.045 × 2,800
            </code>{' '}
            and subtracts daily operating expenses to compute the exact net position.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 text-[11px] font-medium">Window Anchor:</span>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setRequestTargetDate(anchorDate);
              setRequestScope('all');
              setRequestNote('');
              setIsRequestModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
            title="Request daily expense breakdown from staff"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Request Expenses from Staff</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenExpenseModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Daily Expense</span>
          </button>

          {onNavigateToWeeklyReports && (
            <button
              type="button"
              onClick={onNavigateToWeeklyReports}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors border border-slate-200"
              title="View Weekly Expense Report"
            >
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>Weekly Reports</span>
            </button>
          )}
        </div>
      </div>

      {/* 30-Day Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: 30-Day Total PV */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            1. Total 30-Day PV
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {summary.total30DayPV.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} PV
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Commission Units:</span>
            <strong className="font-mono text-slate-700">
              {(summary.total30DayPV * 0.045).toFixed(2)}
            </strong>
          </div>
        </div>

        {/* Card 2: 30-Day Store Profit (Store Profit - Always Visible) */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-1 bg-gradient-to-br from-emerald-50/40 to-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            2. Store Profit (4.5% PV)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {FinancialService.formatCurrency(summary.total30DayProfit)}
          </div>
          <div className="text-[11px] text-emerald-800 font-mono">
            PV × 0.045 × 2,800
          </div>
        </div>

        {/* Card 3: 30-Day Operating Expenses (In Staff Custody / Requested) */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm space-y-1 bg-gradient-to-br from-rose-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              3. Operating Expenses
            </span>
            {unlockedDates.size > 0 ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Unlock className="w-2.5 h-2.5" />
                <span>Unlocked ({unlockedDates.size}d)</span>
              </span>
            ) : (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Staff Custody</span>
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {FinancialService.formatCurrency(summary.total30DayExpenses)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Details:</span>
            {unlockedDates.size > 0 ? (
              <span className="text-emerald-700 font-semibold">{summary.expenseRecordsCount} receipts</span>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenRequestModal(anchorDate)}
                className="text-amber-800 hover:text-amber-900 font-bold underline text-[10px]"
              >
                Request from Staff
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Net Amount (Profit / Loss - Always Visible) */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              4. 30-Day Net Balance
            </span>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                summary.status === 'PROFIT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : summary.status === 'LOSS'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {summary.status}
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
              summary.net30DayAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {FinancialService.formatCurrency(summary.net30DayAmount)}
          </div>
          <div className="text-[10px] text-slate-400">
            Store Profit - Expenses
          </div>
        </div>

        {/* Card 5: Operational Trajectory */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            5. Performance Split
          </span>
          <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
            <div className="p-1 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[9px] font-bold text-emerald-800 uppercase block">Profit</span>
              <strong className="text-xs font-mono text-emerald-900">{summary.profitableDaysCount}d</strong>
            </div>
            <div className="p-1 bg-rose-50 rounded-lg border border-rose-200">
              <span className="text-[9px] font-bold text-rose-800 uppercase block">Loss</span>
              <strong className="text-xs font-mono text-rose-900">{summary.lossDaysCount}d</strong>
            </div>
            <div className="p-1 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-[9px] font-bold text-slate-700 uppercase block">Even</span>
              <strong className="text-xs font-mono text-slate-800">{summary.breakEvenDaysCount}d</strong>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 text-center pt-0.5">
            {summary.activeReportingDaysCount} active sales days in window
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 30-DAY INTERACTIVE NET TREND VISUALIZATION CHART                           */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>30-Day Daily Net Profit Trend (PV Profit vs Daily Expenses)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Hover over or click any day to inspect daily store profit, expenses, and net position.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-slate-600">Store Profit (PV × 4.5% × 2,800)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-400"></span>
              <span className="text-slate-600">Daily Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white ring-1 ring-slate-400"></span>
              <span className="text-slate-600">Net Balance</span>
            </div>
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[760px] h-64 relative bg-slate-50/70 rounded-xl p-4 border border-slate-100">
            {/* Chart Canvas */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="1000" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="1000" y2="70" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="1000" y2="120" stroke="#cbd5e1" strokeWidth="1.5" /> {/* Baseline */}
              <line x1="0" y1="170" x2="1000" y2="170" stroke="#e2e8f0" strokeDasharray="3 3" />

              {/* Bars & Trend Points */}
              {days.map((day, idx) => {
                const totalDays = days.length;
                const slotWidth = 1000 / totalDays;
                const xCenter = idx * slotWidth + slotWidth / 2;
                const barWidth = Math.max(8, slotWidth * 0.35);

                const profitHeight = maxDayValue > 0 ? (day.storeProfit / maxDayValue) * 100 : 0;
                const expenseHeight = maxDayValue > 0 ? (day.totalExpenses / maxDayValue) * 100 : 0;

                const netNorm = maxDayValue > 0 ? (day.netAmount / maxDayValue) * 100 : 0;
                const netY = Math.max(10, Math.min(190, 120 - netNorm));

                const isSelected = selectedDayDetail?.date === day.date;

                return (
                  <g
                    key={day.date}
                    className="cursor-pointer group"
                    onClick={() => setSelectedDayDetail(day)}
                  >
                    {/* Hover highlight background */}
                    <rect
                      x={idx * slotWidth + 2}
                      y="10"
                      width={slotWidth - 4}
                      height="180"
                      fill={isSelected ? '#dbeafe' : 'transparent'}
                      className="group-hover:fill-slate-200/50 transition-colors rounded"
                    />

                    {/* Store Profit Bar (Upwards from baseline 120) */}
                    {day.storeProfit > 0 && (
                      <rect
                        x={xCenter - barWidth - 1}
                        y={120 - profitHeight}
                        width={barWidth}
                        height={Math.max(2, profitHeight)}
                        fill="#10b981"
                        rx="2"
                        className="transition-all opacity-85 group-hover:opacity-100"
                      />
                    )}

                    {/* Expenses Bar */}
                    {day.totalExpenses > 0 && (
                      <rect
                        x={xCenter + 1}
                        y={120 - expenseHeight}
                        width={barWidth}
                        height={Math.max(2, expenseHeight)}
                        fill="#f43f5e"
                        rx="2"
                        className="transition-all opacity-85 group-hover:opacity-100"
                      />
                    )}

                    {/* Net Position Indicator Point */}
                    <circle
                      cx={xCenter}
                      cy={netY}
                      r={isSelected ? '5' : '3.5'}
                      fill={day.netAmount >= 0 ? '#059669' : '#e11d48'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="transition-all shadow-xs"
                    />

                    {/* Day label tick */}
                    {idx % 3 === 0 && (
                      <text
                        x={xCenter}
                        y="198"
                        textAnchor="middle"
                        fontSize="9"
                        fill="#64748b"
                        fontFamily="monospace"
                      >
                        {day.date.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Day Quick Inspector Banner */}
        {selectedDayDetail && (
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {selectedDayDetail.date} ({selectedDayDetail.dayLabel})
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedDayDetail.status === 'PROFIT'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : selectedDayDetail.status === 'LOSS'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {selectedDayDetail.status}
                </span>
              </div>
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
                <span>PV: <strong className="text-amber-300 font-mono">{selectedDayDetail.totalPV.toFixed(1)} PV</strong></span>
                <span>·</span>
                <span>Store Profit: <strong className="text-emerald-300 font-mono">{FinancialService.formatCurrency(selectedDayDetail.storeProfit)}</strong></span>
                <span>·</span>
                <span>
                  Expenses:{' '}
                  {unlockedDates.has(selectedDayDetail.date) ? (
                    <strong className="text-rose-300 font-mono">{FinancialService.formatCurrency(selectedDayDetail.totalExpenses)}</strong>
                  ) : (
                    <span className="text-amber-300 italic font-medium">Staff Custody</span>
                  )}
                </span>
                <span>·</span>
                <span>Net: <strong className={`font-mono font-bold ${selectedDayDetail.netAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{FinancialService.formatCurrency(selectedDayDetail.netAmount)}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!unlockedDates.has(selectedDayDetail.date) ? (
                <button
                  type="button"
                  onClick={() => handleOpenRequestModal(selectedDayDetail.date)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Request Expenses from Staff</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRelockDate(selectedDayDetail.date)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Details</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenExpenseModal(selectedDayDetail.date)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close Day Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 30-DAY DAY-BY-DAY PROFIT & EXPENSE RECONCILIATION TABLE                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>30-Day Consecutive Daily Ledger Table</span>
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredDays.length} of 30 days. Store Profit and Net Balance are directly displayed.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Days (30)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('profit')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'profit'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Profitable ({summary.profitableDaysCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('loss')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'loss'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Deficit ({summary.lossDaysCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('with-expenses')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'with-expenses'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Has Expenses
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-32">Date</th>
                <th className="py-3 px-3 text-right">Reported PV</th>
                <th className="py-3 px-3 text-right text-emerald-800 font-bold">Store Profit (PV × 4.5% × 2,800)</th>
                <th className="py-3 px-3 text-right text-rose-800 font-bold">Daily Expenses</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900">Net Balance (Profit / Loss)</th>
                <th className="py-3 px-3 text-center w-28">Status</th>
                <th className="py-3 px-3 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDays.map((day) => {
                const isExpanded = expandedDayKey === day.date;
                const isUnlocked = unlockedDates.has(day.date);

                return (
                  <React.Fragment key={day.date}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900">
                        <div className="font-mono font-bold text-xs">{day.date}</div>
                        <div className="text-[10px] text-slate-500">{day.dayLabel}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {day.totalPV > 0 ? (
                          <span className="font-bold text-amber-800">
                            {day.totalPV.toFixed(1)} PV
                          </span>
                        ) : (
                          <span className="text-slate-400">0.0 PV</span>
                        )}
                      </td>

                      {/* Store Profit - Always Visible */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {day.storeProfit > 0 ? (
                          FinancialService.formatCurrency(day.storeProfit)
                        ) : (
                          <span className="text-slate-400">TSh 0</span>
                        )}
                      </td>

                      {/* Daily Expenses (Staff Custody by Default or Unlocked via Staff Request) */}
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                        {isUnlocked ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-rose-700">
                              {FinancialService.formatCurrency(day.totalExpenses)}
                            </span>
                            <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                              Unlocked
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 text-[11px] italic font-normal flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Staff Custody</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenRequestModal(day.date)}
                              className="px-1.5 py-0.5 text-[9px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300 transition-colors"
                              title="Request expenses for this date from staff"
                            >
                              Request
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Net Position (Always Visible) */}
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                        <span
                          className={`${
                            day.netAmount > 0
                              ? 'text-emerald-700'
                              : day.netAmount < 0
                              ? 'text-rose-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {FinancialService.formatCurrency(day.netAmount)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            day.status === 'PROFIT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : day.status === 'LOSS'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {day.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRequestModal(day.date)}
                              className="px-2 py-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors flex items-center gap-1"
                              title="Request daily expenses from staff"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Request</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandedDayKey(isExpanded ? null : day.date)}
                              className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1"
                              title="View expense receipts"
                            >
                              <Receipt className="w-3 h-3 text-emerald-600" />
                              <span>Receipts ({day.expenses.length})</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenExpenseModal(day.date)}
                            className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
                            title={`Record expense for ${day.date}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Expense Items Row (Visible when Unlocked) */}
                    {isExpanded && isUnlocked && day.expenses.length > 0 && (
                      <tr className="bg-slate-50/90 border-t border-b border-slate-200/80">
                        <td colSpan={7} className="p-3 pl-8">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                              <span className="flex items-center gap-2">
                                <Receipt className="w-3.5 h-3.5 text-rose-600" />
                                <span>Itemized Expense Receipts for {day.date} (Requested from Staff):</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRelockDate(day.date)}
                                className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Lock Breakdown</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {day.expenses.map((exp) => (
                                <div
                                  key={exp.id}
                                  className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-800">{exp.description}</div>
                                    <div className="text-[10px] text-slate-500">
                                      Category: <strong className="text-slate-700">{exp.category}</strong> · Entered by @{exp.enteredBy}
                                    </div>
                                  </div>
                                  <div className="font-mono font-bold text-rose-700 text-xs">
                                    {FinancialService.formatCurrency(exp.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t border-slate-800">
                <td className="py-3 px-3 uppercase text-[10px] tracking-wider">
                  30-Day Totals:
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-300">
                  {summary.total30DayPV.toFixed(1)} PV
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-300">
                  {FinancialService.formatCurrency(summary.total30DayProfit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-300">
                  {FinancialService.formatCurrency(summary.total30DayExpenses)}
                </td>
                <td
                  className={`py-3 px-3 text-right font-mono text-sm ${
                    summary.net30DayAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {FinancialService.formatCurrency(summary.net30DayAmount)}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10">
                    {summary.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-[10px] text-slate-400">
                  {summary.expenseRecordsCount} Total Expenses
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REQUEST EXPENSES FROM STAFF                                        */}
      {/* ========================================================================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Request Daily Expenses from Staff
                  </h3>
                  <p className="text-xs text-slate-500">Request itemized daily operational expense records from staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <span className="font-bold block">Administrative Notice:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Daily operational expenses are held in staff custody. To inspect itemized receipts and category breakdowns for administrative audit, submit an expense request below.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Request Scope:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestScope('single')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      requestScope === 'single'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Single Date ({requestTargetDate})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestScope('all')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      requestScope === 'all'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All 30 Days
                  </button>
                </div>
              </div>

              {requestScope === 'single' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Requested Expense Date:
                  </label>
                  <input
                    type="date"
                    value={requestTargetDate}
                    onChange={(e) => setRequestTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message to Staff (Optional):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please release itemized expense receipts for this date for managerial reconciliation."
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDispatchingRequest}
                onClick={handleDispatchExpenseRequest}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{isDispatchingRequest ? 'Sending...' : 'Dispatch Request & Unlock Breakdown'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECORD DAILY EXPENSE MODAL FOR MANAGERS                                   */}
      {/* ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white max-w-lg w-full p-6 rounded-2xl shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Daily Operational Expense</h3>
                  <p className="text-xs text-slate-500">Expenses will automatically subtract from daily store profit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expense Date (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  required
                  value={expenseFormDate}
                  onChange={(e) => setExpenseFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expense Category *
                </label>
                <select
                  required
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount in Tanzanian Shillings (TSh / TZS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    TSh
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 50000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full pl-12 pr-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Purpose *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Electricity token for store clinic, Transport fare for product dispatch, Office stationery"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmittingExpense ? 'Saving...' : 'Save & Subtract from Profit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
