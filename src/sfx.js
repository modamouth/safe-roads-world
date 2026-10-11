// ---------------------------------------------------------------------------
// All sound is synthesised with the Web Audio API — no audio files to ship.
// ---------------------------------------------------------------------------
export const Sfx = {
  ctx: null, master: null, muted: false, eng: null,

  init(scene) {
    try {
      const c = scene.sound && scene.sound.context;
      if (!c) return;
      if (this.ctx !== c) {
        this.ctx = c;
        this.master = c.createGain();
        this.master.gain.value = this.muted ? 0 : 0.85;
        this.master.connect(c.destination);
      }
      if (c.state === 'suspended' && c.resume) c.resume();
    } catch (e) { /* audio unavailable; game continues silently */ }
  },

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.85; },

  tone(f, d, type, v, to) {
    const c = this.ctx; if (!c || !this.master) return;
    try {
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v || 0.15, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + d + 0.05);
    } catch (e) {}
  },

  noise(d, v, fc, type) {
    const c = this.ctx; if (!c || !this.master) return;
    try {
      const n = Math.max(1, Math.floor(c.sampleRate * d));
      const b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
      for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(); s.buffer = b;
      const f = c.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = fc || 1200;
      const g = c.createGain(); g.gain.value = v || 0.3;
      s.connect(f); f.connect(g); g.connect(this.master); s.start();
    } catch (e) {}
  },

  click() { this.tone(720, 0.05, 'triangle', 0.09); },
  skid() { this.noise(0.5, 0.16, 2600, 'bandpass'); },

  impact(k) {
    this.noise(0.5 + 0.7 * k, 0.55, 700 + 400 * k);
    this.tone(70, 0.4 + 0.5 * k, 'sine', 0.55, 28);
    this.noise(0.25, 0.22, 5200, 'highpass');
  },

  chime(good) {
    if (good) { this.tone(523, 0.14, 'triangle', 0.12); setTimeout(() => this.tone(784, 0.22, 'triangle', 0.12), 120); }
    else { this.tone(220, 0.3, 'sawtooth', 0.08, 150); }
  },

  startEngine() {
    const c = this.ctx; if (!c || !this.master || this.eng) return;
    try {
      const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0.0001;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
      o.start(); o2.start();
      g.gain.linearRampToValueAtTime(0.06, c.currentTime + 0.4);
      this.eng = { o, o2, f, g };
    } catch (e) {}
  },

  setEngine(kmh) {
    const e = this.eng; if (!e) return;
    const t = this.ctx.currentTime;
    e.o.frequency.setTargetAtTime(38 + kmh * 1.05, t, 0.08);
    e.o2.frequency.setTargetAtTime(19 + kmh * 0.52, t, 0.08);
    e.f.frequency.setTargetAtTime(300 + kmh * 7, t, 0.1);
  },

  stopEngine() {
    const e = this.eng; if (!e) return; this.eng = null;
    try {
      const t = this.ctx.currentTime;
      e.g.gain.cancelScheduledValues(t);
      e.g.gain.setTargetAtTime(0.0001, t, 0.05);
      e.o.stop(t + 0.4); e.o2.stop(t + 0.4);
    } catch (x) {}
  }
};
