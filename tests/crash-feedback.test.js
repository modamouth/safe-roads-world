import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { CrashFeedbackService, getCrashSeverity } from '../src/services/CrashFeedbackService.ts';
import { bindCrashFeedback } from '../src/services/crashFeedbackScene.js';

let vibrate, now;
beforeEach(() => {
  now = 0; vibrate = vi.fn(() => true);
  vi.stubGlobal('navigator', { vibrate, userActivation: { hasBeenActive: true } });
  vi.stubGlobal('performance', { now: () => now });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('CrashFeedbackService', () => {
  it('issues distinct light, medium and heavy requests', () => {
    const service = new CrashFeedbackService();
    for (const severity of ['light', 'medium', 'heavy']) {
      expect(service.trigger(severity)).toBe(true); now += 1000;
    }
    expect(vibrate.mock.calls).toEqual([[80], [[120, 60, 160]], [[250, 80, 350, 100, 450]]]);
  });
  it('silently handles unsupported browsers and rejected/throwing implementations', () => {
    const service = new CrashFeedbackService();
    vi.stubGlobal('navigator', {});
    expect(service.isSupported()).toBe(false); expect(service.trigger('heavy')).toBe(false); service.stop();
    vi.stubGlobal('navigator', { vibrate: vi.fn(() => { throw new Error('Blocked'); }) });
    expect(() => service.stop()).not.toThrow(); expect(service.trigger('heavy')).toBe(false);
    now += 1000;
    vi.stubGlobal('navigator', { vibrate: () => false });
    expect(service.trigger('heavy')).toBe(false);
  });
  it('respects the preference and cancels an active vibration immediately when disabled', () => {
    const service = new CrashFeedbackService({ enabled: false });
    expect(service.trigger('light')).toBe(false); expect(vibrate).not.toHaveBeenCalled();
    service.setEnabled(true); expect(service.trigger('light')).toBe(true);
    service.setEnabled(false); expect(vibrate).toHaveBeenLastCalledWith(0);
    now += 1000; expect(service.trigger('medium')).toBe(false); expect(vibrate).toHaveBeenCalledTimes(2);
  });
  it('debounces callbacks at the exact configurable cooldown boundary; stop does not reset it', () => {
    const service = new CrashFeedbackService({ cooldownMs: 1000 });
    expect(service.trigger('light')).toBe(true); expect(service.trigger('light')).toBe(false);
    now = 999; expect(service.trigger('medium')).toBe(false);
    service.stop(); expect(vibrate).toHaveBeenLastCalledWith(0);
    expect(service.trigger('heavy')).toBe(false);
    now = 1000; expect(service.trigger('medium')).toBe(true);
    const short = new CrashFeedbackService({ cooldownMs: 25 });
    expect(short.trigger('light')).toBe(true); now += 24; expect(short.trigger('light')).toBe(false);
    now++; expect(short.trigger('light')).toBe(true);
  });
  it('does not request vibration before browser user activation', () => {
    navigator.userActivation.hasBeenActive = false;
    expect(new CrashFeedbackService().trigger('heavy')).toBe(false); expect(vibrate).not.toHaveBeenCalled();
  });
  it.each([[0, 'light'], [39.99, 'light'], [40, 'medium'], [69.99, 'medium'], [70, 'heavy'], [120, 'heavy']])('maps %s km/h to %s', (speed, severity) => {
    expect(getCrashSeverity(speed)).toBe(severity);
  });
  it('is safe to import and construct without reading window or navigator in SSR', async () => {
    vi.resetModules();
    const reads = vi.fn(() => { throw new Error('Browser global accessed'); });
    const descriptors = ['window', 'navigator'].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    try {
      for (const key of ['window', 'navigator']) Object.defineProperty(globalThis, key, { configurable: true, get: reads });
      const { CrashFeedbackService: Service } = await import('../src/services/CrashFeedbackService.ts');
      await import('../src/services/crashFeedback.ts');
      const service = new Service(); expect(reads).not.toHaveBeenCalled();
      expect(service.isSupported()).toBe(false); expect(service.trigger('heavy')).toBe(false); expect(() => service.stop()).not.toThrow();
    } finally {
      ['window', 'navigator'].forEach((key, i) => { if (descriptors[i]) Object.defineProperty(globalThis, key, descriptors[i]); else delete globalThis[key]; });
    }
  });
  it('cancels on scene pause/sleep/shutdown/destroy and removes lifecycle listeners', () => {
    const scene = { events: new EventEmitter() };
    bindCrashFeedback(scene);
    scene.events.emit('pause'); scene.events.emit('sleep'); scene.events.emit('shutdown');
    expect(vibrate.mock.calls).toEqual([[0], [0], [0]]);
    expect(scene.events.listenerCount('pause')).toBe(0); expect(scene.events.listenerCount('destroy')).toBe(0);
    bindCrashFeedback(scene); scene.events.emit('destroy'); expect(vibrate).toHaveBeenLastCalledWith(0);
  });
});
