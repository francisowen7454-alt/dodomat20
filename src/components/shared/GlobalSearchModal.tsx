import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { SecurityService } from '../../services/security';
import { Product, DailyOperationalReport } from '../../types';
import {
  Search,
  X,
  Package,
  FileText,
  Calendar,
  User,
  ArrowRight,
  Copy,
  Check,
  Tag,
  DollarSign,
  TrendingUp,
  Shield,
  Briefcase,
  Layers,
  Activity,
  CornerDownLeft,
  ExternalLink,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView?: (view: 'landing' | 'staff') => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
}) => {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'inventory' | 'sales'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyOperationalReport | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setSelectedProduct(null);
      setSelectedReport(null);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedProduct || selectedReport) {
          setSelectedProduct(null);
          setSelectedReport(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedProduct, selectedReport, onClose]);

  // Load products and reports
  const allProducts = useMemo(() => StorageService.getProducts(), [isOpen]);
  const allReports = useMemo(() => {
    const reports = StorageService.getDailyReports();
    // RBAC: Staff can search their own reports; Manager can search all reports
    if (currentUser?.role === 'staff') {
      return reports.filter((r) => r.staffUsername === currentUser.username);
    }
    return reports;
  }, [isOpen, currentUser]);

  // Search filtering logic
  const filteredResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return {
        products: allProducts.slice(0, 6),
        reports: allReports.slice(0, 5),
        isDefaultList: true,
      };
    }

    // 1. Search Inventory Items (by SKU ID, Name, Category)
    const matchedProducts = allProducts.filter((product) => {
      const matchName = product.name.toLowerCase().includes(trimmed);
      const matchSku = product.id.toLowerCase().includes(trimmed);
      const matchCategory = (product.category || '').toLowerCase().includes(trimmed);
      return matchName || matchSku || matchCategory;
    });

    // 2. Search Sales Records (by Report SKU/ID, Date, Staff Name, Kit Number, or items sold)
    const matchedReports = allReports.filter((report) => {
      const matchId = report.id.toLowerCase().includes(trimmed);
      const matchDate = report.reportDate.toLowerCase().includes(trimmed);
      const matchStaff =
        report.staffName.toLowerCase().includes(trimmed) ||
        report.staffUsername.toLowerCase().includes(trimmed);
      const matchKits = (report.kitNumbers || '').toLowerCase().includes(trimmed);
      const matchStatus = report.status.toLowerCase().includes(trimmed);

      // Check if any product sold in this report matches the query
      const matchSoldItem = report.items.some(
        (item) =>
          item.productName.toLowerCase().includes(trimmed) ||
          item.productId.toLowerCase().includes(trimmed)
      );

      return matchId || matchDate || matchStaff || matchKits || matchStatus || matchSoldItem;
    });

    return {
      products: matchedProducts,
      reports: matchedReports,
      isDefaultList: false,
    };
  }, [query, allProducts, allReports]);

  const handleCopySku = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(sku);
    setCopiedId(sku);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedReport(null);
    setSelectedProduct(product);
  };

  const handleSelectReport = (report: DailyOperationalReport) => {
    setSelectedProduct(null);
    setSelectedReport(report);
  };

  const handleNavigateToWorkspace = () => {
    if (onNavigateToView) {
      onNavigateToView('staff');
    }
    onClose();
  };

  if (!isOpen) return null;

  const showProducts = activeFilter === 'all' || activeFilter === 'inventory';
  const showReports = activeFilter === 'all' || activeFilter === 'sales';
  const totalCount = filteredResults.products.length + filteredResults.reports.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-16 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] transition-colors duration-200">
        {/* Search Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 transition-colors">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedProduct(null);
              setSelectedReport(null);
            }}
            placeholder="Search inventory items or sales records by name or SKU (e.g. BFS-001, Arthro, REP-2026)..."
            className="flex-1 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedProduct(null);
                setSelectedReport(null);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Segmented Control Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs transition-colors">
          <div className="flex items-center gap-1.5 p-0.5 bg-slate-200/70 dark:bg-slate-700/60 rounded-lg">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Results ({totalCount})
            </button>
            <button
              onClick={() => setActiveFilter('inventory')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'inventory'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Inventory ({filteredResults.products.length})</span>
            </button>
            <button
              onClick={() => setActiveFilter('sales')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'sales'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sales Records ({filteredResults.reports.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            {filteredResults.isDefaultList ? 'Recent & Popular Items' : `Showing ${totalCount} matches`}
          </div>
        </div>

        {/* Modal Body: Split view (List on left, preview detail on right if selected) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Main Results Column */}
          <div
            className={`p-4 space-y-5 overflow-y-auto ${
              selectedProduct || selectedReport ? 'md:col-span-7' : 'md:col-span-12'
            }`}
          >
            {totalCount === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching items or records found</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  No inventory products or sales logs matched &ldquo;<span className="font-semibold text-slate-700 dark:text-slate-300">{query}</span>&rdquo;. Try searching by product name (e.g. &ldquo;Arthro&rdquo;), product SKU (e.g. &ldquo;BFS-001&rdquo;), or report ID (e.g. &ldquo;REP-2026&rdquo;).
                </p>
              </div>
            ) : (
              <>
                {/* 1. Inventory Items Section */}
                {showProducts && filteredResults.products.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Inventory Items ({filteredResults.products.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Click to preview SKU details</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                      {filteredResults.products.map((product) => {
                        const isSelected = selectedProduct?.id === product.id;
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className={`p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Product Thumbnail or Fallback */}
                              {product.imageUrl ? (
                                <img
                                  src={SecurityService.sanitizeSafeUrl(product.imageUrl)}
                                  alt={product.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                                  BFS
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {product.name}
                                  </span>
                                  <span
                                    onClick={(e) => handleCopySku(product.id, e)}
                                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono font-semibold shrink-0 flex items-center gap-1 transition-colors"
                                    title="Click to copy SKU"
                                  >
                                    <span>{product.id}</span>
                                    {copiedId === product.id ? (
                                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-slate-400" />
                                    )}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>{product.category || 'General Health'}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                                    TZS {product.currentPrice.toLocaleString()}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                                    {product.pv} PV
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleSelectProduct(product)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer"
                              title="View details"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Sales Records Section */}
                {showReports && filteredResults.reports.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Sales Records ({filteredResults.reports.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Click to audit report</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                      {filteredResults.reports.map((report) => {
                        const isSelected = selectedReport?.id === report.id;
                        return (
                          <div
                            key={report.id}
                            onClick={() => handleSelectReport(report)}
                            className={`p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={(e) => handleCopySku(report.id, e)}
                                  className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded text-[10px] font-mono font-bold shrink-0 flex items-center gap-1"
                                  title="Click to copy Record SKU"
                                >
                                  <span>{report.id}</span>
                                  {copiedId === report.id ? (
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-emerald-400" />
                                  )}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                  {report.reportDate}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                                    report.status === 'approved'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                                  }`}
                                >
                                  {report.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">{report.staffName}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                                  TZS {report.totalSalesAmount.toLocaleString()}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                  {report.totalQuantitySold} items sold
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                                  {report.totalPv} PV
                                </span>
                              </div>

                              {/* Highlight matching item names if found */}
                              {report.items && report.items.length > 0 && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                                  Items: {report.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleSelectReport(report)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer"
                              title="View sales details"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Detail Preview Column */}
          {(selectedProduct || selectedReport) && (
            <div className="md:col-span-5 p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40 space-y-4 overflow-y-auto">
              {/* Product Preview */}
              {selectedProduct && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      <span>Inventory Item Details</span>
                    </span>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedProduct.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <img
                        src={SecurityService.sanitizeSafeUrl(selectedProduct.imageUrl)}
                        alt={selectedProduct.name}
                        className="w-full h-44 object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {selectedProduct.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">SKU:</span>
                      <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-800 dark:text-slate-200">
                        {selectedProduct.id}
                      </span>
                      <button
                        onClick={(e) => handleCopySku(selectedProduct.id, e)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 font-semibold ml-1 cursor-pointer"
                      >
                        {copiedId === selectedProduct.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === selectedProduct.id ? 'Copied' : 'Copy SKU'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Category</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {selectedProduct.category || 'General Health'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Point Value (PV)</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums block mt-0.5">
                        {selectedProduct.pv} PV
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl col-span-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Member Price</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums block mt-0.5">
                        TZS {selectedProduct.currentPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleNavigateToWorkspace()}
                      className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Open in Staff Workspace</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sales Report Preview */}
              {selectedReport && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      <span>Sales Record Audit</span>
                    </span>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                        {selectedReport.id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                          selectedReport.status === 'approved'
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {selectedReport.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                      Daily Report for {selectedReport.reportDate}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Submitted by: <strong className="text-slate-900 dark:text-slate-200">{selectedReport.staffName}</strong> (@{selectedReport.staffUsername})
                    </p>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Sales Amount</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums block mt-0.5">
                        TZS {selectedReport.totalSalesAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Quantity</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums block mt-0.5">
                        {selectedReport.totalQuantitySold} pcs
                      </span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Total PV</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums block mt-0.5">
                        {selectedReport.totalPv} PV
                      </span>
                    </div>
                  </div>

                  {/* Items Sold Breakdown */}
                  {selectedReport.items && selectedReport.items.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Sold Products ({selectedReport.items.length}):
                      </span>
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs">
                        {selectedReport.items.map((item, idx) => (
                          <div key={idx} className="p-2 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{item.productName}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                SKU: {item.productId} · Qty: {item.quantity} · {item.pv * item.quantity} PV
                              </div>
                            </div>
                            <div className="text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white text-xs">
                              TZS {item.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnostic Tests & Kit numbers */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Quantum Analyzer Tests:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedReport.quantumTestCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Body Analyzer Tests:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedReport.bodyAnalyzerTestCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Kits Registered:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedReport.kitRegisteredCount}</span>
                    </div>
                    {selectedReport.kitNumbers && (
                      <div className="pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 font-mono truncate">
                        Kits: {selectedReport.kitNumbers}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleNavigateToWorkspace()}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>Review in Staff Workspace</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Keyboard navigation hints */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                Ctrl
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                K
              </kbd>
              <span className="text-[11px] ml-1">to search anywhere</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                ESC
              </kbd>
              <span className="text-[11px] ml-1">to close</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            T20 Unified Global Inventory & Sales Engine
          </div>
        </div>
      </div>
    </div>
  );
};
