import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
function browser(storage) {
  const listeners = new Map();
  const target = () => ({ addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) });
  vi.stubGlobal('window', target()); vi.stubGlobal('document', { ...target(), visibilityState: 'visible' });
  vi.stubGlobal('localStorage', storage);
  const vibrate = vi.fn(() => true); vi.stubGlobal('navigator', { vibrate });
  return { listeners, vibrate };
}
describe('persistent haptics and browser lifecycle', () => {
  it('loads disabled preference, persists changes, requires interaction and stops on hiding/leaving', async () => {
    const storage = { getItem: vi.fn(() => 'false'), setItem: vi.fn() };
    const { listeners, vibrate } = browser(storage);
    const feedback = await import('../src/services/crashFeedback.ts');
    const cleanup = feedback.initializeCrashFeedback();
    expect(feedback.hapticsEnabled()).toBe(false);
    expect(feedback.triggerCrashFeedback(100)).toBe(false);
    feedback.setHapticsEnabled(true);
    expect(storage.setItem).toHaveBeenCalledWith(feedback.HAPTICS_KEY, 'true');
    expect(feedback.triggerCrashFeedback(100)).toBe(false);
    listeners.get('click')({ isTrusted: false }); expect(feedback.triggerCrashFeedback(100)).toBe(false);
    listeners.get('keydown')({ isTrusted: true }); expect(feedback.triggerCrashFeedback(100)).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith([250, 80, 350, 100, 450]);
    document.visibilityState = 'hidden'; listeners.get('visibilitychange')(); expect(vibrate).toHaveBeenLastCalledWith(0);
    expect(feedback.triggerCrashFeedback(100)).toBe(false);
    listeners.get('blur')(); listeners.get('pagehide')();
    cleanup(); expect(listeners.size).toBe(0); expect(vibrate).toHaveBeenLastCalledWith(0);
  });
  it('defaults on and survives blocked storage', async () => {
    browser({ getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Denied'); } });
    const feedback = await import('../src/services/crashFeedback.ts');
    const cleanup = feedback.initializeCrashFeedback();
    expect(feedback.hapticsEnabled()).toBe(true);
    expect(() => feedback.setHapticsEnabled(false)).not.toThrow();
    expect(feedback.hapticsEnabled()).toBe(false); cleanup();
  });
});
