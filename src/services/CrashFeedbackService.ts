export type CrashSeverity = 'light' | 'medium' | 'heavy';
export interface CrashFeedbackOptions { enabled?: boolean; cooldownMs?: number }

const patterns: Record<CrashSeverity, number | number[]> = {
  light: 80, medium: [120, 60, 160], heavy: [250, 80, 350, 100, 450]
};

/** Vehicle speeds throughout the simulations are km/h, including residual impact speed. */
export function getCrashSeverity(speedKmh: number): CrashSeverity {
  if (!Number.isFinite(speedKmh) || speedKmh < 40) return 'light';
  return speedKmh < 70 ? 'medium' : 'heavy';
}

/** No browser globals are read during module evaluation or construction. */
export class CrashFeedbackService {
  private enabled: boolean;
  private readonly cooldownMs: number;
  private lastRequest = -Infinity;

  constructor(options: CrashFeedbackOptions = {}) {
    this.enabled = options.enabled ?? true;
    const cooldown = options.cooldownMs ?? 1000;
    this.cooldownMs = Number.isFinite(cooldown) ? Math.max(0, cooldown) : 1000;
  }

  isSupported(): boolean {
    try { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'; }
    catch { return false; }
  }

  trigger(severity: CrashSeverity): boolean {
    if (!this.enabled || !this.isSupported() || !patterns[severity]) return false;
    try {
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - this.lastRequest < this.cooldownMs) return false;
      // Reserve the cooldown even when the browser refuses a request.
      this.lastRequest = now;
      const pattern = patterns[severity];
      return navigator.vibrate(Array.isArray(pattern) ? [...pattern] : pattern);
    } catch { return false; }
  }

  stop(): void {
    try { if (this.isSupported()) navigator.vibrate(0); } catch { /* Optional API. */ }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }
}
