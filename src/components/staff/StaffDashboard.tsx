import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  Product,
  DailyOperationalReport,
  DailyReportItem,
  PeriodType,
  PeriodAggregatedReport,
} from '../../types';
import {
  FileText,
  Package,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Send,
  Edit3,
  Clock,
  Eye,
  Plus,
  Trash2,
  TrendingUp,
  MessageSquare,
  FileCheck,
  UserCheck,
  KeyRound,
  Shield,
  HelpCircle,
  Check,
  AlertTriangle,
  X,
  Bell,
  Printer,
  Download,
  Receipt,
  Scale,
} from 'lucide-react';
import { ProfileModal } from '../shared/ProfileModal';
import { PrintReportModal } from '../shared/PrintReportModal';
import { BackupService } from '../../services/backupService';
import { FinancialService } from '../../services/financialService';
import { ProductInventory } from './ProductInventory';
import { ProfileSettings } from './ProfileSettings';
import { DailyReportModule } from './DailyReportModule';
import { ExpenseManagementModule } from './ExpenseManagementModule';
import { NotificationCenter } from '../shared/NotificationCenter';
import { SystemDateTimeHeader } from '../shared/SystemDateTimeHeader';

type StaffTab =
  | 'daily-entry'
  | 'product-catalog'
  | 'edit-past-reports'
  | 'auto-periods'
  | 'expenses'
  | 'my-reports-feedback'
  | 'my-profile';

export const StaffDashboard: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();

  if (currentUser?.role === 'manager') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-red-200 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted (Manager Role)</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Managers are restricted from entering the Staff Workspace. Your account has executive audit authority via the <strong>Manager Dashboard</strong>.
          </p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<StaffTab>('product-catalog');

  // Loaded data
  const [products, setProducts] = useState<Product[]>([]);
  const [allReports, setAllReports] = useState<DailyOperationalReport[]>([]);

  // Selected date for daily report (defaults to today/reference date dynamically)
  const [selectedReportDate, setSelectedReportDate] = useState<string>(() => StorageService.getSystemDate());

  // Form states for Daily Report items (4 Core Columns: Product Name, Product Price, Quantity, Total Amount)
  const [reportItems, setReportItems] = useState<DailyReportItem[]>([]);
  const [quantumCount, setQuantumCount] = useState<string>('');
  const [bodyAnalyzerCount, setBodyAnalyzerCount] = useState<string>('');
  const [kitRegisteredCount, setKitRegisteredCount] = useState<number | ''>('');
  const [kitNumbers, setKitNumbers] = useState<string>('');

  // Daily report review mode before submission
  const [reviewMode, setReviewMode] = useState<boolean>(false);

  // Product Registration form states (The 3 Core Required Fields: Product Name, Product Price, Quantity)
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number | ''>('');
  const [newProdStock, setNewProdStock] = useState<number | ''>('');
  const [newProdCategory, setNewProdCategory] = useState('Wellness & Nutrition');

  // Past Report Editing
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);

  // Automated Period Reports Tab state
  const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodType>('weekly');
  const [periodReportData, setPeriodReportData] = useState<PeriodAggregatedReport | null>(null);
  const [isPeriodReviewModalOpen, setIsPeriodReviewModalOpen] = useState<boolean>(false);
  const [isSubmittingPeriod, setIsSubmittingPeriod] = useState<boolean>(false);

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Notifications
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  // In-App Low Stock Notification calculations
  const [isLowStockBannerDismissed, setIsLowStockBannerDismissed] = useState(false);
  const lowStockThreshold = StorageService.getLowStockThreshold();
  const lowStockProducts = products.filter((p) => p.currentStock !== undefined && p.currentStock <= lowStockThreshold);
  const outOfStockProducts = lowStockProducts.filter((p) => p.currentStock === 0);

  // Automated Period Financial Reconciliation
  const allStaffExpenses = StorageService.getExpenses(currentUser);
  const periodStaffExpenses = periodReportData
    ? allStaffExpenses.filter((e) => e.expenseDate >= periodReportData.startDate && e.expenseDate <= periodReportData.endDate)
    : [];
  const periodStaffExpensesTotal = periodStaffExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const staffNetPosition = FinancialService.calculateNetPosition(
    periodReportData?.totalPv || 0,
    periodStaffExpensesTotal
  );

  const loadAll = () => {
    const prods = StorageService.getProducts();
    const reps = StorageService.getDailyReports(currentUser);
    setProducts(prods);
    setAllReports(reps);
    return { prods, reps };
  };

  useEffect(() => {
    const { prods, reps } = loadAll();
    const currentDate = StorageService.getSystemDate();
    loadReportForDate(currentDate, prods, reps);
    loadPeriodReport(selectedPeriodType, currentDate);

    const handleSystemDateChange = (e: any) => {
      const newDate = typeof e.detail === 'string' ? e.detail : e.detail?.date;
      if (newDate) {
        setSelectedReportDate(newDate);
        loadReportForDate(newDate, prods, reps);
        loadPeriodReport(selectedPeriodType, newDate);
      }
    };
    window.addEventListener('t20-system-date-changed', handleSystemDateChange);
    return () => window.removeEventListener('t20-system-date-changed', handleSystemDateChange);
  }, []);

  const loadPeriodReport = (type: PeriodType, refDate = selectedReportDate) => {
    setSelectedPeriodType(type);
    const agg = StorageService.getAggregatedPeriodReport(type, refDate, currentUser);
    setPeriodReportData(agg);
  };

  // Populate daily report for a given date from existing report or registered products
  const loadReportForDate = (dateStr: string, currentProds = products, currentReps = allReports) => {
    setSelectedReportDate(dateStr);
    const existing = currentReps.find(r => r.reportDate === dateStr);

    if (existing) {
      setIsEditingExisting(true);
      setReportItems(existing.items);
      setQuantumCount(existing.quantumTestCount === null ? '' : String(existing.quantumTestCount));
      setBodyAnalyzerCount(existing.bodyAnalyzerTestCount === null ? '' : String(existing.bodyAnalyzerTestCount));
      setKitRegisteredCount(existing.kitRegisteredCount);
      setKitNumbers(existing.kitNumbers || '');
    } else {
      setIsEditingExisting(false);
      // Auto-populate from all registered products with quantity = 0!
      // This fulfills: "kupitia bidhaa zilizosajiliwa mfumo utakwenda kuziweka sehemu ya reporty automatically na hivyo haitomhitaji tena staff kuanza kuzisajili bidhaa ili ajaze reporty"
      const initialItems: DailyReportItem[] = currentProds.map(p => ({
        productId: p.id,
        productName: p.name,
        productPrice: p.currentPrice,
        pv: p.pv || 0,
        quantity: 0,
        totalPv: 0,
        totalAmount: 0,
      }));
      setReportItems(initialItems);
      setQuantumCount('');
      setBodyAnalyzerCount('');
      setKitRegisteredCount('');
      setKitNumbers('');
    }
    setReviewMode(false);
  };

  // Handle changing item quantity (updates Total Amount: Price * Quantity & Line PV: PV * Quantity)
  const handleItemQuantityChange = (productId: string, qtyValue: number) => {
    setReportItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const validQty = Math.max(0, isNaN(qtyValue) ? 0 : qtyValue);
          return {
            ...item,
            quantity: validQty,
            totalPv: (item.pv || 0) * validQty,
            totalAmount: item.productPrice * validQty,
          };
        }
        return item;
      })
    );
  };

  // Handle changing item unit price
  const handleItemPriceChange = (productId: string, priceValue: number) => {
    setReportItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const validPrice = Math.max(0, isNaN(priceValue) ? 0 : priceValue);
          return {
            ...item,
            productPrice: validPrice,
            totalAmount: validPrice * item.quantity,
          };
        }
        return item;
      })
    );
  };

  // Add registered product manually if user removed it earlier
  const handleAddProductToReport = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    if (reportItems.some(i => i.productId === prod.id)) {
      showNotice('error', 'This product is already present in the daily report list.');
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
        totalPv: 0,
        totalAmount: 0,
      },
    ]);
  };

  const handleRemoveItemFromReport = (productId: string) => {
    setReportItems(prev => prev.filter(i => i.productId !== productId));
  };

  // Calculations for current report
  const currentTotalSales = reportItems.reduce((acc, it) => acc + it.totalAmount, 0);
  const currentTotalQuantity = reportItems.reduce((acc, it) => acc + it.quantity, 0);
  const currentTotalPv = reportItems.reduce((acc, it) => acc + ((it.pv || 0) * it.quantity), 0);

  // Submit Daily Report flow: Staff reviews and submits
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportItems.length === 0) {
      showNotice('error', 'Please ensure at least one product is in the daily report table.');
      return;
    }
    setReviewMode(true);
  };

  const handleFinalSubmitDailyReport = () => {
    let finalQuantum: number | null = null;
    if (quantumCount.trim() !== '') {
      const q = parseInt(quantumCount, 10);
      finalQuantum = isNaN(q) ? null : Math.max(0, q);
    }

    let finalBodyAnalyzer: number | null = null;
    if (bodyAnalyzerCount.trim() !== '') {
      const b = parseInt(bodyAnalyzerCount, 10);
      finalBodyAnalyzer = isNaN(b) ? null : Math.max(0, b);
    }

    const calculatedItems = reportItems.map(it => {
      const prod = products.find(p => p.id === it.productId);
      const pv = it.pv ?? prod?.pv ?? 0;
      return {
        ...it,
        pv,
        totalPv: pv * it.quantity,
      };
    });

    const report: DailyOperationalReport = {
      id: `REP-${selectedReportDate}`,
      reportDate: selectedReportDate,
      staffUsername: currentUser?.username || 'staff',
      staffName: currentUser?.fullName || 'Staff Member',
      items: calculatedItems,
      totalSalesAmount: currentTotalSales,
      totalQuantitySold: currentTotalQuantity,
      totalPv: currentTotalPv,
      quantumTestCount: finalQuantum,
      bodyAnalyzerTestCount: finalBodyAnalyzer,
      kitRegisteredCount: Number(kitRegisteredCount) || 0,
      kitNumbers: kitNumbers.trim() || undefined,
      notes: undefined,
      status: 'submitted',
      staffReviewed: true,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      managerFeedback: isEditingExisting
        ? allReports.find(r => r.reportDate === selectedReportDate)?.managerFeedback
        : undefined,
    };

    StorageService.saveOrUpdateDailyReport(report);
    loadAll();
    loadPeriodReport(selectedPeriodType);
    setReviewMode(false);
    showNotice(
      'success',
      `Daily report for ${selectedReportDate} has been saved and dispatched to the Manager Dashboard for review.`
    );
  };

  // Product Registration Handler: The 3 Core Required Fields (Product Name, Product Price, Quantity)
  const handleRegisterProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || newProdPrice === '' || newProdStock === '') {
      showNotice('error', 'Please fill in all 3 required fields: Product Name, Product Price, and Quantity.');
      return;
    }

    const newId = `T20-PRD-${String(products.length + 1).padStart(3, '0')}`;
    const product: Product = {
      id: newId,
      name: newProdName.trim(),
      currentPrice: Number(newProdPrice),
      pv: 0,
      currentStock: Number(newProdStock),
      category: newProdCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.addProduct(product, currentUser?.username || 'staff');
    const { prods, reps } = loadAll();

    // Auto-insert this new registered product into current daily report table so staff never registers twice!
    setReportItems(prev => {
      if (prev.some(it => it.productId === product.id)) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productPrice: product.currentPrice,
          pv: product.pv || 0,
          quantity: 0,
          totalPv: 0,
          totalAmount: 0,
        },
      ];
    });

    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    showNotice(
      'success',
      `Product "${product.name}" has been registered into the T20 Server and automatically added to your Daily Report form!`
    );
  };

  // Staff Reviews & Formally Submits Period Report (Weekly / Monthly etc.)
  const handleStaffSubmitPeriodReport = () => {
    if (!periodReportData) return;
    setIsSubmittingPeriod(true);

    StorageService.submitPeriodReport(periodReportData.id, {
      staffUsername: currentUser?.username || 'staff',
    });

    setIsSubmittingPeriod(false);
    setIsPeriodReviewModalOpen(false);
    loadPeriodReport(selectedPeriodType);
    showNotice(
      'success',
      `${periodReportData.label} successfully reviewed by staff and submitted to the Executive Manager for audit review!`
    );
  };

  const handleSelectDate = (dateStr: string) => {
    StorageService.setSystemDate(dateStr);
    loadReportForDate(dateStr);
    loadPeriodReport(selectedPeriodType);
    showNotice('success', `Unified system date updated to ${dateStr}. Daily report & period views synchronized.`);
  };

  // Reports submitted by this staff
  const mySubmittedReports = allReports.filter(r => r.staffUsername === currentUser?.username);

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Unified System Operational Date & Live Clock Header */}
      <SystemDateTimeHeader
        currentDate={selectedReportDate}
        onDateChange={handleSelectDate}
        roleLabel="Staff Operations"
      />

      {/* Workspace Top Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Staff Operations Workspace</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-900 font-bold">{currentUser?.fullName} (@{currentUser?.username})</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Report Date: {selectedReportDate}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
                T20 Daily Operations & Automated Reporting Center
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Notification Center */}
              <NotificationCenter
                onNavigateToInventory={() => setActiveTab('product-catalog')}
                onStockUpdated={() => loadAll()}
              />

              {lowStockProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('product-catalog')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-colors flex items-center gap-1.5 ${
                    outOfStockProducts.length > 0
                      ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100 animate-pulse'
                      : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  }`}
                  title="Click to view and restock low-stock products"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {lowStockProducts.length} Stock Alert{lowStockProducts.length > 1 ? 's' : ''}
                  </span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('product-catalog')}
                className="text-xs bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>Registered Products ({products.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('my-profile')}
                className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                title="Open Profile Settings Page"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Profile Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                title="Print Daily or Multi-Period Operational Reports"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>Print Reports</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    BackupService.exportBackupFile();
                    showNotice('success', 'Data backup exported successfully!');
                  } catch (err: any) {
                    showNotice('error', err.message || 'Error exporting backup.');
                  }
                }}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
                title="Download complete database backup (JSON)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Backup</span>
              </button>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pt-4 scrollbar-none border-t border-slate-100 mt-3">
            {[
              { id: 'product-catalog', label: '1. Register Products (Product Inventory)', icon: Package },
              { id: 'daily-entry', label: '2. Fill Daily Report', icon: FileText },
              { id: 'auto-periods', label: '3. Automated Period Reports (Review & Submit)', icon: TrendingUp },
              { id: 'edit-past-reports', label: '4. Edit Past Reports', icon: Edit3 },
              { id: 'expenses', label: '5. Record Store Expenses', icon: Receipt },
              { id: 'my-reports-feedback', label: '6. Manager Feedback & Remarks', icon: MessageSquare },
              { id: 'my-profile', label: '7. Profile Settings & Security', icon: UserCheck },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as StaffTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Notice alert */}
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
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            )}
            <div className="text-sm font-semibold">{notice.message}</div>
          </div>
        )}

        {/* Low-Stock In-App Alert Banner */}
        {lowStockProducts.length > 0 && !isLowStockBannerDismissed && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/95 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-950">
                    Low Stock Notification: {lowStockProducts.length} item{lowStockProducts.length > 1 ? 's' : ''} require attention
                  </h4>
                  {outOfStockProducts.length > 0 && (
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-800 uppercase">
                      {outOfStockProducts.length} Depleted (0 Stock)
                    </span>
                  )}
                  <span className="text-[10px] text-amber-700 font-mono">
                    (Safety Threshold: ≤ {lowStockThreshold} units)
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Items requiring restock: <strong>{lowStockProducts.map(p => `${p.name} (${p.currentStock} units)`).slice(0, 3).join(', ')}{lowStockProducts.length > 3 ? ` and ${lowStockProducts.length - 3} other items` : ''}</strong>. Replenish inventory to prevent sales disruption.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeTab !== 'product-catalog' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('product-catalog')}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[36px]"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Go to Inventory</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsLowStockBannerDismissed(true)}
                className="p-1.5 text-amber-700 hover:text-amber-950 rounded-lg hover:bg-amber-100/70 transition-colors"
                title="Dismiss low-stock alert banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== TAB 1: REGISTER PRODUCTS (PRODUCT INVENTORY) ==================== */}
        {activeTab === 'product-catalog' && (
          <ProductInventory
            products={products}
            onProductsUpdated={() => {
              const { prods, reps } = loadAll();
              loadReportForDate(selectedReportDate, prods, reps);
            }}
            onNavigateToDailyReport={() => setActiveTab('daily-entry')}
          />
        )}

        {/* ==================== TAB 2: FILL DAILY REPORT (DAILY REPORT MODULE) ==================== */}
        {activeTab === 'daily-entry' && (
          <DailyReportModule
            products={products}
            initialDate={selectedReportDate}
            onReportSubmitted={() => {
              loadAll();
              loadPeriodReport(selectedPeriodType);
            }}
            onNavigateToInventory={() => setActiveTab('product-catalog')}
            onNavigateToPeriods={() => setActiveTab('auto-periods')}
          />
        )}




        {/* ==================== TAB 3: AUTOMATED PERIOD REPORTS (REVIEW & SUBMIT FLOW) ==================== */}
        {activeTab === 'auto-periods' && (
          <div className="space-y-6">
            {/* Guide & Selector */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                    Staff Period Review & Submission
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">
                    Automated Multi-Period Reporting Engine
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                    When a reporting period completes (e.g. Weekly or Monthly), the system compiles all daily entries automatically.
                    <strong> Staff reviews the compiled period figures and formally submits the report to the Manager Dashboard for audit and feedback remarks.</strong>
                  </p>
                </div>

                {/* Period Selector Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                  {(['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'] as PeriodType[]).map(p => (
                    <button
                      key={p}
                      onClick={() => loadPeriodReport(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors capitalize ${
                        selectedPeriodType === p
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : p === 'quarterly' ? 'Quarterly' : p === 'semi-annual' ? 'Semi-Annual' : 'Annual'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Compiled Period Report Card */}
            {periodReportData && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{periodReportData.label}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Period Range: {periodReportData.startDate} to {periodReportData.endDate} · {periodReportData.dailyReportsCount} Daily Reports Consolidated
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Submission Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        periodReportData.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : periodReportData.status === 'changes_requested'
                          ? 'bg-amber-100 text-amber-800'
                          : periodReportData.status === 'submitted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {periodReportData.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Strategic Metric Badges including Store Profit and Net Balance */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block font-semibold">Total Revenue:</span>
                    <strong className="text-base font-mono text-emerald-700 tabular-nums">
                      TZS {periodReportData.totalRevenue.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Accumulated PV:</span>
                    <strong className="text-base font-mono text-amber-800 tabular-nums">
                      {(periodReportData.totalPv || 0).toFixed(1)} PV
                    </strong>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {staffNetPosition.commissionUnits} comm. units
                    </span>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 block font-semibold text-[11px]">Store Profit (4.5%):</span>
                    <strong className="text-base font-mono text-emerald-800 tabular-nums">
                      TZS {staffNetPosition.storeProfit.toLocaleString()}
                    </strong>
                    <span className="text-[9px] text-emerald-600 block font-mono">
                      PV × 0.045 × 2,800
                    </span>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block font-semibold text-[11px]">Operating Expenses:</span>
                    <strong className="text-base font-mono text-slate-800 tabular-nums">
                      TZS {staffNetPosition.totalExpenses.toLocaleString()}
                    </strong>
                    <span className="text-[9px] text-slate-400 block">
                      {periodStaffExpenses.length} expense item(s)
                    </span>
                  </div>
                  <div className={`p-2 rounded-lg border ${
                    staffNetPosition.status === 'PROFIT'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : staffNetPosition.status === 'LOSS'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="block font-semibold text-[11px]">Net Balance:</span>
                      <span className="text-[9px] font-black uppercase px-1 rounded bg-white/70">
                        {staffNetPosition.status}
                      </span>
                    </div>
                    <strong className="text-base font-mono tabular-nums block mt-0.5">
                      TZS {staffNetPosition.netAmount.toLocaleString()}
                    </strong>
                    <span className="text-[9px] opacity-80 block">Profit - Expenses</span>
                  </div>
                </div>

                {/* Secondary Row: Units Sold & Diagnostics */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-lg border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Total Units Sold:</span>
                    <strong className="font-mono text-slate-900">{periodReportData.totalQuantitySold} pcs</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Clinical Diagnostics & Kits:</span>
                    <strong className="font-mono text-purple-700">
                      {periodReportData.quantumTotal + periodReportData.bodyAnalyzerTotal} pts · {periodReportData.kitRegisteredTotal} kits
                    </strong>
                  </div>
                </div>

                {/* 4 Core Columns Product Rollup + PV */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Consolidated Product Ledger (Product Name, Product Price, Unit PV, Quantity Sold, Total PV, Total Amount)
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-right">Product Price (TZS)</th>
                          <th className="py-2.5 px-3 text-center">Unit PV</th>
                          <th className="py-2.5 px-3 text-right font-bold">Quantity (Units Sold)</th>
                          <th className="py-2.5 px-3 text-right font-bold text-amber-900">Total PV</th>
                          <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Amount (TZS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {periodReportData.productTotals.map(p => (
                          <tr key={p.productId}>
                            <td className="py-2 px-3 font-semibold text-slate-900">{p.productName}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">TZS {p.productPrice.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-amber-800 text-[11px]">{p.pv ?? 0} PV</td>
                            <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{p.totalQuantity}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-amber-900 text-xs">
                              {((p.pv || 0) * p.totalQuantity).toFixed(1)} PV
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                              TZS {p.totalAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 font-bold bg-slate-50 text-slate-900">
                          <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider">
                            Consolidated Grand Total:
                          </td>
                          <td className="py-3 px-3 text-right font-mono">{periodReportData.totalQuantitySold}</td>
                          <td className="py-3 px-3 text-right font-mono text-amber-800">
                            {(periodReportData.totalPv || 0).toFixed(1)} PV
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-base text-emerald-700">
                            TZS {periodReportData.totalRevenue.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Manager Feedback Banner if Manager has reviewed this period report */}
                {periodReportData.managerFeedback && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Executive Manager Feedback ({periodReportData.reviewedByManager ? `@${periodReportData.reviewedByManager}` : 'Manager'}):</span>
                    </div>
                    <p className="text-xs text-slate-800 italic pl-6">
                      "{periodReportData.managerFeedback}"
                    </p>
                    {periodReportData.reviewedAt && (
                      <div className="text-[10px] text-slate-500 pl-6">
                        Reviewed at: {new Date(periodReportData.reviewedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Staff Review Before Submission CTA Card */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Staff Pre-Submission Audit & Submission to Executive Manager</span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                        Daily operational logs are automatically compiled here. Multi-period statements (Weekly, Monthly, Quarterly, Semi-Annual, and Annual) are reviewed by staff before being formally submitted to the Executive Manager.
                      </p>
                    </div>

                    {periodReportData.submittedAt && (
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                        ✓ Formally Submitted by @{periodReportData.submittedByStaff} ({new Date(periodReportData.submittedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 font-mono">
                      Report ID: <code className="font-bold text-slate-700">{periodReportData.id}</code> · {periodReportData.dailyReportsCount} daily records consolidated
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPeriodReviewModalOpen(true)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors min-h-[42px]"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>
                        {periodReportData.submittedAt
                          ? `Re-Audit & Submit ${selectedPeriodType.toUpperCase()} Report to Manager`
                          : `Review & Submit ${selectedPeriodType.toUpperCase()} Report to Manager`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= MODAL: FORMAL STAFF REVIEW BEFORE SUBMISSION ================= */}
            {isPeriodReviewModalOpen && periodReportData && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                        Pre-Submission Audit Stage
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                        Staff Audit & Submission: {periodReportData.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Please verify all consolidated sales figures, clinical diagnostic tallies, and member kit registrations before submitting to the Executive Manager.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPeriodReviewModalOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Period Highlights Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block font-semibold">Total Revenue:</span>
                      <strong className="text-base font-mono text-emerald-700 tabular-nums">
                        TZS {periodReportData.totalRevenue.toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-semibold">Accumulated PV:</span>
                      <strong className="text-base font-mono text-amber-800 tabular-nums">
                        {(periodReportData.totalPv || 0).toFixed(1)} PV
                      </strong>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <span className="text-emerald-800 block font-semibold text-[11px]">Store Profit (4.5%):</span>
                      <strong className="text-base font-mono text-emerald-800 tabular-nums">
                        TZS {staffNetPosition.storeProfit.toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-600 block font-semibold text-[11px]">Period Expenses:</span>
                      <strong className="text-base font-mono text-slate-800 tabular-nums">
                        TZS {staffNetPosition.totalExpenses.toLocaleString()}
                      </strong>
                    </div>
                    <div className={`p-2 rounded-lg border ${
                      staffNetPosition.status === 'PROFIT'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : staffNetPosition.status === 'LOSS'
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                      <span className="block font-semibold text-[11px]">Net Amount:</span>
                      <strong className="text-base font-mono tabular-nums block">
                        TZS {staffNetPosition.netAmount.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Diagnostics breakdown & period scope */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block font-semibold">Diagnostic Modalities Breakdown:</span>
                      <div className="mt-1 space-y-0.5 font-mono text-slate-800">
                        <div>• Quantum Resonance: <strong>{periodReportData.quantumTotal} patients</strong></div>
                        <div>• Body Analyzer: <strong>{periodReportData.bodyAnalyzerTotal} patients</strong></div>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-semibold">Consolidation Scope:</span>
                      <div className="mt-1 space-y-0.5 text-slate-800">
                        <div>• Range: <strong>{periodReportData.startDate}</strong> to <strong>{periodReportData.endDate}</strong></div>
                        <div>• Consolidated Daily Operational Logs: <strong>{periodReportData.dailyReportsCount}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Consolidated Product Ledger (4 Core Columns + PV) */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Consolidated Product Sales Ledger (Product Name, Price, PV, Quantity Sold, Total Amount):
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">1. Product Name</th>
                            <th className="py-2.5 px-3 text-right">2. Product Price (TZS)</th>
                            <th className="py-2.5 px-3 text-center">Unit PV</th>
                            <th className="py-2.5 px-3 text-right font-bold">3. Quantity Sold</th>
                            <th className="py-2.5 px-3 text-right font-bold text-amber-900">Total PV</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-900">4. Total Amount (TZS)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {periodReportData.productTotals.map(p => (
                            <tr key={p.productId} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{p.productName}</td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                                TZS {p.productPrice.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-800 text-[11px]">
                                {p.pv ?? 0} PV
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                                {p.totalQuantity}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-amber-900 text-xs">
                                {((p.pv || 0) * p.totalQuantity).toFixed(1)} PV
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                                TZS {p.totalAmount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          {periodReportData.productTotals.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400">
                                No products sold in this period range.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                            <td colSpan={3} className="py-3 px-3 text-right uppercase text-xs">
                              Consolidated Period Total:
                            </td>
                            <td className="py-3 px-3 text-right font-mono">{periodReportData.totalQuantitySold} pcs</td>
                            <td className="py-3 px-3 text-right font-mono text-amber-800">
                              {(periodReportData.totalPv || 0).toFixed(1)} PV
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-base text-emerald-700">
                              TZS {periodReportData.totalRevenue.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Daily Reports Breakdown Summary */}
                  {periodReportData.dailySummaries && periodReportData.dailySummaries.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Day-by-Day Daily Reports Summary ({periodReportData.dailySummaries.length} days):</span>
                        <span className="text-[11px] font-mono font-normal text-slate-500">
                          {periodReportData.startDate} to {periodReportData.endDate}
                        </span>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3 text-right">Units Sold</th>
                              <th className="py-2 px-3 text-right font-bold text-amber-900">Daily PV</th>
                              <th className="py-2 px-3 text-right">Daily Sales (TZS)</th>
                              <th className="py-2 px-3 text-center">Diagnostics</th>
                              <th className="py-2 px-3 text-center">Member Kits</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {periodReportData.dailySummaries.map((ds) => (
                              <tr key={ds.reportId} className="hover:bg-slate-50/60">
                                <td className="py-2 px-3 font-mono font-medium text-slate-900">{ds.reportDate}</td>
                                <td className="py-2 px-3 text-right font-mono">{ds.totalQuantitySold}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                                  {(ds.totalPv || 0).toFixed(1)} PV
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                  TZS {ds.totalSalesAmount.toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-[11px]">
                                  {(ds.quantumTestCount || 0) + (ds.bodyAnalyzerTestCount || 0)} pts
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-[11px]">
                                  {ds.kitRegisteredCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Staff Verification Badge */}
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong>Staff Verification Statement:</strong> I have reviewed this consolidated statement and confirm that all sales data, clinical diagnostic counts, and member kit enrollments reconcile accurately with underlying daily operational records.
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPeriodReviewModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleStaffSubmitPeriodReport}
                      disabled={isSubmittingPeriod}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[42px] disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>
                        {isSubmittingPeriod
                          ? 'Submitting...'
                          : `Confirm & Submit ${selectedPeriodType.toUpperCase()} to Manager`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: EDIT PAST REPORTS ==================== */}
        {activeTab === 'edit-past-reports' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>Edit Past Reports (Automatic Multi-Period Recalculation)</span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Select any previous date to correct quantities, prices, diagnostics, or kit registrations. The system will <strong>automatically update the daily record and recalculate all period rollups</strong> in real time.
              </p>
            </div>

            {/* List of past submitted reports */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">Report Date</th>
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3 text-right">Total Sales</th>
                    <th className="py-2.5 px-3 text-right text-amber-900 font-bold">Total PV</th>
                    <th className="py-2.5 px-3 text-center">Quantum</th>
                    <th className="py-2.5 px-3 text-center">Body Analyzer</th>
                    <th className="py-2.5 px-3 text-center">Kits</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allReports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{rep.reportDate}</td>
                      <td className="py-2.5 px-3 text-slate-700">@{rep.staffUsername}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        TZS {rep.totalSalesAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-amber-800">
                        {(rep.totalPv || 0).toFixed(1)} PV
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {rep.quantumTestCount === null ? 'NULL' : rep.quantumTestCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {rep.bodyAnalyzerTestCount === null ? 'NULL' : rep.bodyAnalyzerTestCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {rep.kitRegisteredCount}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rep.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === 'changes_requested'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            loadReportForDate(rep.reportDate);
                            setActiveTab('daily-entry');
                            showNotice('success', `Loaded editor for report date: ${rep.reportDate}.`);
                          }}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit This Report</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: RECORD STORE EXPENSES ==================== */}
        {activeTab === 'expenses' && (
          <ExpenseManagementModule
            currentUsername={currentUser?.username || 'staff'}
            systemDate={selectedReportDate}
          />
        )}

        {/* ==================== TAB 6: MY REPORTS & MANAGER FEEDBACK ==================== */}
        {activeTab === 'my-reports-feedback' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>My Submitted Reports & Executive Feedback</span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                View real-time feedback remarks submitted by the Executive Manager. If revision is requested, you can edit and resubmit immediately without requiring the manager to enter your workspace.
              </p>
            </div>

            <div className="space-y-4">
              {mySubmittedReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                  No reports submitted yet under your username.
                </div>
              ) : (
                mySubmittedReports.map((report) => (
                  <div key={report.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900">{report.reportDate}</span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-xs text-slate-500">Ref: {report.id}</span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          Sales: TZS {report.totalSalesAmount.toLocaleString()}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-xs font-bold text-amber-800 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Total PV: {(report.totalPv || 0).toFixed(1)} PV
                        </span>
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

                    {/* Breakdown items */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Units Sold:</span>
                        <strong className="font-mono text-slate-900">{report.totalQuantitySold} pcs</strong>
                      </div>
                      <div>
                        <span className="text-purple-700 font-semibold block">Quantum Diagnostics:</span>
                        <strong className="font-mono text-slate-900">
                          {report.quantumTestCount === null ? 'NULL' : report.quantumTestCount}
                        </strong>
                      </div>
                      <div>
                        <span className="text-blue-700 font-semibold block">Body Analyzer Diagnostics:</span>
                        <strong className="font-mono text-slate-900">
                          {report.bodyAnalyzerTestCount === null ? 'NULL' : report.bodyAnalyzerTestCount}
                        </strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-semibold block">Registered Kits:</span>
                        <strong className="font-mono text-slate-900">{report.kitRegisteredCount}</strong>
                      </div>
                    </div>

                    {/* Manager Feedback */}
                    {report.managerFeedback ? (
                      <div className="p-3 bg-white border border-emerald-300 rounded-lg text-xs space-y-1">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Manager Feedback (@{report.reviewedBy || 'Manager'}):</span>
                        </span>
                        <p className="text-slate-800 italic">"{report.managerFeedback}"</p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        Pending Executive Review...
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => {
                          loadReportForDate(report.reportDate);
                          setActiveTab('daily-entry');
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit & Resubmit This Report</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 6: PROFILE SETTINGS & SECURITY ==================== */}
        {activeTab === 'my-profile' && <ProfileSettings />}
      </div>

      {/* Floating profile modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* Print Report Modal with scope, date range, and category filter */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reports={allReports}
        expenses={allStaffExpenses}
        defaultDate={selectedReportDate}
        defaultScope="daily"
        userRole="staff"
        currentUsername={currentUser?.username}
      />
    </div>
  );
};
