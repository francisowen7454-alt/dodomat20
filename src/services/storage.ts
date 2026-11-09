import {
  User,
  Product,
  DailyOperationalReport,
  PeriodType,
  PeriodAggregatedReport,
  PeriodDailySummary,
  AuditLogEntry,
  InAppNotification,
  Expense,
} from '../types';
import { NotificationAudio } from './notificationAudio';
import { FCMService } from './fcmNotificationService';
import { BackupService } from './backupService';
import { SecurityService } from './security';

const STORAGE_KEYS = {
  USERS: 't20_users_v5',
  CURRENT_USER: 't20_current_user_v5',
  PRODUCTS: 't20_products_v7_bfsuma_pv',
  DAILY_REPORTS: 't20_daily_reports_v7_bfsuma_pv',
  EXPENSES: 't20_expenses_v7_bfsuma',
  PERIOD_SUBMISSIONS: 't20_period_submissions_v5',
  AUDIT_LOGS: 't20_audit_logs_v5',
  LOW_STOCK_THRESHOLD: 't20_low_stock_threshold_v5',
  NOTIFICATIONS_STATE: 't20_notifications_state_v5',
  OPERATIONAL_NOTIFICATIONS: 't20_operational_notifs_v6',
  SYSTEM_DATE: 't20_system_date_v5',
  DATE_MODE: 't20_date_mode_v5',
  REGISTERED_USERS_PERMANENT: 't20_registered_users_permanent',
};

export const HERO_OPERATIONS_IMAGE = '/assets/images/hero_t20_operations_1792695111872.jpg';
export const DIAGNOSTIC_IMAGE = '/assets/images/diagnostic_quantum_analyzer_1792695111179.jpg';
export const RECEIPT_SAMPLE_IMAGE = '/assets/images/receipt_sample_scan_1792695112168.jpg';

export const DEMO_REPORT_IDS = new Set([
  'REP-2026-10-22',
  'REP-2026-10-21',
  'REP-2026-10-20',
  'REP-2026-10-19',
  'REP-2026-10-18',
  'REP-2026-10-17',
  'REP-2026-10-16',
]);

const initialUsers: User[] = [
  {
    id: 'usr-1',
    fullName: 'Francis Owen',
    username: 'francis.manager',
    email: 'manager@t20.co.tz',
    role: 'manager',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-01-15T08:00:00Z',
    lastLoginAt: '2026-10-22T08:30:00Z',
  },
  {
    id: 'usr-2',
    fullName: 'Neema Mushi',
    username: 'neema.staff',
    email: 'neema@t20.co.tz',
    role: 'staff',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-02-01T09:00:00Z',
    lastLoginAt: '2026-10-22T09:15:00Z',
  },
  {
    id: 'usr-3',
    fullName: 'Juma Bakari',
    username: 'juma.staff',
    email: 'juma@t20.co.tz',
    role: 'staff',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-02-10T10:00:00Z',
    lastLoginAt: '2026-10-21T16:45:00Z',
  },
];

// Official BF Suma Tanzania (BF Suma TZ) Commercial Products
// Extracted directly from official price sheet image:
// - Categories translated to English
// - Includes exact Point Value (PV) and Member Price (TZS)
// - Strictly NO quantity field in registration
const initialProducts: Product[] = [
  // 1. Bones & Joints (MIFUPA NA MAUNGIO)
  {
    id: 'BFS-001',
    name: 'Zaminocal Plus Capsules',
    category: 'Bones & Joints',
    pv: 18,
    currentPrice: 64400,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-002',
    name: 'Arthro Extra tablets',
    category: 'Bones & Joints',
    pv: 34.5,
    currentPrice: 112000,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-003',
    name: 'Gluzo joint ultra Pro',
    category: 'Bones & Joints',
    pv: 44.8,
    currentPrice: 156800,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },

  // 2. Immune Boosters (KINGA YA MWILI)
  {
    id: 'BFS-004',
    name: '4 in 1 Reishi Coffee',
    category: 'Immune Boosters',
    pv: 6.5,
    currentPrice: 36400,
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-005',
    name: '4 in 1 Ginseng Coffee',
    category: 'Immune Boosters',
    pv: 6.5,
    currentPrice: 36400,
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-006',
    name: '4 in 1 Cordyceps Coffee',
    category: 'Immune Boosters',
    pv: 6.5,
    currentPrice: 36400,
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-007',
    name: 'Pure and Broken GS',
    category: 'Immune Boosters',
    pv: 99,
    currentPrice: 308000,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-008',
    name: 'Pure& Broken GS oil',
    category: 'Immune Boosters',
    pv: 102,
    currentPrice: 358600,
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-009',
    name: 'Refined Yunzh Essence',
    category: 'Immune Boosters',
    pv: 24,
    currentPrice: 81200,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-010',
    name: 'NMN Duo Release',
    category: 'Immune Boosters',
    pv: 112,
    currentPrice: 417200,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-011',
    name: 'Quad - Reish',
    category: 'Immune Boosters',
    pv: 28,
    currentPrice: 98000,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },

  // 3. Reproductive Health (MFUMO WA UZAZI)
  {
    id: 'BFS-012',
    name: 'X Power Coffee for Men',
    category: 'Reproductive Health',
    pv: 8,
    currentPrice: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-013',
    name: 'Prostate relax capsule',
    category: 'Reproductive Health',
    pv: 18,
    currentPrice: 67200,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-014',
    name: 'X Power Man Capsules',
    category: 'Reproductive Health',
    pv: 35,
    currentPrice: 117600,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },

  // 4. Digestive Health (MMENG\'ENYO WA CHAKULA)
  {
    id: 'BFS-015',
    name: 'Consti Relax',
    category: 'Digestive Health',
    pv: 22,
    currentPrice: 81200,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-016',
    name: 'Ntdiar pills 12Pcs',
    category: 'Digestive Health',
    pv: 7.2,
    currentPrice: 100800,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-017',
    name: 'Novel Depile',
    category: 'Digestive Health',
    pv: 17,
    currentPrice: 61600,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-018',
    name: 'Veggie Vegie',
    category: 'Digestive Health',
    pv: 23,
    currentPrice: 84000,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-019',
    name: 'Probio 3',
    category: 'Digestive Health',
    pv: 22,
    currentPrice: 84000,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },

  // 5. Cardiovascular Health (MZUNGUKO WA DAMU)
  {
    id: 'BFS-020',
    name: 'Micro 2 Cycle',
    category: 'Cardiovascular Health',
    pv: 11,
    currentPrice: 61600,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-021',
    name: 'Cerebrain tablets',
    category: 'Cardiovascular Health',
    pv: 22,
    currentPrice: 70000,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-022',
    name: 'Detoxilive Pro Oil',
    category: 'Cardiovascular Health',
    pv: 15,
    currentPrice: 56000,
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-023',
    name: 'Reliving Tea',
    category: 'Cardiovascular Health',
    pv: 9,
    currentPrice: 50400,
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-024',
    name: 'GymEffect capsules',
    category: 'Cardiovascular Health',
    pv: 15,
    currentPrice: 56000,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },

  // 6. Personal Care (MATUMIZI BINAFSI)
  {
    id: 'BFS-025',
    name: 'Famicare (FEMININE CLEANSER)',
    category: 'Personal Care',
    pv: 6,
    currentPrice: 30800,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-026',
    name: 'Femenergy capsules',
    category: 'Personal Care',
    pv: 25,
    currentPrice: 84000,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-027',
    name: 'Cool Roll',
    category: 'Personal Care',
    pv: 2.4,
    currentPrice: 33600,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-028',
    name: 'Dr.T\'s Tooth paste',
    category: 'Personal Care',
    pv: 2.8,
    currentPrice: 15400,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-029',
    name: 'Femiotic',
    category: 'Personal Care',
    pv: 28,
    currentPrice: 112000,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-030',
    name: 'Femicalcium D3',
    category: 'Personal Care',
    pv: 24.5,
    currentPrice: 89000,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },

  // 7. Children\'s Health (BIDHAA ZAWATOTO)
  {
    id: 'BFS-031',
    name: 'Vitamin C (chewable tablets)',
    category: 'Children\'s Health',
    pv: 15,
    currentPrice: 56000,
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-032',
    name: 'Calcium & Vitamin D',
    category: 'Children\'s Health',
    pv: 18,
    currentPrice: 67200,
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-033',
    name: 'Sharp Vision',
    category: 'Children\'s Health',
    pv: 18,
    currentPrice: 67200,
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },

  // 8. Skin Care (NGOZI)
  {
    id: 'BFS-034',
    name: 'Anatic Herbal Soap',
    category: 'Skin Care',
    pv: 1,
    currentPrice: 6160,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-035',
    name: 'Feminery',
    category: 'Skin Care',
    pv: 25,
    currentPrice: 84000,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'BFS-036',
    name: 'Youth Ever',
    category: 'Skin Care',
    pv: 79,
    currentPrice: 277200,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-10-26T08:00:00Z',
  },
];

const initialDailyReports: DailyOperationalReport[] = [
  {
    id: 'REP-2026-10-22',
    reportDate: '2026-10-22',
    staffUsername: 'neema.staff',
    staffName: 'Neema Mushi',
    items: [
      {
        productId: 'BFS-001',
        productName: 'Zaminocal Plus Capsules',
        productPrice: 64400,
        pv: 18,
        quantity: 2,
        totalAmount: 128800,
        totalPv: 36,
      },
      {
        productId: 'BFS-002',
        productName: 'Arthro Extra tablets',
        productPrice: 112000,
        pv: 34.5,
        quantity: 2,
        totalAmount: 224000,
        totalPv: 69,
      },
      {
        productId: 'BFS-007',
        productName: 'Pure and Broken GS',
        productPrice: 308000,
        pv: 99,
        quantity: 1,
        totalAmount: 308000,
        totalPv: 99,
      },
      {
        productId: 'BFS-014',
        productName: 'X Power Man Capsules',
        productPrice: 117600,
        pv: 35,
        quantity: 2,
        totalAmount: 235200,
        totalPv: 70,
      },
      {
        productId: 'BFS-034',
        productName: 'Anatic Herbal Soap',
        productPrice: 6160,
        pv: 1,
        quantity: 5,
        totalAmount: 30800,
        totalPv: 5,
      },
    ],
    totalSalesAmount: 926800,
    totalQuantitySold: 12,
    totalPv: 279,
    quantumTestCount: 12,
    bodyAnalyzerTestCount: 8,
    kitRegisteredCount: 3,
    kitNumbers: 'T20-KIT-8841, T20-KIT-8842, T20-KIT-8843',
    notes: 'Morning clinical screening batch completed on schedule; all diagnostic probes calibrated.',
    status: 'submitted',
    staffReviewed: true,
    submittedAt: '2026-10-22T11:30:00Z',
    updatedAt: '2026-10-22T11:30:00Z',
    managerFeedback: '',
  },
  {
    id: 'REP-2026-10-21',
    reportDate: '2026-10-21',
    staffUsername: 'neema.staff',
    staffName: 'Neema Mushi',
    items: [
      {
        productId: 'BFS-004',
        productName: '4 in 1 Reishi Coffee',
        productPrice: 36400,
        pv: 6.5,
        quantity: 4,
        totalAmount: 145600,
        totalPv: 26,
      },
      {
        productId: 'BFS-012',
        productName: 'X Power Coffee for Men',
        productPrice: 42000,
        pv: 8,
        quantity: 3,
        totalAmount: 126000,
        totalPv: 24,
      },
      {
        productId: 'BFS-021',
        productName: 'Cerebrain tablets',
        productPrice: 70000,
        pv: 22,
        quantity: 2,
        totalAmount: 140000,
        totalPv: 44,
      },
      {
        productId: 'BFS-031',
        productName: 'Vitamin C (chewable tablets)',
        productPrice: 56000,
        pv: 15,
        quantity: 2,
        totalAmount: 112000,
        totalPv: 30,
      },
    ],
    totalSalesAmount: 523600,
    totalQuantitySold: 11,
    totalPv: 124,
    quantumTestCount: 10,
    bodyAnalyzerTestCount: 6,
    kitRegisteredCount: 2,
    kitNumbers: 'T20-KIT-8839, T20-KIT-8840',
    notes: 'All clinical test logs synchronized with reception registry.',
    status: 'approved',
    staffReviewed: true,
    submittedAt: '2026-10-21T17:15:00Z',
    updatedAt: '2026-10-21T17:15:00Z',
    managerFeedback: 'Report reviewed and reconciled. Sales figures, PV metrics, and member kit registrations match bank slips.',
    reviewedBy: 'francis.manager',
    reviewedAt: '2026-10-21T18:30:00Z',
  },
  {
    id: 'REP-2026-10-20',
    reportDate: '2026-10-20',
    staffUsername: 'juma.staff',
    staffName: 'Juma Bakari',
    items: [
      {
        productId: 'BFS-015',
        productName: 'Consti Relax',
        productPrice: 81200,
        pv: 22,
        quantity: 2,
        totalAmount: 162400,
        totalPv: 44,
      },
      {
        productId: 'BFS-020',
        productName: 'Micro 2 Cycle',
        productPrice: 61600,
        pv: 11,
        quantity: 3,
        totalAmount: 184800,
        totalPv: 33,
      },
      {
        productId: 'BFS-034',
        productName: 'Anatic Herbal Soap',
        productPrice: 6160,
        pv: 1,
        quantity: 8,
        totalAmount: 49280,
        totalPv: 8,
      },
    ],
    totalSalesAmount: 396480,
    totalQuantitySold: 13,
    totalPv: 85,
    quantumTestCount: 8,
    bodyAnalyzerTestCount: 5,
    kitRegisteredCount: 1,
    kitNumbers: 'T20-KIT-8835',
    notes: 'Afternoon inventory audit complete; stock counts verify against shelves.',
    status: 'approved',
    staffReviewed: true,
    submittedAt: '2026-10-20T17:00:00Z',
    updatedAt: '2026-10-20T17:00:00Z',
    managerFeedback: 'Approved after verification of kit numbers and cash reconciliations.',
    reviewedBy: 'francis.manager',
    reviewedAt: '2026-10-20T18:00:00Z',
  },
  {
    id: 'REP-2026-10-19',
    reportDate: '2026-10-19',
    staffUsername: 'neema.staff',
    staffName: 'Neema Mushi',
    items: [
      {
        productId: 'BFS-001',
        productName: 'Zaminocal Plus Capsules',
        productPrice: 64400,
        pv: 18,
        quantity: 3,
        totalAmount: 193200,
        totalPv: 54,
      },
      {
        productId: 'BFS-002',
        productName: 'Arthro Extra tablets',
        productPrice: 112000,
        pv: 34.5,
        quantity: 2,
        totalAmount: 224000,
        totalPv: 69,
      },
      {
        productId: 'BFS-004',
        productName: '4 in 1 Reishi Coffee',
        productPrice: 36400,
        pv: 6.5,
        quantity: 4,
        totalAmount: 145600,
        totalPv: 26,
      },
    ],
    totalSalesAmount: 562800,
    totalQuantitySold: 9,
    totalPv: 149,
    quantumTestCount: 14,
    bodyAnalyzerTestCount: 9,
    kitRegisteredCount: 3,
    kitNumbers: 'T20-KIT-8820, T20-KIT-8821, T20-KIT-8822',
    status: 'approved',
    staffReviewed: true,
    submittedAt: '2026-10-19T17:00:00Z',
    updatedAt: '2026-10-19T17:00:00Z',
  },
  {
    id: 'REP-2026-10-18',
    reportDate: '2026-10-18',
    staffUsername: 'juma.staff',
    staffName: 'Juma Bakari',
    items: [
      {
        productId: 'BFS-014',
        productName: 'X Power Man Capsules',
        productPrice: 117600,
        pv: 35,
        quantity: 2,
        totalAmount: 235200,
        totalPv: 70,
      },
      {
        productId: 'BFS-021',
        productName: 'Cerebrain tablets',
        productPrice: 70000,
        pv: 22,
        quantity: 2,
        totalAmount: 140000,
        totalPv: 44,
      },
      {
        productId: 'BFS-034',
        productName: 'Anatic Herbal Soap',
        productPrice: 6160,
        pv: 1,
        quantity: 6,
        totalAmount: 36960,
        totalPv: 6,
      },
    ],
    totalSalesAmount: 412160,
    totalQuantitySold: 10,
    totalPv: 120,
    quantumTestCount: 9,
    bodyAnalyzerTestCount: 6,
    kitRegisteredCount: 2,
    kitNumbers: 'T20-KIT-8815, T20-KIT-8816',
    status: 'approved',
    staffReviewed: true,
    submittedAt: '2026-10-18T16:30:00Z',
    updatedAt: '2026-10-18T16:30:00Z',
  },
  {
    id: 'REP-2026-10-17',
    reportDate: '2026-10-17',
    staffUsername: 'neema.staff',
    staffName: 'Neema Mushi',
    items: [
      {
        productId: 'BFS-007',
        productName: 'Pure and Broken GS',
        productPrice: 308000,
        pv: 99,
        quantity: 1,
        totalAmount: 308000,
        totalPv: 99,
      },
      {
        productId: 'BFS-012',
        productName: 'X Power Coffee for Men',
        productPrice: 42000,
        pv: 8,
        quantity: 3,
        totalAmount: 126000,
        totalPv: 24,
      },
      {
        productId: 'BFS-031',
        productName: 'Vitamin C (chewable tablets)',
        productPrice: 56000,
        pv: 15,
        quantity: 2,
        totalAmount: 112000,
        totalPv: 30,
      },
    ],
    totalSalesAmount: 546000,
    totalQuantitySold: 6,
    totalPv: 153,
    quantumTestCount: 16,
    bodyAnalyzerTestCount: 11,
    kitRegisteredCount: 4,
    kitNumbers: 'T20-KIT-8801, T20-KIT-8802, T20-KIT-8803, T20-KIT-8804',
    status: 'approved',
    staffReviewed: true,
    submittedAt: '2026-10-17T18:00:00Z',
    updatedAt: '2026-10-17T18:00:00Z',
  },
  {
    id: 'REP-2026-10-16',
    reportDate: '2026-10-16',
    staffUsername: 'juma.staff',
    staffName: 'Juma Bakari',
    items: [
      {
        productId: 'BFS-001',
        productName: 'Zaminocal Plus Capsules',
        productPrice: 64400,
        pv: 18,
        quantity: 2,
        totalAmount: 128800,
        totalPv: 36,
      },
      {
        productId: 'BFS-004',
        productName: '4 in 1 Reishi Coffee',
        productPrice: 36400,
        pv: 6.5,
        quantity: 4,
        totalAmount: 145600,
        totalPv: 26,
      },
      {
        productId: 'BFS-015',
        productName: 'Consti Relax',
        productPrice: 81200,
        pv: 22,
        quantity: 2,
        totalAmount: 162400,
        totalPv: 44,
      },
    ],
    totalSalesAmount: 436800,
    totalQuantitySold: 8,
    totalPv: 106,
    quantumTestCount: 11,
    bodyAnalyzerTestCount: 7,
    kitRegisteredCount: 2,
    kitNumbers: 'T20-KIT-8790, T20-KIT-8791',
    status: 'approved',
    staffReviewed: true,
    submittedAt: '2026-10-16T17:10:00Z',
    updatedAt: '2026-10-16T17:10:00Z',
  },
];

const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    action: 'SYSTEM_INITIALIZATION',
    details: 'T20 Server reporting engine and operational schema initialized',
    actor: 'system',
    role: 'manager',
    timestamp: '2026-10-20T08:00:00Z',
  },
];

const initialOperationalNotifications: InAppNotification[] = [
  {
    id: 'notif-op-1',
    type: 'period_ready',
    title: 'Weekly Report Compiled & Ready for Review',
    message: 'Weekly operational report (Oct 16 - Oct 22) is synthesized with 7 daily logs. Staff can perform pre-submission review.',
    voiceText: 'Attention Staff: Weekly operational report is compiled and ready for review and submission.',
    targetRole: 'staff',
    urgency: 'info',
    timestamp: '2026-10-22T08:15:00Z',
    read: false,
    dismissed: false,
  },
  {
    id: 'notif-op-2',
    type: 'report_approved',
    title: 'Daily Report Approved by Manager',
    message: 'Executive Manager @francis.manager approved daily report for Oct 21, 2026. Remarks: "Reconciliations match bank deposits and clinic registry."',
    voiceText: 'Attention Staff: Your daily report has been approved by the Executive Manager.',
    targetRole: 'staff',
    urgency: 'info',
    timestamp: '2026-10-21T18:40:00Z',
    read: false,
    dismissed: false,
  },
  {
    id: 'notif-op-3',
    type: 'report_submitted',
    title: 'Daily Operational Report Submitted for Audit',
    message: 'Staff Neema Mushi submitted daily report for Oct 22, 2026. Awaiting executive audit review.',
    voiceText: 'Attention Manager: A new daily operational report has been submitted by staff and awaits your executive audit review.',
    targetRole: 'manager',
    urgency: 'info',
    timestamp: '2026-10-22T11:30:00Z',
    read: false,
    dismissed: false,
  },
  {
    id: 'notif-op-4',
    type: 'shift_reminder',
    title: 'Morning Shift Synchronization (09:00 AM)',
    message: 'Morning operational sync: Verify diagnostic patient logs, member kit registrations, and synchronize product inventory.',
    voiceText: 'Attention Staff: Morning operational sync. Please verify diagnostic patient registers and morning product inventory.',
    targetRole: 'staff',
    urgency: 'info',
    timestamp: '2026-10-22T09:00:00Z',
    read: false,
    dismissed: false,
  },
];

export class StorageService {
  private static getItem<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Storage error writing key ${key}:`, err);
    }
  }

  // Users - Persistent across applet versions
  static getUsers(): User[] {
    const permanentUsers = this.getItem<User[]>(STORAGE_KEYS.REGISTERED_USERS_PERMANENT, []);
    const localUsers = this.getItem<User[]>(STORAGE_KEYS.USERS, []);

    // Merge permanent accounts, version-local accounts, and system initial users
    const userMap = new Map<string, User>();
    initialUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    localUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    permanentUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));

    const merged = Array.from(userMap.values());
    return merged;
  }

  static saveUsers(users: User[]): void {
    this.setItem(STORAGE_KEYS.USERS, users);
    this.setItem(STORAGE_KEYS.REGISTERED_USERS_PERMANENT, users);
    BackupService.syncCurrentDataToVault();
  }

  static addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    this.addAuditLog('USER_REGISTERED', `New ${user.role} ${user.fullName} (@${user.username}) registered`, user.username, user.role);
  }

  static updateUser(id: string, updates: Partial<User>): User | null {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    this.saveUsers(users);
    return users[idx];
  }

  // Edit Username & Password for Staff / User
  static updateUserProfile(
    userId: string,
    updates: { fullName?: string; username?: string; password?: string }
  ): { success: boolean; error?: string; user?: User } {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const targetUser = users[userIndex];
    const oldUsername = targetUser.username;

    // Validate username if changed
    if (updates.username && updates.username.trim().toLowerCase() !== oldUsername.toLowerCase()) {
      const cleanNewUsername = updates.username.trim().toLowerCase();
      if (users.some(u => u.id !== userId && u.username.toLowerCase() === cleanNewUsername)) {
        return { success: false, error: `Username "${updates.username}" is already taken by another user.` };
      }
      targetUser.username = cleanNewUsername;
    }

    if (updates.fullName && updates.fullName.trim()) {
      targetUser.fullName = updates.fullName.trim();
    }

    users[userIndex] = targetUser;
    this.saveUsers(users);

    // If username or full name changed, also update staff details in reports
    if (updates.username || updates.fullName) {
      const reports = this.getDailyReports();
      let changed = false;
      reports.forEach(r => {
        if (r.staffUsername === oldUsername) {
          if (updates.username) r.staffUsername = targetUser.username;
          if (updates.fullName) r.staffName = targetUser.fullName;
          changed = true;
        }
      });
      if (changed) {
        this.saveDailyReports(reports);
      }
    }

    // Update current user session
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      this.setCurrentUser(targetUser);
    }

    this.addAuditLog(
      'PROFILE_UPDATED',
      `User ${targetUser.fullName} (@${targetUser.username}) updated profile credentials`,
      targetUser.username,
      targetUser.role
    );

    return { success: true, user: targetUser };
  }

  static getCurrentUser(): User | null {
    return this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  static setCurrentUser(user: User | null): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Products
  static getProducts(): Product[] {
    return this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
  }

  static saveProducts(products: Product[]): void {
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    BackupService.syncCurrentDataToVault();
  }

  static addProduct(product: Product, actorUsername: string): void {
    const products = this.getProducts();
    products.unshift(product);
    this.saveProducts(products);
    this.addAuditLog(
      'PRODUCT_REGISTERED',
      `Product "${product.name}" registered (Price: TZS ${product.currentPrice.toLocaleString()})`,
      actorUsername,
      'staff'
    );
  }

  static addProductsBatch(newProducts: Product[], actorUsername: string): void {
    if (newProducts.length === 0) return;
    const existing = this.getProducts();
    // Add new items and save
    const updated = [...newProducts, ...existing];
    this.saveProducts(updated);
    this.addAuditLog(
      'PRODUCT_BATCH_IMPORT',
      `Imported ${newProducts.length} products via PDF document analysis (Alphabetically Sorted A to Z)`,
      actorUsername,
      'staff'
    );
  }

  static updateProduct(id: string, updates: Partial<Product>, actorUsername: string): Product | null {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveProducts(products);
    this.addAuditLog('PRODUCT_UPDATED', `Updated product ${products[idx].name}`, actorUsername, 'staff');
    return products[idx];
  }

  static deleteProduct(id: string, actorUsername: string): boolean {
    const products = this.getProducts();
    const target = products.find(p => p.id === id);
    if (!target) return false;
    const remaining = products.filter(p => p.id !== id);
    this.saveProducts(remaining);
    this.addAuditLog('PRODUCT_DELETED', `Deleted product "${target.name}" (${id})`, actorUsername, 'staff');
    return true;
  }

  // Daily Operational Reports
  static getDailyReports(forUser?: User | null): DailyOperationalReport[] {
    const user = forUser !== undefined ? forUser : this.getCurrentUser();
    const stored = this.getItem<DailyOperationalReport[]>(STORAGE_KEYS.DAILY_REPORTS, initialDailyReports);

    // USER REQUIREMENT:
    // When a newly registered staff or manager registers and logs in:
    // "mtumiaji iwe staff au manager wanapojisajili wanakuta account haiona any detail wao ndio wanaanza kutumia mfumo"
    if (user) {
      if (user.role === 'staff') {
        // Newly registered staff only see their own reports (demo staff neema/juma retain their demo reports)
        if (user.username.toLowerCase() !== 'neema.staff' && user.username.toLowerCase() !== 'juma.staff') {
          return stored.filter((r) => r.staffUsername?.toLowerCase() === user.username.toLowerCase());
        }
      } else if (user.role === 'manager') {
        // Newly registered managers start with zero pre-existing demo reports until staff submit real ones
        if (user.username.toLowerCase() !== 'francis.manager') {
          return stored.filter(
            (r) =>
              !DEMO_REPORT_IDS.has(r.id) &&
              r.staffUsername?.toLowerCase() !== 'neema.staff' &&
              r.staffUsername?.toLowerCase() !== 'juma.staff'
          );
        }
      }
    }

    return stored;
  }

  static saveDailyReports(reports: DailyOperationalReport[]): void {
    this.setItem(STORAGE_KEYS.DAILY_REPORTS, reports);
    BackupService.syncCurrentDataToVault();
  }

  static getReportByDate(dateStr: string): DailyOperationalReport | null {
    const reports = this.getDailyReports();
    return reports.find(r => r.reportDate === dateStr) || null;
  }

  static saveOrUpdateDailyReport(report: DailyOperationalReport): void {
    const reports = this.getDailyReports();
    const idx = reports.findIndex(r => r.reportDate === report.reportDate || r.id === report.id);

    const totalSalesAmount = report.items.reduce((acc, item) => acc + (item.productPrice * item.quantity), 0);
    const totalQuantitySold = report.items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPv = report.items.reduce((acc, item) => acc + ((item.pv || 0) * item.quantity), 0);

    const updatedReport: DailyOperationalReport = {
      ...report,
      totalSalesAmount,
      totalQuantitySold,
      totalPv,
      items: report.items.map(it => ({
        ...it,
        pv: it.pv || 0,
        totalAmount: it.productPrice * it.quantity,
        totalPv: (it.pv || 0) * it.quantity,
      })),
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      reports[idx] = updatedReport;
      this.addAuditLog(
        'DAILY_REPORT_UPDATED',
        `Staff @${report.staffUsername} updated daily report for ${report.reportDate} (Total Sales: TZS ${totalSalesAmount.toLocaleString()})`,
        report.staffUsername,
        'staff'
      );
    } else {
      reports.unshift(updatedReport);
      this.addAuditLog(
        'DAILY_REPORT_CREATED',
        `Staff @${report.staffUsername} created daily report for ${report.reportDate} (Total Sales: TZS ${totalSalesAmount.toLocaleString()})`,
        report.staffUsername,
        'staff'
      );
    }

    this.saveDailyReports(reports);

    // Automated In-App & Voice Notification for Manager & Staff on Report Completion
    this.addNotification({
      type: 'report_submitted',
      title: `Daily Operational Report Completed: ${report.reportDate}`,
      message: `Staff @${report.staffUsername} completed daily operational log (${totalQuantitySold} units, TZS ${totalSalesAmount.toLocaleString()}). Figures consolidated for review.`,
      voiceText: `Daily operational report for ${report.reportDate} has been completed and compiled for review.`,
      targetRole: 'all',
      urgency: 'info',
    });
  }

  // =========================================================================
  // EXPENSE MANAGEMENT METHODS
  // =========================================================================

  static getExpenses(forUser?: User | null): Expense[] {
    const user = forUser !== undefined ? forUser : this.getCurrentUser();
    const stored = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    if (!stored || !Array.isArray(stored)) return [];
    if (user) {
      if (user.role === 'staff') {
        return stored.filter((e) => e.enteredBy?.toLowerCase() === user.username.toLowerCase());
      } else if (user.role === 'manager') {
        if (user.username.toLowerCase() !== 'francis.manager') {
          return stored.filter(
            (e) =>
              e.enteredBy?.toLowerCase() !== 'neema.staff' &&
              e.enteredBy?.toLowerCase() !== 'juma.staff' &&
              e.enteredBy?.toLowerCase() !== 'francis.manager'
          );
        }
      }
    }
    return stored;
  }

  static saveExpenses(expenses: Expense[]): void {
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    BackupService.syncCurrentDataToVault();
  }

  static async recordExpense(data: {
    expenseDate: string;
    category: string;
    description: string;
    amount: number;
  }): Promise<{ success: boolean; expense?: Expense; error?: string }> {
    const currentUser = this.getCurrentUser();
    const enteredBy = currentUser?.username || 'staff';

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...SecurityService.getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          expenseDate: data.expenseDate,
          category: data.category,
          description: data.description,
          amount: data.amount,
        }),
      });

      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success && res.expense) {
        const created: Expense = res.expense;
        const currentList = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
        currentList.unshift(created);
        this.setItem(STORAGE_KEYS.EXPENSES, currentList);
        this.addAuditLog(
          'EXPENSE_RECORDED',
          `Staff @${enteredBy} recorded expense of TSh ${created.amount.toLocaleString()} for ${created.category}`,
          enteredBy,
          currentUser?.role || 'staff'
        );
        BackupService.syncCurrentDataToVault();
        return { success: true, expense: created };
      }
      if (!response.ok && res.error) {
        return { success: false, error: res.error };
      }
    } catch {
      // offline fallback
    }

    // Local / Offline fallback
    const fallbackExpense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      expenseDate: data.expenseDate,
      category: data.category,
      description: data.description.trim(),
      amount: Math.round(Number(data.amount)),
      enteredBy,
      createdAt: new Date().toISOString(),
    };

    const currentList = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    currentList.unshift(fallbackExpense);
    this.setItem(STORAGE_KEYS.EXPENSES, currentList);
    this.addAuditLog(
      'EXPENSE_RECORDED',
      `Staff @${enteredBy} recorded expense of TSh ${fallbackExpense.amount.toLocaleString()} for ${fallbackExpense.category}`,
      enteredBy,
      currentUser?.role || 'staff'
    );
    BackupService.syncCurrentDataToVault();
    return { success: true, expense: fallbackExpense };
  }

  static reviewDailyReport(
    reportId: string,
    status: 'approved' | 'changes_requested',
    feedback: string,
    managerUsername: string
  ): boolean {
    const reports = this.getDailyReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) return false;

    report.status = status;
    report.managerFeedback = feedback;
    report.reviewedBy = managerUsername;
    report.reviewedAt = new Date().toISOString();
    report.updatedAt = new Date().toISOString();

    this.saveDailyReports(reports);
    this.addAuditLog(
      'MANAGER_REPORT_REVIEW',
      `Manager @${managerUsername} reviewed report #${reportId} (${report.reportDate}): Status ${status.toUpperCase()}`,
      managerUsername,
      'manager'
    );

    // Automated Voice & In-App Notification dispatched to Staff
    if (status === 'approved') {
      this.addNotification({
        type: 'report_approved',
        title: `Daily Report Approved: ${report.reportDate}`,
        message: `Executive Manager @${managerUsername} approved your report for ${report.reportDate}. Remarks: "${feedback}"`,
        voiceText: `Official Notification: Your operational report for ${report.reportDate} has been approved by the Manager.`,
        targetRole: 'staff',
        urgency: 'info',
      });
    } else {
      this.addNotification({
        type: 'report_changes_requested',
        title: `Adjustments Requested: ${report.reportDate}`,
        message: `Manager @${managerUsername} requested changes on ${report.reportDate}. Remarks: "${feedback}"`,
        voiceText: `Attention Staff: The Manager has requested adjustments on the operational report for ${report.reportDate}.`,
        targetRole: 'staff',
        urgency: 'warning',
      });
    }

    return true;
  }

  // Period Submissions storage (e.g. Weekly Report review and submission by staff)
  static getPeriodSubmissions(): Record<string, Partial<PeriodAggregatedReport>> {
    return this.getItem<Record<string, Partial<PeriodAggregatedReport>>>(STORAGE_KEYS.PERIOD_SUBMISSIONS, {
      'weekly-2026-10-16-2026-10-22': {
        status: 'submitted',
        staffReviewed: true,
        submittedByStaff: 'neema.staff',
        submittedAt: '2026-10-22T12:00:00Z',
        staffNotes: 'Weekly operations reconciled across all 3 logged shifts; diagnostic numbers verified.',
      },
    });
  }

  static savePeriodSubmissions(data: Record<string, Partial<PeriodAggregatedReport>>): void {
    this.setItem(STORAGE_KEYS.PERIOD_SUBMISSIONS, data);
  }

  static submitPeriodReport(
    periodId: string,
    data: {
      staffUsername: string;
      staffNotes?: string;
    }
  ): void {
    const subs = this.getPeriodSubmissions();
    subs[periodId] = {
      ...subs[periodId],
      status: 'submitted',
      staffReviewed: true,
      submittedByStaff: data.staffUsername,
      submittedAt: new Date().toISOString(),
      staffNotes: data.staffNotes || 'Period figures consolidated and reviewed by staff.',
    };
    this.savePeriodSubmissions(subs);
    this.addAuditLog('PERIOD_REPORT_SUBMITTED', `Staff @${data.staffUsername} submitted ${periodId} for Manager Review`, data.staffUsername, 'staff');

    // Notification dispatched to Manager with Voice
    this.addNotification({
      type: 'report_submitted',
      title: `Weekly/Period Report Submitted: ${periodId.toUpperCase()}`,
      message: `Staff @${data.staffUsername} submitted consolidated report for Manager audit. Staff Note: "${data.staffNotes || 'Reconciled'}"`,
      voiceText: `Attention Executive Manager: Weekly operational report has been submitted and is ready for audit.`,
      targetRole: 'manager',
      urgency: 'info',
    });
  }

  static reviewPeriodReport(
    periodId: string,
    status: 'approved' | 'changes_requested',
    feedback: string,
    managerUsername: string
  ): void {
    const subs = this.getPeriodSubmissions();
    subs[periodId] = {
      ...subs[periodId],
      status,
      managerFeedback: feedback,
      reviewedByManager: managerUsername,
      reviewedAt: new Date().toISOString(),
    };
    this.savePeriodSubmissions(subs);
    this.addAuditLog('PERIOD_REPORT_REVIEWED', `Manager @${managerUsername} reviewed ${periodId}: ${status.toUpperCase()}`, managerUsername, 'manager');

    // Notification dispatched to Staff with Voice
    if (status === 'approved') {
      this.addNotification({
        type: 'report_approved',
        title: `Period Report Approved: ${periodId.toUpperCase()}`,
        message: `Executive Manager @${managerUsername} officially approved ${periodId}. Remarks: "${feedback}"`,
        voiceText: `Official Notification: Your weekly period report has been approved by the Executive Manager.`,
        targetRole: 'staff',
        urgency: 'info',
      });
    } else {
      this.addNotification({
        type: 'report_changes_requested',
        title: `Adjustments Requested: ${periodId.toUpperCase()}`,
        message: `Manager @${managerUsername} requested modifications on ${periodId}. Remarks: "${feedback}"`,
        voiceText: `Attention Staff: The Executive Manager has requested adjustments on the weekly period report.`,
        targetRole: 'staff',
        urgency: 'warning',
      });
    }
  }

  // Automated Period Reports Engine (Weekly, Monthly, Quarterly, Semi-Annual, Annual)
  static getAggregatedPeriodReport(periodType: PeriodType, anchorDateStr = '2026-10-22', forUser?: User | null): PeriodAggregatedReport {
    const allReports = this.getDailyReports(forUser);
    const anchor = new Date(anchorDateStr);
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const d = anchor.getDate();

    let startDateStr = '';
    let endDateStr = '';
    let label = '';

    if (periodType === 'daily') {
      startDateStr = anchorDateStr;
      endDateStr = anchorDateStr;
      label = `Daily Report (${anchorDateStr})`;
    } else if (periodType === 'weekly') {
      const weekStart = new Date(anchor);
      weekStart.setDate(d - 6);
      startDateStr = weekStart.toISOString().slice(0, 10);
      endDateStr = anchorDateStr;
      label = `Weekly Report (${startDateStr} to ${endDateStr})`;
    } else if (periodType === 'monthly') {
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0);
      startDateStr = monthStart.toISOString().slice(0, 10);
      endDateStr = monthEnd.toISOString().slice(0, 10);
      label = `Monthly Report (${monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`;
    } else if (periodType === 'quarterly') {
      const q = Math.floor(m / 3);
      const qStart = new Date(y, q * 3, 1);
      const qEnd = new Date(y, (q + 1) * 3, 0);
      startDateStr = qStart.toISOString().slice(0, 10);
      endDateStr = qEnd.toISOString().slice(0, 10);
      label = `Quarterly Report Q${q + 1} (${startDateStr} to ${endDateStr})`;
    } else if (periodType === 'semi-annual') {
      const isH1 = m < 6;
      const hStart = new Date(y, isH1 ? 0 : 6, 1);
      const hEnd = new Date(y, isH1 ? 6 : 12, 0);
      startDateStr = hStart.toISOString().slice(0, 10);
      endDateStr = hEnd.toISOString().slice(0, 10);
      label = `Semi-Annual Report ${isH1 ? 'H1' : 'H2'} (${startDateStr} to ${endDateStr})`;
    } else {
      const aStart = new Date(y, 0, 1);
      const aEnd = new Date(y, 11, 31);
      startDateStr = aStart.toISOString().slice(0, 10);
      endDateStr = aEnd.toISOString().slice(0, 10);
      label = `Annual Report (${y})`;
    }

    const periodId = `${periodType}-${startDateStr}-${endDateStr}`;
    const periodDailyReports = allReports.filter(r => r.reportDate >= startDateStr && r.reportDate <= endDateStr);

    let totalRevenue = 0;
    let totalQuantitySold = 0;
    let totalPv = 0;
    let quantumTotal = 0;
    let bodyAnalyzerTotal = 0;
    let kitRegisteredTotal = 0;

    const productMap = new Map<string, { productId: string; productName: string; productPrice: number; pv: number; totalQuantity: number; totalAmount: number; totalPv: number }>();

    periodDailyReports.forEach(r => {
      totalRevenue += r.totalSalesAmount;
      totalQuantitySold += r.totalQuantitySold;
      totalPv += (r.totalPv || 0);
      if (r.quantumTestCount !== null) quantumTotal += r.quantumTestCount;
      if (r.bodyAnalyzerTestCount !== null) bodyAnalyzerTotal += r.bodyAnalyzerTestCount;
      kitRegisteredTotal += r.kitRegisteredCount;

      r.items.forEach(it => {
        const itemPv = it.pv || 0;
        const existing = productMap.get(it.productId) || {
          productId: it.productId,
          productName: it.productName,
          productPrice: it.productPrice,
          pv: itemPv,
          totalQuantity: 0,
          totalAmount: 0,
          totalPv: 0,
        };
        existing.totalQuantity += it.quantity;
        existing.totalAmount += (it.productPrice * it.quantity);
        existing.totalPv += (itemPv * it.quantity);
        productMap.set(it.productId, existing);
      });
    });

    const subs = this.getPeriodSubmissions();
    const submissionMeta = subs[periodId] || {};

    const dailySummaries: PeriodDailySummary[] = periodDailyReports
      .map(r => ({
        reportId: r.id,
        reportDate: r.reportDate,
        staffName: r.staffName,
        staffUsername: r.staffUsername,
        totalSalesAmount: r.totalSalesAmount,
        totalQuantitySold: r.totalQuantitySold,
        totalPv: r.totalPv || 0,
        quantumTestCount: r.quantumTestCount,
        bodyAnalyzerTestCount: r.bodyAnalyzerTestCount,
        kitRegisteredCount: r.kitRegisteredCount,
        items: r.items,
      }))
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

    return {
      id: periodId,
      periodType,
      label,
      startDate: startDateStr,
      endDate: endDateStr,
      dailyReportsCount: periodDailyReports.length,
      totalRevenue,
      totalQuantitySold,
      totalPv,
      productTotals: Array.from(productMap.values()),
      dailySummaries,
      quantumTotal,
      bodyAnalyzerTotal,
      kitRegisteredTotal,
      status: submissionMeta.status || (periodDailyReports.every(r => r.status === 'approved') && periodDailyReports.length > 0 ? 'approved' : 'draft'),
      staffReviewed: submissionMeta.staffReviewed || false,
      submittedByStaff: submissionMeta.submittedByStaff,
      submittedAt: submissionMeta.submittedAt,
      staffNotes: submissionMeta.staffNotes,
      managerFeedback: submissionMeta.managerFeedback,
      reviewedByManager: submissionMeta.reviewedByManager,
      reviewedAt: submissionMeta.reviewedAt,
    };
  }

  // Audit Logs
  static getAuditLogs(): AuditLogEntry[] {
    return this.getItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
  }

  static addAuditLog(action: string, details: string, actor: string, role: 'manager' | 'staff'): void {
    const logs = this.getAuditLogs();
    const entry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      details,
      actor,
      role,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(entry);
    if (logs.length > 500) logs.length = 500;
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // Low Stock & In-App Notification System
  static getLowStockThreshold(): number {
    return this.getItem<number>(STORAGE_KEYS.LOW_STOCK_THRESHOLD, 10);
  }

  static setLowStockThreshold(threshold: number): void {
    const val = Math.max(1, isNaN(threshold) ? 10 : threshold);
    this.setItem(STORAGE_KEYS.LOW_STOCK_THRESHOLD, val);
  }

  private static getNotificationStates(): Record<string, { read: boolean; dismissed: boolean }> {
    return this.getItem<Record<string, { read: boolean; dismissed: boolean }>>(STORAGE_KEYS.NOTIFICATIONS_STATE, {});
  }

  private static saveNotificationStates(states: Record<string, { read: boolean; dismissed: boolean }>): void {
    this.setItem(STORAGE_KEYS.NOTIFICATIONS_STATE, states);
  }

  static getLowStockNotifications(): InAppNotification[] {
    const products = this.getProducts();
    const threshold = this.getLowStockThreshold();
    const states = this.getNotificationStates();

    const notifications: InAppNotification[] = [];

    products.forEach((product) => {
      if (product.currentStock !== undefined && product.currentStock <= threshold) {
        const notifId = `notif-stock-${product.id}`;
        const state = states[notifId] || { read: false, dismissed: false };

        if (!state.dismissed) {
          const isCritical = product.currentStock === 0;
          notifications.push({
            id: notifId,
            type: isCritical ? 'out_of_stock' : 'low_stock',
            title: isCritical ? `Out of Stock: ${product.name}` : `Low Stock: ${product.name}`,
            message: isCritical
              ? `"${product.name}" is completely depleted (0 units remaining). Restock immediately to avoid sales disruption.`
              : `"${product.name}" has only ${product.currentStock} units remaining (below safety threshold of ${threshold} units).`,
            productId: product.id,
            productName: product.name,
            currentStock: product.currentStock,
            threshold,
            urgency: isCritical ? 'critical' : 'warning',
            timestamp: product.updatedAt || new Date().toISOString(),
            read: state.read,
            dismissed: false,
          });
        }
      }
    });

    // Sort by critical first, then lowest stock
    return notifications.sort((a, b) => {
      if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
      if (b.urgency === 'critical' && a.urgency !== 'critical') return 1;
      return (a.currentStock ?? 0) - (b.currentStock ?? 0);
    });
  }

  // Operational Notifications Engine (Workflow alerts, approvals & 3x daily shift reminders)
  static getOperationalNotifications(): InAppNotification[] {
    return this.getItem<InAppNotification[]>(STORAGE_KEYS.OPERATIONAL_NOTIFICATIONS, initialOperationalNotifications);
  }

  static saveOperationalNotifications(notifs: InAppNotification[]): void {
    this.setItem(STORAGE_KEYS.OPERATIONAL_NOTIFICATIONS, notifs);
  }

  static addNotification(notifData: Omit<InAppNotification, 'id' | 'timestamp' | 'read' | 'dismissed'>): InAppNotification {
    const list = this.getOperationalNotifications();
    const newNotif: InAppNotification = {
      ...notifData,
      id: `notif-op-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false,
    };
    list.unshift(newNotif);
    if (list.length > 120) list.length = 120;
    this.saveOperationalNotifications(list);

    // Role-targeted notification via FCM/Web Notification & distinct sound chime (NO spoken voice)
    try {
      const currentUser = this.getCurrentUser();
      const userRole = currentUser?.role;
      const isTargeted = !newNotif.targetRole || newNotif.targetRole === 'all' || newNotif.targetRole === userRole;
      if (isTargeted) {
        FCMService.sendNotification({
          title: newNotif.title,
          body: newNotif.message,
          targetRole: newNotif.targetRole || 'all',
          type: newNotif.type as any,
        });

        if (userRole === 'manager') {
          NotificationAudio.playManagerReportAlert();
        } else {
          NotificationAudio.playStaffReportAlert();
        }
      }
    } catch {
      // Audio & notification safety
    }

    return newNotif;
  }

  static getAllNotifications(targetRole?: 'staff' | 'manager' | 'all'): InAppNotification[] {
    const operational = this.getOperationalNotifications().filter(n => !n.dismissed);
    const stockNotifs = this.getLowStockNotifications();
    const combined = [...operational, ...stockNotifs];

    const filtered = combined.filter(n => {
      if (!targetRole || targetRole === 'all') return true;
      if (!n.targetRole || n.targetRole === 'all') return true;
      return n.targetRole === targetRole;
    });

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static markNotificationAsRead(id: string): void {
    // Check operational notifications
    const opNotifs = this.getOperationalNotifications();
    const opIdx = opNotifs.findIndex(n => n.id === id);
    if (opIdx >= 0) {
      opNotifs[opIdx].read = true;
      this.saveOperationalNotifications(opNotifs);
    }

    // Check stock notifications state
    const states = this.getNotificationStates();
    states[id] = { ...states[id], read: true, dismissed: states[id]?.dismissed || false };
    this.saveNotificationStates(states);
  }

  static markAllNotificationsAsRead(): void {
    // Mark operational notifications as read
    const opNotifs = this.getOperationalNotifications();
    opNotifs.forEach(n => {
      n.read = true;
    });
    this.saveOperationalNotifications(opNotifs);

    // Mark stock notifications as read
    const notifs = this.getLowStockNotifications();
    const states = this.getNotificationStates();
    notifs.forEach(n => {
      states[n.id] = { ...states[n.id], read: true, dismissed: states[n.id]?.dismissed || false };
    });
    this.saveNotificationStates(states);
  }

  static dismissNotification(id: string): void {
    // Check operational notifications
    const opNotifs = this.getOperationalNotifications();
    const opIdx = opNotifs.findIndex(n => n.id === id);
    if (opIdx >= 0) {
      opNotifs[opIdx].dismissed = true;
      opNotifs[opIdx].read = true;
      this.saveOperationalNotifications(opNotifs);
    }

    // Check stock notifications state
    const states = this.getNotificationStates();
    states[id] = { ...states[id], read: true, dismissed: true };
    this.saveNotificationStates(states);
  }

  static clearAllNotifications(): void {
    // Clear operational notifications
    const opNotifs = this.getOperationalNotifications();
    opNotifs.forEach(n => {
      n.dismissed = true;
      n.read = true;
    });
    this.saveOperationalNotifications(opNotifs);

    // Clear stock notifications
    const notifs = this.getLowStockNotifications();
    const states = this.getNotificationStates();
    notifs.forEach(n => {
      states[n.id] = { read: true, dismissed: true };
    });
    this.saveNotificationStates(states);
  }

  static restockProduct(productId: string, additionalUnits: number, actorUsername: string): Product | null {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return null;

    const previousStock = products[idx].currentStock ?? 0;
    const newStock = previousStock + Math.max(1, additionalUnits);
    products[idx] = {
      ...products[idx],
      currentStock: newStock,
      updatedAt: new Date().toISOString(),
    };
    this.saveProducts(products);

    // If restocked above threshold, clear dismissed/read state
    const notifId = `notif-stock-${productId}`;
    const states = this.getNotificationStates();
    delete states[notifId];
    this.saveNotificationStates(states);

    this.addAuditLog(
      'STOCK_RESTOCKED',
      `Restocked "${products[idx].name}" (+${additionalUnits} units, new stock: ${newStock})`,
      actorUsername,
      'staff'
    );

    return products[idx];
  }

  static getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static isAutoDateEnabled(): boolean {
    try {
      const mode = localStorage.getItem(STORAGE_KEYS.DATE_MODE);
      return mode !== 'manual';
    } catch {
      return true;
    }
  }

  static getSystemDate(): string {
    const today = this.getTodayString();
    try {
      // If user is in auto mode, always use the real current day
      if (this.isAutoDateEnabled()) {
        return today;
      }
      const stored = localStorage.getItem(STORAGE_KEYS.SYSTEM_DATE);
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        return stored;
      }
    } catch {
      // fallback
    }
    return today;
  }

  static setSystemDate(dateStr: string, isManual = true): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_DATE, dateStr);
      localStorage.setItem(STORAGE_KEYS.DATE_MODE, isManual ? 'manual' : 'auto');
      const payload = { date: dateStr, isAuto: !isManual, today: this.getTodayString() };
      window.dispatchEvent(new CustomEvent('t20-system-date-changed', { detail: payload }));
    } catch {
      // ignore
    }
  }

  static resetDateToToday(): string {
    const today = this.getTodayString();
    this.setSystemDate(today, false);
    return today;
  }

  static checkAndAutoAdvanceDate(): { changed: boolean; newDate: string } {
    const today = this.getTodayString();
    if (this.isAutoDateEnabled()) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.SYSTEM_DATE);
        if (stored !== today) {
          localStorage.setItem(STORAGE_KEYS.SYSTEM_DATE, today);
          const payload = { date: today, isAuto: true, today };
          window.dispatchEvent(new CustomEvent('t20-system-date-changed', { detail: payload }));
          return { changed: true, newDate: today };
        }
      } catch {
        // ignore
      }
    }
    return { changed: false, newDate: today };
  }

  static resetToDemoData(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.DAILY_REPORTS);
    localStorage.removeItem(STORAGE_KEYS.PERIOD_SUBMISSIONS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_DATE);
    localStorage.removeItem(STORAGE_KEYS.DATE_MODE);
    window.location.reload();
  }
}
