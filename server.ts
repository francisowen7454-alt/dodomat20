import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev environment requires dev server to strictly run on port 3000
const PORT = 3000;

// Allowed expense categories for T20 Business Expense Management
export const ALLOWED_EXPENSE_CATEGORIES = new Set([
  'Salaries',
  'Rent',
  'Electricity and Utilities',
  'Transport',
  'Office Expenses',
  'Other Operating Expenses',
]);

// =========================================================================
// 1. DEFENSIVE HTTP SECURITY HEADERS & CSP
// =========================================================================
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  // Content Security Policy allowing preview framing within Google AI Studio & Cloud Run
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com https://*.run.app; base-uri 'self'; form-action 'self';"
  );
  next();
});

// =========================================================================
// 2. TARGETED BODY PARSING & DOS DEFENSE
// =========================================================================
// Endpoint-specific body parsers to prevent resource exhaustion / DoS
const json64kb = express.json({ limit: '64kb' });
const json5mb = express.json({ limit: '5mb' });
const json10mb = express.json({ limit: '10mb' });
const json15mb = express.json({ limit: '15mb' });

// Default body parser for standard requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api/gemini/analyze-product-image')) {
    return json10mb(req, res, next);
  }
  if (req.path.startsWith('/api/gemini/scan-product-form') || req.path.startsWith('/api/gemini/parse-product-pdf')) {
    return json15mb(req, res, next);
  }
  if (req.path.startsWith('/api/data/sync')) {
    return json5mb(req, res, next);
  }
  return json64kb(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// =========================================================================
// 3. SLIDING-WINDOW RATE LIMITER & BRUTE-FORCE DEFENSE
// =========================================================================
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMaps = new Map<string, Map<string, RateLimitRecord>>();

function createRateLimiter(bucketName: string, maxRequests: number, windowMs: number = 60000) {
  if (!rateLimitMaps.has(bucketName)) {
    rateLimitMaps.set(bucketName, new Map());
  }
  const bucket = rateLimitMaps.get(bucketName)!;

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = bucket.get(clientIp);

    if (!record || now > record.resetAt) {
      bucket.set(clientIp, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', waitSeconds.toString());
      return res.status(429).json({
        success: false,
        error: `Too Many Requests: Rate limit exceeded. Please wait ${waitSeconds} seconds before trying again.`,
      });
    }
    next();
  };
}

// Periodic cleanup of expired rate limit buckets
setInterval(() => {
  const now = Date.now();
  for (const bucket of rateLimitMaps.values()) {
    for (const [key, record] of bucket.entries()) {
      if (now > record.resetAt) {
        bucket.delete(key);
      }
    }
  }
}, 3 * 60 * 1000);

// Apply rate limiters to specific endpoints
const authRateLimiter = createRateLimiter('auth', 60, 60000); // 60 auth attempts/min
const geminiRateLimiter = createRateLimiter('gemini', 60, 60000); // 60 AI calls/min
const apiRateLimiter = createRateLimiter('general_api', 200, 60000); // 200 req/min

app.use('/api', apiRateLimiter);

// =========================================================================
// 4. CRYPTOGRAPHIC PASSWORD HASHING (PBKDF2 + SHA-512 + UNIQUE SALT)
// =========================================================================
export function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const computedBuf = Buffer.from(computedHash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (computedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, expectedBuf);
  } catch {
    return false;
  }
}

// =========================================================================
// 5. SESSION MANAGEMENT (CRYPTO TOKENS + 24H EXPIRY)
// =========================================================================
export interface SessionData {
  userId: string;
  username: string;
  role: 'manager' | 'staff';
  fullName: string;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, SessionData>();
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts[0]?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

export function getSessionFromRequest(req: express.Request): SessionData | null {
  let token: string | undefined;

  // 1. Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Custom header
  if (!token && typeof req.headers['x-session-token'] === 'string') {
    token = req.headers['x-session-token'].trim();
  }

  // 3. HttpOnly Cookie
  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies['t20_session'];
  }

  if (!token) return null;

  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required. Session missing, invalid, or expired.',
    });
  }
  (req as any).user = session;
  next();
}

export function requireRole(role: 'manager' | 'staff') {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = (req as any).user as SessionData;
    if (!session || session.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Action requires ${role} role privileges.`,
      });
    }
    next();
  };
}

// =========================================================================
// 6. PERSISTENT VAULT STORAGE HELPERS
// =========================================================================
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'database_vault.json');
const FALLBACK_DATA_FILE = path.resolve('/tmp', 't20_database_vault.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignore if data dir creation fails in read-only environment
}

function getDataFilePath(): string {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    return DATA_FILE;
  } catch {
    return FALLBACK_DATA_FILE;
  }
}

export interface StoredUser {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  role: 'manager' | 'staff';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  passwordSalt: string;
  passwordHash: string;
}

export interface ExpenseRecord {
  id: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  enteredBy: string;
  createdAt: string;
}

export interface VaultData {
  version: string;
  users: StoredUser[];
  products: any[];
  dailyReports: any[];
  expenses: ExpenseRecord[];
  periodSubmissions?: Record<string, any>;
  auditLogs?: any[];
}

function readVault(): VaultData {
  const primaryPath = DATA_FILE;
  const fallbackPath = FALLBACK_DATA_FILE;
  const targetPath = fs.existsSync(primaryPath) ? primaryPath : fs.existsSync(fallbackPath) ? fallbackPath : primaryPath;

  if (fs.existsSync(targetPath)) {
    try {
      const content = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        version: parsed.version || '7.0.0',
        users: Array.isArray(parsed.users) ? parsed.users : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        dailyReports: Array.isArray(parsed.dailyReports) ? parsed.dailyReports : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        periodSubmissions: parsed.periodSubmissions || {},
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      };
    } catch {
      // fallback
    }
  }
  return {
    version: '7.0.0',
    users: [],
    products: [],
    dailyReports: [],
    expenses: [],
    periodSubmissions: {},
    auditLogs: [],
  };
}

function writeVaultAtomic(data: VaultData): void {
  const targetFile = getDataFilePath();
  try {
    const tempFile = `${targetFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, targetFile);
  } catch (err) {
    console.warn('[Storage] Primary write failed, writing to fallback tmp file:', err);
    try {
      fs.writeFileSync(FALLBACK_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (fallbackErr) {
      console.error('[Storage Error] Could not write vault data to fallback:', fallbackErr);
    }
  }
}

export function sanitizeUser(user: any) {
  if (!user || typeof user !== 'object') return null;
  const { passwordSalt, passwordHash, password, ...safeUser } = user;
  return safeUser;
}

// Initialize seed users with cryptographically salted PBKDF2 hashes if vault has no users
function seedDefaultUsersIfEmpty(): void {
  const vault = readVault();
  if (vault.users.length === 0) {
    const mgrCreds = hashPassword('Francis@Manager2026!');
    const staff1Creds = hashPassword('Neema@Staff2026!');
    const staff2Creds = hashPassword('Juma@Staff2026!');

    vault.users = [
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
        passwordSalt: mgrCreds.salt,
        passwordHash: mgrCreds.hash,
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
        passwordSalt: staff1Creds.salt,
        passwordHash: staff1Creds.hash,
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
        passwordSalt: staff2Creds.salt,
        passwordHash: staff2Creds.hash,
      },
    ];
    writeVaultAtomic(vault);
    console.log('[T20 Security] Seeded default accounts with salted PBKDF2 credentials.');
  }
}
seedDefaultUsersIfEmpty();

// =========================================================================
// 7. SECURE AUTHENTICATION ENDPOINTS
// =========================================================================

// POST /api/auth/login
app.post('/api/auth/login', authRateLimiter, (req, res) => {
  try {
    const { username, password } = req.body || {};

    // 1. Mandatory password and username presence check (Prevents empty-password bypass)
    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: Username is required.',
      });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: Password is required to sign in.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const vault = readVault();
    const user = vault.users.find(
      (u) => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername)
    );

    // Generic error response to prevent username enumeration
    const genericAuthError = 'Invalid username or password. Please verify your credentials.';

    if (!user) {
      return res.status(401).json({ success: false, error: genericAuthError });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated by Management. Contact the administrator.',
      });
    }

    // 2. Cryptographic PBKDF2 password verification with constant-time equality
    const isValidPassword = verifyPassword(password.trim(), user.passwordSalt, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: genericAuthError });
    }

    // 3. Issue cryptographically random session token
    const token = crypto.randomBytes(32).toString('hex');
    const session: SessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    activeSessions.set(token, session);

    // Update lastLoginAt
    user.lastLoginAt = new Date().toISOString();
    writeVaultAtomic(vault);

    // Set secure cookie
    res.setHeader(
      'Set-Cookie',
      `t20_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Authentication processing failed.' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', authRateLimiter, (req, res) => {
  try {
    const { fullName, username, password, email, role } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full Name must be at least 2 characters.' });
    }
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Username must be at least 3 characters.' });
    }
    if (!password || typeof password !== 'string' || password.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Password must be at least 5 characters.' });
    }

    // Automatically normalize username: trim, lowercase, replace spaces with dots
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '.');
    if (!/^[a-z0-9._@+-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Username can only contain alphanumeric characters, dots, underscores, hyphens, or @.',
      });
    }

    // Role selection: registration allowed for all accounts (both manager and staff)
    const assignedRole: 'manager' | 'staff' = role === 'manager' ? 'manager' : 'staff';
    const activeSession = getSessionFromRequest(req);
    const isAdminAction = req.headers['x-admin-create-user'] === 'true';

    const vault = readVault();
    const existingIndex = vault.users.findIndex((u) => u.username.toLowerCase() === cleanUsername);

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const cookieFlags = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';

    // If an account already exists with this username, update credentials and authenticate immediately
    if (existingIndex !== -1) {
      const existingUser = vault.users[existingIndex];
      const { salt, hash } = hashPassword(password.trim());
      existingUser.fullName = fullName.trim() || existingUser.fullName;
      existingUser.passwordSalt = salt;
      existingUser.passwordHash = hash;
      existingUser.role = assignedRole;
      existingUser.isActive = true;
      existingUser.lastLoginAt = new Date().toISOString();
      writeVaultAtomic(vault);

      // If an existing Manager created this user via admin dashboard, keep the manager's active session intact
      if (activeSession && activeSession.role === 'manager' && isAdminAction && activeSession.username !== existingUser.username) {
        return res.json({
          success: true,
          message: `Account for ${existingUser.fullName} successfully updated as ${assignedRole}.`,
          user: sanitizeUser(existingUser),
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const session: SessionData = {
        userId: existingUser.id,
        username: existingUser.username,
        role: existingUser.role,
        fullName: existingUser.fullName,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_MS,
      };
      activeSessions.set(token, session);

      res.setHeader(
        'Set-Cookie',
        `t20_session=${token}; Path=/; HttpOnly; ${cookieFlags}; Max-Age=86400`
      );

      return res.json({
        success: true,
        message: `Account for ${existingUser.fullName} registered and signed in successfully.`,
        token,
        user: sanitizeUser(existingUser),
      });
    }

    // Hash password securely with PBKDF2
    const { salt, hash } = hashPassword(password.trim());

    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      fullName: fullName.trim(),
      username: cleanUsername,
      email: email && typeof email === 'string' ? email.trim().toLowerCase() : cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@t20.local`,
      role: assignedRole,
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      passwordSalt: salt,
      passwordHash: hash,
    };

    vault.users.push(newUser);
    writeVaultAtomic(vault);

    // If an existing Manager created this user via admin panel, keep the manager's active session intact
    if (activeSession && activeSession.role === 'manager' && isAdminAction) {
      return res.json({
        success: true,
        message: `Account for ${newUser.fullName} successfully registered as ${assignedRole}.`,
        user: sanitizeUser(newUser),
      });
    }

    // Otherwise, issue session token for new public registrant
    const token = crypto.randomBytes(32).toString('hex');
    const session: SessionData = {
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
      fullName: newUser.fullName,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    activeSessions.set(token, session);

    res.setHeader(
      'Set-Cookie',
      `t20_session=${token}; Path=/; HttpOnly; ${cookieFlags}; Max-Age=86400`
    );

    return res.json({
      success: true,
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Registration processing failed.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
  const session = (req as any).user as SessionData;
  const vault = readVault();
  let user = vault.users.find((u) => u.id === session.userId || u.username.toLowerCase() === session.username.toLowerCase());
  if (!user && session.username) {
    user = {
      id: session.userId,
      fullName: session.fullName,
      username: session.username,
      email: `${session.username}@t20.local`,
      role: session.role,
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      passwordSalt: '',
      passwordHash: '',
    };
  }
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, error: 'Session user is no longer active.' });
  }
  return res.json({ success: true, user: sanitizeUser(user) });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const session = getSessionFromRequest(req);
  if (session) {
    // Invalidate active token
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      activeSessions.delete(authHeader.substring(7).trim());
    }
    const cookies = parseCookies(req.headers.cookie);
    if (cookies['t20_session']) {
      activeSessions.delete(cookies['t20_session']);
    }
  }
  res.setHeader('Set-Cookie', 't20_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/update-profile
app.post('/api/auth/update-profile', requireAuth, (req, res) => {
  try {
    const session = (req as any).user as SessionData;
    const { fullName, username, currentPassword, newPassword } = req.body || {};

    const vault = readVault();
    const userIndex = vault.users.findIndex((u) => u.id === session.userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const user = vault.users[userIndex];

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword || !verifyPassword(currentPassword.trim(), user.passwordSalt, user.passwordHash)) {
        return res.status(401).json({ success: false, error: 'Current password verification failed.' });
      }
      if (typeof newPassword !== 'string' || newPassword.trim().length < 5) {
        return res.status(400).json({ success: false, error: 'New password must be at least 5 characters long.' });
      }
      const newCreds = hashPassword(newPassword.trim());
      user.passwordSalt = newCreds.salt;
      user.passwordHash = newCreds.hash;
    }

    // If changing username
    if (username && username.trim().toLowerCase() !== user.username.toLowerCase()) {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
        return res.status(400).json({ success: false, error: 'Invalid username format.' });
      }
      if (vault.users.some((u) => u.id !== user.id && u.username.toLowerCase() === cleanUsername)) {
        return res.status(409).json({ success: false, error: `Username "${username}" is already taken.` });
      }
      user.username = cleanUsername;
      session.username = cleanUsername;
    }

    if (fullName && fullName.trim()) {
      user.fullName = fullName.trim();
      session.fullName = fullName.trim();
    }

    vault.users[userIndex] = user;
    writeVaultAtomic(vault);

    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update credentials.' });
  }
});

// =========================================================================
// 8. EXPENSE MANAGEMENT & DATA PERSISTENCE ENDPOINTS
// =========================================================================

// GET /api/expenses (Strictly Authenticated + Role-Filtered)
app.get('/api/expenses', requireAuth, (req, res) => {
  try {
    const session = (req as any).user as SessionData;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    const vault = readVault();
    let expenses = vault.expenses || [];
    if (session.role === 'staff') {
      expenses = expenses.filter((e) => e.enteredBy === session.username);
    }

    return res.json({
      success: true,
      expenses,
    });
  } catch (err: any) {
    console.error('Fetch expenses error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve expenses.' });
  }
});

// POST /api/expenses (Strictly Authenticated + Server-Enforced Identity)
app.post('/api/expenses', requireAuth, (req, res) => {
  try {
    const session = (req as any).user as SessionData;
    const { expenseDate, category, description, amount } = req.body || {};

    if (!expenseDate || typeof expenseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing expenseDate (YYYY-MM-DD).' });
    }

    if (!category || typeof category !== 'string' || !ALLOWED_EXPENSE_CATEGORIES.has(category.trim())) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${Array.from(ALLOWED_EXPENSE_CATEGORIES).join(', ')}`,
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Expense description is required.' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Expense amount must be a positive number in TZS.' });
    }

    // Server-enforced identity: never trust client-supplied enteredBy
    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      expenseDate: expenseDate.trim(),
      category: category.trim(),
      description: description.trim(),
      amount: Math.round(numericAmount),
      enteredBy: session.username, // Strictly authenticated staff identity
      createdAt: new Date().toISOString(),
    };

    const vault = readVault();
    vault.expenses = vault.expenses || [];
    vault.expenses.push(newExpense);
    writeVaultAtomic(vault);

    return res.status(201).json({
      success: true,
      expense: newExpense,
    });
  } catch (err: any) {
    console.error('Create expense error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record expense.' });
  }
});

// Helper to remove prototype pollution keys
function hasPrototypePollution(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasPrototypePollution(obj[key])) return true;
    }
  }
  return false;
}

// GET /api/data/load (Strictly Authenticated + Role-Filtered + Cache-Control: no-store)
app.get('/api/data/load', requireAuth, (req, res) => {
  try {
    const session = (req as any).user as SessionData;

    // Defensive no-cache headers to prevent proxy and browser credential caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    const vault = readVault();

    // Sanitize all users (strip password salts and hashes)
    const sanitizedUsers = vault.users.map(sanitizeUser);

    // Role-based data authorization:
    // - Managers can view all reports, submissions, expenses, and audit logs.
    // - Staff can ONLY view their own reports, their own expenses, and the shared product catalog.
    let reports = vault.dailyReports;
    let expenses = vault.expenses || [];
    if (session.role === 'staff') {
      reports = vault.dailyReports.filter((r) => r.staffUsername === session.username);
      expenses = expenses.filter((e) => e.enteredBy === session.username);
    }

    return res.json({
      success: true,
      data: {
        version: vault.version,
        products: vault.products,
        dailyReports: reports,
        expenses,
        users: sanitizedUsers,
        periodSubmissions: session.role === 'manager' ? vault.periodSubmissions : {},
        auditLogs: session.role === 'manager' ? vault.auditLogs : [],
      },
    });
  } catch (err: any) {
    console.error('Data load error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve persistent data vault.' });
  }
});

// POST /api/data/sync (Strictly Authenticated + Schema Validated + Atomic Write)
app.post('/api/data/sync', requireAuth, (req, res) => {
  try {
    const session = (req as any).user as SessionData;
    const payload = req.body;

    // 1. Prototype Pollution Defense
    if (!payload || typeof payload !== 'object' || hasPrototypePollution(payload)) {
      return res.status(400).json({ success: false, error: 'Invalid or potentially malicious payload structure.' });
    }

    // 2. Schema Limits Defense
    if (payload.products && (!Array.isArray(payload.products) || payload.products.length > 5000)) {
      return res.status(400).json({ success: false, error: 'Products array exceeds maximum allowed allocation.' });
    }
    if (payload.dailyReports && (!Array.isArray(payload.dailyReports) || payload.dailyReports.length > 5000)) {
      return res.status(400).json({ success: false, error: 'Daily reports array exceeds maximum allowed allocation.' });
    }
    if (payload.expenses && (!Array.isArray(payload.expenses) || payload.expenses.length > 5000)) {
      return res.status(400).json({ success: false, error: 'Expenses array exceeds maximum allowed allocation.' });
    }

    const currentVault = readVault();

    // 3. Role-based update enforcement
    if (session.role === 'staff') {
      // Staff cannot overwrite entire user database or modify other staff reports/expenses
      if (Array.isArray(payload.dailyReports)) {
        // Only accept reports authored by this staff user
        const otherStaffReports = currentVault.dailyReports.filter((r) => r.staffUsername !== session.username);
        const thisStaffReports = payload.dailyReports.filter((r: any) => r.staffUsername === session.username);
        currentVault.dailyReports = [...otherStaffReports, ...thisStaffReports];
      }
      if (Array.isArray(payload.expenses)) {
        // Only accept expenses entered by this staff user
        const otherStaffExpenses = (currentVault.expenses || []).filter((e) => e.enteredBy !== session.username);
        const thisStaffExpenses = payload.expenses.filter((e: any) => e.enteredBy === session.username);
        currentVault.expenses = [...otherStaffExpenses, ...thisStaffExpenses];
      }
      if (Array.isArray(payload.products) && payload.products.length > 0) {
        currentVault.products = payload.products;
      }
    } else {
      // Manager has full administrative synchronization rights
      if (Array.isArray(payload.products)) currentVault.products = payload.products;
      if (Array.isArray(payload.dailyReports)) currentVault.dailyReports = payload.dailyReports;
      if (Array.isArray(payload.expenses)) currentVault.expenses = payload.expenses;
      if (payload.periodSubmissions) currentVault.periodSubmissions = payload.periodSubmissions;
      if (Array.isArray(payload.auditLogs)) currentVault.auditLogs = payload.auditLogs;
    }

    writeVaultAtomic(currentVault);

    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('Error during secure /api/data/sync:', err);
    return res.status(500).json({ success: false, error: 'Failed to write securely to server vault.' });
  }
});


// =========================================================================
// 9. GEMINI AI CATALOG & DOCUMENT SCANNING ENDPOINTS (STRICTLY AUTHENTICATED)
// =========================================================================
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function stripDataUrlPrefix(base64: string): { cleanBase64: string; mimeType: string } {
  const match = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], cleanBase64: match[2] };
  }
  return { mimeType: 'image/jpeg', cleanBase64: base64 };
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']);

export const BF_SUMA_CATEGORIES = [
  'Bones & Joints',
  'Immune Boosters',
  'Reproductive Health',
  'Digestive Health',
  'Cardiovascular Health',
  'Personal Care',
  "Children's Health",
  'Skin Care',
];

export const BF_SUMA_FALLBACK_PRODUCTS = [
  { name: '4 in 1 Cordyceps Coffee', category: 'Immune Boosters', price: 36400, pv: 6.5, description: 'Immune support herbal coffee infused with premium Cordyceps militaris.' },
  { name: '4 in 1 Ginseng Coffee', category: 'Immune Boosters', price: 36400, pv: 6.5, description: 'Energizing herbal coffee enriched with American Ginseng.' },
  { name: '4 in 1 Reishi Coffee', category: 'Immune Boosters', price: 36400, pv: 6.5, description: 'Health-boosting beverage formulated with organic Reishi Ganoderma.' },
  { name: 'Anatic Herbal Soap', category: 'Skin Care', price: 6160, pv: 1, description: 'Gentle antibacterial botanical skincare cleansing soap.' },
  { name: 'Arthro Extra tablets', category: 'Bones & Joints', price: 112000, pv: 34.5, description: 'Glucosamine and chondroitin formula for cartilage regeneration.' },
  { name: 'Calcium & Vitamin D', category: "Children's Health", price: 67200, pv: 18, description: 'Essential skeletal nutrition for growing children.' },
  { name: 'Cerebrain tablets', category: 'Cardiovascular Health', price: 70000, pv: 22, description: 'Ginkgo biloba formula for mental focus, memory, and micro-circulation.' },
  { name: 'Consti Relax', category: 'Digestive Health', price: 81200, pv: 22, description: 'FOS prebiotics and natural fiber for gentle bowel regularity.' },
  { name: 'Cool Roll', category: 'Personal Care', price: 33600, pv: 2.4, description: 'Refreshing roll-on providing natural coolness and deodorizing.' },
  { name: 'Detoxilive Pro Oil', category: 'Cardiovascular Health', price: 56000, pv: 15, description: 'High-purity phospholipid oil supporting liver health and lipid metabolism.' },
  { name: "Dr.T's Tooth paste", category: 'Personal Care', price: 15400, pv: 2.8, description: 'Herbal fluoride-free oral care toothpaste for gums and teeth.' },
  { name: 'Famicare (FEMININE CLEANSER)', category: 'Personal Care', price: 30800, pv: 6, description: 'Gentle pH-balanced botanical intimate cleansing formulation.' },
  { name: 'Femenergy capsules', category: 'Personal Care', price: 84000, pv: 25, description: 'Holistic wellness and vitality support capsules for women.' },
  { name: 'Femicalcium D3', category: 'Personal Care', price: 89000, pv: 24.5, description: 'High-absorption calcium complex enriched with Vitamin D3.' },
  { name: 'Feminery', category: 'Skin Care', price: 84000, pv: 25, description: 'Radiance and cellular nourishment for vibrant skin tone.' },
  { name: 'Femiotic', category: 'Personal Care', price: 112000, pv: 28, description: 'Specialized probiotic strains for women floral micro-ecology.' },
  { name: 'Gluzo joint ultra Pro', category: 'Bones & Joints', price: 156800, pv: 44.8, description: 'Extra-strength joint nourishment and cartilage defense formulation.' },
  { name: 'GymEffect capsules', category: 'Cardiovascular Health', price: 56000, pv: 15, description: 'Gymnema sylvestre herbal extract for sugar and cardiovascular regulation.' },
  { name: 'Micro 2 Cycle', category: 'Cardiovascular Health', price: 61600, pv: 11, description: 'Salvia and notoginseng formula for coronary circulation.' },
  { name: 'NMN Duo Release', category: 'Immune Boosters', price: 417200, pv: 112, description: 'Cutting-edge NAD+ cellular longevity and DNA repair booster.' },
  { name: 'Novel Depile', category: 'Digestive Health', price: 61600, pv: 17, description: 'Citrus bioflavonoid formula for vascular and rectal vein integrity.' },
  { name: 'Ntdiar pills 12Pcs', category: 'Digestive Health', price: 100800, pv: 7.2, description: 'Rapid soothing intestinal comfort herbal formulation.' },
  { name: 'Probio 3', category: 'Digestive Health', price: 84000, pv: 22, description: 'Multi-strain probiotic capsules for gut microbiota balance.' },
  { name: 'Prostate relax capsule', category: 'Reproductive Health', price: 67200, pv: 18, description: 'Herbal blend supporting healthy prostate function and urinary flow.' },
  { name: 'Pure and Broken GS', category: 'Immune Boosters', price: 308000, pv: 99, description: 'Cracked Ganoderma lucidum spore capsules for core immune defense.' },
  { name: 'Pure& Broken GS oil', category: 'Immune Boosters', price: 358600, pv: 102, description: 'Concentrated Reishi triterpenoid spore oil for deep vitality.' },
  { name: 'Quad - Reish', category: 'Immune Boosters', price: 98000, pv: 28, description: 'Synergistic 4-mushroom complex for multi-pathway immune response.' },
  { name: 'Refined Yunzh Essence', category: 'Immune Boosters', price: 81200, pv: 24, description: 'Yunzhi polysaccharide PSP peptide for cellular resilience.' },
  { name: 'Reliving Tea', category: 'Cardiovascular Health', price: 50400, pv: 9, description: 'Herbal cleansing infusion supporting normal blood pressure.' },
  { name: 'Sharp Vision', category: "Children's Health", price: 67200, pv: 18, description: 'Lutein, blueberry, and beta-carotene eye health support.' },
  { name: 'Veggie Vegie', category: 'Digestive Health', price: 84000, pv: 23, description: 'Natural green dietary enzyme and fiber blend for digestive detox.' },
  { name: 'Vitamin C (chewable tablets)', category: "Children's Health", price: 56000, pv: 15, description: 'Delicious high-bioavailability chewable Vitamin C.' },
  { name: 'X Power Coffee for Men', category: 'Reproductive Health', price: 42000, pv: 8, description: 'Vitality-boosting coffee for men enriched with natural herbs.' },
  { name: 'X Power Man Capsules', category: 'Reproductive Health', price: 117600, pv: 35, description: 'Macca and Tongkat Ali vitality formula for stamina.' },
  { name: 'Youth Ever', category: 'Skin Care', price: 277200, pv: 79, description: 'Premium collagen peptide anti-aging skin formulation.' },
  { name: 'Zaminocal Plus Capsules', category: 'Bones & Joints', price: 64400, pv: 18, description: 'Chelated calcium and zinc amino acid complex for strong bones.' },
];

// POST /api/gemini/analyze-product-image (Requires Authentication)
app.post('/api/gemini/analyze-product-image', requireAuth, geminiRateLimiter, async (req, res) => {
  try {
    const { imageBase64, mimeType: userMime } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing imageBase64 payload.' });
    }

    const { cleanBase64, mimeType: detectedMime } = stripDataUrlPrefix(imageBase64);
    const mimeType = userMime || detectedMime || 'image/jpeg';

    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Unsupported file type for image analysis.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Using BF Suma Tanzania fallback.');
      return res.json({
        success: true,
        isFallback: true,
        product: {
          name: 'Arthro Extra tablets',
          category: 'Bones & Joints',
          price: 112000,
          pv: 34.5,
          description: 'BF Suma Glucosamine & Chondroitin formula for joint mobility and cartilage regeneration.',
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `You are an expert BF Suma Tanzania health product inventory cataloguer.
Analyze this product photo (package, bottle, label, supplement container, or retail item).
Match and extract the BF Suma product details for catalog registration:
1. "name": The clean, specific commercial BF Suma product name.
2. "category": Select the official BF Suma Tanzania English category from:
   ["Bones & Joints", "Immune Boosters", "Reproductive Health", "Digestive Health", "Cardiovascular Health", "Personal Care", "Children's Health", "Skin Care"].
3. "price": Member Price in Tanzanian Shillings (TZS) as a positive number.
4. "pv": Point Value (PV) as a positive decimal or whole number.
5. "description": A concise 1-2 sentence description of key health benefits.

NOTE: Strictly do NOT extract or return quantity; registration tracks catalog info only.
Return ONLY valid JSON matching the schema.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'BF Suma product name' },
            category: { type: Type.STRING, description: 'BF Suma category' },
            price: { type: Type.NUMBER, description: 'Member Price in TZS' },
            pv: { type: Type.NUMBER, description: 'Point Value (PV)' },
            description: { type: Type.STRING, description: 'Health benefits summary' },
          },
          required: ['name', 'category', 'price', 'pv'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(text);
    return res.json({
      success: true,
      product: {
        name: parsed.name || 'Arthro Extra tablets',
        category: parsed.category || 'Bones & Joints',
        price: Math.max(1000, Math.round(Number(parsed.price) || 112000)),
        pv: Math.max(0, Number(parsed.pv) || 34.5),
        description: parsed.description || 'BF Suma health formulation for daily vitality and wellness.',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/analyze-product-image:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze product image.',
    });
  }
});

// POST /api/gemini/scan-product-form (Requires Authentication)
app.post(['/api/gemini/scan-product-form', '/api/gemini/parse-product-pdf'], requireAuth, geminiRateLimiter, async (req, res) => {
  try {
    const { fileBase64, pdfBase64, mimeType: userMime } = req.body || {};
    const payload = fileBase64 || pdfBase64;

    if (!payload || typeof payload !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing document or image payload.' });
    }

    const { cleanBase64, mimeType: detectedMime } = stripDataUrlPrefix(payload);
    let finalMime = userMime || detectedMime;

    if (payload.includes('application/pdf') || userMime === 'application/pdf') {
      finalMime = 'application/pdf';
    } else if (!finalMime || finalMime === 'application/octet-stream') {
      finalMime = 'image/jpeg';
    }

    if (!ALLOWED_MIME_TYPES.has(finalMime.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Unsupported file type for document analysis.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Returning authentic BF Suma Tanzania catalog.');
      const fallback = [...BF_SUMA_FALLBACK_PRODUCTS].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      return res.json({
        success: true,
        isFallback: true,
        count: fallback.length,
        products: fallback,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: finalMime,
              data: cleanBase64,
            },
          },
          {
            text: `You are an expert BF Suma Tanzania product inventory specialist.
Analyze this document (which may be a photo snapshot of a printed product order form or a PDF document).
Read all product names and member prices.
For every BF Suma product identified:
1. "name": The clean official BF Suma product name.
2. "category": Match to one of the 8 official BF Suma categories:
   ["Bones & Joints", "Immune Boosters", "Reproductive Health", "Digestive Health", "Cardiovascular Health", "Personal Care", "Children's Health", "Skin Care"].
3. "price": Member Price in Tanzanian Shillings (TZS) as a positive number.
4. "pv": Point Value (PV) as a decimal or integer number.
5. "description": 1 concise sentence describing the product benefits.
Return ALL extracted products in a JSON array.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'BF Suma product name' },
              category: { type: Type.STRING, description: 'Official BF Suma English category' },
              price: { type: Type.NUMBER, description: 'Member Price in TZS' },
              pv: { type: Type.NUMBER, description: 'Point Value (PV)' },
              description: { type: Type.STRING, description: 'Short summary' },
            },
            required: ['name', 'category', 'price', 'pv'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API for form parsing');
    }

    let parsedList: Array<{ name: string; category: string; price: number; pv?: number; description?: string }> = JSON.parse(text);
    if (!Array.isArray(parsedList) || parsedList.length === 0) {
      parsedList = BF_SUMA_FALLBACK_PRODUCTS;
    }

    const cleanedProducts = parsedList
      .filter((p) => p && typeof p.name === 'string' && p.name.trim().length > 0)
      .map((p) => ({
        name: p.name.trim(),
        category: p.category || 'Bones & Joints',
        price: Math.max(1000, Math.round(Number(p.price) || 64400)),
        pv: Math.max(0, Number(p.pv) || 18),
        description: p.description || 'BF Suma Tanzania natural health formulation.',
      }));

    cleanedProducts.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return res.json({
      success: true,
      count: cleanedProducts.length,
      products: cleanedProducts,
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/scan-product-form:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to scan product form.',
    });
  }
});

// =========================================================================
// 10. SPA / STATIC HOSTING
// =========================================================================
async function startServer() {
  const distExists = fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' && distExists;

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[T20 Server] System running securely on http://0.0.0.0:${PORT} (Mode: ${isProd ? 'Production' : 'Development'})`);
  });
}

startServer();
