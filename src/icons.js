// ---------------------------------------------------------------------------
// Icons drawn in code (no image files). drawIcon(g, name, x, y, size, color)
// draws a glyph centred on (x, y) that fits inside a size x size box.
// ---------------------------------------------------------------------------

function star(g, x, y, ro, ri) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro, a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  g.fillPoints(pts, true);
}

export const ICONS = ['back', 'close', 'lock', 'city', 'lab', 'taxi', 'highway', 'gravel', 'truck', 'school',
  'map', 'passport', 'badge', 'star', 'play', 'check', 'speed', 'info',
  'car_speed', 'pedestrian', 'motorcycle', 'bicycle', 'heavy', 'car_shield', 'conditions', 'child_seat',
  'rules', 'treatment', 'alcohol', 'fatigue', 'more', 'steering', 'walker'];

export function drawIcon(g, name, x, y, s, color, alpha) {
  const a = alpha == null ? 1 : alpha, h = s / 2, lw = Math.max(2, s * 0.1);
  g.lineStyle(lw, color, a);
  g.fillStyle(color, a);

  switch (name) {
    case 'back':
      g.beginPath(); g.moveTo(x + h * 0.05, y - h * 0.6); g.lineTo(x - h * 0.55, y); g.lineTo(x + h * 0.05, y + h * 0.6); g.strokePath();
      g.lineBetween(x - h * 0.5, y, x + h * 0.65, y);
      break;
    case 'close':
      g.lineBetween(x - h * 0.55, y - h * 0.55, x + h * 0.55, y + h * 0.55);
      g.lineBetween(x + h * 0.55, y - h * 0.55, x - h * 0.55, y + h * 0.55);
      break;
    case 'lock':
      g.fillRoundedRect(x - h * 0.62, y - h * 0.08, h * 1.24, h * 0.9, h * 0.16);
      g.beginPath(); g.arc(x, y - h * 0.08, h * 0.38, Math.PI, Math.PI * 2); g.strokePath();
      break;
    case 'city': // skyline: gabled block, tower with spire, flat block, on a base line
      g.fillTriangle(x - h * 0.86, y - h * 0.05, x - h * 0.6, y - h * 0.35, x - h * 0.34, y - h * 0.05);
      g.fillRect(x - h * 0.86, y - h * 0.06, h * 0.52, h * 0.76);
      g.fillRect(x - h * 0.24, y - h * 0.62, h * 0.48, h * 1.32);
      g.fillRect(x - lw * 0.4, y - h * 0.9, lw * 0.8, h * 0.3);
      g.fillRect(x + h * 0.34, y - h * 0.3, h * 0.52, h);
      g.fillRect(x - h * 0.95, y + h * 0.68, h * 1.9, lw * 0.9);
      break;
    case 'lab':
      g.fillPoints([
        { x: x - h * 0.2, y: y - h * 0.62 }, { x: x + h * 0.2, y: y - h * 0.62 }, { x: x + h * 0.2, y: y - h * 0.2 },
        { x: x + h * 0.72, y: y + h * 0.78 }, { x: x - h * 0.72, y: y + h * 0.78 }, { x: x - h * 0.2, y: y - h * 0.2 }
      ], true);
      g.lineBetween(x - h * 0.38, y - h * 0.78, x + h * 0.38, y - h * 0.78);
      break;
    case 'taxi':
      g.fillRoundedRect(x - h * 0.85, y - h * 0.1, h * 1.7, h * 0.55, h * 0.14);
      g.fillPoints([{ x: x - h * 0.5, y: y - h * 0.1 }, { x: x - h * 0.3, y: y - h * 0.48 }, { x: x + h * 0.32, y: y - h * 0.48 }, { x: x + h * 0.55, y: y - h * 0.1 }], true);
      g.fillRect(x - h * 0.16, y - h * 0.68, h * 0.32, h * 0.16);
      g.fillCircle(x - h * 0.5, y + h * 0.5, h * 0.22);
      g.fillCircle(x + h * 0.5, y + h * 0.5, h * 0.22);
      break;
    case 'highway':
      g.lineBetween(x - h * 0.8, y + h * 0.8, x - h * 0.22, y - h * 0.8);
      g.lineBetween(x + h * 0.8, y + h * 0.8, x + h * 0.22, y - h * 0.8);
      g.fillRect(x - lw * 0.45, y + h * 0.3, lw * 0.9, h * 0.4);
      g.fillRect(x - lw * 0.38, y - h * 0.22, lw * 0.76, h * 0.3);
      g.fillRect(x - lw * 0.3, y - h * 0.7, lw * 0.6, h * 0.2);
      break;
    case 'gravel':
      g.fillTriangle(x - h * 0.85, y + h * 0.2, x - h * 0.15, y - h * 0.7, x + h * 0.5, y + h * 0.2);
      g.fillCircle(x - h * 0.55, y + h * 0.58, h * 0.16);
      g.fillCircle(x - h * 0.05, y + h * 0.66, h * 0.12);
      g.fillCircle(x + h * 0.38, y + h * 0.56, h * 0.18);
      g.fillCircle(x + h * 0.72, y + h * 0.7, h * 0.1);
      break;
    case 'truck':
      g.fillRect(x - h * 0.9, y - h * 0.55, h * 1.1, h * 0.95);
      g.fillPoints([{ x: x + h * 0.3, y: y - h * 0.25 }, { x: x + h * 0.66, y: y - h * 0.25 }, { x: x + h * 0.9, y: y + h * 0.05 }, { x: x + h * 0.9, y: y + h * 0.4 }, { x: x + h * 0.3, y: y + h * 0.4 }], true);
      g.fillCircle(x - h * 0.55, y + h * 0.58, h * 0.2);
      g.fillCircle(x + h * 0.55, y + h * 0.58, h * 0.2);
      break;
    case 'school':
      g.fillTriangle(x - h * 0.85, y - h * 0.1, x, y - h * 0.8, x + h * 0.85, y - h * 0.1);
      g.fillRect(x - h * 0.65, y - h * 0.1, h * 1.3, h * 0.9);
      break;
    case 'map':
      g.strokePoints([
        { x: x - h * 0.8, y: y - h * 0.55 }, { x: x - h * 0.27, y: y - h * 0.75 }, { x: x + h * 0.27, y: y - h * 0.55 }, { x: x + h * 0.8, y: y - h * 0.75 },
        { x: x + h * 0.8, y: y + h * 0.55 }, { x: x + h * 0.27, y: y + h * 0.75 }, { x: x - h * 0.27, y: y + h * 0.55 }, { x: x - h * 0.8, y: y + h * 0.75 }
      ], true, true);
      g.lineBetween(x - h * 0.27, y - h * 0.75, x - h * 0.27, y + h * 0.55);
      g.lineBetween(x + h * 0.27, y - h * 0.55, x + h * 0.27, y + h * 0.75);
      break;
    case 'passport':
      g.strokeRoundedRect(x - h * 0.6, y - h * 0.82, h * 1.2, h * 1.64, h * 0.14);
      g.strokeCircle(x, y - h * 0.1, h * 0.34);
      g.lineBetween(x - h * 0.3, y + h * 0.5, x + h * 0.3, y + h * 0.5);
      break;
    case 'badge':
      g.strokePoints([{ x: x - h * 0.7, y: y - h * 0.75 }, { x: x + h * 0.7, y: y - h * 0.75 }, { x: x + h * 0.7, y: y + h * 0.1 }, { x: x, y: y + h * 0.85 }, { x: x - h * 0.7, y: y + h * 0.1 }], true, true);
      star(g, x, y - h * 0.05, h * 0.36, h * 0.15);
      break;
    case 'star':
      star(g, x, y + h * 0.06, h * 0.92, h * 0.4);
      break;
    case 'play':
      g.fillTriangle(x - h * 0.45, y - h * 0.62, x + h * 0.65, y, x - h * 0.45, y + h * 0.62);
      break;
    case 'check':
      g.beginPath(); g.moveTo(x - h * 0.6, y); g.lineTo(x - h * 0.15, y + h * 0.45); g.lineTo(x + h * 0.65, y - h * 0.5); g.strokePath();
      break;
    case 'speed':
      g.beginPath(); g.arc(x, y + h * 0.3, h * 0.78, Math.PI, Math.PI * 2); g.strokePath();
      g.lineBetween(x, y + h * 0.3, x + h * 0.45, y - h * 0.2);
      g.fillCircle(x, y + h * 0.3, h * 0.14);
      break;
    case 'info':
      g.strokeCircle(x, y, h * 0.82);
      g.fillCircle(x, y - h * 0.38, h * 0.11);
      g.fillRect(x - lw * 0.5, y - h * 0.12, lw, h * 0.6);
      break;
    default:
      if (!drawOutline(g, name, x, y, h, Math.max(1.6, s * 0.055), color, a)) g.fillCircle(x, y, h * 0.4);
  }
  return g;
}

// --- Learning Lab outline icons -------------------------------------------
// Thin-line style. Coordinates are fractions of the half-size h.
function drawOutline(g, name, x, y, h, lw, color, a) {
  const P = (fx, fy) => ({ x: x + fx * h, y: y + fy * h });
  const line = (...pts) => g.strokePoints(pts.map(p => P(p[0], p[1])), false, false);
  const poly = (...pts) => g.strokePoints(pts.map(p => P(p[0], p[1])), true, true);
  const ring = (fx, fy, fr) => g.strokeCircle(x + fx * h, y + fy * h, fr * h);
  const dot = (fx, fy, fr) => g.fillCircle(x + fx * h, y + fy * h, fr * h);
  const arc = (fx, fy, fr, a0, a1) => { g.beginPath(); g.arc(x + fx * h, y + fy * h, fr * h, a0, a1); g.strokePath(); };
  const box = (fx, fy, fw, fh, fr) => g.strokeRoundedRect(x + fx * h, y + fy * h, fw * h, fh * h, (fr || 0.01) * h);
  const car = (ox, oy, k) => {
    poly([ox - 0.62 * k, oy + 0.22 * k], [ox - 0.62 * k, oy + 0.02 * k], [ox - 0.4 * k, oy - 0.06 * k], [ox - 0.18 * k, oy - 0.3 * k],
      [ox + 0.3 * k, oy - 0.3 * k], [ox + 0.55 * k, oy - 0.04 * k], [ox + 0.8 * k, oy + 0.04 * k], [ox + 0.8 * k, oy + 0.22 * k]);
    ring(ox - 0.33 * k, oy + 0.24 * k, 0.13 * k); ring(ox + 0.5 * k, oy + 0.24 * k, 0.13 * k);
  };
  g.lineStyle(lw, color, a); g.fillStyle(color, a);

  switch (name) {
    case 'car_speed':
      car(0.12, 0.05, 1);
      line([-0.98, -0.12], [-0.66, -0.12]); line([-1.0, 0.02], [-0.72, 0.02]); line([-0.94, 0.16], [-0.7, 0.16]);
      return true;
    case 'pedestrian':
      ring(0.06, -0.72, 0.13);
      line([0.02, -0.55], [-0.06, 0.02]); line([-0.32, -0.18], [0.0, -0.42], [0.3, -0.14]);
      line([-0.06, 0.02], [-0.3, 0.42]); line([-0.06, 0.02], [0.22, 0.42]);
      line([-0.75, 0.72], [-0.42, 0.72]); line([-0.2, 0.72], [0.14, 0.72]); line([0.36, 0.72], [0.7, 0.72]);
      return true;
    case 'motorcycle':
      ring(-0.56, 0.42, 0.28); ring(0.58, 0.42, 0.28);
      line([-0.56, 0.42], [-0.12, 0.08], [0.36, 0.08], [0.58, 0.42]); line([0.36, 0.08], [0.46, -0.2]);
      ring(0.02, -0.6, 0.15); line([-0.02, -0.44], [-0.18, 0.0], [0.08, 0.2]); line([-0.04, -0.34], [0.42, -0.2]);
      return true;
    case 'bicycle':
      ring(-0.56, 0.46, 0.28); ring(0.58, 0.46, 0.28);
      line([-0.56, 0.46], [-0.08, 0.46], [0.26, 0.02], [-0.24, 0.02], [-0.56, 0.46]); line([0.26, 0.02], [0.58, 0.46]);
      line([-0.24, 0.02], [-0.3, -0.12]); line([0.26, 0.02], [0.32, -0.2]);
      ring(0.02, -0.7, 0.13); line([-0.04, -0.56], [-0.26, -0.12]); line([-0.08, -0.46], [0.3, -0.2]);
      return true;
    case 'heavy':
      box(-0.95, -0.55, 1.28, 0.85, 0.04);
      poly([0.4, -0.25], [0.7, -0.25], [0.95, 0.05], [0.95, 0.3], [0.4, 0.3]);
      ring(-0.7, 0.45, 0.13); ring(-0.42, 0.45, 0.13); ring(0.7, 0.45, 0.13);
      return true;
    case 'car_shield':
      car(0.0, 0.42, 0.95);
      poly([-0.24, -0.82], [0.24, -0.82], [0.24, -0.52], [0.0, -0.28], [-0.24, -0.52]);
      line([-0.12, -0.6], [-0.03, -0.5], [0.13, -0.68]);
      return true;
    case 'conditions': // rain, wind, sun over a hill road (no snow: Namibian conditions)
      ring(-0.62, -0.32, 0.13); line([-0.74, -0.38], [-0.62, -0.62], [-0.5, -0.38]);
      line([-0.32, -0.5], [0.12, -0.5]); arc(0.12, -0.6, 0.1, -Math.PI / 2, Math.PI / 2);
      line([-0.32, -0.3], [0.2, -0.3]);
      ring(0.62, -0.4, 0.14);
      for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; line([0.62 + Math.cos(t) * 0.22, -0.4 + Math.sin(t) * 0.22], [0.62 + Math.cos(t) * 0.32, -0.4 + Math.sin(t) * 0.32]); }
      arc(0, 1.05, 0.95, Math.PI * 1.18, Math.PI * 1.82); arc(0, 1.05, 0.62, Math.PI * 1.22, Math.PI * 1.78);
      return true;
    case 'child_seat':
      box(-0.34, -0.8, 0.68, 1.1, 0.22); box(-0.5, 0.22, 1.0, 0.42, 0.12);
      line([-0.24, -0.5], [0.24, -0.5]);
      line([-0.18, -0.36], [0.0, -0.04], [0.18, -0.36]); line([0.0, -0.04], [0.0, 0.22]);
      return true;
    case 'rules':
      box(-0.5, -0.78, 1.0, 1.42, 0.06); line([-0.12, 0.64], [-0.12, 0.88], [0.0, 0.8], [0.12, 0.88], [0.12, 0.64]);
      [-0.48, -0.16, 0.16].forEach(fy => { box(-0.34, fy, 0.18, 0.18, 0.02); line([-0.06, fy + 0.09], [0.34, fy + 0.09]); });
      return true;
    case 'treatment': // chevron alignment marker
      box(-0.5, -0.82, 1.0, 1.0, 0.04);
      line([-0.18, -0.62], [0.16, -0.32], [-0.18, -0.02]); line([0.02, -0.62], [0.36, -0.32], [0.02, -0.02]);
      line([-0.2, 0.18], [-0.2, 0.86]); line([0.2, 0.18], [0.2, 0.86]);
      return true;
    case 'alcohol':
      box(-0.66, -0.86, 0.2, 0.3, 0.03); box(-0.8, -0.56, 0.48, 1.36, 0.12); box(-0.7, -0.1, 0.28, 0.4, 0.04);
      ring(0.38, 0.28, 0.38); line([0.12, 0.02], [0.64, 0.54]);
      return true;
    case 'fatigue':
      ring(0, -0.36, 0.28); arc(0, 0.7, 0.62, Math.PI, Math.PI * 2);
      ring(0, 0.5, 0.3); line([-0.3, 0.5], [0.3, 0.5]);
      line([0.42, -0.74], [0.6, -0.74], [0.42, -0.56], [0.6, -0.56]);
      line([0.7, -0.96], [0.82, -0.96], [0.7, -0.84], [0.82, -0.84]);
      return true;
    case 'steering': // hands on a steering wheel
      ring(0, 0, 0.62); ring(0, 0.04, 0.16);
      line([-0.16, 0.04], [-0.6, -0.04]); line([0.16, 0.04], [0.6, -0.04]); line([0, 0.2], [0, 0.62]);
      arc(-0.66, -0.06, 0.2, Math.PI * 0.55, Math.PI * 1.45); arc(0.66, -0.06, 0.2, -Math.PI * 0.45, Math.PI * 0.45);
      return true;
    case 'walker':
      ring(0.06, -0.76, 0.13);
      line([0.02, -0.6], [-0.04, 0.0]); line([-0.28, -0.22], [0.0, -0.46], [0.26, -0.18]);
      line([-0.04, 0.0], [-0.28, 0.74]); line([-0.04, 0.0], [0.18, 0.32], [0.3, 0.74]);
      return true;
    case 'more':
      dot(-0.5, 0, 0.13); dot(0, 0, 0.13); dot(0.5, 0, 0.13);
      return true;
  }
  return false;
}

/** Convenience: a new Graphics object with one icon drawn at (x, y). */
export function icon(scene, name, x, y, s, color, alpha) {
  return drawIcon(scene.add.graphics(), name, x, y, s, color, alpha);
}
