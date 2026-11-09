import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../../services/storage';
import { InAppNotification } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { NotificationAudio, IPhoneToneStyle, NotificationAudioMode } from '../../services/notificationAudio';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Package,
  Plus,
  Check,
  X,
  Sliders,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Smartphone,
  Music,
  Radio,
} from 'lucide-react';

interface NotificationCenterProps {
  onNavigateToInventory?: () => void;
  onStockUpdated?: () => void;
}

type NotificationFilter = 'all' | 'reports' | 'shifts' | 'stock';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNavigateToInventory,
  onStockUpdated,
}) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [threshold, setThreshold] = useState<number>(10);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [quickRestockSuccess, setQuickRestockSuccess] = useState<string | null>(null);
  const [notifMode, setNotifMode] = useState<NotificationAudioMode>(() => NotificationAudio.getNotificationMode());
  const [voiceActive, setVoiceActive] = useState<boolean>(() => NotificationAudio.isVoiceEnabled());
  const [iphoneTone, setIphoneTone] = useState<IPhoneToneStyle>(() => NotificationAudio.getIPhoneToneStyle());
  const [playingNotifId, setPlayingNotifId] = useState<string | null>(null);
  const [toneFeedback, setToneFeedback] = useState<string | null>(null);
  const [testStage, setTestStage] = useState<1 | 2 | 3>(3);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleModeChange = (mode: NotificationAudioMode) => {
    setNotifMode(mode);
    NotificationAudio.setNotificationMode(mode);
    setVoiceActive(mode !== 'muted');
    if (mode === 'sound_and_voice') {
      NotificationAudio.playIPhoneTune(iphoneTone);
      setToneFeedback('Mode: Sound + Voice');
    } else if (mode === 'sound_only') {
      NotificationAudio.playIPhoneTune(iphoneTone);
      setToneFeedback('Mode: Sound Only');
    } else if (mode === 'voice_only') {
      NotificationAudio.speak('Voice only alert active.');
      setToneFeedback('Mode: Voice Only');
    } else {
      setToneFeedback('Mode: Muted');
    }
    setTimeout(() => setToneFeedback(null), 2500);
  };

  const handleToneChange = (tone: IPhoneToneStyle) => {
    setIphoneTone(tone);
    NotificationAudio.setIPhoneToneStyle(tone);
    NotificationAudio.playIPhoneTune(tone);
    setToneFeedback(`Switched to iPhone ${tone === 'tritone' ? 'Tri-Tone' : tone === 'chord' ? 'Chord' : 'Ding'}`);
    setTimeout(() => setToneFeedback(null), 2500);
  };

  const handlePlayIPhoneTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    NotificationAudio.playIPhoneTune(iphoneTone);
    setToneFeedback('Playing iPhone Tune...');
    setTimeout(() => setToneFeedback(null), 2500);
  };

  const loadNotifications = () => {
    const role = currentUser?.role || 'staff';
    const notifs = StorageService.getAllNotifications(role);
    const currentThreshold = StorageService.getLowStockThreshold();
    setNotifications(notifs);
    setThreshold(currentThreshold);
  };

  useEffect(() => {
    loadNotifications();

    // Check periodically or when window regains focus
    const interval = setInterval(() => {
      loadNotifications();
      // Periodically check if scheduled shift reminder should trigger
      if (currentUser?.role) {
        NotificationAudio.checkShiftReminders(currentUser.role);
      }
    }, 6000);

    const handleFocus = () => loadNotifications();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.role]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingThreshold(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.urgency === 'critical').length;

  const handleMarkAsRead = (id: string) => {
    StorageService.markNotificationAsRead(id);
    loadNotifications();
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.dismissNotification(id);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleClearAll = () => {
    StorageService.clearAllNotifications();
    loadNotifications();
  };

  const handleQuickRestock = (productId: string, units: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = StorageService.restockProduct(productId, units, currentUser?.username || 'staff');
    if (updated) {
      setQuickRestockSuccess(`+${units} units added to ${updated.name}`);
      setTimeout(() => setQuickRestockSuccess(null), 3000);
      loadNotifications();
      if (onStockUpdated) onStockUpdated();
    }
  };

  const handleThresholdChange = (val: number) => {
    StorageService.setLowStockThreshold(val);
    setThreshold(val);
    setIsEditingThreshold(false);
    loadNotifications();
  };

  const handleToggleVoice = () => {
    const next = !voiceActive;
    NotificationAudio.setVoiceEnabled(next);
    setVoiceActive(next);
  };

  const handlePlayVoice = (notif: InAppNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingNotifId(notif.id);
    NotificationAudio.announce(
      notif.title,
      notif.voiceText || notif.message,
      notif.type === 'report_approved' ? 'success' : notif.type === 'shift_reminder' ? 'reminder' : 'alert'
    );
    setTimeout(() => {
      setPlayingNotifId(null);
    }, 3500);
  };

  const handleTriggerShiftAlert = (shift: 'morning' | 'noon' | 'evening', stage: 1 | 2 | 3 = testStage) => {
    const role = currentUser?.role || 'staff';
    const details = NotificationAudio.triggerManualShiftAlert(shift, stage, role);

    StorageService.addNotification({
      type: 'shift_reminder',
      title: details.title,
      message: details.message,
      voiceText: details.voiceText,
      targetRole: 'all',
      urgency: stage === 3 ? 'warning' : 'info',
    });

    loadNotifications();
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'reports') {
      return (
        n.type === 'report_submitted' ||
        n.type === 'report_approved' ||
        n.type === 'report_changes_requested' ||
        n.type === 'period_ready' ||
        n.type === 'report_feedback'
      );
    }
    if (filter === 'shifts') return n.type === 'shift_reminder';
    if (filter === 'stock') return n.type === 'low_stock' || n.type === 'out_of_stock';
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition-all flex items-center justify-center ${
          isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
            : criticalCount > 0
            ? 'bg-red-50/80 border-red-200 text-red-700 hover:bg-red-100'
            : unreadCount > 0
            ? 'bg-blue-50/90 border-blue-200 text-blue-800 hover:bg-blue-100'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
        title={
          unreadCount > 0
            ? `${unreadCount} unread operational notifications & voice alerts`
            : 'System Notifications & Voice Alerts'
        }
        aria-label="Notification Center"
      >
        <Bell className="w-4 h-4" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex items-center justify-center text-[10px] font-black font-mono rounded-full px-1.5 min-w-[18px] h-[18px] shadow-sm text-white ${
              criticalCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
            }`}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Notification Center */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold tracking-tight">Notification Center</h4>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30">
                    Voice & Audits
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {unreadCount === 0
                    ? 'All operational reports and inventory up to date'
                    : `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Voice Sound Toggle */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-1.5 rounded-lg border transition-colors ${
                  voiceActive
                    ? 'bg-blue-500/30 border-blue-400/40 text-blue-300 hover:bg-blue-500/40'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title={voiceActive ? 'Voice announcements active. Click to mute.' : 'Voice muted. Click to enable.'}
              >
                {voiceActive ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsEditingThreshold(!isEditingThreshold)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Stock alert settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Alert Mode (Sound vs Voice) & iPhone Notification Tune Selector */}
          <div className="px-4 py-2.5 bg-slate-800/95 text-white border-b border-slate-700/80 text-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Delivery Mode Choice: Sound vs Voice */}
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-200">Mode:</span>
                <select
                  value={notifMode}
                  onChange={(e) => handleModeChange(e.target.value as NotificationAudioMode)}
                  className="bg-slate-900 text-blue-300 font-bold text-[11px] px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                  title="Choose notification delivery mode: Sound + Voice, Sound Only, Voice Only, or Muted"
                >
                  <option value="sound_and_voice">Sound + Voice</option>
                  <option value="sound_only">Sound Only</option>
                  <option value="voice_only">Voice Only</option>
                  <option value="muted">Muted (Silent)</option>
                </select>
              </div>

              {/* iPhone Tune Choice */}
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-200">Tune:</span>
                <select
                  value={iphoneTone}
                  onChange={(e) => handleToneChange(e.target.value as IPhoneToneStyle)}
                  className="bg-slate-900 text-emerald-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                  title="Select iPhone alert tune style"
                >
                  <option value="tritone">Tri-Tone (Classic iPhone)</option>
                  <option value="chord">Chord (iOS Arpeggio)</option>
                  <option value="ding">Ding (iOS Glass Bell)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {toneFeedback && (
                <span className="text-[10px] font-mono text-emerald-400 font-semibold animate-pulse hidden sm:inline">
                  {toneFeedback}
                </span>
              )}
              <button
                type="button"
                onClick={handlePlayIPhoneTest}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs shrink-0"
                title="Play authentic iPhone notification tune"
              >
                <Music className="w-3 h-3 text-white" />
                <span>Play iPhone Tune</span>
              </button>
            </div>
          </div>

          {/* 3x Daily Shift Reminder Control Strip (Every 15 Minutes, 3rd Alert has Assistant Reminder) */}
          <div className="px-4 py-2.5 bg-slate-800 text-white border-b border-slate-700 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>3x Daily Shift Alerts (Every 15 Min):</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                Morning · Noon · Evening
              </span>
            </div>

            {/* Stage Selector (1st, 2nd, or 3rd Notification) */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTestStage(1)}
                className={`flex-1 py-1 px-1 rounded text-[10px] font-bold transition-all text-center ${
                  testStage === 1
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="1st Notification: Shift start"
              >
                1st Alert (:00)
              </button>
              <button
                type="button"
                onClick={() => setTestStage(2)}
                className={`flex-1 py-1 px-1 rounded text-[10px] font-bold transition-all text-center ${
                  testStage === 2
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="2nd Notification: 15 minutes after start"
              >
                2nd Alert (+15m)
              </button>
              <button
                type="button"
                onClick={() => setTestStage(3)}
                className={`flex-1 py-1 px-1 rounded text-[10px] font-bold transition-all text-center ${
                  testStage === 3
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-400 hover:text-white'
                }`}
                title="3rd Notification: Assistant review & submit reminder"
              >
                ★ 3rd Alert (+30m)
              </button>
            </div>

            <div className="text-[10px] text-slate-300 bg-slate-900/40 p-1.5 rounded border border-slate-700/60 leading-tight">
              {testStage === 3 ? (
                <span className="text-emerald-300 font-medium">
                  📢 <strong>3rd Alert Voice:</strong> "As the T20 Server Assistant, I remind you to review the report and submit it."
                </span>
              ) : testStage === 2 ? (
                <span>⏱️ <strong>2nd Alert Voice:</strong> 15-minute operational follow-up to reconcile tallies & kits.</span>
              ) : (
                <span>🔔 <strong>1st Alert Voice:</strong> Shift opening operational initialization.</span>
              )}
            </div>

            {/* Shift Trigger Buttons */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleTriggerShiftAlert('morning', testStage)}
                className="flex-1 py-1.5 px-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-semibold text-slate-100 transition-colors text-center border border-slate-600"
                title={`Trigger Morning Alert (${testStage} of 3)`}
              >
                ☀️ Morning
              </button>
              <button
                type="button"
                onClick={() => handleTriggerShiftAlert('noon', testStage)}
                className="flex-1 py-1.5 px-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-semibold text-slate-100 transition-colors text-center border border-slate-600"
                title={`Trigger Noon Alert (${testStage} of 3)`}
              >
                🌤️ Noon
              </button>
              <button
                type="button"
                onClick={() => handleTriggerShiftAlert('evening', testStage)}
                className="flex-1 py-1.5 px-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-semibold text-slate-100 transition-colors text-center border border-slate-600"
                title={`Trigger Evening Alert (${testStage} of 3)`}
              >
                🌙 Evening
              </button>
            </div>
          </div>

          {/* Threshold Configuration Drawer */}
          {isEditingThreshold && (
            <div className="p-3 bg-slate-800 text-white border-b border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Low-Stock Alert Threshold:</span>
                <span className="font-mono font-bold text-amber-400">≤ {threshold} units</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 20].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleThresholdChange(lvl)}
                    className={`flex-1 py-1 px-2 rounded font-mono font-bold text-xs transition-colors ${
                      threshold === lvl
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    ≤ {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs overflow-x-auto">
            {(
              [
                { id: 'all', label: `All (${notifications.length})` },
                { id: 'reports', label: 'Reports & Audits' },
                { id: 'shifts', label: '3x Shift Reminders' },
                { id: 'stock', label: 'Stock Alerts' },
              ] as { id: NotificationFilter; label: string }[]
            ).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  filter === t.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Feedback message for quick restock */}
          {quickRestockSuccess && (
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{quickRestockSuccess}</span>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">No Notifications</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px] mx-auto">
                    All report reviews, approvals, and inventory levels are completely up to date.
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const isCritical = notif.urgency === 'critical';
                const isApproved = notif.type === 'report_approved';
                const isSubmitted = notif.type === 'report_submitted';
                const isShift = notif.type === 'shift_reminder';
                const isPeriodReady = notif.type === 'period_ready';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id)}
                    className={`p-3.5 hover:bg-slate-50/80 transition-colors relative cursor-pointer ${
                      !notif.read
                        ? isCritical
                          ? 'bg-red-50/40'
                          : isApproved
                          ? 'bg-emerald-50/30'
                          : isSubmitted
                          ? 'bg-blue-50/30'
                          : isShift
                          ? 'bg-purple-50/30'
                          : 'bg-amber-50/30'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                            isCritical
                              ? 'bg-red-100 text-red-700'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-700'
                              : isSubmitted
                              ? 'bg-blue-100 text-blue-700'
                              : isShift
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isCritical ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : isApproved ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isSubmitted ? (
                            <FileCheck className="w-4 h-4" />
                          ) : isShift ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded font-mono ${
                                isCritical
                                  ? 'bg-red-100 text-red-800'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isSubmitted
                                  ? 'bg-blue-100 text-blue-800'
                                  : isShift
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {notif.type.replace('_', ' ')}
                            </span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {notif.timestamp.slice(11, 16)}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-slate-900 mt-1">
                            {notif.title}
                          </h5>

                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {/* Voice Play Button */}
                            <button
                              type="button"
                              onClick={(e) => handlePlayVoice(notif, e)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                                playingNotifId === notif.id
                                  ? 'bg-blue-600 text-white animate-pulse'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title="Re-play audio voice notification"
                            >
                              <Volume2 className="w-3 h-3 text-blue-600" />
                              <span>{playingNotifId === notif.id ? 'Speaking...' : 'Play Voice'}</span>
                            </button>

                            {/* Quick Restock Buttons for stock alerts */}
                            {notif.productId && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickRestock(notif.productId!, 5, e)}
                                  className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors flex items-center gap-0.5"
                                  title="Add 5 units directly"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Restock +5</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickRestock(notif.productId!, 10, e)}
                                  className="px-2 py-0.5 text-[10px] font-bold font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-0.5"
                                  title="Add 10 units directly"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>+10</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(notif.id, e)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors shrink-0"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-slate-600 hover:text-slate-900 font-semibold text-[11px]"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-slate-400 hover:text-red-600 text-[11px]"
                >
                  Clear all
                </button>
              )}
            </div>

            {onNavigateToInventory && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToInventory();
                  setIsOpen(false);
                }}
                className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 text-[11px]"
              >
                <span>Inventory Catalog</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
