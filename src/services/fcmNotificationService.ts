/**
 * Firebase Cloud Messaging & Web Push Notification Service
 * Delivers non-intrusive text-based web notifications to Staff and Managers.
 * Uses Web Notifications API, Service Worker registration, and pleasant Web Audio chimes (NO voice speech).
 */

export interface WebNotificationPayload {
  title: string;
  body: string;
  targetRole?: 'staff' | 'manager' | 'all';
  type?: 'report_submitted' | 'report_approved' | 'period_ready' | 'shift_reminder' | 'system';
  data?: Record<string, string>;
  url?: string;
}

class FCMNotificationService {
  private permission: NotificationPermission = 'default';
  private audioCtx: AudioContext | null = null;
  private isSupported = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      if (this.isSupported) {
        this.permission = Notification.permission;
      }
    }
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !this.isSupported) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !this.isSupported) return false;
    try {
      const res = await Notification.requestPermission();
      this.permission = res;
      return res === 'granted';
    } catch {
      return false;
    }
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
   * Sound for MANAGER: Distinct, rich multi-tone executive chime when a new report is submitted
   */
  public playManagerNotificationSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Arpeggiated executive harmonic chime: A4 (440Hz) -> C#5 (554.37Hz) -> E5 (659.25Hz) -> A5 (880Hz)
      const freqs = [440, 554.37, 659.25, 880];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    } catch {
      // Audio safety
    }
  }

  /**
   * Sound for STAFF: Distinct crisp operational bell tone when weekly/period reports are ready.
   * Plays three times (3x chime) as required by staff notification specifications.
   */
  public playStaffNotificationSound(repeatCount = 3): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      for (let rep = 0; rep < repeatCount; rep++) {
        const offset = rep * 0.42; // 420ms between chimes
        const now = ctx.currentTime + offset;
        const notes = [
          { freq: 784, start: 0, dur: 0.26, gain: 0.2 },
          { freq: 1174, start: 0.1, dur: 0.32, gain: 0.24 },
        ];
        notes.forEach(({ freq, start, dur, gain: maxGain }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + start);

          gain.gain.setValueAtTime(0.0001, now + start);
          gain.gain.linearRampToValueAtTime(maxGain, now + start + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + start);
          osc.stop(now + start + dur + 0.02);
        });
      }
    } catch {
      // Audio safety
    }
  }

  /**
   * Send non-intrusive text-based web notification to user
   */
  public sendNotification(payload: WebNotificationPayload): void {
    const { title, body, targetRole = 'all' } = payload;

    // Play appropriate sound (NO spoken voice)
    if (targetRole === 'manager') {
      this.playManagerNotificationSound();
    } else {
      this.playStaffNotificationSound();
    }

    // Trigger Web Notification API if permitted
    if (this.isSupported && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `t20-${Date.now()}`,
          requireInteraction: false,
          silent: true, // Audio handled crisply via Web Audio
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };

        // Auto close after 6 seconds for non-intrusive experience
        setTimeout(() => {
          try {
            notif.close();
          } catch {
            // ignore
          }
        }, 6000);
      } catch {
        // Fallback or permission blocked
      }
    }

    // Dispatch custom in-app event for toast rendering
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('t20-web-notification', {
          detail: {
            title,
            body,
            targetRole,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  }
}

export const FCMService = new FCMNotificationService();
