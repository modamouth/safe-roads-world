import { W, H, COLORS as C } from './config.js';

const HY = 330;   // horizon line (design px) of the drawn fallback sky

/**
 * Builds every drawn (code-generated) texture used as a fallback when the
 * photo assets haven't loaded, plus a few textures used regardless
 * (debris particles, glow, grain, silhouette/haze blends).
 */
export function buildTextures(scene) {
  const mk = (key, w, h, fn) => {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // --- Drawn fallback: player car, rear view ---
  mk('carRear', 220, 170, g => {
    g.fillStyle(0x000000, 0.32); g.fillEllipse(110, 160, 204, 20);
    g.fillStyle(0x0D1117, 1); g.fillRoundedRect(22, 120, 40, 40, 8); g.fillRoundedRect(158, 120, 40, 40, 8);
    g.fillStyle(0xE9EDF2, 1); g.fillRoundedRect(30, 20, 160, 74, { tl: 26, tr: 26, bl: 8, br: 8 });
    g.fillStyle(0xF6F8FA, 1); g.fillRoundedRect(12, 70, 196, 72, { tl: 14, tr: 14, bl: 10, br: 10 });
    g.fillStyle(0x17222F, 1); g.fillRoundedRect(44, 32, 132, 42, { tl: 16, tr: 16, bl: 5, br: 5 });
    g.fillStyle(0x2C4058, 1); g.fillTriangle(60, 72, 104, 34, 132, 34);
    g.fillStyle(0xE5484D, 1); g.fillRect(96, 38, 28, 4);
    g.fillRoundedRect(16, 78, 30, 18, 5); g.fillRoundedRect(174, 78, 30, 18, 5);
    g.fillStyle(0xFF9A9E, 1); g.fillRect(20, 82, 12, 3); g.fillRect(178, 82, 12, 3);
    g.fillStyle(0x222B36, 1); g.fillRoundedRect(14, 124, 192, 18, 6);
    g.fillStyle(0xFFFBEA, 1); g.fillRect(84, 100, 52, 20);
    g.lineStyle(2, 0x222B36, 1); g.strokeRect(84, 100, 52, 20);
    g.fillStyle(0x222B36, 1); g.fillRect(92, 106, 6, 8); g.fillRect(104, 106, 6, 8); g.fillRect(116, 106, 6, 8);
  });

  // --- Drawn fallback: kudu, side view facing right ---
  mk('kudu', 240, 210, g => {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(120, 204, 170, 14);
    g.fillStyle(0x6B5039, 1);
    g.fillRoundedRect(58, 140, 9, 62, 3); g.fillRoundedRect(78, 142, 9, 60, 3);
    g.fillRoundedRect(152, 140, 9, 62, 3); g.fillRoundedRect(172, 142, 9, 60, 3);
    g.fillTriangle(48, 114, 22, 142, 56, 134);
    g.fillStyle(0x8B6B4C, 1); g.fillEllipse(118, 128, 150, 68);
    g.fillPoints([{ x: 168, y: 112 }, { x: 198, y: 74 }, { x: 222, y: 88 }, { x: 190, y: 138 }], true);
    g.fillEllipse(220, 82, 40, 20);
    g.fillStyle(0x5B4431, 1); g.fillPoints([{ x: 170, y: 108 }, { x: 196, y: 70 }, { x: 204, y: 76 }, { x: 178, y: 116 }], true);
    g.fillStyle(0x8B6B4C, 1); g.fillTriangle(210, 74, 202, 54, 224, 72);
    g.lineStyle(3, 0xF2E8D4, 0.85);
    [84, 100, 116, 132, 148].forEach(x => g.lineBetween(x, 100, x - 2, 152));
    g.fillStyle(0x1A1410, 1); g.fillCircle(226, 80, 3);
    g.lineStyle(5, 0xE8DCC3, 1);
    g.strokePoints([{ x: 212, y: 72 }, { x: 204, y: 50 }, { x: 216, y: 36 }, { x: 206, y: 20 }, { x: 218, y: 8 }], false);
    g.strokePoints([{ x: 220, y: 72 }, { x: 214, y: 52 }, { x: 226, y: 38 }, { x: 217, y: 22 }, { x: 229, y: 10 }], false);
  });

  // --- Drawn fallback: umbrella thorn acacia ---
  mk('acacia', 260, 230, g => {
    g.fillStyle(0x5B4029, 1);
    g.fillPoints([{ x: 120, y: 230 }, { x: 132, y: 230 }, { x: 134, y: 130 }, { x: 156, y: 92 }, { x: 146, y: 86 }, { x: 126, y: 110 }, { x: 112, y: 88 }, { x: 102, y: 94 }, { x: 118, y: 134 }], true);
    g.fillStyle(0x4E5A2A, 1); g.fillEllipse(130, 86, 232, 44);
    g.fillStyle(0x6B7A34, 1); g.fillEllipse(130, 74, 222, 40);
    g.fillStyle(0x7F8F3E, 1); g.fillEllipse(116, 62, 150, 26); g.fillEllipse(182, 66, 100, 22);
  });

  mk('bush', 120, 70, g => {
    g.fillStyle(0x000000, 0.2); g.fillEllipse(60, 64, 100, 10);
    g.fillStyle(0x6F6A32, 1); g.fillEllipse(35, 48, 64, 36);
    g.fillStyle(0x7E7738, 1); g.fillEllipse(70, 44, 76, 42);
    g.fillStyle(0x8A8440, 1); g.fillEllipse(52, 36, 60, 36);
  });

  mk('post', 16, 64, g => {
    g.fillStyle(0xF5F5F5, 1); g.fillRect(3, 4, 10, 60);
    g.fillStyle(C.red, 1); g.fillRect(3, 10, 10, 12);
  });

  // Animal warning sign
  mk('sign', 90, 120, g => {
    g.fillStyle(0x8A94A0, 1); g.fillRect(43, 60, 4, 60);
    g.fillStyle(0xD93A3F, 1); g.fillPoints([{ x: 45, y: 4 }, { x: 88, y: 74 }, { x: 2, y: 74 }], true);
    g.fillStyle(0xFFFFFF, 1); g.fillPoints([{ x: 45, y: 17 }, { x: 76, y: 68 }, { x: 14, y: 68 }], true);
    g.fillStyle(0x1B1B1B, 1);
    g.fillEllipse(44, 52, 24, 10); g.fillRect(34, 54, 3, 10); g.fillRect(52, 54, 3, 10);
    g.fillEllipse(58, 44, 8, 6); g.fillRect(56, 34, 2, 10); g.fillRect(60, 34, 2, 10);
  });

  mk('dot', 8, 8, g => { g.fillStyle(0xFFFFFF, 1); g.fillRect(0, 0, 8, 8); });
  mk('shard', 10, 10, g => { g.fillStyle(0xFFFFFF, 1); g.fillTriangle(0, 10, 10, 10, 5, 0); });

  mk('shadow', 128, 40, g => {
    g.fillStyle(0x000000, 0.16); g.fillEllipse(64, 20, 126, 36);
    g.fillStyle(0x000000, 0.22); g.fillEllipse(64, 20, 100, 26);
    g.fillStyle(0x000000, 0.30); g.fillEllipse(64, 20, 70, 16);
  });

  // --- Canvas textures (gradients, grain, silhouettes) ---
  const glow = scene.textures.createCanvas('glow', 128, 128), gc = glow.getContext();
  const rg = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,240,200,0.55)'); rg.addColorStop(1, 'rgba(255,240,200,0)');
  gc.fillStyle = rg; gc.fillRect(0, 0, 128, 128); glow.refresh();

  const vig = scene.textures.createCanvas('vig', 270, 480), vc = vig.getContext();
  const vg = vc.createRadialGradient(135, 240, 120, 135, 240, 330);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  vc.fillStyle = vg; vc.fillRect(0, 0, 270, 480); vig.refresh();

  // Dusk sky with mountains (fallback, used if the photo sky hasn't loaded)
  const skyH = HY + 40;
  const sky = scene.textures.createCanvas('sky', W * 2, skyH * 2), sc = sky.getContext();
  sc.scale(2, 2);
  const sg = sc.createLinearGradient(0, 0, 0, skyH);
  sg.addColorStop(0, '#132347'); sg.addColorStop(0.3, '#4B3F7A'); sg.addColorStop(0.6, '#C65B72');
  sg.addColorStop(0.85, '#F29A5B'); sg.addColorStop(1, '#F7C27A');
  sc.fillStyle = sg; sc.fillRect(0, 0, W, skyH);
  const sun = sc.createRadialGradient(360, 296, 0, 360, 296, 170);
  sun.addColorStop(0, 'rgba(255,236,170,0.95)'); sun.addColorStop(0.25, 'rgba(255,200,120,0.55)'); sun.addColorStop(1, 'rgba(255,170,100,0)');
  sc.fillStyle = sun; sc.fillRect(0, 100, W, 280);
  sc.fillStyle = '#FFE7A8'; sc.beginPath(); sc.arc(360, 296, 30, 0, Math.PI * 2); sc.fill();
  const ridge = (base, amp, col, a, b, cc) => {
    sc.fillStyle = col; sc.beginPath(); sc.moveTo(0, HY + 6);
    for (let x = 0; x <= W; x += 6) {
      const y = base - (Math.sin(x * a) * 0.55 + Math.sin(x * b + 1.3) * 0.32 + Math.sin(x * cc + 2.1) * 0.13 + 0.6) * amp;
      sc.lineTo(x, y);
    }
    sc.lineTo(W, HY + 6); sc.closePath(); sc.fill();
  };
  ridge(HY - 2, 54, '#7B4E72', 0.011, 0.027, 0.06);
  ridge(HY + 2, 34, '#5A3A55', 0.017, 0.041, 0.09);
  ridge(HY + 5, 16, '#3F2C42', 0.03, 0.07, 0.12);
  const hz = sc.createLinearGradient(0, HY - 50, 0, HY + 6);
  hz.addColorStop(0, 'rgba(245,176,108,0)'); hz.addColorStop(1, 'rgba(245,176,108,0.55)');
  sc.fillStyle = hz; sc.fillRect(0, HY - 50, W, 56);
  sky.refresh();

  // Soft dusk backdrop used on menu-style scenes (Predict, Reveal, Passport)
  const bd = scene.textures.createCanvas('bgdusk', W, H), bc = bd.getContext();
  const bgr = bc.createLinearGradient(0, 0, 0, H);
  bgr.addColorStop(0, '#0A1424'); bgr.addColorStop(0.55, '#16223F'); bgr.addColorStop(0.85, '#3A2A48'); bgr.addColorStop(1, '#5A3446');
  bc.fillStyle = bgr; bc.fillRect(0, 0, W, H);
  const bgl = bc.createRadialGradient(W * 0.72, H, 10, W * 0.72, H, 420);
  bgl.addColorStop(0, 'rgba(242,154,91,0.30)'); bgl.addColorStop(1, 'rgba(242,154,91,0)');
  bc.fillStyle = bgl; bc.fillRect(0, 0, W, H);
  bd.refresh();
}
