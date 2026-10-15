import { describe, it, expect } from 'vitest';
import { escPosition } from '../src/lab/core/escPath.js';
describe('ESC comparison paths', () => {
  it('keeps the complete car visible throughout either trajectory', () => {
    for (const on of [true, false]) for (let i = 0; i <= 100; i++) {
      const p = escPosition(i / 100, on);
      expect(p.x).toBeGreaterThan(.1); expect(p.x).toBeLessThan(.9);
      expect(p.y).toBeGreaterThan(.1); expect(p.y).toBeLessThan(.94);
    }
  });
  it('shares the approach then separates into lane and verge outcomes', () => {
    expect(escPosition(0, true)).toEqual(escPosition(0, false));
    expect(escPosition(.35, true)).toEqual(escPosition(.35, false));
    expect(escPosition(1, true).x).toBeCloseTo(.155);
    expect(escPosition(1, true).y).toBeCloseTo(.185);
    expect(escPosition(1, false).x).toBeCloseTo(.81);
    expect(escPosition(1, false).y).toBeCloseTo(.22);
  });
});
