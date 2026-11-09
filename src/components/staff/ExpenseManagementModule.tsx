import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory } from '../../types';
import { StorageService } from '../../services/storage';
import { EXPENSE_CATEGORIES, FinancialService } from '../../services/financialService';
import {
  Receipt,
  Plus,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Search,
} from 'lucide-react';

interface ExpenseManagementModuleProps {
  currentUsername: string;
  systemDate: string;
}

export const ExpenseManagementModule: React.FC<ExpenseManagementModuleProps> = ({
  currentUsername,
  systemDate,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form states
  const [expenseDate, setExpenseDate] = useState<string>(systemDate);
  const [category, setCategory] = useState<ExpenseCategory>('Office Expenses');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadExpenses = () => {
    const list = StorageService.getExpenses();
    setExpenses(list);
  };

  useEffect(() => {
    loadExpenses();
  }, [currentUsername]);

  useEffect(() => {
    if (systemDate) {
      setExpenseDate(systemDate);
    }
  }, [systemDate]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDate) {
      showNotification('error', 'Please enter a valid expense date.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showNotification('error', 'Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      showNotification('error', 'Please provide a clear description of the expense.');
      return;
    }

    setIsSubmitting(true);
    const result = await StorageService.recordExpense({
      expenseDate,
      category,
      description: description.trim(),
      amount: numAmount,
    });
    setIsSubmitting(false);

    if (result.success && result.expense) {
      showNotification(
        'success',
        `Expense of ${FinancialService.formatCurrency(result.expense.amount)} for "${result.expense.category}" recorded successfully.`
      );
      setAmount('');
      setDescription('');
      setIsFormOpen(false);
      loadExpenses();
    } else {
      showNotification('error', result.error || 'Failed to record expense. Please try again.');
    }
  };

  // Filtered expenses list
  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.expenseDate.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const totalRecorded = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Receipt className="w-4 h-4" />
            <span>Operational Cost Registry</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            Store Expense Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record authorized operational expenditures in Tanzanian Shillings (TSh) for store management audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Recorded</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {FinancialService.formatCurrency(totalRecorded)}
            </span>
          </div>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen ? 'Close Form' : 'Record New Expense'}</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          )}
          <span className="text-xs font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* New Expense Form Modal/Collapsible */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Record Operating Expense</span>
            </div>
            <span className="text-xs text-slate-400">
              Entered by: <strong className="text-slate-700 dark:text-slate-300">@{currentUsername}</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expense Date *</span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono min-h-[40px]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Category *</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[40px]"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Amount (TSh) *</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  placeholder="e.g. 45000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono min-h-[40px]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Description & Particulars *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Store office electricity tokens, transport voucher for stock retrieval, water bill..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[40px]"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors min-h-[38px] disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Expense Record</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search expense description, date, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[38px]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Filter Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[38px]"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Recorded Expenses ({filteredExpenses.length})
          </span>
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
            Subtotal: {FinancialService.formatCurrency(filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0))}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No expense records found</p>
            <p className="text-xs text-slate-400">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search criteria.'
                : 'Click "Record New Expense" above to add business expenditures.'}
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
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {exp.expenseDate}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {exp.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
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
