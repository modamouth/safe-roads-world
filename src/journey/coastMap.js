// ---------------------------------------------------------------------------
// Journey to the Ocean: the route map, drawn from real coordinates (latitude,
// longitude) of central-western Namibia: the Atlantic coast with Walvis Bay's
// lagoon, the dunes south of the Swakop, the Namib gravel plains, savanna and
// the Khomas Hochland, dry riverbeds, the Erongo and Spitzkoppe, and the roads.
//
//   drawCoastMap(scene, area, { towns, here })   towns: the route's stops in order;
//   here: index of the town the next leg starts from (or the end, when done)
// ---------------------------------------------------------------------------
import { COLORS as C, FONT, REDUCE_MOTION } from '../config.js';

const VIEW = { north: -21.3, south: -23.05, west: 14.0, east: 17.25 };
export const PLACES = {
  Windhoek: [-22.56, 17.08], Okahandja: [-21.98, 16.91], Karibib: [-21.94, 15.85], Usakos: [-21.99, 15.59],
  Arandis: [-22.42, 14.98], Swakopmund: [-22.68, 14.53], 'Walvis Bay': [-22.96, 14.51], 'Henties Bay': [-22.12, 14.28],
  Omaruru: [-21.43, 15.93]
};
const COAST = [[-21.3, 13.97], [-21.6, 14.06], [-21.9, 14.17], [-22.12, 14.27], [-22.35, 14.37], [-22.55, 14.46], [-22.68, 14.52],
  [-22.8, 14.52], [-22.93, 14.51], [-22.97, 14.49], [-22.9, 14.45], [-22.88, 14.43], [-22.95, 14.44], [-23.05, 14.45]];
const DUNES = [[-22.7, 14.53], [-22.73, 14.72], [-22.84, 14.86], [-23.05, 15.05], [-23.05, 14.45], [-22.97, 14.5], [-22.8, 14.53]];
const DESERT_EDGE = [[-21.3, 15.05], [-21.8, 15.42], [-22.2, 15.72], [-22.6, 15.92], [-23.05, 16.02]];
const SAVANNA_EDGE = [[-21.3, 16.25], [-22.0, 16.52], [-22.5, 16.62], [-23.05, 16.6]];
const RIVERS = {
  Swakop: [[-21.95, 16.7], [-22.05, 16.35], [-22.2, 15.95], [-22.35, 15.6], [-22.48, 15.3], [-22.56, 15.0], [-22.62, 14.8], [-22.68, 14.54]],
  Khan: [[-21.98, 15.62], [-22.12, 15.4], [-22.3, 15.18], [-22.45, 15.05], [-22.55, 15.0]]
};
// The B2 as driven (Windhoek to Okahandja is the B1), and other roads in grey.
const ROUTE = [['Windhoek'], [-22.3, 17.0], ['Okahandja'], [-21.97, 16.4], ['Karibib'], ['Usakos'], [-22.2, 15.3], ['Arandis'], [-22.56, 14.74], ['Swakopmund']];
const OTHER_ROADS = [
  [PLACES.Okahandja, [-21.3, 16.76]], [PLACES.Windhoek, [-23.05, 17.15]], [PLACES.Swakopmund, PLACES['Walvis Bay']],
  [PLACES.Swakopmund, [-22.4, 14.39], PLACES['Henties Bay']], [PLACES.Karibib, PLACES.Omaruru]
];

export function drawCoastMap(scene, a, { towns, here }) {
  // Equal scale across and down (a degree of longitude is shorter at 22°S).
  const kx = Math.cos(22.2 * Math.PI / 180), k = Math.min(a.w / ((VIEW.east - VIEW.west) * kx), a.h / (VIEW.north - VIEW.south));
  const ox = a.x + (a.w - (VIEW.east - VIEW.west) * kx * k) / 2, oy = a.y + (a.h - (VIEW.north - VIEW.south) * k) / 2;
  const P = ([lat, lon]) => ({ x: ox + (lon - VIEW.west) * kx * k, y: oy + (VIEW.north - lat) * k });
  const g = scene.add.graphics(), labels = [];
  const label = (str, p, o) => labels.push(scene.add.text(p.x, p.y, str, Object.assign({ fontFamily: FONT, fontSize: '11px', color: '#3B2A1C', resolution: 2 }, o)).setOrigin(0.5));
  const poly = (pts, col, alpha) => { g.fillStyle(col, alpha == null ? 1 : alpha); g.fillPoints(pts.map(P), true); };
  const west = VIEW.west - 0.3;

  // Land from the highlands in the east to the dunes on the coast, then the sea.
  g.fillStyle(0x9C9466, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 16);
  poly([[VIEW.north + 0.3, west], ...SAVANNA_EDGE.map(([lat, lon], i) => [i === 0 ? VIEW.north + 0.3 : lat, lon]), [VIEW.south - 0.3, SAVANNA_EDGE[SAVANNA_EDGE.length - 1][1]], [VIEW.south - 0.3, west]], 0xB9A470);
  poly([[VIEW.north + 0.3, west], ...DESERT_EDGE.map(([lat, lon], i) => [i === 0 ? VIEW.north + 0.3 : lat, lon]), [VIEW.south - 0.3, DESERT_EDGE[DESERT_EDGE.length - 1][1]], [VIEW.south - 0.3, west]], 0xDCC9A0);
  poly(DUNES, 0xDD8F4E);
  g.lineStyle(1, 0xB86A33, 0.6);
  for (let i = 0; i < 9; i++) { const p = P([-22.78 - i * 0.03, 14.6 + (i % 3) * 0.1]); g.beginPath(); g.arc(p.x, p.y + 6, 7, Math.PI * 1.15, Math.PI * 1.85); g.strokePath(); }
  poly([[VIEW.north + 0.3, west], ...COAST, [VIEW.south - 0.3, COAST[COAST.length - 1][1]], [VIEW.south - 0.3, west]], 0x3C7896);
  g.lineStyle(1.5, 0xF3E6C8, 0.9); g.strokePoints(COAST.map(P), false);
  g.lineStyle(1, 0xFFFFFF, 0.25);
  for (let i = 0; i < 6; i++) { const p = P([-21.5 - i * 0.27, 14.0 + i * 0.04]); g.lineBetween(p.x - 10, p.y, p.x - 2, p.y - 3); }

  // Mountains: the Erongo massif, the Spitzkoppe, the hills of the Khomas Hochland and near Arandis.
  const e = P([-21.62, 15.62]);
  g.fillStyle(0x6B4A33, 0.95); g.fillEllipse(e.x, e.y, 0.36 * kx * k, 0.26 * k);
  g.fillStyle(0x8A6345, 1); g.fillEllipse(e.x - 4, e.y - 2, 0.22 * kx * k, 0.15 * k);
  const peak = (lat, lon, h, col) => { const p = P([lat, lon]); g.fillStyle(col, 1); g.fillTriangle(p.x - h * 0.7, p.y + h * 0.3, p.x, p.y - h, p.x + h * 0.7, p.y + h * 0.3); };
  peak(-21.83, 15.19, 11, 0x7A4A30);
  [[-22.72, 16.45], [-22.66, 16.62], [-22.78, 16.75], [-22.68, 16.9], [-22.82, 16.98], [-22.4, 16.8], [-22.5, 15.12], [-22.46, 15.22]].forEach(([lat, lon], i) => peak(lat, lon, 6 + (i % 3), 0x6E6545));

  // Dry riverbeds, edged with green.
  Object.values(RIVERS).forEach(r => { g.lineStyle(4, 0x8DA060, 0.55); g.strokePoints(r.map(P), false); g.lineStyle(1.5, 0xE9DDBF, 0.9); g.strokePoints(r.map(P), false); });

  // Roads: others in grey, then the route (done in yellow).
  OTHER_ROADS.forEach(r => { g.lineStyle(3, 0x6E6A64, 0.85); g.strokePoints(r.map(P), false); });
  const route = ROUTE.map(p => (typeof p[0] === 'string' ? PLACES[p[0]] : p)).map(P);
  g.lineStyle(7, 0x2B2A2E, 1); g.strokePoints(route, false);
  g.lineStyle(2, 0xF2F2F2, 0.9); g.strokePoints(route, false);
  const stopAt = name => ROUTE.findIndex(p => p[0] === name);
  if (here > 0) { g.lineStyle(4, C.yellow, 1); g.strokePoints(route.slice(0, stopAt(towns[here]) + 1), false); }

  // Places: route stops bold; other towns small.
  label('Atlantic', P([-22.15, 14.05]), { fontSize: '10px', color: '#DDEFFF', fontStyle: 'italic' }); labels[labels.length - 1].setAngle(-70);
  label('NAMIB', P([-22.72, 15.4]), { fontSize: '12px', color: '#8A6E45', fontStyle: 'bold', letterSpacing: 3 });
  label('Erongo', P([-21.62, 15.62]), { fontSize: '10px', color: '#F3E6C8', fontStyle: 'bold' });
  label('Spitzkoppe', P([-21.73, 15.19]), { fontSize: '10px' });
  label('Khomas Hochland', P([-22.86, 16.35]), { fontSize: '10px', color: '#3B3424' });
  label('Swakop', P([-22.16, 16.08]), { fontSize: '9px', color: '#5E6B3A', fontStyle: 'italic' });
  ['Walvis Bay', 'Henties Bay', 'Omaruru', 'Okahandja', 'Usakos'].forEach(name => {
    const p = P(PLACES[name]);
    g.fillStyle(0xFFFFFF, 1); g.fillCircle(p.x, p.y, 3); g.lineStyle(1.5, 0x2B2A2E, 1); g.strokeCircle(p.x, p.y, 3);
    const below = name === 'Usakos' || name === 'Walvis Bay';
    label(name, { x: p.x + (name === 'Henties Bay' || name === 'Walvis Bay' ? 34 : 0), y: p.y + (below ? 11 : -11) }, { fontSize: '10px', color: '#2B2A2E', backgroundColor: '#FFFFFF99', padding: { x: 2, y: 0 } });
  });
  towns.forEach((name, i) => {
    const p = P(PLACES[name]), reached = i <= here, end = i === towns.length - 1;
    g.fillStyle(reached ? C.yellow : 0xFFFFFF, 1); g.fillCircle(p.x, p.y, end ? 8 : 7);
    g.lineStyle(2.5, C.navy, 1); g.strokeCircle(p.x, p.y, end ? 8 : 7);
    const side = name === 'Windhoek' ? [-10, 14, 1] : name === 'Swakopmund' ? [10, -12, 0] : name === 'Arandis' ? [10, -11, 0] : [0, -16, 0.5];
    labels.push(scene.add.text(p.x + side[0], p.y + side[1], name, { fontFamily: FONT, fontSize: '13px', color: '#0B1B2E', fontStyle: 'bold', backgroundColor: '#FFFFFFE6', padding: { x: 4, y: 1 }, resolution: 2 }).setOrigin(side[2], 0.5));
  });

  // North arrow and a 50 km scale bar (one degree of latitude is about 111 km).
  const n = { x: a.x + a.w - 22, y: a.y + 30 };
  g.fillStyle(0x0B1B2E, 0.9); g.fillTriangle(n.x - 6, n.y + 8, n.x, n.y - 10, n.x + 6, n.y + 8);
  label('N', { x: n.x, y: n.y + 17 }, { fontSize: '11px', color: '#0B1B2E', fontStyle: 'bold' });
  const bar = 50 / 111 * k, bx = a.x + a.w - 22 - bar, by = a.y + a.h - 16;
  g.fillStyle(0x0B1B2E, 0.9); g.fillRect(bx, by, bar, 3); g.fillRect(bx, by - 4, 2, 7); g.fillRect(bx + bar - 2, by - 4, 2, 7);
  label('50 km', { x: bx + bar / 2, y: by - 9 }, { fontSize: '10px', color: '#0B1B2E', fontStyle: 'bold' });

  // Clip to the rounded panel, frame it, and pulse where you are.
  const mask = scene.make.graphics({}, false); mask.fillStyle(0xFFFFFF); mask.fillRoundedRect(a.x, a.y, a.w, a.h, 16);
  g.setMask(mask.createGeometryMask());
  const frame = scene.add.graphics(); frame.lineStyle(2, 0xFFFFFF, 0.25); frame.strokeRoundedRect(a.x, a.y, a.w, a.h, 16);
  labels.push(scene.add.text(a.x + 12, a.y + 12, 'B2', { fontFamily: FONT, fontSize: '14px', color: '#FFFFFF', fontStyle: 'bold', backgroundColor: '#1E6B45', padding: { x: 6, y: 2 }, resolution: 2 }));
  const p = P(PLACES[towns[here]]), ring = scene.add.circle(p.x, p.y, 13).setStrokeStyle(3, C.yellow, 1);
  if (!REDUCE_MOTION) scene.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 1100, repeat: -1 });
}
