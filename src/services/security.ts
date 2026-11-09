/**
 * Security Service & Defensive Hardening Module for T20 Server
 * 
 * Protects against:
 * - Authentication bypass
 * - Brute-force attacks (rate limiting & lockout)
 * - XSS & malicious URL injection (javascript: pseudo-protocols)
 * - Credential theft & plaintext password leaks
 * - Prototype pollution & input tampering
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout
const ATTEMPT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes window

interface AttemptRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, AttemptRecord>();

// Pre-defined system vault sync authorization token
export const VAULT_SYNC_TOKEN = 'T20-VAULT-SECURE-SYNC-KEY-v7';

export class SecurityService {
  /**
   * Sanitizes URLs before rendering in href, src, or download attributes.
   * Strictly blocks javascript:, vbscript:, data:text/html, etc.
   * Only allows http:, https:, safe data:image/*, and safe relative paths.
   */
  public static sanitizeSafeUrl(
    url: string | null | undefined,
    fallback: string = '/assets/images/hero_t20_operations_1792695111872.jpg'
  ): string {
    if (!url || typeof url !== 'string') return fallback;

    const trimmed = url.trim();

    // Check for malicious pseudo-protocols
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('data:text/') ||
      lower.startsWith('data:application/')
    ) {
      console.warn('[Security Warning] Blocked dangerous URL execution attempt:', trimmed.slice(0, 30));
      return fallback;
    }

    // Allow safe data:image/* schemes
    if (lower.startsWith('data:image/')) {
      return trimmed;
    }

    // Allow relative paths starting with /
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }

    // Validate standard HTTP/HTTPS URLs
    try {
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch {
      // invalid URL
    }

    return fallback;
  }

  /**
   * Sanitizes user textual inputs (removes script tags and HTML control sequences).
   */
  public static sanitizeString(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
      .trim();
  }

  /**
   * Brute-Force Defense: Checks if a username or IP is temporarily locked out.
   */
  public static checkBruteForceLockout(identifier: string): { allowed: boolean; waitSeconds?: number } {
    const key = identifier.trim().toLowerCase();
    const record = loginAttempts.get(key);

    if (!record) {
      return { allowed: true };
    }

    const now = Date.now();

    // Check active lockout
    if (record.lockedUntil && now < record.lockedUntil) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    // Reset if window expired
    if (now - record.lastAttempt > ATTEMPT_WINDOW_MS) {
      loginAttempts.delete(key);
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Records a login attempt to detect and throttle brute-force attacks.
   */
  public static recordLoginAttempt(identifier: string, success: boolean): void {
    const key = identifier.trim().toLowerCase();
    const now = Date.now();

    if (success) {
      loginAttempts.delete(key);
      return;
    }

    const record = loginAttempts.get(key) || {
      attempts: 0,
      lastAttempt: now,
      lockedUntil: null,
    };

    record.attempts += 1;
    record.lastAttempt = now;

    if (record.attempts >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      console.warn(`[Security Alert] Rate-limiting user identifier "${key}" for 60 seconds due to repeated failed logins.`);
    }

    loginAttempts.set(key, record);
  }

  /**
   * Session Token Storage in browser memory/sessionStorage (never plaintext password)
   */
  private static cachedToken: string | null = null;

  public static getAuthToken(): string | null {
    if (this.cachedToken) return this.cachedToken;
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('t20_auth_token') || localStorage.getItem('t20_auth_token');
        if (stored) {
          this.cachedToken = stored;
          return stored;
        }
      }
    } catch {
      // fallback
    }
    return null;
  }

  public static setAuthToken(token: string | null): void {
    this.cachedToken = token;
    try {
      if (typeof window !== 'undefined') {
        if (token) {
          sessionStorage.setItem('t20_auth_token', token);
          localStorage.setItem('t20_auth_token', token);
        } else {
          sessionStorage.removeItem('t20_auth_token');
          localStorage.removeItem('t20_auth_token');
        }
      }
    } catch {
      // fallback
    }
  }

  public static getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'x-vault-sync-token': VAULT_SYNC_TOKEN,
    };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-session-token'] = token;
    }
    return headers;
  }

  /**
   * Strip sensitive fields (passwords) from user objects before serialization / transmission.
   */
  public static sanitizeUserForExport<T extends { password?: string }>(user: T): Omit<T, 'password'> {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
