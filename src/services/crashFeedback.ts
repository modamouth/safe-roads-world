import { CrashFeedbackService, getCrashSeverity } from './CrashFeedbackService';

export const HAPTICS_KEY = 'safeRoadsWorld.settings.haptics';
export const crashFeedback = new CrashFeedbackService();
let enabled = true;
let initialized = false;
let interacted = false;

export function hapticsEnabled(): boolean { return enabled; }
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
  crashFeedback.setEnabled(value);
  try { localStorage.setItem(HAPTICS_KEY, String(value)); } catch { /* Private/blocked storage. */ }
}

export function triggerCrashFeedback(speedKmh: number): boolean {
  if (!interacted || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return false;
  return crashFeedback.trigger(getCrashSeverity(speedKmh));
}
export function stopCrashFeedback(): void { crashFeedback.stop(); }

/** Called once at browser startup, never at import time. Returns teardown for game destruction. */
export function initializeCrashFeedback(): () => void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  initialized = true;
  try { enabled = localStorage.getItem(HAPTICS_KEY) !== 'false'; } catch { /* Default on. */ }
  crashFeedback.setEnabled(enabled);
  const interact = (event: Event): void => { if (event.isTrusted) interacted = true; };
  const hidden = (): void => { if (document.visibilityState === 'hidden') stopCrashFeedback(); };
  for (const name of ['pointerdown', 'keydown', 'click']) document.addEventListener(name, interact, true);
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('blur', stopCrashFeedback);
  window.addEventListener('pagehide', stopCrashFeedback);
  return () => {
    stopCrashFeedback();
    for (const name of ['pointerdown', 'keydown', 'click']) document.removeEventListener(name, interact, true);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('blur', stopCrashFeedback);
    window.removeEventListener('pagehide', stopCrashFeedback);
    initialized = false; interacted = false;
  };
}
