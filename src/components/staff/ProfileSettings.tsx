import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  User,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  History,
  Lock,
  AtSign,
  UserCheck,
  FileText,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();

  // Form states
  const [displayName, setDisplayName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!currentUser) return null;

  // Retrieve user's personal audit activity
  const allLogs = StorageService.getAuditLogs();
  const userLogs = allLogs.filter(
    (l) => l.actor === currentUser.username || l.actor === username
  ).slice(0, 5);

  // Compute password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'None', score: 0, color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500' };
    if (score === 2) return { label: 'Moderate', score: 2, color: 'bg-amber-500' };
    if (score === 3) return { label: 'Good', score: 3, color: 'bg-blue-500' };
    return { label: 'Strong', score: 4, color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase();

    // 1. Validate Display Name
    if (!cleanName || cleanName.length < 2) {
      setStatusMessage({
        type: 'error',
        text: 'Display Name must be at least 2 characters long.',
      });
      return;
    }

    // 2. Validate Username format
    if (!cleanUsername || cleanUsername.length < 3) {
      setStatusMessage({
        type: 'error',
        text: 'Username must be at least 3 characters long.',
      });
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      setStatusMessage({
        type: 'error',
        text: 'Username can only contain letters, numbers, dots (.), underscores (_), and hyphens (-).',
      });
      return;
    }

    // 3. Password Verification (if user is changing password)
    if (newPassword) {
      if (!currentPasswordInput) {
        setStatusMessage({
          type: 'error',
          text: 'Please enter your current password to authorize changing your password.',
        });
        return;
      }

      if (newPassword.length < 5) {
        setStatusMessage({
          type: 'error',
          text: 'New password must be at least 5 characters long.',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        setStatusMessage({
          type: 'error',
          text: 'New password and confirmation password do not match.',
        });
        return;
      }
    }

    setIsSubmitting(true);

    const result = await updateProfile({
      fullName: cleanName,
      username: cleanUsername,
      currentPassword: currentPasswordInput ? currentPasswordInput : undefined,
      password: newPassword ? newPassword : undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: 'Your profile settings and credentials have been updated securely.',
      });
      // Clear password fields for security
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Failed to update credentials. Please check your entries.',
      });
    }
  };

  const handleResetForm = () => {
    setDisplayName(currentUser.fullName);
    setUsername(currentUser.username);
    setCurrentPasswordInput('');
    setNewPassword('');
    setConfirmPassword('');
    setStatusMessage(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          )}
          <div className="text-sm font-semibold">{statusMessage.text}</div>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white flex items-center justify-center text-xl font-black uppercase shadow-md">
              {currentUser.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {currentUser.fullName}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Active</span>
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                @{currentUser.username} · {currentUser.email}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  <Shield className="w-3 h-3 text-blue-600" />
                  Role: Operations Staff
                </span>
                <span>·</span>
                <span className="text-[11px]">
                  ID: <code className="font-mono text-slate-700">{currentUser.id}</code>
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 sm:text-right">
            <div>
              Account Created:{' '}
              <strong className="text-slate-800 font-medium">
                {new Date(currentUser.createdAt).toLocaleDateString()}
              </strong>
            </div>
            {currentUser.lastLoginAt && (
              <div>
                Last Session:{' '}
                <strong className="text-slate-800 font-medium font-mono text-[11px]">
                  {new Date(currentUser.lastLoginAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Display Name & General Information */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>1. Personal & Display Identity</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update how your name appears on daily operational reports, clinical diagnostic records, and managerial review receipts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Display Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Neema Mushi"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                This name is attached to daily shift reports submitted to the Executive Manager.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Work Email
              </label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Email is verified and securely bound to this workspace account.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Username & System Handle */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AtSign className="w-4 h-4 text-emerald-600" />
                <span>2. Workspace Login Username</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your unique login handle used to access the T20 Server Staff Workspace.
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Login Username *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-400">
                @
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. neema.staff"
                className="w-full pl-8 pr-3 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 mt-2 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Data Consistency Guarantee:</span>
              </div>
              <p>
                When you update your username, the T20 Server automatically links all your past daily reports, multi-period filings, and audit records to your new handle without losing historical data.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Password & Security */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-600" />
                <span>3. Password & Security Credentials</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Leave these fields blank if you do not wish to change your current password.
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-xl">
            {/* Current Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Current Password (Required to change password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password & Confirmation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 5 characters"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Strength:</span>
                      <span className="font-semibold text-slate-700">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 rounded-full transition-colors ${
                            strength.score >= step ? strength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {confirmPassword && (
                  <div className="mt-1.5 text-[11px] flex items-center gap-1 font-medium">
                    {newPassword === confirmPassword ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Passwords match</span>
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Passwords do not match</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard Changes</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile Settings'}</span>
          </button>
        </div>
      </form>

      {/* Section 4: Recent Security & Account Activity */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <span>Recent Security & Activity History</span>
        </h3>
        <p className="text-xs text-slate-500">
          Chronological record of account events and workspace actions performed under your credentials.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400">
                    No recent activity recorded for this session.
                  </td>
                </tr>
              ) : (
                userLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
