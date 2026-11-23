// ---------------------------------------------------------------------------
// The Journey Home: buildings along the town sections of the B1. Facades are
// drawn once into textures (Namibian small-town shops with verandas, walled
// houses, container shops, a fuel station; office blocks in Windhoek) and placed
// as roadside sprites, set back behind the verge on both sides.
//
//   townTextures(scene)          bake the facade textures (once per game)
//   townLayout(leg)              [{ s, x, key, w, kind, n }] where each building stands
//   townArt(scene, b)            the illustrated building for it ({ key, ground, w }), if loaded
//   townRanges(leg)              [[from, to]] the town sections of a leg
// ---------------------------------------------------------------------------
import { rng, ROAD } from './sim.js';

const PX = 40;          // texture pixels per metre
const SET_BACK = ROAD.EDGE + 6;   // nearest edge of a building from the centre line

const WALLS = [0xEFE3C8, 0xE7B98A, 0xCFE3D2, 0xE9D27A, 0xC9DCEB, 0xF1EEE6, 0xD9A38B];
const SHOPS = ['GENERAL DEALER', 'BUTCHERY', 'PHARMACY', 'HARDWARE', 'TAKE-AWAYS', 'HAIR SALON', 'CASH & CARRY', 'FURNITURE', 'SUPERMARKET', 'TYRES & EXHAUSTS'];
const STALLS = ['TUCK SHOP', 'KAPANA', 'CELL REPAIRS', 'AIRTIME'];
const SIGN_COLS = [[0xB3261E, '#FFFFFF'], [0x1F5FA8, '#FFFFFF'], [0x1E6B45, '#FFFFFF'], [0xF2C230, '#1B1B1B'], [0xFFFFFF, '#B3261E']];

// The facades: kind, width (m), and enough variety that neighbours differ.
const VARIANTS = [
  ...SHOPS.map((name, i) => ({ key: 'jh_bld_shop' + i, kind: 'shop', w: 10 + (i % 3) * 1.5, name, wall: WALLS[i % WALLS.length], sign: SIGN_COLS[i % SIGN_COLS.length] })),
  ...[0, 1, 2, 3, 4].map(i => ({ key: 'jh_bld_house' + i, kind: 'house', w: 10 + (i % 2) * 2, wall: WALLS[(i * 3 + 1) % WALLS.length], roof: [0x7C8087, 0x9A4A3A, 0x5E6B5A, 0x8C8F94, 0xA0522D][i], gate: [0x2F3B4C, 0x6B3A2A, 0x1E6B45, 0x444444, 0x2F3B4C][i] })),
  ...STALLS.map((name, i) => ({ key: 'jh_bld_stall' + i, kind: 'stall', w: 6.5, name, wall: [0x2F7FB8, 0xC0392B, 0x2E8B57, 0xE67E22][i] })),
  { key: 'jh_bld_fuel', kind: 'fuel', w: 15 },
  ...[0, 1, 2].map(i => ({ key: 'jh_bld_office' + i, kind: 'office', w: 14, floors: 2 + i % 2, wall: [0xEDE6D6, 0xD8D2C4, 0xE6CDB0][i], name: ['OFFICES', 'BANK', 'MEDICAL CENTRE'][i] }))
];
const BY_KIND = kind => VARIANTS.filter(v => v.kind === kind);

// The illustrated buildings (lab/assets.js `town`): width in metres, and where the ground
// line sits (a fraction of the image height, measured from the art). Drawn facades stand in
// until they load.
const TOWN_ART = {
  shop: [['town_shop_a', 0.909], ['town_shop_b', 0.925], ['town_shop_c', 0.948], ['town_shop_d', 0.951]].map(([key, ground]) => ({ key, ground, w: 11.5 })),
  office: [['town_office_a', 0.979, 15], ['town_office_b', 0.983, 15.5]].map(([key, ground, w]) => ({ key, ground, w })),
  house: [['town_house_a', 0.975], ['town_house_b', 0.977]].map(([key, ground]) => ({ key, ground, w: 11.5 })),
  stall: [{ key: 'town_stall_a', ground: 0.977, w: 6.5 }],
  fuel: [{ key: 'town_fuel_station', ground: 0.971, w: 16 }]
};
export function townArt(scene, b) {
  const list = TOWN_ART[b.kind] || [], art = list[b.n % list.length];
  return art && scene.textures.exists(art.key) ? art : null;
}
const HEIGHT = { shop: 5, house: 5, stall: 4, fuel: 6, office: 12 };

/** Draw one facade into a texture. Coordinates are metres, origin bottom-left. */
function bake(scene, v) {
  const W = Math.round(v.w * PX), H = Math.round(HEIGHT[v.kind] * PX), m = n => n * PX, Y = n => H - m(n);
  const g = scene.make.graphics({ x: 0, y: 0 }, false), texts = [];
  const label = (x, y, str, size, color, maxW) => {
    const t = scene.make.text({ x: m(x), y: Y(y), text: str, style: { fontFamily: 'Arial, sans-serif', fontSize: size + 'px', color, fontStyle: 'bold' } }, false).setOrigin(0.5);
    if (maxW && t.width > m(maxW)) t.setScale(m(maxW) / t.width);
    texts.push(t);
  };
  const windowAt = (x, y, w, h, bars) => {
    g.fillStyle(0x24313F, 1); g.fillRect(m(x), Y(y + h), m(w), m(h));
    g.fillStyle(0x8FB3CC, 0.35); g.fillTriangle(m(x), Y(y + h), m(x + w * 0.45), Y(y + h), m(x), Y(y + h * 0.4));
    g.lineStyle(2, 0xF4F1EA, 1); g.strokeRect(m(x), Y(y + h), m(w), m(h));
    if (bars) { g.lineStyle(2, 0x3A3A3A, 0.9); for (let bx = x + 0.2; bx < x + w; bx += 0.2) g.lineBetween(m(bx), Y(y + h), m(bx), Y(y)); }
  };

  if (v.kind === 'shop') {
    // Parapet front with a painted signboard, a veranda on posts, shopfront windows.
    g.fillStyle(v.wall, 1); g.fillRect(0, Y(4.6), W, m(4.6));
    g.fillStyle(v.sign[0], 1); g.fillRect(m(0.4), Y(4.45), W - m(0.8), m(0.95));
    label(v.w / 2, 3.97, v.name, 24, v.sign[1], v.w - 1.2);
    g.fillStyle(0x9AA0A6, 1); g.fillRect(0, Y(3.2), W, m(0.22));
    g.fillStyle(0x000000, 0.18); g.fillRect(0, Y(2.98), W, m(0.5));
    windowAt(0.7, 0.45, v.w / 2 - 1.8, 2.1, true); windowAt(v.w / 2 + 1.1, 0.45, v.w / 2 - 1.8, 2.1, true);
    g.fillStyle(0x3B2A20, 1); g.fillRect(m(v.w / 2 - 0.6), Y(2.4), m(1.2), m(2.4));
    g.fillStyle(0xD6D6D6, 1); [0.15, v.w / 2 - 0.08, v.w - 0.3].forEach(x => g.fillRect(m(x), Y(3.0), m(0.15), m(3.0)));
    g.fillStyle(0x8E8A80, 1); g.fillRect(0, Y(0.25), W, m(0.25));
  } else if (v.kind === 'house') {
    // A walled plot: corrugated roof and windows behind a painted boundary wall with a gate.
    const roofTop = 4.8, eaves = 3.2, hx = 1.2;
    g.fillStyle(v.roof, 1); g.fillPoints([{ x: m(hx - 0.4), y: Y(eaves) }, { x: m(hx + 1.6), y: Y(roofTop) }, { x: m(v.w - hx - 1.6), y: Y(roofTop) }, { x: m(v.w - hx + 0.4), y: Y(eaves) }], true);
    g.lineStyle(1, 0x000000, 0.18); for (let x = hx + 0.2; x < v.w - hx; x += 0.25) g.lineBetween(m(x), Y(eaves), m(x + (x < v.w / 2 ? 0.25 : -0.25)), Y(roofTop - 0.05));
    g.fillStyle(v.wall, 1); g.fillRect(m(hx), Y(eaves), m(v.w - 2 * hx), m(eaves));
    windowAt(hx + 1, 1.6, 1.4, 1.2, true); windowAt(v.w - hx - 2.4, 1.6, 1.4, 1.2, true);
    const wall = 1.9;
    g.fillStyle(0xE8E2D4, 1); g.fillRect(0, Y(wall), W, m(wall));
    g.fillStyle(0xC9C1B0, 1); for (let x = 0; x <= v.w; x += 2.5) g.fillRect(m(x) - 4, Y(wall + 0.15), 8, m(wall + 0.15));
    g.fillStyle(v.gate, 1); g.fillRect(m(v.w / 2 - 1.6), Y(1.7), m(3.2), m(1.7));
    g.lineStyle(2, 0x000000, 0.35); for (let x = v.w / 2 - 1.4; x < v.w / 2 + 1.6; x += 0.25) g.lineBetween(m(x), Y(1.7), m(x), Y(0.05));
  } else if (v.kind === 'stall') {
    // A painted shipping container with a serving hatch and a hand-lettered sign.
    g.fillStyle(v.wall, 1); g.fillRect(0, Y(2.6), W, m(2.6));
    g.lineStyle(2, 0x000000, 0.18); for (let x = 0.15; x < v.w; x += 0.3) g.lineBetween(m(x), Y(2.6), m(x), Y(0));
    g.fillStyle(0xF4F1EA, 1); g.fillRect(m(0.6), Y(2.45), W - m(1.2), m(0.7));
    label(v.w / 2, 2.1, v.name, 22, '#1B1B1B', v.w - 1.6);
    g.fillStyle(0x24313F, 1); g.fillRect(m(1.2), Y(1.6), m(v.w - 2.4), m(0.9));
    g.fillStyle(0x9AA0A6, 1); g.fillRect(m(0.9), Y(1.75), m(v.w - 1.8), m(0.12));
    g.fillStyle(0xD9D2C3, 1); g.fillRect(m(1.0), Y(0.75), m(v.w - 2.0), m(0.1));
  } else if (v.kind === 'fuel') {
    // Forecourt canopy on columns over two pump islands, the kiosk behind.
    g.fillStyle(0xEDE6D6, 1); g.fillRect(m(9.5), Y(3.2), m(5.2), m(3.2));
    windowAt(10.1, 0.5, 2.2, 1.9, false); g.fillStyle(0x3B2A20, 1); g.fillRect(m(12.9), Y(2.3), m(1.1), m(2.3));
    g.fillStyle(0xFFFFFF, 1); g.fillRect(0, Y(5.6), m(9.4), m(0.9));
    g.fillStyle(0x1E6B45, 1); g.fillRect(0, Y(5.0), m(9.4), m(0.3));
    label(4.7, 5.2, 'FUEL', 26, '#1E6B45');
    g.fillStyle(0xD6D6D6, 1); [1.2, 7.8].forEach(x => g.fillRect(m(x), Y(4.7), m(0.35), m(4.7)));
    [2.6, 6.0].forEach(x => { g.fillStyle(0xF4F1EA, 1); g.fillRect(m(x), Y(1.6), m(0.8), m(1.6)); g.fillStyle(0x1E6B45, 1); g.fillRect(m(x), Y(1.6), m(0.8), m(0.35)); g.fillStyle(0x24313F, 1); g.fillRect(m(x + 0.15), Y(1.1), m(0.5), m(0.35)); });
    g.fillStyle(0x8E8A80, 1); g.fillRect(m(2.3), Y(0.2), m(4.6), m(0.2));
    g.fillStyle(0x1E6B45, 1); g.fillRect(m(14.0), Y(5.8), m(0.25), m(5.8)); g.fillRect(m(13.3), Y(5.8), m(1.6), m(1.4));
    label(14.1, 5.1, 'OPEN', 14, '#FFFFFF');
  } else {
    // Windhoek office block: storeys of windows over shopfronts, a name on top.
    const fh = 3.3, top = 1 + v.floors * fh + 0.6;
    g.fillStyle(v.wall, 1); g.fillRect(0, Y(top), W, m(top));
    for (let f = 0; f < v.floors; f++) for (let x = 0.6; x < v.w - 1.2; x += 1.6) windowAt(x, 1.2 + f * fh + 0.8, 1.1, 1.8, false);
    g.fillStyle(0x24313F, 1); g.fillRect(m(0.4), Y(1.0), W - m(0.8), m(0.9));
    label(v.w / 2, top - 0.35, v.name, 22, '#2F3B4C', v.w - 2);
  }

  const dt = scene.textures.addDynamicTexture(v.key, W, H);
  dt.draw([g, ...texts]);
  g.destroy(); texts.forEach(t => t.destroy());
}

/** Bake every facade texture once (they live in the game's texture manager). */
export function townTextures(scene) {
  VARIANTS.forEach(v => { if (!scene.textures.exists(v.key)) bake(scene, v); });
}

/** Town sections of a leg: from each town board to the next speed-limit change (or past the end). */
export function townRanges(leg) {
  return leg.zones.flatMap((z, i) => (z.sign && z.sign.startsWith('town:') ? [[z.at === 0 ? -60 : z.at + 10, (leg.zones[i + 1] || { at: leg.length + 250 }).at - 10, z.sign.slice(5)]] : []));
}

/** Where each building stands. The same town always looks the same. */
export function townLayout(leg) {
  const out = [];
  townRanges(leg).forEach(([from, to, name]) => {
    const r = rng([...name].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) >>> 0);
    const city = name === 'Windhoek';
    let fuelDone = false;
    [-1, 1].forEach(side => {
      for (let s = from + r() * 12; s < to; s += 13 + r() * 12) {
        const roll = r();
        let kind = city ? (roll < 0.4 ? 'office' : roll < 0.8 ? 'shop' : 'house') : roll < 0.45 ? 'shop' : roll < 0.75 ? 'house' : roll < 0.92 ? 'stall' : 'fuel';
        if (kind === 'fuel' && fuelDone) kind = 'shop';
        if (kind === 'fuel') fuelDone = true;
        const options = BY_KIND(kind), n = Math.floor(r() * 4), v = options[n % options.length];
        out.push({ s: Math.round(s), x: side * (SET_BACK + v.w / 2 + r() * 2), key: v.key, w: v.w, kind, n });
      }
    });
  });
  return out;
}
