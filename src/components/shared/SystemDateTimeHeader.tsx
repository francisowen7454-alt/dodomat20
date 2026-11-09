import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Volume2, VolumeX, Sparkles, Smartphone, Music, Check, Radio, Zap, RefreshCw } from 'lucide-react';
import { NotificationAudio, NotificationAudioMode } from '../../services/notificationAudio';
import { StorageService } from '../../services/storage';

interface SystemDateTimeHeaderProps {
  currentDate: string;
  onDateChange?: (newDate: string) => void;
  roleLabel?: string;
}

export const SystemDateTimeHeader: React.FC<SystemDateTimeHeaderProps> = ({
  currentDate,
  onDateChange,
  roleLabel,
}) => {
  const [liveTime, setLiveTime] = useState<string>('');
  const [notifMode, setNotifMode] = useState<NotificationAudioMode>(() => NotificationAudio.getNotificationMode());
  const [audioFeedback, setAudioFeedback] = useState<string | null>(null);
  const [isAuto, setIsAuto] = useState<boolean>(() => StorageService.isAutoDateEnabled());
  const [todayStr, setTodayStr] = useState<string>(() => StorageService.getTodayString());

  // Update clock every second and check for automatic day rollover
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Check if day changed
      const realToday = StorageService.getTodayString();
      if (realToday !== todayStr) {
        setTodayStr(realToday);
      }

      // Check if automatic rollover needed
      const check = StorageService.checkAndAutoAdvanceDate();
      if (check.changed) {
        if (onDateChange) onDateChange(check.newDate);
        setAudioFeedback(`Date automatically advanced: ${check.newDate}`);
        setTimeout(() => setAudioFeedback(null), 4000);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Also check on tab focus/visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const check = StorageService.checkAndAutoAdvanceDate();
        if (check.changed && onDateChange) {
          onDateChange(check.newDate);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Listen to global date change events
    const handleGlobalDateChange = (e: any) => {
      const detail = e.detail;
      if (detail && typeof detail === 'object') {
        setIsAuto(detail.isAuto);
        if (detail.date && onDateChange && detail.date !== currentDate) {
          onDateChange(detail.date);
        }
      }
    };
    window.addEventListener('t20-system-date-changed', handleGlobalDateChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('t20-system-date-changed', handleGlobalDateChange);
    };
  }, [todayStr, currentDate, onDateChange]);

  const handleResetToToday = () => {
    const today = StorageService.resetDateToToday();
    setIsAuto(true);
    if (onDateChange) onDateChange(today);
    setAudioFeedback(`System date reset to Today (${today})`);
    setTimeout(() => setAudioFeedback(null), 3000);
  };

  const handleManualDateChange = (newDate: string) => {
    if (!newDate) return;
    const isActuallyToday = newDate === StorageService.getTodayString();
    StorageService.setSystemDate(newDate, !isActuallyToday);
    setIsAuto(isActuallyToday);
    if (onDateChange) onDateChange(newDate);
  };

  const handleModeChange = (mode: NotificationAudioMode) => {
    NotificationAudio.setNotificationMode(mode);
    setNotifMode(mode);
    if (mode === 'sound_and_voice') {
      NotificationAudio.playIPhoneTune();
      setAudioFeedback('Sound + Voice Active');
    } else if (mode === 'sound_only') {
      NotificationAudio.playIPhoneTune();
      setAudioFeedback('Sound Only Active');
    } else if (mode === 'voice_only') {
      NotificationAudio.speak('Voice only active.');
      setAudioFeedback('Voice Only Active');
    } else {
      setAudioFeedback('Notifications Muted');
    }
    setTimeout(() => setAudioFeedback(null), 3000);
  };

  const handlePlayIPhoneTune = () => {
    NotificationAudio.playIPhoneTune();
    setAudioFeedback('Playing iPhone Tune...');
    setTimeout(() => setAudioFeedback(null), 3000);
  };

  const handleTestVoice = () => {
    NotificationAudio.announce(
      'T20 Server Assistant Review Reminder',
      'As the T20 Server Assistant, I remind you to review the report and submit it.',
      'alert'
    );
    setAudioFeedback('As the T20 Server Assistant...');
    setTimeout(() => setAudioFeedback(null), 3500);
  };

  // Format readable date
  const formattedDate = (() => {
    try {
      const [year, month, day] = currentDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return currentDate;
    }
  })();

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Unified System Date & Live Clock */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          {/* Synchronized System Date */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold leading-tight">
                  Unified Operational Date
                </span>
                {currentDate === todayStr ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Current Date (Today - Automatic)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <span>Historical / Custom Date (Manual)</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-mono font-bold text-white text-xs sm:text-sm">
                  {currentDate}
                </span>
                <span className="text-slate-400 hidden md:inline">({formattedDate})</span>
                {onDateChange && (
                  <input
                    type="date"
                    value={currentDate}
                    onChange={(e) => handleManualDateChange(e.target.value)}
                    className="ml-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    title="Change unified operational date for all reporting forms"
                  />
                )}
                {currentDate !== todayStr && (
                  <button
                    type="button"
                    onClick={handleResetToToday}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
                    title="Reset to today's date automatically"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Set Today ({todayStr})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real-Time Live Clock */}
          <div className="flex items-center gap-2 pl-3 sm:pl-6 border-l border-slate-800">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Live System Time
                </span>
              </div>
              <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm mt-0.5 tabular-nums">
                {liveTime || '--:--:--'}
              </div>
            </div>
          </div>

          {roleLabel && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Portal: <strong className="text-white">{roleLabel}</strong></span>
            </div>
          )}
        </div>

        {/* Voice & Sound Notification Mode Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {audioFeedback && (
            <span className="text-[11px] font-mono text-emerald-400 font-semibold animate-pulse hidden sm:inline">
              {audioFeedback}
            </span>
          )}

          {/* Delivery Mode Selector (Sound vs Voice vs Both vs Muted) */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold hidden sm:inline">Alert:</span>
            <select
              value={notifMode}
              onChange={(e) => handleModeChange(e.target.value as NotificationAudioMode)}
              className="bg-slate-900 text-blue-300 font-bold text-[11px] px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
              title="Choose notification delivery mode: Sound + Voice, Sound Only, Voice Only, or Muted"
            >
              <option value="sound_and_voice">Sound + Voice</option>
              <option value="sound_only">Sound Only (Chime)</option>
              <option value="voice_only">Voice Only (Speech)</option>
              <option value="muted">Muted (Silent)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handlePlayIPhoneTune}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 transition-colors text-[11px] font-bold"
            title="Play authentic Apple iPhone notification chime"
          >
            <Smartphone className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">iPhone Tune</span>
          </button>

          <button
            type="button"
            onClick={handleTestVoice}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors text-[11px] font-semibold"
            title="Preview voice announcement"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Test Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
};
