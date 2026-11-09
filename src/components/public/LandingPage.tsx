import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Package,
  FileSpreadsheet,
  Activity,
  Layers,
  ArrowRight,
  CheckCircle,
  FileText,
  Camera,
  Users,
  BarChart3,
  Server,
  Lock,
} from 'lucide-react';
import { HERO_OPERATIONS_IMAGE } from '../../services/storage';

interface LandingPageProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onEnterPortal: (portal: 'manager' | 'staff') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onEnterPortal }) => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Mission & Identity */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <span>T20 Core Enterprise</span>
                <span aria-hidden="true">·</span>
                <span>Operations & Reporting Engine</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight text-balance">
                Business Operations, Sales, Inventory & Automated Reporting System
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                T20 Server gathers daily report submissions, auto-populating registered products (Name, Price, Quantity & Total Amount), tracking Quantum & Body Analyzer testing tallies, serializing Member Kits, and generating Weekly, Monthly, Quarterly, Semi-Annual, and Annual reports automatically with full manager review workflows.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                {currentUser ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => onEnterPortal(currentUser.role === 'manager' ? 'manager' : 'staff')}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                      <span>
                        Enter {currentUser.role === 'manager' ? 'Manager Dashboard' : 'Staff Workspace'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Signed in as:</span>
                      <strong className="text-slate-900 font-bold">{currentUser.fullName}</strong>
                      <span className="text-slate-500 font-mono">(@{currentUser.username})</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenAuth('login')}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                      <span>Access System Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenAuth('register')}
                      className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                    >
                      Register (Staff / Manager)
                    </button>
                  </>
                )}
              </div>

              {/* Trust & Architecture notes */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Role-Based Access Control</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>Staff & Manager Self-Registration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Automated Period Synthesis</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Asset */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 aspect-[16/10] bg-slate-100">
                <img
                  src={HERO_OPERATIONS_IMAGE}
                  alt="T20 Server Business Operations Center"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-white">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                    Operations Command Center
                  </span>
                  <p className="text-sm font-medium mt-1">
                    Manage sales, diagnostics, member kits, and executive audits in one unified system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities-section" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              System Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              End-to-End Operational Pipeline
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              Every daily report entered directly populates unified ledgers without manual recalculations or double counting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Product Catalog & Daily Reporting */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Product Catalog & Daily Reporting
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Register products with Product Name, Product Price, and Quantity. The daily report auto-populates products and computes Total Amount (Price × Quantity) automatically.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-blue-600">
                Total Amount = Price × Quantity Sold
              </div>
            </div>

            {/* 2. Diagnostic Testing */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Quantum & Body Analyzer Diagnostics
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Track patients served daily on Quantum resonance and Body Analyzer instruments. Supports verified counts, confirmed zeroes (0), and pending unknown tallies (NULL).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-purple-600">
                Patient Headcount Tracking
              </div>
            </div>

            {/* 3. Member Kit Registration */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Member Kit Registration
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Log serialized kit distributions each day, tracking registered kit counts and serial numbers to prevent duplicates across reports.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-emerald-600">
                Kit Serialization & Duplication Control
              </div>
            </div>

            {/* 4. Staff Review & Submission */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Staff Review & Direct Submission
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Staff members review calculated totals before submitting. Upon submission, reports route directly to the Manager Dashboard for oversight.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-amber-600">
                Pre-Submission Verification
              </div>
            </div>

            {/* 5. Automated Period Reports */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Automatic Multi-Period Engine
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Weekly, Monthly, Quarterly, Semi-Annual, and Annual reports synthesize directly from daily submissions. Editing past reports automatically updates all periods.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-rose-600">
                Weekly · Monthly · Quarterly · Annual
              </div>
            </div>

            {/* 6. Manager Review & Feedback */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Executive Review & Audit Feedback
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Managers review reports and provide constructive feedback without logging into staff accounts; staff members view feedback directly in their workspace.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-teal-600">
                Two-Way Managerial Feedback Loop
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about-section" className="py-16 bg-white border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                About T20 Server
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1 mb-4">
                Structured Operations for High-Growth Enterprises
              </h2>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  Instead of writing identical entries on disconnected paper ledgers or struggling with manual calculations across multiple spreadsheets, T20 Server captures operational data once at source.
                </p>
                <p>
                  Daily entries directly feed executive dashboards and automated period rollups. When corrections are needed, staff can edit previous entries with automatic updates cascading to all reports.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Instant self-registration for Staff and Managers</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Dynamic recalculation of all period rollups</span>
                </div>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                <Server className="w-5 h-5 text-emerald-400" />
                <span>Logical Architectural Flow</span>
              </h3>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                  <div className="text-emerald-400 font-bold mb-1">01. Staff Operations Intake</div>
                  <div className="text-slate-300">
                    Product Additions · Daily Entry (Price, Qty, Total) · Quantum & Body Diagnostics · Member Kits
                  </div>
                </div>

                <div className="text-center text-slate-500 font-bold">↓</div>

                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                  <div className="text-blue-400 font-bold mb-1">02. Staff Review & Submission</div>
                  <div className="text-slate-300">
                    Grand total verification · Direct submission to Manager Dashboard queue
                  </div>
                </div>

                <div className="text-center text-slate-500 font-bold">↓</div>

                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                  <div className="text-purple-400 font-bold mb-1">03. Manager Audit & Real-Time Feedback</div>
                  <div className="text-slate-300">
                    Direct review without staff account switching · Remarks & status approvals
                  </div>
                </div>

                <div className="text-center text-slate-500 font-bold">↓</div>

                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                  <div className="text-amber-400 font-bold mb-1">04. Automated Period Synthesis & Past Edits</div>
                  <div className="text-slate-300">
                    Weekly → Monthly → Quarterly → Annual · Dynamic updates on past report edits
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">T20 SERVER</span>
            <span>—</span>
            <span>Business Operations, Sales, Inventory & Reporting Management System</span>
          </div>
          <div>
            <span>Dar es Salaam Operations Hub · Enterprise Standards</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
