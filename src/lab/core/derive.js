// ---------------------------------------------------------------------------
// Derived figures. Some numbers shown to players are calculated rather than
// quoted, e.g. stopping distance at a speed. Every input to these functions
// comes from the content register (via "$claim:id" params), so a derived
// number is only as sourced as its inputs. Pure functions, no Phaser.
// ---------------------------------------------------------------------------
import { stopping, impactKmh } from '../../stopping.js';

export { stopping, impactKmh };

/** Metres travelled at `kmh` in `seconds` (e.g. during a microsleep). */
export const distanceAt = (kmh, seconds) => kmh / 3.6 * seconds;

/** Relative crash risk after a speed change, power model: (v1 / v0) ^ exponent. */
export const powerRatio = (v0, v1, exponent) => Math.pow(v1 / v0, exponent);

/**
 * Chart series builders, keyed by `derive` in chart scene data. Each returns
 * [{ x, value, parts? }]. `p` has already had its $claim params resolved.
 */
export const SERIES = {
  // Total stopping distance per speed, split into reaction and braking parts.
  stopping(p) {
    return p.speeds.map(kmh => {
      const s = stopping(kmh, p.reactionS, p.decel);
      return { x: kmh, value: round1(s.total), parts: [round1(s.react), round1(s.brake)] };
    });
  },
  // Relative fatal-crash risk vs a base speed.
  power(p) {
    return p.speeds.map(kmh => ({ x: kmh, value: round2(powerRatio(p.base, kmh, p.exponent)) }));
  },
  // Distance travelled with eyes closed for each duration at a fixed speed.
  distanceAt(p) {
    return p.seconds.map(s => ({ x: s, value: round1(distanceAt(p.kmh, s)) }));
  }
};

export const round1 = v => Math.round(v * 10) / 10;
export const round2 = v => Math.round(v * 100) / 100;
