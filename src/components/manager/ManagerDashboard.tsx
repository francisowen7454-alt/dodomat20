import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  PeriodType,
  DailyOperationalReport,
  PeriodAggregatedReport,
  PeriodDailySummary,
  Product,
} from '../../types';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  AlertTriangle,
  RotateCcw,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Activity,
  MessageSquare,
  Search,
  Check,
  X,
  ExternalLink,
  KeyRound,
  Eye,
  BarChart3,
  Award,
  UserPlus,
  Scale,
  Wallet,
} from 'lucide-react';
import { ProfileModal } from '../shared/ProfileModal';
import { SystemDateTimeHeader } from '../shared/SystemDateTimeHeader';
import { PrintReportModal } from '../shared/PrintReportModal';
import { ImageViewerModal } from '../shared/ImageViewerModal';
import { BackupService } from '../../services/backupService';
import { ManagerFinancialOverview } from './ManagerFinancialOverview';
import { DailyProfitReportModule } from './DailyProfitReportModule';
import { AdminUserModal } from './AdminUserModal';
import { Expense } from '../../types';
import { FinancialService } from '../../services/financialService';

type ManagerTab = 'financial-overview' | 'daily-profit' | 'period-reports' | 'daily-reviews';

export const ManagerDashboard: React.FC = () => {
  const { currentUser, allUsers, toggleUserStatus } = useAuth();

  if (currentUser?.role !== 'manager') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-red-200 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Denied: Executive Authorization Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Staff members are restricted from accessing executive manager dashboards and reviewing managerial reports.
          </p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<ManagerTab>('financial-overview');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('weekly');
  const [systemDate, setSystemDate] = useState<string>(() => StorageService.getSystemDate());

  // Loaded data
  const [allReports, setAllReports] = useState<DailyOperationalReport[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState(() => StorageService.getAuditLogs());
  const [isAdminUserModalOpen, setIsAdminUserModalOpen] = useState(false);

  // Period rollup state
  const [currentPeriodData, setCurrentPeriodData] = useState<PeriodAggregatedReport>(() =>
    StorageService.getAggregatedPeriodReport('weekly', StorageService.getSystemDate())
  );

  // Review & Feedback modal for manager (Daily Report)
  const [selectedReportForReview, setSelectedReportForReview] = useState<DailyOperationalReport | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');

  // Period Review Feedback by manager (Weekly / Monthly etc.)
  const [periodFeedbackInput, setPeriodFeedbackInput] = useState('');

  // Daily report inspection modal inside Period Reports
  const [inspectingDailyReport, setInspectingDailyReport] = useState<PeriodDailySummary | null>(null);

  // Profile modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Print Report Modal & Image Viewer states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Notifications
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadAll = () => {
    // Pass currentUser so newly registered managers start with an empty dashboard!
    const reps = StorageService.getDailyReports(currentUser);
    const exps = StorageService.getExpenses(currentUser);
    const prods = StorageService.getProducts();
    setAllReports(reps);
    setAllExpenses(exps);
    setProducts(prods);
    setAuditLogs(StorageService.getAuditLogs());
    const periodData = StorageService.getAggregatedPeriodReport(selectedPeriod, systemDate, currentUser);
    setCurrentPeriodData(periodData);
    setPeriodFeedbackInput(periodData.managerFeedback || '');
  };

  useEffect(() => {
    loadAll();

    const handleSystemDateEvent = (e: any) => {
      const newDate = typeof e.detail === 'string' ? e.detail : e.detail?.date;
      if (newDate && newDate !== systemDate) {
        setSystemDate(newDate);
      }
    };
    window.addEventListener('t20-system-date-changed', handleSystemDateEvent);
    return () => window.removeEventListener('t20-system-date-changed', handleSystemDateEvent);
  }, [selectedPeriod, systemDate, currentUser?.id]);

  // Handle period switch
  const handleSwitchPeriod = (period: PeriodType) => {
    setSelectedPeriod(period);
    const pData = StorageService.getAggregatedPeriodReport(period, systemDate, currentUser);
    setCurrentPeriodData(pData);
    setPeriodFeedbackInput(pData.managerFeedback || '');
  };

  const handleSystemDateChange = (newDate: string) => {
    setSystemDate(newDate);
    const isToday = newDate === StorageService.getTodayString();
    StorageService.setSystemDate(newDate, !isToday);
    showNotice('success', `Unified system date updated to ${newDate}. All report calculations synchronized.`);
  };

  // Manager provides feedback & approves/rejects daily report
  const handleReviewAction = (status: 'approved' | 'changes_requested') => {
    if (!selectedReportForReview) return;
    if (!feedbackInput.trim()) {
      showNotice('error', 'Please enter your managerial feedback remarks before submitting.');
      return;
    }

    const ok = StorageService.reviewDailyReport(
      selectedReportForReview.id,
      status,
      feedbackInput.trim(),
      currentUser?.username || 'manager'
    );

    if (ok) {
      loadAll();
      setSelectedReportForReview(null);
      setFeedbackInput('');
      showNotice(
        'success',
        `Daily report for ${selectedReportForReview.reportDate} marked as ${status.toUpperCase()} and feedback dispatched to Staff Workspace.`
      );
    }
  };

  // Manager provides feedback & approves/rejects automated period report (Weekly / Monthly etc.)
  const handleReviewPeriodAction = (status: 'approved' | 'changes_requested') => {
    if (!currentPeriodData) return;
    if (!periodFeedbackInput.trim()) {
      showNotice('error', 'Please enter your managerial audit remarks for this period report.');
      return;
    }

    StorageService.reviewPeriodReport(
      currentPeriodData.id,
      status,
      periodFeedbackInput.trim(),
      currentUser?.username || 'manager'
    );

    loadAll();
    showNotice(
      'success',
      `${currentPeriodData.label} audit completed: Status set to ${status.toUpperCase()} and remarks dispatched to Staff Workspace.`
    );
  };


  // Grand totals across all reports
  const totalRevenueAll = allReports.reduce((acc, r) => acc + r.totalSalesAmount, 0);
  const totalPvAll = allReports.reduce((acc, r) => acc + (r.totalPv || 0), 0);
  const totalKitsAll = allReports.reduce((acc, r) => acc + r.kitRegisteredCount, 0);
  const totalQuantumAll = allReports.reduce((acc, r) => acc + (r.quantumTestCount || 0), 0);
  const totalBodyAll = allReports.reduce((acc, r) => acc + (r.bodyAnalyzerTestCount || 0), 0);
  const pendingReviewCount = allReports.filter(r => r.status === 'submitted').length;

  // Period Performance Analytics & Trends
  const periodDailyList = currentPeriodData.dailySummaries || [];
  const maxPeriodDailySales = Math.max(...periodDailyList.map(d => d.totalSalesAmount), 1);
  const avgDailySales = periodDailyList.length > 0 ? Math.round(currentPeriodData.totalRevenue / periodDailyList.length) : 0;
  const avgDailyUnits = periodDailyList.length > 0 ? (currentPeriodData.totalQuantitySold / periodDailyList.length).toFixed(1) : '0';

  const peakSalesDay = periodDailyList.length > 0
    ? [...periodDailyList].sort((a, b) => b.totalSalesAmount - a.totalSalesAmount)[0]
    : null;

  const lowestSalesDay = periodDailyList.length > 0
    ? [...periodDailyList].sort((a, b) => a.totalSalesAmount - b.totalSalesAmount)[0]
    : null;

  const topSellingProduct = currentPeriodData.productTotals.length > 0
    ? [...currentPeriodData.productTotals].sort((a, b) => b.totalAmount - a.totalAmount)[0]
    : null;

  // Period Financial Reconciliation (Store Profit: totalPV * 0.045 * 2800 & Net Amount: profit - expenses)
  const periodExpenses = allExpenses.filter(
    (e) => e.expenseDate >= currentPeriodData.startDate && e.expenseDate <= currentPeriodData.endDate
  );
  const periodExpensesTotal = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const periodFinancialPosition = FinancialService.calculateNetPosition(
    currentPeriodData.totalPv || 0,
    periodExpensesTotal
  );

  const getDayOfWeekName = (dateStr: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateStr);
    return isNaN(d.getDay()) ? dateStr : days[d.getDay()];
  };

  const getShortDay = (dateStr: string) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateStr);
    return isNaN(d.getDay()) ? '' : days[d.getDay()];
  };

  const handleExportCSV = () => {
    const headers = ['Product Name', 'Price (TZS)', 'Unit PV', 'Quantity Sold', 'Total PV', 'Total Amount (TZS)', 'Contribution %'];
    const rows = currentPeriodData.productTotals.map(p => {
      const pct = currentPeriodData.totalRevenue > 0 ? ((p.totalAmount / currentPeriodData.totalRevenue) * 100).toFixed(1) : '0';
      const linePv = ((p.pv || 0) * p.totalQuantity).toFixed(1);
      return `"${p.productName}",${p.productPrice},${p.pv || 0},${p.totalQuantity},${linePv},${p.totalAmount},${pct}%`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentPeriodData.label.replace(/\s+/g, '_')}_Sales_Summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('success', `Exported ${currentPeriodData.label} summary table to CSV.`);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Executive Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Manager Oversight Center</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-bold">Executive Authority</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-300 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1.5 normal-case">
                  <span>Manager:</span>
                  <strong className="text-white">{currentUser?.fullName || 'Executive Manager'}</strong>
                  <span className="text-slate-400 font-mono">(@{currentUser?.username || 'manager'})</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300 font-mono">{systemDate}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                Executive Management Dashboard & Audit Portal
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                onClick={() => {
                  try {
                    BackupService.exportBackupFile();
                    showNotice('success', 'Data backup exported successfully!');
                  } catch (err: any) {
                    showNotice('error', err.message || 'Error exporting backup.');
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                title="Download complete database backup (JSON)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Backup</span>
              </button>
              <button
                onClick={() => setIsAdminUserModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                title="Create Authorized Manager or Staff Account"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Register User</span>
              </button>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                title="Edit Username or Password"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Credentials</span>
              </button>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>Print Reports</span>
              </button>
            </div>
          </div>

          {/* Manager Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 scrollbar-none border-t border-slate-800 mt-4 no-print">
            {[
              { id: 'financial-overview', label: '1. BF Suma PV Profit & Store Financial Overview', icon: DollarSign },
              { id: 'daily-profit', label: '2. Daily Profit Report & 30-Day Net Trend', icon: Activity },
              { id: 'period-reports', label: '3. Multi-Period Reports & Daily Summaries (Weekly, Monthly, Quarterly, Semi-Annual, Annual)', icon: FileSpreadsheet },
              { id: 'daily-reviews', label: `4. Review Daily Reports Queue (${pendingReviewCount} pending audit)`, icon: MessageSquare },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ManagerTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Unified System Date, Live Clock & Voice Audio Controls */}
        <div className="mb-6">
          <SystemDateTimeHeader
            currentDate={systemDate}
            onDateChange={handleSystemDateChange}
            roleLabel="Executive Manager"
          />
        </div>

        {/* Notice */}
        {notice && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            )}
            <div className="text-sm font-semibold">{notice.message}</div>
          </div>
        )}

        {/* ==================== TAB 1: BF SUMA PV PROFIT & STORE FINANCIAL OVERVIEW ==================== */}
        {activeTab === 'financial-overview' && (
          <ManagerFinancialOverview
            reports={allReports}
            expenses={allExpenses}
            systemDate={systemDate}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
            onOpenRegisterModal={() => setIsAdminUserModalOpen(true)}
          />
        )}

        {/* ==================== TAB 2: DAILY PROFIT REPORT & 30-DAY NET TREND ==================== */}
        {activeTab === 'daily-profit' && (
          <DailyProfitReportModule
            reports={allReports}
            expenses={allExpenses}
            systemDate={systemDate}
            onExpenseRecorded={loadAll}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
            onNavigateToWeeklyReports={() => {
              setSelectedPeriod('weekly');
              setActiveTab('period-reports');
            }}
          />
        )}

        {/* ==================== TAB 2: DAILY REPORTS QUEUE & REVIEW ==================== */}
        {activeTab === 'daily-reviews' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="max-w-2xl">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span>Audit Daily Reports & Provide Manager Feedback</span>
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Examine Product Name, Product Price, Quantity, Total Amount, Diagnostics, and Member Kits, then provide executive feedback to approve or request changes.
                </p>
              </div>
            </div>

            {allReports.length === 0 ? (
              <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    No Reports Received Yet (Zero Reports Pending)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-lg mx-auto">
                    Your Manager account is active with zero demo clutter. This audit page will automatically populate as soon as staff members submit their operational reports.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-2 max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Live Automatic Waiting Mode:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                    As soon as staff submits a daily or period report, you will receive an instant text notification and an executive audio chime.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {allReports.map((report) => (
                  <div key={report.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-slate-900">{report.reportDate}</span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-xs text-slate-600">Submitted by: <strong>{report.staffName}</strong> (@{report.staffUsername})</span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          Sales: TZS {report.totalSalesAmount.toLocaleString()}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-xs font-bold text-amber-800 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Total PV: {(report.totalPv || 0).toFixed(1)} PV
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Kits: <strong>{report.kitRegisteredCount}</strong> · Quantum: <strong>{report.quantumTestCount === null ? 'NULL' : report.quantumTestCount}</strong> · Body Analyzer: <strong>{report.bodyAnalyzerTestCount === null ? 'NULL' : report.bodyAnalyzerTestCount}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md ${
                          report.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : report.status === 'changes_requested'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* 4 Core Columns Product Table + PV */}
                  <div className="overflow-x-auto bg-slate-50 rounded-lg p-3">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="py-1.5 px-2">Product Name</th>
                          <th className="py-1.5 px-2 text-right">Product Price</th>
                          <th className="py-1.5 px-2 text-center">Unit PV</th>
                          <th className="py-1.5 px-2 text-right">Quantity</th>
                          <th className="py-1.5 px-2 text-right text-amber-900 font-bold">Line PV</th>
                          <th className="py-1.5 px-2 text-right font-bold">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60">
                        {report.items.filter(i => i.quantity > 0).map(it => (
                          <tr key={it.productId}>
                            <td className="py-1.5 px-2 font-medium text-slate-900">{it.productName}</td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">TZS {it.productPrice.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-amber-800 text-[11px]">{it.pv ?? 0} PV</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold tabular-nums">{it.quantity}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold tabular-nums text-amber-900 text-xs">
                              {((it.pv || 0) * it.quantity).toFixed(1)} PV
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold tabular-nums text-slate-900">
                              TZS {it.totalAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 font-bold text-slate-900">
                          <td colSpan={3} className="py-2 px-2 text-right uppercase text-[10px]">
                            Daily Total:
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {report.totalQuantitySold}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-amber-800">
                            {(report.totalPv || 0).toFixed(1)} PV
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-700">
                            TZS {report.totalSalesAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Diagnostics & Member Kits details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block font-semibold">Diagnostics Breakdown:</span>
                      <span>Quantum: {report.quantumTestCount === null ? 'NULL' : `${report.quantumTestCount} patients`}</span><br />
                      <span>Body Analyzer: {report.bodyAnalyzerTestCount === null ? 'NULL' : `${report.bodyAnalyzerTestCount} patients`}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block font-semibold">Member Kits:</span>
                      <span>Total: <strong>{report.kitRegisteredCount}</strong></span>
                      {report.kitNumbers && <div className="text-[10px] text-slate-600 truncate mt-0.5">{report.kitNumbers}</div>}
                    </div>
                  </div>

                  {/* Manager Feedback block if present */}
                  {report.managerFeedback && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1">
                      <span className="font-bold text-emerald-950 block">
                        Your Managerial Feedback (@{report.reviewedBy || 'manager'}):
                      </span>
                      <p className="text-slate-800 italic">"{report.managerFeedback}"</p>
                    </div>
                  )}

                  {/* Review Action CTA */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={() => {
                        setSelectedReportForReview(report);
                        setFeedbackInput(report.managerFeedback || '');
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{report.managerFeedback ? 'Update Feedback Remarks & Status' : 'Audit & Provide Feedback'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal for Review & Feedback */}
          {selectedReportForReview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
                <div className="bg-white max-w-lg w-full p-6 rounded-2xl shadow-2xl border border-slate-200 space-y-4 my-8">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Executive Review for Date: {selectedReportForReview.reportDate}
                      </h3>
                      <p className="text-xs text-slate-500">Staff Member: {selectedReportForReview.staffName} (@{selectedReportForReview.staffUsername})</p>
                    </div>
                    <button
                      onClick={() => setSelectedReportForReview(null)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 space-y-1">
                    <div>Total Sales: <strong className="font-mono text-emerald-700 font-bold">TZS {selectedReportForReview.totalSalesAmount.toLocaleString()}</strong></div>
                    <div>Accumulated PV: <strong className="font-mono text-amber-800 font-bold">{(selectedReportForReview.totalPv || 0).toFixed(1)} PV</strong></div>
                    <div>Diagnostics: Quantum ({selectedReportForReview.quantumTestCount === null ? 'NULL' : selectedReportForReview.quantumTestCount}), Body Analyzer ({selectedReportForReview.bodyAnalyzerTestCount === null ? 'NULL' : selectedReportForReview.bodyAnalyzerTestCount})</div>
                    <div>Registered Member Kits: <strong className="font-mono">{selectedReportForReview.kitRegisteredCount}</strong></div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Manager Feedback Remarks *
                    </label>
                    <textarea
                      rows={4}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="e.g. Sales reconciliations, diagnostic tallies, and member kit registrations are verified and match banking receipts."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      The staff member will see this feedback directly on their workspace.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setSelectedReportForReview(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewAction('changes_requested')}
                        className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-colors"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={() => handleReviewAction('approved')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                      >
                        Approve Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: WEEKLY, MONTHLY, QUARTERLY, SEMI-ANNUAL & ANNUAL REPORTS ==================== */}
        {activeTab === 'period-reports' && (
          <div className="space-y-6">
            {/* Period Switcher Toolbar */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded">
                    Executive Audit
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Weekly, Monthly, Quarterly, Semi-Annual & Annual Reports
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Aggregates daily sales data from all staff operational submissions into consolidated summary tables with weekly performance trend analysis.
                </p>
              </div>

              {/* Action Buttons: Switch Period, CSV & Print */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                  {(['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'] as PeriodType[]).map(p => (
                    <button
                      key={p}
                      onClick={() => handleSwitchPeriod(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-all capitalize ${
                        selectedPeriod === p
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      {p === 'weekly' ? 'Weekly Report' : p === 'monthly' ? 'Monthly Report' : p === 'quarterly' ? 'Quarterly Report' : p === 'semi-annual' ? 'Semi-Annual Report' : 'Annual Report'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200"
                    title="Export aggregated sales table to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200"
                    title="Print formal period statement"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Formal Report Document Sheet */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none">
              {/* Header */}
              <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      T20 SERVER ENTERPRISE
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {selectedPeriod.toUpperCase()} RECONCILIATION
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
                    {currentPeriodData.label}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official Executive Consolidation of Daily Sales, Diagnostic Tallies, and Membership Registrations
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-600 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-none border-slate-200 space-y-0.5">
                  <div>Period Range: <strong className="font-mono text-slate-900">{currentPeriodData.startDate} to {currentPeriodData.endDate}</strong></div>
                  <div>Daily Reports Consolidated: <strong className="font-mono text-emerald-700">{currentPeriodData.dailyReportsCount} Operational Days</strong></div>
                  <div>Total PV Accumulated: <strong className="font-mono text-amber-800 font-bold">{(currentPeriodData.totalPv || 0).toFixed(1)} PV</strong></div>
                  <div>Store Profit (4.5% PV): <strong className="font-mono text-emerald-700 font-bold">TZS {periodFinancialPosition.storeProfit.toLocaleString()}</strong></div>
                  <div>Net Balance (Profit - Expenses): <strong className={`font-mono font-bold ${periodFinancialPosition.netAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>TZS {periodFinancialPosition.netAmount.toLocaleString()}</strong></div>
                  <div className="mt-1">
                    Audit Status: <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      currentPeriodData.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentPeriodData.status === 'changes_requested'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {currentPeriodData.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated Period Financial Management & Store Profit Block */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Period Store Profit & Financial Management (BF Suma PV Formula)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Formula: <code>Store Profit = Total PV × 4.5% × TSh 2,800</code> | <code>Net Amount = Store Profit - Operating Expenses</code>
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-auto ${
                    periodFinancialPosition.status === 'PROFIT'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : periodFinancialPosition.status === 'LOSS'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {periodFinancialPosition.status === 'PROFIT' ? '● Net Profit' : periodFinancialPosition.status === 'LOSS' ? '▲ Net Deficit' : '■ Break Even'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">1. Total Period PV</span>
                    <div className="text-base sm:text-lg font-bold font-mono text-amber-300">
                      {(currentPeriodData.totalPv || 0).toFixed(1)} PV
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Commission: <strong className="text-white font-mono">{periodFinancialPosition.commissionUnits.toLocaleString()}</strong> units
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-emerald-500/40 p-3.5 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">2. Calculated Store Profit</span>
                    <div className="text-base sm:text-lg font-bold font-mono text-emerald-300">
                      TZS {periodFinancialPosition.storeProfit.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      (PV × 0.045 × 2,800)
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">3. Operating Expenses</span>
                    <div className="text-base sm:text-lg font-bold font-mono text-rose-300">
                      TZS {periodFinancialPosition.totalExpenses.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {periodExpenses.length} expense record(s) in range
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">4. Net Amount (Profit - Expenses)</span>
                    <div className={`text-base sm:text-lg font-bold font-mono ${
                      periodFinancialPosition.netAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      TZS {periodFinancialPosition.netAmount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Status: <strong className="text-white">{periodFinancialPosition.status}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION: WEEKLY PERFORMANCE TRENDS & ANALYTICS                            */}
              {/* ========================================================================= */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{selectedPeriod === 'weekly' ? 'Weekly Performance Trends & Daily Trajectory' : `${currentPeriodData.label} Performance Trends`}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Review daily sales volume progression, peak revenue days, top product driver, and diagnostic velocity.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full self-start sm:self-auto">
                    {periodDailyList.length} Active Days Tracked
                  </span>
                </div>

                {/* KPI Strip (5 Strategic Metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  {/* KPI 1: Daily Average Sales */}
                  <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Avg Daily Sales
                    </span>
                    <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 tabular-nums">
                      TZS {avgDailySales.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ~<strong className="text-white font-mono">{avgDailyUnits}</strong> units/day
                    </div>
                  </div>

                  {/* KPI 2: Total Period PV Accumulated */}
                  <div className="bg-slate-800/80 border border-amber-500/40 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                      Accumulated PV
                    </span>
                    <div className="text-base sm:text-lg font-bold font-mono text-amber-300 tabular-nums">
                      {(currentPeriodData.totalPv || 0).toFixed(1)} PV
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Avg ~{periodDailyList.length > 0 ? ((currentPeriodData.totalPv || 0) / periodDailyList.length).toFixed(1) : '0'} PV/day
                    </div>
                  </div>

                  {/* KPI 3: Peak Performance Day */}
                  <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Peak Day
                      </span>
                      {peakSalesDay && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded">
                          ★ PEAK
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-amber-300 tabular-nums">
                      {peakSalesDay ? `TZS ${peakSalesDay.totalSalesAmount.toLocaleString()}` : 'N/A'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {peakSalesDay ? (
                        <>
                          <strong className="text-white font-mono">{peakSalesDay.reportDate}</strong> ({getShortDay(peakSalesDay.reportDate)})
                        </>
                      ) : (
                        'No data'
                      )}
                    </div>
                  </div>

                  {/* KPI 4: Top Revenue Driver SKU */}
                  <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Top SKU
                    </span>
                    <div className="text-xs sm:text-sm font-bold text-white truncate" title={topSellingProduct?.productName}>
                      {topSellingProduct?.productName || 'N/A'}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{topSellingProduct ? `${topSellingProduct.totalQuantity} units` : ''}</span>
                      {topSellingProduct && currentPeriodData.totalRevenue > 0 && (
                        <span className="font-mono text-emerald-400 font-bold">
                          {((topSellingProduct.totalAmount / currentPeriodData.totalRevenue) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* KPI 5: Clinical & Membership Velocity */}
                  <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Diagnostics & Kits
                    </span>
                    <div className="text-base sm:text-lg font-bold font-mono text-blue-400 tabular-nums">
                      {currentPeriodData.quantumTotal + currentPeriodData.bodyAnalyzerTotal} pts · {currentPeriodData.kitRegisteredTotal} kits
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Q: {currentPeriodData.quantumTotal} | B: {currentPeriodData.bodyAnalyzerTotal}
                    </div>
                  </div>
                </div>

                {/* Visual Day-by-Day Revenue Progression Bars */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <span>Daily Sales Revenue Progression</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Click any day's bar to inspect complete product line items
                    </span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-4 sm:p-5">
                    {periodDailyList.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs italic">
                        No daily sales records found for this period range.
                      </div>
                    ) : (
                      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 items-end min-h-[170px] pt-6 pb-2">
                        {periodDailyList.map((ds) => {
                          const heightPct = Math.max(Math.round((ds.totalSalesAmount / maxPeriodDailySales) * 100), 16);
                          const isPeak = peakSalesDay?.reportId === ds.reportId;
                          const dayShort = getShortDay(ds.reportDate);
                          const dateParts = ds.reportDate.split('-');
                          const dateShort = `${dateParts[1]}/${dateParts[2]}`;

                          return (
                            <button
                              key={ds.reportId}
                              type="button"
                              onClick={() => setInspectingDailyReport(ds)}
                              className="group flex flex-col items-center justify-end h-full focus:outline-none transition-transform hover:-translate-y-1"
                              title={`Click to inspect ${ds.reportDate}: TZS ${ds.totalSalesAmount.toLocaleString()} (${ds.totalQuantitySold} pcs)`}
                            >
                              {/* Amount Label */}
                              <div className="text-[10px] sm:text-[11px] font-mono font-bold mb-1.5 transition-colors whitespace-nowrap text-center text-slate-300 group-hover:text-white">
                                {isPeak && <span className="text-amber-400 block text-[9px]">★ PEAK</span>}
                                {(ds.totalSalesAmount / 1000000).toFixed(2)}M
                              </div>

                              {/* Vertical Bar */}
                              <div className="w-full max-w-[52px] bg-slate-800 rounded-t-lg overflow-hidden flex items-end p-0.5 border border-slate-700 group-hover:border-slate-500 transition-colors">
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t-md transition-all duration-300 flex items-center justify-center ${
                                    isPeak
                                      ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                                      : 'bg-gradient-to-t from-blue-700 via-blue-600 to-blue-500 group-hover:from-blue-600 group-hover:to-cyan-400'
                                  }`}
                                >
                                </div>
                              </div>

                              {/* Date & Day Label */}
                              <div className="mt-2 text-center">
                                <span className="block text-[11px] font-bold text-white font-mono">
                                  {dateShort}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-medium">
                                  {dayShort}
                                </span>
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 group-hover:border-blue-400">
                                  {ds.totalQuantitySold} pcs
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* TABLE 1: CONSOLIDATED PRODUCT SALES SUMMARY TABLE                         */}
              {/* ========================================================================= */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>1. Consolidated Product Sales Ledger (Product Name, Product Price, Quantity Sold & Total Sales Amount)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aggregated breakdown across all operational days for {currentPeriodData.label}.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                    {currentPeriodData.productTotals.length} Registered Products Sold
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-right">Product Price (TZS)</th>
                        <th className="py-2.5 px-3 text-center">Unit PV</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">Quantity Sold</th>
                        <th className="py-2.5 px-3 text-right font-bold text-amber-900">Total PV</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Sales Amount (TZS)</th>
                        <th className="py-2.5 px-3 text-right">Revenue Contribution</th>
                        <th className="py-2.5 px-3 text-right">Avg Units / Day</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentPeriodData.productTotals.map(p => {
                        const contributionPct = currentPeriodData.totalRevenue > 0
                          ? ((p.totalAmount / currentPeriodData.totalRevenue) * 100).toFixed(1)
                          : '0.0';
                        const avgPerDay = periodDailyList.length > 0
                          ? (p.totalQuantity / periodDailyList.length).toFixed(1)
                          : '0.0';

                        return (
                          <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {p.productName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                              TZS {p.productPrice.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-800 text-[11px]">
                              {p.pv ?? 0} PV
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                              {p.totalQuantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-amber-900 text-xs">
                              {((p.pv || 0) * p.totalQuantity).toFixed(1)} PV
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                              TZS {p.totalAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-[11px]">
                                {contributionPct}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                              {avgPerDay} pcs/day
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 font-bold bg-slate-50 text-slate-900">
                        <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                          Period Grand Total:
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm">{currentPeriodData.totalQuantitySold} units</td>
                        <td className="py-3 px-3 text-right font-mono text-sm text-amber-900">
                          {(currentPeriodData.totalPv || 0).toFixed(1)} PV
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm sm:text-base text-emerald-700">
                          TZS {currentPeriodData.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs">100.0%</td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                          {avgDailyUnits} units/day
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* TABLE 2: AGGREGATED DAILY SALES SUMMARY TABLE (DAY-BY-DAY PROGRESSION)     */}
              {/* ========================================================================= */}
              <div className="space-y-3 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>2. Daily Sales Data Aggregated Summary Table (Day-by-Day Progression)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review individual daily performance, sales totals, diagnostics completed, and member kits enrolled that compose this period.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0">
                    {currentPeriodData.dailyReportsCount} Operational Daily Records
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Date & Day</th>
                        <th className="py-2.5 px-3">Staff Member</th>
                        <th className="py-2.5 px-3 text-right">Units Sold</th>
                        <th className="py-2.5 px-3 text-right font-bold text-amber-900">Daily PV</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">Daily Sales (TZS)</th>
                        <th className="py-2.5 px-3 text-right">% Contribution</th>
                        <th className="py-2.5 px-3 text-center">Diagnostics (Quantum + Body)</th>
                        <th className="py-2.5 px-3 text-center">Member Kits</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!currentPeriodData.dailySummaries || currentPeriodData.dailySummaries.length === 0) ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-slate-400 italic">
                            No daily sales records recorded for this period range.
                          </td>
                        </tr>
                      ) : (
                        currentPeriodData.dailySummaries.map((ds) => {
                          const totalTests = (ds.quantumTestCount || 0) + (ds.bodyAnalyzerTestCount || 0);
                          const sharePct = currentPeriodData.totalRevenue > 0
                            ? ((ds.totalSalesAmount / currentPeriodData.totalRevenue) * 100).toFixed(1)
                            : '0.0';
                          const isPeak = peakSalesDay?.reportId === ds.reportId;

                          return (
                            <tr key={ds.reportId} className={`hover:bg-slate-50/80 transition-colors ${isPeak ? 'bg-emerald-50/40' : ''}`}>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{ds.reportDate}</span>
                                  {isPeak && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                                      ★ Peak
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-sans block font-normal">
                                  {getDayOfWeekName(ds.reportDate)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                <span className="font-semibold text-slate-900">{ds.staffName}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">@{ds.staffUsername}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-800">
                                {ds.totalQuantitySold} pcs
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-amber-800">
                                {(ds.totalPv || 0).toFixed(1)} PV
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-700 text-xs sm:text-sm">
                                TZS {ds.totalSalesAmount.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  isPeak ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {sharePct}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px]">
                                  {totalTests} tests (Q:{ds.quantumTestCount ?? 0}, B:{ds.bodyAnalyzerTestCount ?? 0})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">
                                  {ds.kitRegisteredCount} kits
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setInspectingDailyReport(ds)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] shadow-xs"
                                  title="Inspect individual product lines sold on this date"
                                >
                                  <Eye className="w-3 h-3 text-emerald-400" />
                                  <span>View Sales Details</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {currentPeriodData.dailySummaries && currentPeriodData.dailySummaries.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                          <td colSpan={2} className="py-3 px-3 text-right uppercase text-[11px]">
                            Consolidated Period Total ({currentPeriodData.dailySummaries.length} days):
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-900">
                            {currentPeriodData.totalQuantitySold} pcs
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-800">
                            {(currentPeriodData.totalPv || 0).toFixed(1)} PV
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700">
                            TZS {currentPeriodData.totalRevenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-xs">
                            100.0%
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-purple-700">
                            {currentPeriodData.quantumTotal + currentPeriodData.bodyAnalyzerTotal} patients
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-blue-700">
                            {currentPeriodData.kitRegisteredTotal} kits
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION: EXECUTIVE AUDIT & REVIEW FOR THIS PERIOD REPORT                 */}
              {/* ========================================================================= */}
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>Executive Audit & Feedback: {currentPeriodData.label}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review staff reconciliation notes and record official approval or requested adjustments without logging into staff account.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Status:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                        currentPeriodData.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentPeriodData.status === 'changes_requested'
                          ? 'bg-amber-100 text-amber-800'
                          : currentPeriodData.status === 'submitted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {currentPeriodData.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Staff submission details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block font-semibold">Staff Submission:</span>
                    <span>
                      {currentPeriodData.submittedByStaff ? (
                        <>Submitted by <strong>@{currentPeriodData.submittedByStaff}</strong> {currentPeriodData.submittedAt ? `on ${new Date(currentPeriodData.submittedAt).toLocaleDateString()}` : ''}</>
                      ) : (
                        <span className="text-slate-400 italic">Not yet formally submitted by staff</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Staff Pre-Submission Review:</span>
                    <span className={currentPeriodData.staffReviewed ? "text-emerald-700 font-semibold" : "text-slate-400 italic"}>
                      {currentPeriodData.staffReviewed ? "✓ Verified & Reviewed by Staff before Submission" : "Awaiting Staff Review"}
                    </span>
                  </div>
                </div>

                {/* Manager Feedback Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Managerial Audit Remarks & Feedback *
                  </label>
                  <textarea
                    rows={3}
                    value={periodFeedbackInput}
                    onChange={(e) => setPeriodFeedbackInput(e.target.value)}
                    placeholder="e.g. Approved. Weekly diagnostic patient count matches clinic registers and product cash flow reconciles with daily bank deposits."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    These audit remarks will be immediately visible on the Staff Workspace.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500">
                    Audit Actor: <strong>@{currentUser?.username}</strong> (Executive Manager)
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReviewPeriodAction('changes_requested')}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-colors"
                    >
                      Request Period Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewPeriodAction('approved')}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Period Report</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Print Footer */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Verified by Executive Management · Francis Owen (Executive Manager)
                </div>
                <div>
                  Generated Date: 2026-10-22
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal: View Single Day Details from Weekly/Period Summary */}
      {inspectingDailyReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Daily Report Summary
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Daily Report for Date: {inspectingDailyReport.reportDate}
                </h3>
                <p className="text-xs text-slate-500">
                  Submitted by {inspectingDailyReport.staffName} (@{inspectingDailyReport.staffUsername})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDailyReport(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPIs for this day */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Daily Sales:</span>
                <strong className="font-mono text-emerald-700 text-sm">
                  TZS {inspectingDailyReport.totalSalesAmount.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Total PV:</span>
                <strong className="font-mono text-amber-800 text-sm">
                  {(inspectingDailyReport.totalPv || 0).toFixed(1)} PV
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Units Sold:</span>
                <strong className="font-mono text-slate-900 text-sm">
                  {inspectingDailyReport.totalQuantitySold} pcs
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Diagnostics:</span>
                <strong className="font-mono text-purple-700 text-xs block">
                  Q: {inspectingDailyReport.quantumTestCount ?? 'NULL'} | B: {inspectingDailyReport.bodyAnalyzerTestCount ?? 'NULL'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Member Kits:</span>
                <strong className="font-mono text-blue-700 text-sm">
                  {inspectingDailyReport.kitRegisteredCount} kits
                </strong>
              </div>
            </div>

            {/* Items sold table */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-800">
                Products Sold on this Date ({inspectingDailyReport.items.filter(i => i.quantity > 0).length} active items):
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-right">Price (TZS)</th>
                      <th className="py-2 px-3 text-center">Unit PV</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right text-amber-900 font-bold">Line PV</th>
                      <th className="py-2 px-3 text-right">Total (TZS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectingDailyReport.items.filter(i => i.quantity > 0).map(it => (
                      <tr key={it.productId}>
                        <td className="py-2 px-3 font-medium text-slate-900">{it.productName}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          TZS {it.productPrice.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-amber-800 text-[11px]">
                          {it.pv ?? 0} PV
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-900 text-xs">
                          {((it.pv || 0) * it.quantity).toFixed(1)} PV
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          TZS {it.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {inspectingDailyReport.items.filter(i => i.quantity > 0).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                          No products sold on this date (quantity = 0).
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td colSpan={3} className="py-2 px-3 text-right uppercase text-[10px]">
                        Day Total:
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{inspectingDailyReport.totalQuantitySold}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-800">
                        {(inspectingDailyReport.totalPv || 0).toFixed(1)} PV
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">
                        TZS {inspectingDailyReport.totalSalesAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingDailyReport(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile & Security Credentials Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* Official Print Report Modal with Date & Category Filters */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reports={allReports}
        expenses={allExpenses}
        defaultDate={systemDate}
        defaultScope="daily"
        userRole="manager"
        currentUsername={currentUser?.username}
      />

      {/* Fullscreen Image Lightbox Modal */}
      <ImageViewerModal
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.url || null}
        title={viewingImage?.title}
        subtitle={viewingImage?.subtitle}
      />

      {/* Administrative User Registration Modal */}
      <AdminUserModal
        isOpen={isAdminUserModalOpen}
        onClose={() => setIsAdminUserModalOpen(false)}
        onUserCreated={() => {
          loadAll();
          showNotice('success', 'New user account successfully created.');
        }}
      />
    </div>
  );
};

