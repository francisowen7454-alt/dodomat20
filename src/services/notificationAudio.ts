/**
 * Audio and Voice Notification Service for T20 Server
 * Provides harmonic chime audio via Web Audio API and natural voice synthesis via Web Speech API.
 * Supports scheduled thrice-a-day shift alerts for Staff and Manager.
 */

export type IPhoneToneStyle = 'tritone' | 'chord' | 'ding';
export type ShiftPeriod = 'morning' | 'noon' | 'evening';
export type ShiftStage = 1 | 2 | 3;
export type NotificationAudioMode = 'sound_and_voice' | 'sound_only' | 'voice_only' | 'muted';

class NotificationAudioService {
  private audioCtx: AudioContext | null = null;
  private voiceEnabled = true;
  private notificationMode: NotificationAudioMode = 'sound_only';
  private iphoneToneStyle: IPhoneToneStyle = 'tritone';
  private lastAnnouncedText = '';
  private lastAnnounceTime = 0;

  constructor() {
    // Read user preference from localStorage: Default is sound_only (NO spoken voice)
    const savedMode = localStorage.getItem('t20_notification_mode') as NotificationAudioMode;
    if (savedMode && ['sound_and_voice', 'sound_only', 'voice_only', 'muted'].includes(savedMode)) {
      this.notificationMode = savedMode;
      this.voiceEnabled = savedMode === 'sound_and_voice' || savedMode === 'voice_only';
    } else {
      // Default to sound only as per user request: "toa sauti ya mtu akiongea wawekee maneno na sound"
      this.notificationMode = 'sound_only';
      this.voiceEnabled = false;
      localStorage.setItem('t20_notification_mode', 'sound_only');
    }

    const savedTone = localStorage.getItem('t20_iphone_tone') as IPhoneToneStyle;
    if (savedTone && ['tritone', 'chord', 'ding'].includes(savedTone)) {
      this.iphoneToneStyle = savedTone;
    }
  }

  public getNotificationMode(): NotificationAudioMode {
    return this.notificationMode;
  }

  public setNotificationMode(mode: NotificationAudioMode): void {
    this.notificationMode = mode;
    this.voiceEnabled = mode !== 'muted';
    localStorage.setItem('t20_notification_mode', mode);
    localStorage.setItem('t20_voice_enabled', mode !== 'muted' ? 'true' : 'false');
  }

  public isVoiceEnabled(): boolean {
    return this.notificationMode !== 'muted' && this.notificationMode !== 'sound_only';
  }

  public setVoiceEnabled(enabled: boolean): void {
    if (enabled) {
      this.setNotificationMode('sound_and_voice');
    } else {
      this.setNotificationMode('muted');
    }
  }

  public getIPhoneToneStyle(): IPhoneToneStyle {
    return this.iphoneToneStyle;
  }

  public setIPhoneToneStyle(style: IPhoneToneStyle): void {
    this.iphoneToneStyle = style;
    localStorage.setItem('t20_iphone_tone', style);
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Synthesize the signature Apple iPhone "Tri-Tone" notification alert
   * Notes: G5 (783.99 Hz) -> C6 (1046.50 Hz) -> E6 (1318.51 Hz)
   * Timbre: Pure sine fundamental + triangle harmonic transient for crisp mallet attack.
   */
  private playIPhoneTriTone(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: 783.99, start: 0, dur: 0.16, gain: 0.28 },
      { freq: 1046.50, start: 0.12, dur: 0.16, gain: 0.28 },
      { freq: 1318.51, start: 0.24, dur: 0.44, gain: 0.32 },
    ];

    notes.forEach(({ freq, start, dur, gain: maxGain }) => {
      const noteStart = now + start;
      const noteEnd = noteStart + dur;

      // 1. Primary fundamental oscillator (Clean Sine wave)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, noteStart);

      // Percussive iOS envelope (3ms strike, fast initial fall, then smooth ringing decay)
      gain1.gain.setValueAtTime(0.0001, noteStart);
      gain1.gain.linearRampToValueAtTime(maxGain, noteStart + 0.003);
      gain1.gain.exponentialRampToValueAtTime(maxGain * 0.42, noteStart + 0.06);
      gain1.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(noteStart);
      osc1.stop(noteEnd);

      // 2. Harmonic transient overtone (Simulates the glass/marimba mallet strike of iOS)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.0, noteStart);

      gain2.gain.setValueAtTime(0.0001, noteStart);
      gain2.gain.linearRampToValueAtTime(maxGain * 0.25, noteStart + 0.002);
      gain2.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.045);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(noteStart);
      osc2.stop(noteStart + 0.05);
    });
  }

  /**
   * Synthesize the modern Apple iPhone "Chord" notification alert
   * Rapid arpeggiated glass harp chord: D5 -> F#5 -> A5 -> D6
   */
  private playIPhoneChord(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, dur: 0.28, gain: 0.22 },
      { freq: 739.99, start: 0.05, dur: 0.28, gain: 0.22 },
      { freq: 880.00, start: 0.10, dur: 0.32, gain: 0.24 },
      { freq: 1174.66, start: 0.15, dur: 0.48, gain: 0.28 },
    ];

    notes.forEach(({ freq, start, dur, gain: maxGain }) => {
      const noteStart = now + start;
      const noteEnd = noteStart + dur;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.linearRampToValueAtTime(maxGain, noteStart + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteEnd);
    });
  }

  /**
   * Synthesize the Apple iPhone "Ding" glass bell notification alert
   */
  private playIPhoneDing(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318.51, now); // E6 high bell

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.58);
  }

  /**
   * Play the iPhone notification tune based on user preference or requested style
   */
  public playIPhoneTune(style: IPhoneToneStyle = this.iphoneToneStyle): void {
    if (this.notificationMode === 'voice_only' || this.notificationMode === 'muted') return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (style === 'chord') {
        this.playIPhoneChord(ctx);
      } else if (style === 'ding') {
        this.playIPhoneDing(ctx);
      } else {
        // Default: Iconic Apple iPhone Tri-Tone
        this.playIPhoneTriTone(ctx);
      }
    } catch {
      // AudioContext not supported or blocked
    }
  }

  /**
   * Distinct tone for Manager Dashboard when a new report is submitted
   */
  public playManagerReportAlert(): void {
    if (this.notificationMode === 'voice_only' || this.notificationMode === 'muted') return;
    this.playIPhoneTune('chord');
  }

  /**
   * Distinct tone for Staff Dashboard when reports are ready or approved.
   * Plays three times (3x chime) per staff notification specification.
   */
  public playStaffReportAlert(repeatCount = 3): void {
    if (this.notificationMode === 'voice_only' || this.notificationMode === 'muted') return;
    for (let rep = 0; rep < repeatCount; rep++) {
      setTimeout(() => {
        this.playIPhoneTune('ding');
      }, rep * 380);
    }
  }

  /**
   * Legacy alias: plays the iPhone tune
   */
  public playChime(type: 'success' | 'alert' | 'reminder' | 'warning' = 'alert'): void {
    if (this.notificationMode === 'voice_only' || this.notificationMode === 'muted') return;
    if (type === 'success') {
      this.playIPhoneTune('chord');
    } else {
      this.playIPhoneTune(this.iphoneToneStyle);
    }
  }

  /**
   * Speak announcement using Web Speech API (English voice)
   */
  public speak(text: string, onEnd?: () => void): void {
    if (this.notificationMode === 'sound_only' || this.notificationMode === 'muted') {
      if (onEnd) onEnd();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    // Debounce exact duplicates within 3 seconds
    const now = Date.now();
    if (this.lastAnnouncedText === text && now - this.lastAnnounceTime < 3000) {
      if (onEnd) onEnd();
      return;
    }
    this.lastAnnouncedText = text;
    this.lastAnnounceTime = now;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      // Pick the best natural English voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice =
        voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira'))) ||
        voices.find(v => v.lang.startsWith('en')) ||
        null;

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      if (onEnd) {
        utterance.onend = () => onEnd();
        utterance.onerror = () => onEnd();
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnd) onEnd();
    }
  }

  /**
   * Play chime, then speak the voice notification based on user's notificationMode
   */
  public announce(
    message: string,
    voiceText?: string,
    type: 'success' | 'alert' | 'reminder' | 'warning' = 'alert'
  ): void {
    if (this.notificationMode === 'muted') return;

    const shouldPlaySound = this.notificationMode === 'sound_and_voice' || this.notificationMode === 'sound_only';
    const shouldSpeakVoice = this.notificationMode === 'sound_and_voice' || this.notificationMode === 'voice_only';

    if (shouldPlaySound) {
      this.playChime(type);
    }

    if (shouldSpeakVoice) {
      const textToSpeak = voiceText || message;
      const delay = shouldPlaySound ? 420 : 50;
      setTimeout(() => {
        this.speak(textToSpeak);
      }, delay);
    }
  }

  /**
   * Check and trigger scheduled shift notifications:
   * 3 Shifts Daily: Morning (09:00), Noon/Midday (14:00), Evening (18:00)
   * Each shift triggers 3 alerts spaced every 15 minutes:
   * - Alert 1: Shift opening (:00 - :14)
   * - Alert 2: Follow-up check (:15 - :29)
   * - Alert 3: Final review reminder (:30 - :59):
   *   "As the T20 Server Assistant, I remind you to review the report and submit it."
   */
  public checkShiftReminders(role: 'staff' | 'manager'): {
    triggered: boolean;
    shift?: ShiftPeriod;
    stage?: ShiftStage;
    title?: string;
    message?: string;
  } {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayDateStr = now.toISOString().slice(0, 10);

    let activeShift: ShiftPeriod | null = null;
    if (currentHour >= 8 && currentHour < 12) {
      activeShift = 'morning';
    } else if (currentHour >= 12 && currentHour < 16) {
      activeShift = 'noon';
    } else if (currentHour >= 17 && currentHour < 21) {
      activeShift = 'evening';
    }

    if (!activeShift) {
      return { triggered: false };
    }

    // Determine 15-minute stage (Alert 1, Alert 2, or Alert 3)
    let stage: ShiftStage = 1;
    if (currentMinute >= 30) {
      stage = 3;
    } else if (currentMinute >= 15) {
      stage = 2;
    } else {
      stage = 1;
    }

    const storageKey = `t20_shift_alert_${todayDateStr}_${activeShift}_stage${stage}_${role}`;
    const alreadyAlerted = localStorage.getItem(storageKey);
    if (alreadyAlerted) {
      return { triggered: false };
    }

    // Mark stage as alerted
    localStorage.setItem(storageKey, 'true');

    const details = this.getShiftDetails(activeShift, stage, role);
    this.announce(details.title, details.voiceText, 'reminder');

    return {
      triggered: true,
      shift: activeShift,
      stage,
      title: details.title,
      message: details.message,
    };
  }

  /**
   * Manual trigger / simulation of shift alert stages (for instant testing)
   */
  public triggerManualShiftAlert(
    shift: ShiftPeriod | 'afternoon',
    stage: ShiftStage = 3,
    role: 'staff' | 'manager' = 'staff'
  ): { title: string; message: string; voiceText: string; stage: ShiftStage } {
    const normalizedShift: ShiftPeriod = shift === 'afternoon' ? 'noon' : shift;
    const details = this.getShiftDetails(normalizedShift, stage, role);
    this.announce(details.title, details.voiceText, 'reminder');
    return { ...details, stage };
  }

  public getShiftDetails(
    shift: ShiftPeriod | 'afternoon',
    stage: ShiftStage = 3,
    role: 'staff' | 'manager' = 'staff'
  ): { title: string; message: string; voiceText: string } {
    const normalizedShift: ShiftPeriod = shift === 'afternoon' ? 'noon' : shift;

    if (role === 'manager') {
      if (normalizedShift === 'morning') {
        if (stage === 1) {
          return {
            title: 'Morning Executive Sync (Alert 1 of 3: Opening)',
            message: 'Good morning Manager. Opening shift initialized. Review overnight reports and staff registers.',
            voiceText: 'Attention Manager: Morning shift operations have started. Please verify overnight submissions and registers.',
          };
        } else if (stage === 2) {
          return {
            title: 'Morning Executive Follow-Up (Alert 2 of 3: +15 Min)',
            message: '15-minute follow-up: Check morning staff activity and patient diagnostic queue.',
            voiceText: 'Fifteen-minute morning follow-up for Manager: Staff activity and diagnostic queues are active.',
          };
        } else {
          return {
            title: 'T20 Server Assistant Review Reminder (Alert 3 of 3: Final)',
            message: 'As the T20 Server Assistant, I remind you to review the report and submit it. Staff morning operational submissions require executive verification.',
            voiceText: 'As the T20 Server Assistant, I remind you to review the report and submit it. Morning operational records from staff are ready for executive review.',
          };
        }
      } else if (normalizedShift === 'noon') {
        if (stage === 1) {
          return {
            title: 'Midday Operations Review (Alert 1 of 3: Sync)',
            message: 'Midday operations sync. Daily sales and diagnostic tests are ready for executive verification.',
            voiceText: 'Attention Manager: Midday operations review. Daily sales and diagnostic tests are ready for executive verification.',
          };
        } else if (stage === 2) {
          return {
            title: 'Midday Operations Follow-Up (Alert 2 of 3: +15 Min)',
            message: '15-minute follow-up: Verify cash reconciliation vouchers and distributor kits.',
            voiceText: 'Fifteen-minute midday follow-up for Manager: Review diagnostic tallies and member kit registrations.',
          };
        } else {
          return {
            title: 'T20 Server Assistant Review Reminder (Alert 3 of 3: Final)',
            message: 'As the T20 Server Assistant, I remind you to review the report and submit it. Midday sales logs and clinical diagnostics await audit verification.',
            voiceText: 'As the T20 Server Assistant, I remind you to review the report and submit it. Midday sales logs and clinical test counts await executive verification.',
          };
        }
      } else {
        // Evening
        if (stage === 1) {
          return {
            title: 'Evening Settlement & Audit Close (Alert 1 of 3)',
            message: 'Evening shift close. Daily records require managerial audit remarks and formal approval.',
            voiceText: 'Attention Manager: Evening shift settlement. Please audit completed reports and dispatch managerial approval.',
          };
        } else if (stage === 2) {
          return {
            title: 'Evening Settlement Follow-Up (Alert 2 of 3: +15 Min)',
            message: '15-minute follow-up: Daily ledger and compiled period figures ready for sign-off.',
            voiceText: 'Fifteen-minute evening closeout follow-up: Operational ledgers and period figures are ready for sign-off.',
          };
        } else {
          return {
            title: 'T20 Server Assistant Review Reminder (Alert 3 of 3: Final)',
            message: 'As the T20 Server Assistant, I remind you to review the report and submit it. All completed daily and period reports require managerial approval.',
            voiceText: 'As the T20 Server Assistant, I remind you to review the report and submit it. All completed daily and multi-period reports require managerial approval.',
          };
        }
      }
    } else {
      // Staff Role
      if (normalizedShift === 'morning') {
        if (stage === 1) {
          return {
            title: 'Morning Shift Operations (Alert 1 of 3: Opening)',
            message: 'Good morning. Synchronize registered product stock, member kits, and begin recording clinical diagnostics.',
            voiceText: 'Attention Staff: Morning operational sync. Please verify diagnostic patient registers and morning product inventory.',
          };
        } else if (stage === 2) {
          return {
            title: 'Morning Operations Follow-Up (Alert 2 of 3: +15 Min)',
            message: '15-minute follow-up: Verify inventory stock, clinical testing queues, and member kit registrations.',
            voiceText: 'Fifteen-minute morning follow-up: Verify product stock levels, clinical testing queues, and member kit registrations.',
          };
        } else {
          return {
            title: 'T20 Server Assistant Review Reminder (Alert 3 of 3: Final)',
            message: 'As the T20 Server Assistant, I remind you to review the report and submit it. Morning operational records must be verified.',
            voiceText: 'As the T20 Server Assistant, I remind you to review the report and submit it. Morning operational records and clinical diagnostic tallies must be reviewed and submitted.',
          };
        }
      } else if (normalizedShift === 'noon') {
        if (stage === 1) {
          return {
            title: 'Midday Operations Check (Alert 1 of 3: Midday Sync)',
            message: 'Midday operational check. Reconcile cash sales, diagnostic testing tallies, and member kit registrations.',
            voiceText: 'Attention Staff: Afternoon operational review. Please reconcile daily sales transactions and registered member kits.',
          };
        } else if (stage === 2) {
          return {
            title: 'Midday Operations Follow-Up (Alert 2 of 3: +15 Min)',
            message: '15-minute follow-up: Ensure all diagnostic analyzers and sales vouchers are accounted for.',
            voiceText: 'Fifteen-minute midday follow-up: Check that all diagnostic analyzer counts and sales vouchers match.',
          };
        } else {
          return {
            title: 'T20 Server Assistant Review Reminder (Alert 3 of 3: Final)',
            message: 'As the T20 Server Assistant, I remind you to review the report and submit it. Midday figures are prepared for submission.',
            voiceText: 'As the T20 Server Assistant, I remind you to review the report and submit it. Please verify midday product sales and member kit registrations before submitting.',
          };
        }
      } else {
        // Evening
        if (stage === 1) {
          return {
            title: 'Evening Shift Closeout (Alert 1 of 3: Settlement)',
            message: 'Evening shift close. Finalize daily operational data so weekly and multi-period reports compile for review.',
            voiceText: 'Attention Staff: Evening shift settlement. Finalize daily operations and prepare reports for final review.',
          };
        } else if (stage === 2) {
          return {
            title: 'Evening Settlement Follow-Up (Alert 2 of 3: +15 Min)',
            message: '15-minute follow-up: Reconcile cash receipts, banking slips, and registered kits before submission.',
            voiceText: 'Fifteen-minute evening closeout follow-up: Ensure daily figures match banking slips and clinical testing tallies.',
          };
        } else {
          return {
            title: 'T20 Server Assistant Review Reminder (Alert 3 of 3: Final)',
            message: 'As the T20 Server Assistant, I remind you to review the report and submit it. All daily operational logs and period reports must be submitted for managerial audit.',
            voiceText: 'As the T20 Server Assistant, I remind you to review the report and submit it. All daily logs and compiled multi-period reports must now be submitted for executive audit.',
          };
        }
      }
    }
  }
}

export const NotificationAudio = new NotificationAudioService();
