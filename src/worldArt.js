// ---------------------------------------------------------------------------
// World-shell art slots (Title, Map) and their drawn placeholders.
//
// The four images below are OPTIONAL. Boot loads them separately from the
// nine photo assets, so a missing file never affects the REAL flag. Scenes ask
// artKey() for a texture: the real image if it loaded, otherwise the drawn
// placeholder that buildWorldTextures() makes here.
// ---------------------------------------------------------------------------
import { W, H, Z } from './config.js';

export const OPTIONAL_ART = {
  title_bg: 'assets/title_bg.webp',
  map_bg: 'assets/map_bg.webp',
  hero_wave: 'assets/hero_wave.webp',
  hero_passport: 'assets/hero_passport.webp'
};

const FALLBACK = { title_bg: 'title_bg_fb', map_bg: 'map_bg_fb', hero_wave: 'hero_wave_fb', hero_passport: 'hero_passport_fb' };

export const optKey = name => 'opt_' + name;

/**
 * Texture key for an art slot. `names` is one slot name or a list tried in
 * order (e.g. ['title_bg', 'map_bg']); the first image that loaded wins,
 * otherwise the drawn placeholder of the first name.
 */
export function artKey(scene, names) {
  const list = [].concat(names);
  const hit = list.find(n => scene.textures.exists(optKey(n)));
  return hit ? optKey(hit) : FALLBACK[list[0]];
}

/** Adds an image scaled to cover the whole 540x960 design space, centred. */
export function cover(scene, key, depth) {
  const im = scene.add.image(W / 2, H / 2, key).setDepth(depth || 0);
  im.setScale(Math.max(W / im.width, H / im.height));
  return im;
}

/** Adds a hero image scaled to a given height, bottom-centre anchored. `names` as in artKey(). */
export function hero(scene, names, x, bottomY, height, depth) {
  const im = scene.add.image(x, bottomY, artKey(scene, names)).setOrigin(0.5, 1).setDepth(depth || 0);
  im.setScale(height / im.height);
  return im;
}

// --- drawn placeholders ----------------------------------------------------

function canvas(scene, key, w, h, scale) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, Math.round(w * scale), Math.round(h * scale));
  const c = t.getContext();
  c.scale(scale, scale);
  return { t, c };
}

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
}

function ridge(c, base, amp, col, a, b, cc) {
  c.fillStyle = col; c.beginPath(); c.moveTo(0, base + amp);
  for (let x = 0; x <= W; x += 6) c.lineTo(x, base - (Math.sin(x * a) * 0.55 + Math.sin(x * b + 1.3) * 0.32 + Math.sin(x * cc + 2.1) * 0.13 + 0.6) * amp);
  c.lineTo(W, base + amp); c.closePath(); c.fill();
}

/** Title placeholder: sky photo (or drawn dusk sky), hills and a road to the horizon. */
function titleBg(scene) {
  const { t, c } = canvas(scene, 'title_bg_fb', W, H, Z);
  const HZ = 600;
  const skyKey = scene.textures.exists('img_sky') ? 'img_sky' : 'sky';
  const src = scene.textures.get(skyKey).getSourceImage();
  const s = Math.max(W / src.width, (HZ + 20) / src.height);
  c.drawImage(src, (W - src.width * s) / 2, HZ + 20 - src.height * s, src.width * s, src.height * s);

  ridge(c, HZ - 4, 60, '#7B4E72', 0.011, 0.027, 0.06);
  ridge(c, HZ + 2, 36, '#5A3A55', 0.017, 0.041, 0.09);
  const land = c.createLinearGradient(0, HZ, 0, H);
  land.addColorStop(0, '#9C6A3F'); land.addColorStop(1, '#4A2F22');
  c.fillStyle = land; c.fillRect(0, HZ, W, H - HZ);

  // road
  c.fillStyle = '#3F3D40';
  c.beginPath(); c.moveTo(W / 2 - 10, HZ); c.lineTo(W / 2 + 10, HZ); c.lineTo(W / 2 + 300, H); c.lineTo(W / 2 - 300, H); c.closePath(); c.fill();
  c.strokeStyle = '#FFCB2B'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(W / 2 - 8, HZ); c.lineTo(W / 2 - 272, H); c.moveTo(W / 2 + 8, HZ); c.lineTo(W / 2 + 272, H); c.stroke();
  c.fillStyle = '#F2F2F2';
  for (let k = 0.04; k < 1; k *= 1.55) {
    const y0 = HZ + (H - HZ) * k, y1 = HZ + (H - HZ) * Math.min(1, k * 1.25), w0 = 1 + 8 * k;
    c.fillRect(W / 2 - w0 / 2, y0, w0, y1 - y0);
  }
  // acacia silhouettes on the horizon
  c.fillStyle = '#3F2C42';
  [[70, 1], [150, 0.6], [420, 0.8], [492, 0.5]].forEach(([x, k]) => {
    c.fillRect(x - 2 * k, HZ - 30 * k, 4 * k, 32 * k);
    c.beginPath(); c.ellipse(x, HZ - 34 * k, 34 * k, 8 * k, 0, 0, Math.PI * 2); c.fill();
  });
  t.refresh();
}

/** Map placeholder: warm savanna ground, hills, dry riverbed, bush, a small city cluster. */
function mapBg(scene) {
  const { t, c } = canvas(scene, 'map_bg_fb', W, H, Z);
  const r = rng(7);
  const base = c.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#D9AE6A'); base.addColorStop(0.35, '#C38E52'); base.addColorStop(0.7, '#A9783F'); base.addColorStop(1, '#86592F');
  c.fillStyle = base; c.fillRect(0, 0, W, H);

  // dune bands in the north
  for (let i = 0; i < 6; i++) {
    c.fillStyle = 'rgba(244,206,140,0.16)';
    c.beginPath(); c.moveTo(0, 30 + i * 42);
    c.bezierCurveTo(W * 0.3, -10 + i * 42, W * 0.6, 70 + i * 42, W, 20 + i * 42);
    c.lineTo(W, 44 + i * 42); c.bezierCurveTo(W * 0.6, 92 + i * 42, W * 0.3, 12 + i * 42, 0, 52 + i * 42);
    c.closePath(); c.fill();
  }
  // hills
  [[80, 430, 170, 0.32], [470, 520, 180, 0.28], [110, 770, 210, 0.3], [440, 830, 170, 0.26], [300, 280, 150, 0.18]].forEach(([x, y, rad, a]) => {
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(92,60,36,${a})`); g.addColorStop(1, 'rgba(92,60,36,0)');
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  });
  // dry riverbed
  c.strokeStyle = 'rgba(238,214,166,0.38)'; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-20, 720); c.bezierCurveTo(140, 640, 160, 520, 560, 400); c.stroke();
  // bush
  for (let i = 0; i < 280; i++) {
    c.fillStyle = `rgba(66,78,38,${0.35 + r() * 0.3})`;
    c.beginPath(); c.arc(r() * W, r() * H, 1.5 + r() * 3.5, 0, Math.PI * 2); c.fill();
  }
  // city cluster around the Windhoek node
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(244,236,220,${0.25 + r() * 0.25})`;
    c.fillRect(W * 0.5 + (r() - 0.5) * 170, H * 0.63 + (r() - 0.5) * 100, 5 + r() * 10, 4 + r() * 8);
  }
  // overall navy tint + edge vignette so nodes and labels stand out
  c.fillStyle = 'rgba(11,27,46,0.2)'; c.fillRect(0, 0, W, H);
  const v = c.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620);
  v.addColorStop(0, 'rgba(5,8,13,0)'); v.addColorStop(1, 'rgba(5,8,13,0.55)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  t.refresh();
}

/** Simple drawn figure in a hi-vis vest. pose: 'wave' | 'passport'. Design size 200 x 320. */
function heroFigure(scene, key, pose) {
  const { t, c } = canvas(scene, key, 200, 320, 2);
  const body = '#1B2F4A', shirt = '#1FA3B5', vest = '#FFCB2B', stripe = '#EEF2F6', head = '#2A3B52';
  // Glow radius stays inside the 200 px-wide canvas so it never shows a hard edge.
  const halo = c.createRadialGradient(100, 160, 8, 100, 160, 98);
  halo.addColorStop(0, 'rgba(255,214,150,0.32)'); halo.addColorStop(1, 'rgba(255,214,150,0)');
  c.fillStyle = halo; c.fillRect(0, 0, 200, 320);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(100, 310, 56, 8, 0, 0, Math.PI * 2); c.fill();

  c.fillStyle = body; rr(c, 72, 200, 24, 106, 10); rr(c, 104, 200, 24, 106, 10);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 20; c.strokeStyle = shirt;
  c.beginPath(); c.moveTo(66, 124); c.lineTo(54, 168); c.lineTo(58, 208); c.stroke();
  c.beginPath();
  if (pose === 'wave') { c.moveTo(134, 124); c.lineTo(162, 86); c.lineTo(170, 42); }
  else { c.moveTo(134, 124); c.lineTo(148, 166); c.lineTo(122, 176); }
  c.stroke();
  c.fillStyle = head;
  c.beginPath(); c.arc(pose === 'wave' ? 170 : 120, pose === 'wave' ? 34 : 178, 11, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(58, 214, 10, 0, Math.PI * 2); c.fill();

  c.fillStyle = shirt; rr(c, 60, 106, 80, 106, 22);
  c.fillStyle = vest;
  c.beginPath(); c.moveTo(62, 122); c.lineTo(88, 110); c.lineTo(100, 140); c.lineTo(112, 110); c.lineTo(138, 122); c.lineTo(140, 208); c.lineTo(60, 208); c.closePath(); c.fill();
  c.fillStyle = stripe; c.fillRect(60, 166, 80, 7); c.fillRect(60, 184, 80, 7);

  c.fillStyle = head; c.beginPath(); c.arc(100, 78, 26, 0, Math.PI * 2); c.fill();
  c.fillStyle = shirt; c.beginPath(); c.arc(100, 70, 27, Math.PI * 1.05, Math.PI * 1.95); c.fill();
  c.fillRect(100, 62, 36, 7);

  if (pose === 'passport') {
    c.fillStyle = '#1F5FA8'; rr(c, 98, 146, 38, 50, 5);
    c.strokeStyle = vest; c.lineWidth = 3; c.beginPath(); c.arc(117, 166, 9, 0, Math.PI * 2); c.stroke();
    c.fillStyle = vest; c.fillRect(106, 183, 22, 3);
    c.fillStyle = head; c.beginPath(); c.arc(120, 178, 10, 0, Math.PI * 2); c.fill();
  }
  t.refresh();
}

/** Vertical dark scrim (stretched) that keeps title text readable over any background. */
function scrim(scene) {
  const t = scene.textures.createCanvas('scrim_v', 8, 256), c = t.getContext();
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(5,8,13,0.82)'); g.addColorStop(0.42, 'rgba(5,8,13,0.35)');
  g.addColorStop(0.62, 'rgba(5,8,13,0.2)'); g.addColorStop(0.8, 'rgba(5,8,13,0.72)'); g.addColorStop(1, 'rgba(5,8,13,0.94)');
  c.fillStyle = g; c.fillRect(0, 0, 8, 256); t.refresh();
}

/** Builds every placeholder. Call from Boot after loading and buildTextures(). */
export function buildWorldTextures(scene) {
  titleBg(scene);
  mapBg(scene);
  heroFigure(scene, 'hero_wave_fb', 'wave');
  heroFigure(scene, 'hero_passport_fb', 'passport');
  scrim(scene);
}
