export type UserRole = 'manager' | 'staff';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Product {
  id: string; // e.g. T20-PRD-001
  name: string; // Product name
  currentPrice: number; // Member Price (TZS)
  pv: number; // Point Value (PV)
  currentStock?: number; // Quantity in stock (optional)
  category?: string;
  imageUrl?: string; // Product photo base64 data URL or asset path
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportItem {
  productId: string;
  productName: string;
  productPrice: number;
  pv: number; // Point Value per unit
  quantity: number;
  totalAmount: number; // productPrice * quantity
  totalPv: number; // pv * quantity
}

export type ReportStatus = 'draft' | 'reviewed_by_staff' | 'submitted' | 'approved' | 'changes_requested';

export interface DailyOperationalReport {
  id: string; // e.g. REP-2026-10-22
  reportDate: string; // YYYY-MM-DD
  staffUsername: string;
  staffName: string;
  // Core product columns with PV
  items: DailyReportItem[];
  totalSalesAmount: number;
  totalQuantitySold: number;
  totalPv: number; // Total PV accumulated from product sales
  // Testing: Quantum & Body Analyzer (patient count)
  quantumTestCount: number | null;
  bodyAnalyzerTestCount: number | null;
  // Kit registered on this date
  kitRegisteredCount: number;
  kitNumbers?: string;
  notes?: string;
  status: ReportStatus;
  staffReviewed: boolean;
  submittedAt?: string;
  updatedAt: string;
  // Manager review
  managerFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export interface PeriodDailySummary {
  reportId: string;
  reportDate: string;
  staffName: string;
  staffUsername: string;
  totalSalesAmount: number;
  totalQuantitySold: number;
  totalPv: number;
  quantumTestCount: number | null;
  bodyAnalyzerTestCount: number | null;
  kitRegisteredCount: number;
  items: DailyReportItem[];
}

export interface PeriodAggregatedReport {
  id: string;
  periodType: PeriodType;
  label: string;
  startDate: string;
  endDate: string;
  dailyReportsCount: number;
  totalRevenue: number;
  totalQuantitySold: number;
  totalPv: number;
  productTotals: {
    productId: string;
    productName: string;
    productPrice: number;
    pv: number;
    totalQuantity: number;
    totalAmount: number;
    totalPv: number;
  }[];
  dailySummaries?: PeriodDailySummary[];
  quantumTotal: number;
  bodyAnalyzerTotal: number;
  kitRegisteredTotal: number;
  status: ReportStatus;
  staffReviewed: boolean;
  submittedByStaff?: string;
  submittedAt?: string;
  staffNotes?: string;
  managerFeedback?: string;
  reviewedByManager?: string;
  reviewedAt?: string;
}

export interface IncomingGood {
  id: string;
  receivedDate: string;
  receivedBy: string;
  supplierOrSource: string;
  receiptPhotoUrl: string;
  receiptFileName?: string;
  packageDescription?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  actor: string;
  role: UserRole;
  timestamp: string;
}

export type NotificationUrgency = 'critical' | 'warning' | 'info';

export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'system'
  | 'report_feedback'
  | 'report_submitted'
  | 'report_approved'
  | 'report_changes_requested'
  | 'period_ready'
  | 'shift_reminder';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  voiceText?: string;
  targetRole?: 'staff' | 'manager' | 'all';
  productId?: string;
  productName?: string;
  currentStock?: number;
  threshold?: number;
  urgency: NotificationUrgency;
  timestamp: string;
  read: boolean;
  dismissed?: boolean;
}

export type ExpenseCategory =
  | 'Salaries'
  | 'Rent'
  | 'Electricity and Utilities'
  | 'Transport'
  | 'Office Expenses'
  | 'Other Operating Expenses';

export interface Expense {
  id: string;
  expenseDate: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number; // in Tanzanian Shillings (TSh)
  enteredBy: string; // authenticated staff username
  createdAt: string; // ISO 8601 string
}

export type FinancialPeriod = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export type FinancialStatus = 'PROFIT' | 'LOSS' | 'BREAK EVEN';

export interface FinancialSummary {
  period: FinancialPeriod;
  startDate: string;
  endDate: string;
  totalPV: number;
  commissionUnits: number; // totalPV * 0.045
  commissionRate: number; // 0.045 (4.5%)
  conversionFactor: number; // 2,800 TSh per unit
  storeProfit: number; // totalPV * 0.045 * 2800
  totalExpenses: number;
  netAmount: number; // storeProfit - totalExpenses
  status: FinancialStatus;
  expensesByCategory: Record<string, number>;
  expenseCount: number;
  reportCount: number;
}

