/**
 * User Data Backup & Version Migration Service
 * Protects user data across system updates, browser reloads, and version increments.
 * Ensures users never lose their registered accounts, passwords, products, and reports.
 */

import { User, Product, DailyOperationalReport, AuditLogEntry, Expense } from '../types';
import { SecurityService } from './security';

export interface BackupPayload {
  version: string;
  exportedAt: string;
  source: string;
  users: User[];
  products: Product[];
  dailyReports: DailyOperationalReport[];
  expenses?: Expense[];
  periodSubmissions: Record<string, any>;
  auditLogs: AuditLogEntry[];
}

const VAULT_KEY = 't20_permanent_user_vault_v1';
const AUTO_BACKUP_TIMESTAMP_KEY = 't20_vault_last_backup_timestamp';

export class BackupService {
  /**
   * Automatically initialize and restore permanent data across all system updates
   */
  public static ensureRestoredFromVault(): void {
    if (typeof window === 'undefined') return;

    // 1. Local Vault Restoration
    try {
      const rawVault = localStorage.getItem(VAULT_KEY);
      if (rawVault) {
        const vault: Partial<BackupPayload> = JSON.parse(rawVault);

        // Check users
        const currentUsersStr = localStorage.getItem('t20_users_v5');
        if (!currentUsersStr && vault.users && vault.users.length > 0) {
          localStorage.setItem('t20_users_v5', JSON.stringify(vault.users));
          localStorage.setItem('t20_registered_users_permanent', JSON.stringify(vault.users));
        }

        // Check daily reports
        const currentReportsStr = localStorage.getItem('t20_daily_reports_v7_bfsuma_pv');
        if (!currentReportsStr && vault.dailyReports && vault.dailyReports.length > 0) {
          localStorage.setItem('t20_daily_reports_v7_bfsuma_pv', JSON.stringify(vault.dailyReports));
        }

        // Check products
        const currentProductsStr = localStorage.getItem('t20_products_v7_bfsuma_pv');
        if (!currentProductsStr && vault.products && vault.products.length > 0) {
          localStorage.setItem('t20_products_v7_bfsuma_pv', JSON.stringify(vault.products));
        }

        // Check expenses
        const currentExpensesStr = localStorage.getItem('t20_expenses_v7_bfsuma');
        if (!currentExpensesStr && vault.expenses && vault.expenses.length > 0) {
          localStorage.setItem('t20_expenses_v7_bfsuma', JSON.stringify(vault.expenses));
        }
      }
    } catch (err) {
      console.warn('Local vault restoration warning:', err);
    }

    // 2. Server Disk Vault Restoration (Preserves data across browser cache clears and system updates)
    try {
      fetch('/api/data/load', {
        headers: SecurityService.getAuthHeaders(),
        credentials: 'include',
      })
        .then((r) => r.json())
        .then((res) => {
          if (res && res.success && res.data) {
            const serverVault: Partial<BackupPayload> = res.data;

            if (serverVault.users && serverVault.users.length > 0) {
              const localUsersStr = localStorage.getItem('t20_users_v5');
              const localUsers = localUsersStr ? JSON.parse(localUsersStr) : [];
              // Merge any server-persisted users missing locally
              const existingIds = new Set(localUsers.map((u: any) => u.id));
              let added = false;
              serverVault.users.forEach((srvUser: any) => {
                if (!existingIds.has(srvUser.id)) {
                  localUsers.push(srvUser);
                  added = true;
                }
              });
              if (added) {
                localStorage.setItem('t20_users_v5', JSON.stringify(localUsers));
                localStorage.setItem('t20_registered_users_permanent', JSON.stringify(localUsers));
              }
            }

            if (serverVault.products && serverVault.products.length > 0) {
              const currentProdsStr = localStorage.getItem('t20_products_v7_bfsuma_pv');
              const localProducts: any[] = currentProdsStr ? JSON.parse(currentProdsStr) : [];
              const existingProductIds = new Set(localProducts.map(p => p.id));
              let prodAdded = false;
              serverVault.products.forEach(p => {
                if (!existingProductIds.has(p.id)) {
                  localProducts.push(p);
                  prodAdded = true;
                }
              });
              if (prodAdded || !currentProdsStr) {
                localStorage.setItem(
                  't20_products_v7_bfsuma_pv',
                  JSON.stringify(localProducts.length > 0 ? localProducts : serverVault.products)
                );
              }
            }

            if (serverVault.dailyReports && serverVault.dailyReports.length > 0) {
              const currentRepsStr = localStorage.getItem('t20_daily_reports_v7_bfsuma_pv');
              const localReports: any[] = currentRepsStr ? JSON.parse(currentRepsStr) : [];
              const existingRepKeys = new Set(localReports.map(r => r.id || r.reportDate));
              let repAdded = false;
              serverVault.dailyReports.forEach(r => {
                if (!existingRepKeys.has(r.id) && !existingRepKeys.has(r.reportDate)) {
                  localReports.push(r);
                  repAdded = true;
                }
              });
              if (repAdded || !currentRepsStr) {
                localStorage.setItem(
                  't20_daily_reports_v7_bfsuma_pv',
                  JSON.stringify(localReports.length > 0 ? localReports : serverVault.dailyReports)
                );
              }
            }

            if (serverVault.expenses && serverVault.expenses.length > 0) {
              const currentExpStr = localStorage.getItem('t20_expenses_v7_bfsuma');
              const localExpenses: any[] = currentExpStr ? JSON.parse(currentExpStr) : [];
              const existingExpIds = new Set(localExpenses.map(e => e.id));
              let expAdded = false;
              serverVault.expenses.forEach(e => {
                if (!existingExpIds.has(e.id)) {
                  localExpenses.push(e);
                  expAdded = true;
                }
              });
              if (expAdded || !currentExpStr) {
                localStorage.setItem(
                  't20_expenses_v7_bfsuma',
                  JSON.stringify(localExpenses.length > 0 ? localExpenses : serverVault.expenses)
                );
              }
            }
          }
        })
        .catch(() => {
          // Server offline or dev startup
        });
    } catch {
      // safe fallback
    }
  }

  /**
   * Sync current active database state to permanent vault and server disk
   */
  public static syncCurrentDataToVault(): void {
    if (typeof window === 'undefined') return;
    try {
      const usersStr = localStorage.getItem('t20_users_v5') || localStorage.getItem('t20_registered_users_permanent');
      const productsStr = localStorage.getItem('t20_products_v7_bfsuma_pv');
      const reportsStr = localStorage.getItem('t20_daily_reports_v7_bfsuma_pv');
      const expensesStr = localStorage.getItem('t20_expenses_v7_bfsuma');
      const periodSubmissionsStr = localStorage.getItem('t20_period_submissions_v5');
      const auditLogsStr = localStorage.getItem('t20_audit_logs_v5');

      const payload: BackupPayload = {
        version: '7.0.0',
        exportedAt: new Date().toISOString(),
        source: 'T20 Server Automated Protection Vault',
        users: usersStr ? JSON.parse(usersStr) : [],
        products: productsStr ? JSON.parse(productsStr) : [],
        dailyReports: reportsStr ? JSON.parse(reportsStr) : [],
        expenses: expensesStr ? JSON.parse(expensesStr) : [],
        periodSubmissions: periodSubmissionsStr ? JSON.parse(periodSubmissionsStr) : {},
        auditLogs: auditLogsStr ? JSON.parse(auditLogsStr) : [],
      };


      // 1. LocalStorage permanent snapshot
      localStorage.setItem(VAULT_KEY, JSON.stringify(payload));
      localStorage.setItem(AUTO_BACKUP_TIMESTAMP_KEY, payload.exportedAt);

      // 2. Server Disk Persistent Backup (Non-blocking background sync with security authorization token)
      fetch('/api/data/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...SecurityService.getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      }).catch(() => {
        // network resilience
      });
    } catch (err) {
      console.warn('Backup vault synchronization warning:', err);
    }
  }

  /**
   * Generate downloadable JSON backup file
   */
  public static exportBackupFile(): void {
    this.syncCurrentDataToVault();
    const rawVault = localStorage.getItem(VAULT_KEY);
    if (!rawVault) {
      throw new Error('No data available in backup vault.');
    }

    const blob = new Blob([rawVault], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `T20_Server_Complete_Data_Backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import & restore backup from a user-supplied JSON file
   */
  public static async importBackupFile(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) {
            resolve({ success: false, message: 'Fayli halina data (Empty file).' });
            return;
          }

          const parsed: Partial<BackupPayload> = JSON.parse(content);

          if (!parsed.users && !parsed.dailyReports && !parsed.products) {
            resolve({ success: false, message: 'Muundo wa data haukubaliki (Invalid T20 backup format).' });
            return;
          }

          // Restore each section
          if (Array.isArray(parsed.users) && parsed.users.length > 0) {
            localStorage.setItem('t20_users_v5', JSON.stringify(parsed.users));
            localStorage.setItem('t20_registered_users_permanent', JSON.stringify(parsed.users));
          }

          if (Array.isArray(parsed.products) && parsed.products.length > 0) {
            localStorage.setItem('t20_products_v7_bfsuma_pv', JSON.stringify(parsed.products));
          }

          if (Array.isArray(parsed.dailyReports)) {
            localStorage.setItem('t20_daily_reports_v7_bfsuma_pv', JSON.stringify(parsed.dailyReports));
          }

          if (Array.isArray(parsed.expenses)) {
            localStorage.setItem('t20_expenses_v7_bfsuma', JSON.stringify(parsed.expenses));
          }

          if (parsed.periodSubmissions) {
            localStorage.setItem('t20_period_submissions_v5', JSON.stringify(parsed.periodSubmissions));
          }

          if (Array.isArray(parsed.auditLogs)) {
            localStorage.setItem('t20_audit_logs_v5', JSON.stringify(parsed.auditLogs));
          }

          // Save to permanent vault
          localStorage.setItem(VAULT_KEY, content);
          localStorage.setItem(AUTO_BACKUP_TIMESTAMP_KEY, new Date().toISOString());

          resolve({
            success: true,
            message: `Data restored successfully! Users: ${parsed.users?.length || 0}, Reports: ${parsed.dailyReports?.length || 0}, Products: ${parsed.products?.length || 0}`,
            count: (parsed.dailyReports?.length || 0) + (parsed.users?.length || 0),
          });
        } catch (err: any) {
          resolve({ success: false, message: `Error reading backup file: ${err.message || 'Error parsing JSON'}` });
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * Get backup statistics for UI display
   */
  public static getBackupSummary(): {
    lastBackup: string;
    usersCount: number;
    reportsCount: number;
    productsCount: number;
  } {
    try {
      const rawVault = localStorage.getItem(VAULT_KEY);
      const lastBackup = localStorage.getItem(AUTO_BACKUP_TIMESTAMP_KEY) || 'Automated Active';
      if (!rawVault) {
        return { lastBackup: 'Haikurekodiwa bado', usersCount: 0, reportsCount: 0, productsCount: 0 };
      }
      const parsed: BackupPayload = JSON.parse(rawVault);
      return {
        lastBackup,
        usersCount: parsed.users?.length || 0,
        reportsCount: parsed.dailyReports?.length || 0,
        productsCount: parsed.products?.length || 0,
      };
    } catch {
      return { lastBackup: 'Automated Active', usersCount: 0, reportsCount: 0, productsCount: 0 };
    }
  }
}
