import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { NotificationAudio } from '../../services/notificationAudio';
import { OfflineService } from '../../services/offlinePersistence';
import {
  Product,
  DailyOperationalReport,
  DailyReportItem,
  Expense,
  FinancialStatus,
} from '../../types';
import {
  FileText,
  DollarSign,
  Package,
  Activity,
  Layers,
  Send,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  RotateCcw,
  Plus,
  Trash2,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronRight,
  AlertTriangle,
  Save,
  Volume2,
  Wifi,
  WifiOff,
  Receipt,
  Scale,
  X,
  Info,
} from 'lucide-react';
import { SystemDateTimeHeader } from '../shared/SystemDateTimeHeader';
import { FinancialService, EXPENSE_CATEGORIES } from '../../services/financialService';

interface DailyReportModuleProps {
  products: Product[];
  initialDate?: string;
  onReportSubmitted?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToPeriods?: () => void;
}

type DiagnosticTestType = 'quantum' | 'body_analyzer';

export const DailyReportModule: React.FC<DailyReportModuleProps> = ({
  products,
  initialDate,
  onReportSubmitted,
  onNavigateToInventory,
  onNavigateToPeriods,
}) => {
  const { currentUser } = useAuth();

  // Unified system operational date (defaults to current today or passed initialDate)
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || StorageService.getSystemDate()
  );

  useEffect(() => {
    if (initialDate && initialDate !== selectedDate) {
      loadReportData(initialDate, products);
    }
  }, [initialDate]);

  // Synchronize when automatic date advances or system date changes
  useEffect(() => {
    const handleSystemDateChange = (e: any) => {
      const newDate = typeof e.detail === 'string' ? e.detail : e.detail?.date;
      if (newDate && newDate !== selectedDate) {
        loadReportData(newDate, products);
      }
    };
    window.addEventListener('t20-system-date-changed', handleSystemDateChange);
    return () => window.removeEventListener('t20-system-date-changed', handleSystemDateChange);
  }, [products, selectedDate]);

  // Form items: 4 core columns (Product Name, Product Price, Quantity Sold, Total Amount)
  const [reportItems, setReportItems] = useState<DailyReportItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Diagnostic tests: Two test modalities
  // 1. Quantum Resonance Magnetic Analyzer
  // 2. Body Composition Analyzer
  const [selectedDiagnosticType, setSelectedDiagnosticType] = useState<DiagnosticTestType>('quantum');
  const [diagnosticQtyInput, setDiagnosticQtyInput] = useState<string>('');
  const [quantumCount, setQuantumCount] = useState<string>('');
  const [bodyAnalyzerCount, setBodyAnalyzerCount] = useState<string>('');

  // Member Kit Registration Form states
  const [kitRegisteredCount, setKitRegisteredCount] = useState<number | ''>('');
  const [kitNumbers, setKitNumbers] = useState<string>('');

  // Operational states
  const [isExistingReport, setIsExistingReport] = useState<boolean>(false);
  const [existingReportData, setExistingReportData] = useState<DailyOperationalReport | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Daily Expenses & Profit Reconciliation states
  const [dayExpenses, setDayExpenses] = useState<Expense[]>([]);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState<boolean>(false);
  const [expenseCategory, setExpenseCategory] = useState<string>('Other Operating Expenses');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);

  const loadDayExpenses = (targetDate: string) => {
    const allExp = StorageService.getExpenses(currentUser);
    const matched = allExp.filter((e) => e.expenseDate === targetDate);
    setDayExpenses(matched);
  };

  // Feedback notifications
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  // Synchronize available products and load daily report for the chosen unified date
  const loadReportData = (targetDate: string, currentInventory = products) => {
    setSelectedDate(targetDate);
    loadDayExpenses(targetDate);
    const existing = StorageService.getReportByDate(targetDate);

    if (existing) {
      setIsExistingReport(true);
      setExistingReportData(existing);
      setReportItems(existing.items.map(it => {
        const prod = currentInventory.find(p => p.id === it.productId);
        const pv = it.pv !== undefined ? it.pv : (prod?.pv || 0);
        return {
          ...it,
          pv,
          totalPv: it.totalPv !== undefined ? it.totalPv : (pv * it.quantity),
        };
      }));
      setQuantumCount(existing.quantumTestCount === null ? '' : String(existing.quantumTestCount));
      setBodyAnalyzerCount(existing.bodyAnalyzerTestCount === null ? '' : String(existing.bodyAnalyzerTestCount));
      setKitRegisteredCount(existing.kitRegisteredCount);
      setKitNumbers(existing.kitNumbers || '');
    } else {
      setIsExistingReport(false);
      setExistingReportData(null);

      // AUTOMATIC POPULATION FROM REGISTERED PRODUCTS CATALOG:
      // All registered products automatically appear with member price, pv, and quantity = 0
      const initialItems: DailyReportItem[] = currentInventory.map(prod => ({
        productId: prod.id,
        productName: prod.name,
        productPrice: prod.currentPrice,
        pv: prod.pv || 0,
        quantity: 0,
        totalAmount: 0,
        totalPv: 0,
      }));

      // Check if draft exists in IndexedDB offline persistence cache
      OfflineService.getDraftReport(targetDate).then(draft => {
        if (draft && draft.items && draft.items.length > 0) {
          const merged = initialItems.map(init => {
            const draftIt = draft.items.find(d => d.productId === init.productId);
            return draftIt || init;
          });
          setReportItems(merged);
          setQuantumCount(draft.quantumCount || '');
          setBodyAnalyzerCount(draft.bodyAnalyzerCount || '');
          setKitRegisteredCount(draft.kitRegisteredCount !== undefined ? draft.kitRegisteredCount : '');
          setKitNumbers(draft.kitNumbers || '');
          showNotice('info', 'Offline Draft restored from IndexedDB local storage cache.');
        } else {
          setReportItems(initialItems);
          setQuantumCount('');
          setBodyAnalyzerCount('');
          setKitRegisteredCount('');
          setKitNumbers('');
        }
      });
    }
  };

  // Auto-save draft report to IndexedDB as user enters data
  useEffect(() => {
    if (isExistingReport) return;
    const hasData = reportItems.some(i => i.quantity > 0) || !!quantumCount || !!bodyAnalyzerCount || !!kitRegisteredCount || !!kitNumbers;
    if (hasData) {
      const timer = setTimeout(() => {
        OfflineService.saveDraftReport({
          reportDate: selectedDate,
          items: reportItems,
          quantumCount,
          bodyAnalyzerCount,
          kitRegisteredCount,
          kitNumbers,
          updatedAt: new Date().toISOString(),
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [reportItems, quantumCount, bodyAnalyzerCount, kitRegisteredCount, kitNumbers, selectedDate, isExistingReport]);

  useEffect(() => {
    loadReportData(selectedDate, products);
  }, [products]);

  // Handle changing quantity sold for a product
  const handleQuantityChange = (productId: string, rawVal: number | string) => {
    const parsed = typeof rawVal === 'string' ? (rawVal === '' ? 0 : Number(rawVal)) : rawVal;
    const validQty = Math.max(0, isNaN(parsed) ? 0 : parsed);

    setReportItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: validQty,
            totalAmount: item.productPrice * validQty,
            totalPv: (item.pv || 0) * validQty,
          };
        }
        return item;
      })
    );
  };

  // Quick increment/decrement helper
  const handleQuantityDelta = (productId: string, delta: number) => {
    setReportItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const nextQty = Math.max(0, item.quantity + delta);
          return {
            ...item,
            quantity: nextQty,
            totalAmount: item.productPrice * nextQty,
            totalPv: (item.pv || 0) * nextQty,
          };
        }
        return item;
      })
    );
  };

  // Add an extra registered product if previously removed
  const handleAddProduct = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    if (reportItems.some(i => i.productId === prod.id)) {
      showNotice('info', `"${prod.name}" is already included in the active report list.`);
      return;
    }
    setReportItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        productPrice: prod.currentPrice,
        pv: prod.pv || 0,
        quantity: 0,
        totalAmount: 0,
        totalPv: 0,
      },
    ]);
    showNotice('success', `Added "${prod.name}" to the daily operational form.`);
  };

  // Remove a product row
  const handleRemoveItem = (productId: string) => {
    setReportItems(prev => prev.filter(i => i.productId !== productId));
  };

  // Reset all quantities to zero
  const handleResetQuantities = () => {
    setReportItems(prev =>
      prev.map(item => ({
        ...item,
        quantity: 0,
        totalAmount: 0,
        totalPv: 0,
      }))
    );
    showNotice('info', 'All product quantities reset to 0.');
  };

  // Diagnostic Test: Apply count for selected modality
  const handleApplyDiagnosticTally = () => {
    const parsed = parseInt(diagnosticQtyInput, 10);
    if (isNaN(parsed) || parsed < 0) {
      showNotice('error', 'Please enter a valid non-negative number of diagnostic tests.');
      return;
    }

    if (selectedDiagnosticType === 'quantum') {
      setQuantumCount(String(parsed));
      showNotice('success', `Updated Quantum Resonance Magnetic Tests to ${parsed} patients.`);
    } else {
      setBodyAnalyzerCount(String(parsed));
      showNotice('success', `Updated Body Composition Analyzer Tests to ${parsed} patients.`);
    }
    setDiagnosticQtyInput('');
  };

  // Real-time calculations
  const totalSalesAmount = useMemo(
    () => reportItems.reduce((acc, it) => acc + it.totalAmount, 0),
    [reportItems]
  );

  const totalQuantitySold = useMemo(
    () => reportItems.reduce((acc, it) => acc + it.quantity, 0),
    [reportItems]
  );

  const totalPvAccumulated = useMemo(
    () => reportItems.reduce((acc, it) => acc + (it.totalPv || ((it.pv || 0) * it.quantity)), 0),
    [reportItems]
  );

  // Daily Profit & Expenses calculations (BF Suma PV formula)
  const dayStoreProfit = useMemo(() => {
    return FinancialService.calculateStoreProfit(totalPvAccumulated).storeProfit;
  }, [totalPvAccumulated]);

  const dayTotalExpenses = useMemo(() => {
    return dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [dayExpenses]);

  const dayNetAmount = useMemo(() => {
    return dayStoreProfit - dayTotalExpenses;
  }, [dayStoreProfit, dayTotalExpenses]);

  const dayFinancialStatus: FinancialStatus = useMemo(() => {
    if (dayNetAmount > 0) return 'PROFIT';
    if (dayNetAmount < 0) return 'LOSS';
    return 'BREAK EVEN';
  }, [dayNetAmount]);

  const handleRecordDailyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) {
      showNotice('error', 'Please enter a valid expense amount in TZS.');
      return;
    }
    if (!expenseDescription.trim()) {
      showNotice('error', 'Please provide a description for this operational expense.');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const res = await StorageService.recordExpense({
        expenseDate: selectedDate,
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount: Math.round(amt),
      });

      if (res.success) {
        showNotice(
          'success',
          `Recorded expense of ${FinancialService.formatCurrency(amt)} for ${selectedDate}. Store net balance updated.`
        );
        setExpenseDescription('');
        setExpenseAmount('');
        setIsExpenseFormOpen(false);
        loadDayExpenses(selectedDate);
      } else {
        showNotice('error', res.error || 'Failed to record expense.');
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Error communicating with server.');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const activeProductsCount = useMemo(
    () => reportItems.filter(it => it.quantity > 0).length,
    [reportItems]
  );

  // Filtered items based on search input
  const displayedItems = useMemo(() => {
    if (!searchFilter.trim()) return reportItems;
    const query = searchFilter.toLowerCase();
    return reportItems.filter(
      it =>
        it.productName.toLowerCase().includes(query) ||
        it.productId.toLowerCase().includes(query)
    );
  }, [reportItems, searchFilter]);

  // Inventory map to check stock availability
  const inventoryStockMap = useMemo(() => {
    const map = new Map<string, number | undefined>();
    products.forEach(p => map.set(p.id, p.currentStock));
    return map;
  }, [products]);

  // Save Daily Operational Log
  const handleSaveDailyReport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (reportItems.length === 0) {
      showNotice('error', 'The daily report table is empty. Please register or add products first.');
      return;
    }

    setIsSaving(true);

    let parsedQuantum: number | null = null;
    if (quantumCount.trim() !== '') {
      const q = parseInt(quantumCount, 10);
      parsedQuantum = isNaN(q) ? null : Math.max(0, q);
    }

    let parsedBodyAnalyzer: number | null = null;
    if (bodyAnalyzerCount.trim() !== '') {
      const b = parseInt(bodyAnalyzerCount, 10);
      parsedBodyAnalyzer = isNaN(b) ? null : Math.max(0, b);
    }

    const report: DailyOperationalReport = {
      id: `REP-${selectedDate}`,
      reportDate: selectedDate,
      staffUsername: currentUser?.username || 'staff',
      staffName: currentUser?.fullName || 'Staff Member',
      items: reportItems.map(it => ({
        ...it,
        pv: it.pv || 0,
        totalAmount: it.productPrice * it.quantity,
        totalPv: (it.pv || 0) * it.quantity,
      })),
      totalSalesAmount,
      totalQuantitySold,
      totalPv: totalPvAccumulated,
      quantumTestCount: parsedQuantum,
      bodyAnalyzerTestCount: parsedBodyAnalyzer,
      kitRegisteredCount: Number(kitRegisteredCount) || 0,
      kitNumbers: kitNumbers.trim() || undefined,
      notes: undefined,
      status: 'submitted',
      staffReviewed: true,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      managerFeedback: isExistingReport ? existingReportData?.managerFeedback : undefined,
      reviewedBy: isExistingReport ? existingReportData?.reviewedBy : undefined,
      reviewedAt: isExistingReport ? existingReportData?.reviewedAt : undefined,
    };

    try {
      StorageService.saveOrUpdateDailyReport(report);
      // Clean up draft from IndexedDB
      OfflineService.deleteDraftReport(selectedDate);
      if (!OfflineService.isOnline()) {
        OfflineService.queueOfflineAction('SUBMIT_REPORT', report);
      }
      setIsExistingReport(true);
      setExistingReportData(report);
      setIsSaving(false);

      if (onReportSubmitted) {
        onReportSubmitted();
      }

      showNotice(
        'success',
        OfflineService.isOnline()
          ? `Daily operational report for ${selectedDate} saved successfully! These figures automatically compile into your Weekly and Multi-Period Reports.`
          : `Report cached locally on device (IndexedDB Offline). It will synchronize automatically when reconnecting!`
      );
    } catch {
      setIsSaving(false);
      showNotice('error', 'Failed to save daily operational report. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified System Operational Date & Live Clock Banner */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <SystemDateTimeHeader
          currentDate={selectedDate}
          onDateChange={(newDate) => loadReportData(newDate, products)}
          roleLabel="Staff Workspace"
        />
      </div>

      {/* Notifications */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          ) : notice.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          ) : (
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          )}
          <div className="text-sm font-semibold">{notice.message}</div>
        </div>
      )}

      {/* Header Overview Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                Operational Data Entry
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{products.length} Registered Products Auto-Loaded</span>
              </span>
              {isExistingReport && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Existing Record: Editing Mode</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Daily Operations Report — Synchronized Date: {selectedDate}</span>
            </h2>

            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              All registered products from inventory are automatically populated in the table below. Enter <strong>Quantity Sold</strong> to calculate <strong>Total Amount (Price × Quantity)</strong>. All three sections (Product Sales, Member Kits, and Clinical Diagnostics) share this unified operational date.
            </p>
          </div>

          {/* Date Selector & Inventory Shortcut */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-wrap">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label htmlFor="daily-report-date-input" className="text-xs font-semibold text-slate-700">Report Date:</label>
              <input
                id="daily-report-date-input"
                type="date"
                value={selectedDate}
                onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    const isToday = val === StorageService.getTodayString();
                    StorageService.setSystemDate(val, !isToday);
                    loadReportData(val);
                  }
                }}
                className="text-xs font-mono font-bold bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {selectedDate === StorageService.getTodayString() ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Current Date (Today)</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const today = StorageService.resetDateToToday();
                    loadReportData(today);
                  }}
                  className="text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded-full transition-colors border border-blue-300 flex items-center gap-1"
                  title="Reset date automatically to today"
                >
                  <span>⚡ Reset to Today</span>
                </button>
              )}
            </div>

            {onNavigateToInventory && (
              <button
                type="button"
                onClick={onNavigateToInventory}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex items-center gap-1"
              >
                <span>Product Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Manager Feedback Banner if available */}
        {existingReportData?.managerFeedback && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Executive Manager Feedback Received:</span>
            </div>
            <p className="font-mono bg-white/70 p-2.5 rounded-lg border border-amber-200 text-slate-800">
              "{existingReportData.managerFeedback}"
            </p>
            <div className="text-[11px] text-amber-700">
              Reviewed by: {existingReportData.reviewedBy || 'Manager'} · Date: {existingReportData.reviewedAt?.split('T')[0] || selectedDate}
            </div>
          </div>
        )}

        {/* Real-Time Live KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              1. Sales Revenue
            </span>
            <div className="text-sm sm:text-base font-bold font-mono text-blue-950 mt-0.5 tabular-nums">
              TZS {totalSalesAmount.toLocaleString()}
            </div>
            <span className="text-[9px] text-blue-600 block truncate">Price × Quantity</span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              2. Store Profit (4.5% PV)
            </span>
            <div className="text-sm sm:text-base font-bold font-mono text-emerald-800 mt-0.5 tabular-nums">
              TZS {dayStoreProfit.toLocaleString()}
            </div>
            <span className="text-[9px] text-amber-800 block truncate font-mono">
              {totalPvAccumulated.toFixed(1)} PV × 0.045 × 2,800
            </span>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
              3. Day Expenses
            </span>
            <div className="text-sm sm:text-base font-bold font-mono text-rose-900 mt-0.5 tabular-nums">
              TZS {dayTotalExpenses.toLocaleString()}
            </div>
            <span className="text-[9px] text-rose-600 block truncate">
              {dayExpenses.length} item(s) recorded
            </span>
          </div>

          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                4. Net Position
              </span>
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                dayFinancialStatus === 'PROFIT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : dayFinancialStatus === 'LOSS'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {dayFinancialStatus}
              </span>
            </div>
            <div className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
              dayNetAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {FinancialService.formatCurrency(dayNetAmount)}
            </div>
            <span className="text-[9px] text-slate-400 block truncate">
              Profit - Expenses
            </span>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
              5. Diagnostics
            </span>
            <div className="text-sm sm:text-base font-bold font-mono text-purple-950 mt-0.5 tabular-nums">
              {(Number(quantumCount) || 0) + (Number(bodyAnalyzerCount) || 0)} Pts
            </div>
            <span className="text-[9px] text-purple-600 block truncate">
              Q: {quantumCount || '0'} | B: {bodyAnalyzerCount || '0'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
              6. Member Kits
            </span>
            <div className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
              {kitRegisteredCount || 0} Kits
            </div>
            <span className="text-[9px] text-slate-500 block truncate">Auto-registered</span>
          </div>
        </div>
      </div>

      {/* Main Reporting Form */}
      <form onSubmit={handleSaveDailyReport} className="space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: Product Sales Table (4 Core Required Columns)                  */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>1. Product Sales Breakdown (Auto-Loaded from Product Catalog)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Core Columns: <strong>1. Product Name</strong> | <strong>2. Product Price</strong> | <strong>3. Quantity Sold</strong> | <strong>4. Total Amount</strong>
              </p>
            </div>

            {/* Quick Actions: Search, Reset, Add Missing */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-36 sm:w-44"
                />
              </div>

              {totalQuantitySold > 0 && (
                <button
                  type="button"
                  onClick={handleResetQuantities}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
                  title="Reset all quantities to 0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}

              {/* Add unlisted product dropdown */}
              <select
                onChange={e => {
                  if (e.target.value) {
                    handleAddProduct(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="">+ Add Extra Product</option>
                {products
                  .filter(p => !reportItems.some(i => i.productId === p.id))
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (TZS {p.currentPrice.toLocaleString()})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* DESKTOP VIEW: Clean 4-Column Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3">1. Product Name</th>
                  <th className="py-2.5 px-3 text-right w-36">2. Unit Price (TZS)</th>
                  <th className="py-2.5 px-3 text-center w-24">Unit PV</th>
                  <th className="py-2.5 px-3 text-right w-44">3. Quantity Sold</th>
                  <th className="py-2.5 px-3 text-right w-28 text-amber-900 font-bold">Line PV</th>
                  <th className="py-2.5 px-3 text-right w-40 font-bold text-slate-900">
                    4. Total Amount (TZS)
                  </th>
                  <th className="py-2.5 px-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No products match your filter.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, idx) => {
                    const availableStock = inventoryStockMap.get(item.productId);
                    const isOverStock = availableStock !== undefined && item.quantity > availableStock;

                    return (
                      <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                            <span>ID: {item.productId}</span>
                            {availableStock !== undefined && (
                              <>
                                <span>·</span>
                                <span className={availableStock <= 10 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                                  Stock in store: {availableStock}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                          TZS {item.productPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {item.pv ?? 0} PV
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(item.productId, -1)}
                              disabled={item.quantity <= 0}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm disabled:opacity-30"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={e => handleQuantityChange(item.productId, e.target.value)}
                              placeholder="0"
                              className={`w-16 h-8 text-center font-mono font-bold text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                                item.quantity > 0
                                  ? 'bg-emerald-50/40 border-emerald-300 text-emerald-900'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(item.productId, 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(item.productId, 5)}
                              className="h-7 px-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] font-mono border border-blue-200"
                              title="Add 5 units"
                            >
                              +5
                            </button>
                          </div>
                          {isOverStock && (
                            <div className="text-[10px] text-amber-600 mt-1 font-semibold">
                              Quantity exceeds stock ({availableStock})
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-amber-900 text-xs">
                          {((item.pv || 0) * item.quantity).toFixed(1)} PV
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900 text-sm">
                          TZS {item.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                    Grand Daily Sales Total:
                    <span className="block text-[10px] font-normal text-emerald-700 font-mono">
                      Calculated Store Profit (4.5% PV): TZS {FinancialService.calculateStoreProfit(totalPvAccumulated).storeProfit.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm tabular-nums text-blue-700">
                    {totalQuantitySold.toLocaleString()} units
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm tabular-nums text-amber-800">
                    {totalPvAccumulated.toFixed(1)} PV
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base tabular-nums text-emerald-700">
                    TZS {totalSalesAmount.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* MOBILE VIEW: Product Cards */}
          <div className="block md:hidden space-y-3">
            {displayedItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No products found.
              </div>
            ) : (
              displayedItems.map((item, idx) => (
                <div
                  key={item.productId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.quantity > 0
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-900 leading-snug">
                          {item.productName}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {item.pv ?? 0} PV
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Unit Price: TZS {item.productPrice.toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuantityDelta(item.productId, -1)}
                        disabled={item.quantity <= 0}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-base disabled:opacity-30 min-w-[32px]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={e => handleQuantityChange(item.productId, e.target.value)}
                        placeholder="0"
                        className="w-16 h-8 text-center font-mono font-bold text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityDelta(item.productId, 1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-base min-w-[32px]"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuantityDelta(item.productId, 5)}
                        className="h-8 px-2 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs font-mono"
                      >
                        +5
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Total</span>
                      <span className="font-mono font-bold text-xs text-slate-900 tabular-nums block">
                        TZS {item.totalAmount.toLocaleString()}
                      </span>
                      <span className="font-mono font-semibold text-[11px] text-amber-800 tabular-nums">
                        {((item.pv || 0) * item.quantity).toFixed(1)} PV
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2 & 3: CLINICAL DIAGNOSTICS & MEMBER KIT REGISTRATION FORMS       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FORM 1: Clinical Diagnostic Testing Form (Two Modalities with Selector) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Clinical Diagnostic Testing Form (Select Test Modality)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Select between the two clinical diagnostic test types, enter patient count, and record tests for this unified date.
              </p>
            </div>

            {/* Diagnostic Modality Selector Tabs */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Diagnostic Test Type:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDiagnosticType('quantum')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedDiagnosticType === 'quantum'
                      ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">1. Quantum Test</span>
                    {selectedDiagnosticType === 'quantum' && (
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    Quantum Bio-Resonance Magnetic Analyzer
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDiagnosticType('body_analyzer')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedDiagnosticType === 'body_analyzer'
                      ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">2. Body Analyzer</span>
                    {selectedDiagnosticType === 'body_analyzer' && (
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    Body Composition & Cell Analyzer
                  </div>
                </button>
              </div>
            </div>

            {/* Input & Apply Container for Selected Diagnostic */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-800">
                Enter Number of Patients for{' '}
                <strong className="text-purple-700">
                  {selectedDiagnosticType === 'quantum' ? 'Quantum Resonance Test' : 'Body Composition Analyzer Test'}
                </strong>:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={diagnosticQtyInput}
                  onChange={e => setDiagnosticQtyInput(e.target.value)}
                  placeholder="e.g. 12 patients"
                  className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyDiagnosticTally}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors whitespace-nowrap shadow-xs"
                >
                  Set Count
                </button>
              </div>
            </div>

            {/* Live Dual Modality Summary Cards */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-purple-50/40 border border-purple-200/80 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-purple-700 block">
                  Quantum Resonance
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-purple-900">
                    {quantumCount || '0'} pts
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuantumCount(prev => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)))}
                      className="w-6 h-6 rounded bg-white border border-purple-200 text-xs font-bold hover:bg-purple-100 flex items-center justify-center text-purple-900"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantumCount(prev => String((parseInt(prev, 10) || 0) + 1))}
                      className="w-6 h-6 rounded bg-white border border-purple-200 text-xs font-bold hover:bg-purple-100 flex items-center justify-center text-purple-900"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-purple-50/40 border border-purple-200/80 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-purple-700 block">
                  Body Analyzer
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-purple-900">
                    {bodyAnalyzerCount || '0'} pts
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBodyAnalyzerCount(prev => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)))}
                      className="w-6 h-6 rounded bg-white border border-purple-200 text-xs font-bold hover:bg-purple-100 flex items-center justify-center text-purple-900"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyAnalyzerCount(prev => String((parseInt(prev, 10) || 0) + 1))}
                      className="w-6 h-6 rounded bg-white border border-purple-200 text-xs font-bold hover:bg-purple-100 flex items-center justify-center text-purple-900"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM 2: Member Kit Registration Form */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <Layers className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Member Kit Registration Form
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Record new member starter kits registered and enrolled during this unified operational date.
              </p>
            </div>

            <div className="space-y-3">
              {/* Kit Count */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Member Kits Count:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKitRegisteredCount(prev => Math.max(0, (Number(prev) || 0) - 1))}
                    disabled={(Number(kitRegisteredCount) || 0) <= 0}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center disabled:opacity-40"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={kitRegisteredCount}
                    onChange={e => setKitRegisteredCount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0 kits"
                    className="flex-1 px-3 py-2 text-sm font-mono font-bold text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setKitRegisteredCount(prev => (Number(prev) || 0) + 1)}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setKitRegisteredCount(prev => (Number(prev) || 0) + 5)}
                    className="h-9 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs font-mono border border-blue-200"
                  >
                    +5 Kits
                  </button>
                </div>
              </div>

              {/* Kit Serial Numbers */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kit Serial Numbers / Member Names (Optional):
                </label>
                <input
                  type="text"
                  value={kitNumbers}
                  onChange={e => setKitNumbers(e.target.value)}
                  placeholder="e.g. T20-KIT-1092, T20-KIT-1093, Fatuma Said"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Comma-separated serial identifiers recorded on registration certificates.
                </p>
              </div>

              {/* Kit Metrics Card (No Registration Fee) */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">Enrolled Members Today:</span>
                  <strong className="font-mono text-blue-900 text-sm">
                    {kitRegisteredCount || 0} Member Kits Registered
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">Enrollment Status:</span>
                  <span className="font-mono text-blue-800 font-bold">
                    {(Number(kitRegisteredCount) || 0) > 0 ? 'Logged to Registry' : '0 Enrolled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: DAILY PROFIT & EXPENSE RECONCILIATION                          */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Scale className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  4. Daily Store Profit & Expense Reconciliation
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Computes store commission profit from daily PV (<code>PV × 4.5% × TSh 2,800</code>) and subtracts recorded daily expenses for {selectedDate}.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsExpenseFormOpen(!isExpenseFormOpen)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isExpenseFormOpen ? 'Close Form' : '+ Record Daily Expense'}</span>
              </button>
            </div>
          </div>

          {/* 4 Financial Position Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">
                Daily Sales PV
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-amber-950">
                {totalPvAccumulated.toFixed(1)} PV
              </div>
              <span className="text-[10px] text-amber-700 font-mono">
                Comm: {(totalPvAccumulated * 0.045).toFixed(2)} units
              </span>
            </div>

            {/* Store Profit (Always Visible to Manager & Staff) */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                Store Profit (4.5% PV)
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-950">
                {FinancialService.formatCurrency(dayStoreProfit)}
              </div>
              <span className="text-[10px] text-emerald-700 font-mono">
                PV × 0.045 × 2,800
              </span>
            </div>

            {/* Daily Expenses */}
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-rose-800 block">
                Daily Expenses
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-rose-950">
                {FinancialService.formatCurrency(dayTotalExpenses)}
              </div>
              <span className="text-[10px] text-rose-700">
                {`${dayExpenses.length} receipt${dayExpenses.length === 1 ? '' : 's'} on ${selectedDate}`}
              </span>
            </div>

            {/* Net Position (Always Visible to Manager as PROFIT or LOSS) */}
            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-300">
                  Net Balance (Profit / Loss)
                </span>
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                  dayFinancialStatus === 'PROFIT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : dayFinancialStatus === 'LOSS'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {dayFinancialStatus}
                </span>
              </div>
              <div className={`text-base sm:text-lg font-bold font-mono ${
                dayNetAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {FinancialService.formatCurrency(dayNetAmount)}
              </div>
              <span className="text-[10px] text-slate-400">
                Profit - Expenses
              </span>
            </div>
          </div>

          {/* Quick Expense Input Form */}
          {isExpenseFormOpen && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Input Daily Expense for {selectedDate}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpenseFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Amount (TZS / TSh) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 25000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clinic cleaning supplies, dispatch transport"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsExpenseFormOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingExpense}
                  onClick={handleRecordDailyExpense}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmittingExpense ? 'Saving...' : 'Add Expense & Subtract from Profit'}</span>
                </button>
              </div>
            </div>
          )}

          {/* List of Recorded Expenses for this date or Staff Custody Notice */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">
                Receipts for {selectedDate} ({dayExpenses.length}):
              </span>
              {dayTotalExpenses > 0 && (
                <span className="font-mono font-bold text-rose-700">
                  Total Expenses: {FinancialService.formatCurrency(dayTotalExpenses)}
                </span>
              )}
            </div>

            {dayExpenses.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No operational expenses recorded for {selectedDate}. Use the "+ Record Daily Expense" button above to log expenses.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                {dayExpenses.map((exp) => (
                  <div key={exp.id} className="p-2.5 sm:px-4 flex items-center justify-between text-xs bg-white hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-semibold text-slate-900 block">{exp.description}</span>
                      <span className="text-[10px] text-slate-500">
                        Category: <strong className="text-slate-700">{exp.category}</strong> · Logged by @{exp.enteredBy}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-rose-700 text-xs">
                      {FinancialService.formatCurrency(exp.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5: SAVE ACTIONS & COMPILATION SUMMARY                             */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600 max-w-lg">
              <span className="font-bold text-slate-900 block mb-0.5">
                Internal Operational Record Architecture:
              </span>
              Daily reports are saved directly to update store inventory and compile into multi-period reports (Weekly, Monthly, Quarterly, Semi-Annual, and Annual) which are reviewed and submitted to the Executive Manager.
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onNavigateToPeriods && (
                <button
                  type="button"
                  onClick={onNavigateToPeriods}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>Proceed to Weekly & Period Reports</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[42px] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'Saving...'
                    : isExistingReport
                    ? 'Update Daily Operational Log'
                    : 'Save Daily Operational Log'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
