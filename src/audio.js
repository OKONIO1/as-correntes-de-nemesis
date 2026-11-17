// =============================================================
// audio.js — todos os sons são SINTETIZADOS na hora com a Web Audio API
// (não existe nenhum arquivo de áudio). Cada som é uma combinação de
// "osciladores" (geram tons) e "ruído" (chiado, bom para golpes).
// =============================================================

const Sound = {
  ctx: null,       // o "motor" de áudio do navegador
  master: null,    // volume geral
  sfx: null,       // volume dos efeitos
  music: null,     // volume da música
  noiseBuf: null,  // 1 segundo de chiado pré-gerado
  muted: false,
  musicTimer: null,
  musicTheme: null,
  musicStep: 0,
  nextNoteTime: 0,

  // O navegador só deixa tocar som depois de um clique/tecla do jogador
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    const comp = this.ctx.createDynamicsCompressor(); // evita estourar o som
    comp.connect(this.ctx.destination);
    this.master = this.ctx.createGain();
    this.master.connect(comp);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.8;
    this.sfx.connect(this.master);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.32;
    this.music.connect(this.master);

    // Ruído branco: valores aleatórios entre -1 e 1
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    try { this.muted = localStorage.getItem('nemesis-mudo') === '1'; } catch (e) { /* sem storage */ }
    this.master.gain.value = this.muted ? 0 : 0.7;
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
    try { localStorage.setItem('nemesis-mudo', this.muted ? '1' : '0'); } catch (e) { /* ok */ }
  },

  // ---------- blocos básicos ----------

  // Um tom: frequência inicial -> final, com volume que some no fim
  tone(o) {
    if (!this.ctx) return;
    const t = o.at !== undefined ? o.at : this.ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.2;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freq2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (o.lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lowpass;
      g.connect(f);
      out = f;
    }
    osc.connect(g);
    out.connect(o.dest || this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  // Chiado filtrado (whoosh, impacto, explosão)
  noise(o) {
    if (!this.ctx) return;
    const t = o.at !== undefined ? o.at : this.ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.2;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.freq2) f.frequency.exponentialRampToValueAtTime(o.freq2, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  },

  // ---------- efeitos do jogo ----------
  swing(step) {
    this.noise({ dur: 0.18, vol: 0.22, freq: 700 + step * 250, freq2: 3200, q: 2.5 });
    // tilintar da corrente
    this.tone({ freq: 1500 + step * 200, freq2: 1100, dur: 0.06, type: 'square', vol: 0.03 });
  },
  hit(strong) {
    this.noise({ dur: 0.12, vol: 0.45, freq: 1800, freq2: 300, filter: 'lowpass' });
    this.tone({ freq: strong ? 160 : 200, freq2: 45, dur: strong ? 0.25 : 0.14, type: 'sine', vol: 0.55 });
  },
  clank() { // golpe em armadura de bronze
    this.tone({ freq: 880, freq2: 700, dur: 0.18, type: 'square', vol: 0.08 });
    this.tone({ freq: 1320, freq2: 1250, dur: 0.25, type: 'triangle', vol: 0.12 });
    this.noise({ dur: 0.06, vol: 0.2, freq: 4000, filter: 'highpass' });
  },
  block() {
    this.tone({ freq: 600, freq2: 500, dur: 0.12, type: 'square', vol: 0.1 });
    this.tone({ freq: 1800, freq2: 1600, dur: 0.15, type: 'triangle', vol: 0.08 });
  },
  jump(double) {
    this.tone({ freq: double ? 380 : 240, freq2: double ? 760 : 480, dur: 0.12, type: 'square', vol: 0.06, lowpass: 1800 });
  },
  land() { this.noise({ dur: 0.08, vol: 0.15, freq: 400, filter: 'lowpass' }); },
  dash() { this.noise({ dur: 0.22, vol: 0.25, freq: 600, freq2: 4000, q: 1.5 }); },
  hurt() {
    this.tone({ freq: 320, freq2: 110, dur: 0.28, type: 'sawtooth', vol: 0.18, lowpass: 1500 });
    this.noise({ dur: 0.15, vol: 0.3, freq: 900, filter: 'lowpass' });
  },
  enemySwing() { this.noise({ dur: 0.15, vol: 0.12, freq: 500, freq2: 1800, q: 2 }); },
  enemyDie() {
    this.tone({ freq: 220, freq2: 60, dur: 0.35, type: 'sawtooth', vol: 0.12, lowpass: 900 });
    this.noise({ dur: 0.25, vol: 0.2, freq: 700, filter: 'lowpass' });
  },
  bones() { // esqueleto se desfazendo
    for (let i = 0; i < 4; i++) this.tone({ freq: rand(700, 1300), dur: 0.05, type: 'triangle', vol: 0.08, delay: i * 0.05 });
  },
  playerDeath() {
    this.tone({ freq: 260, freq2: 40, dur: 1.2, type: 'sawtooth', vol: 0.2, lowpass: 800 });
    this.tone({ freq: 130, freq2: 30, dur: 1.4, type: 'sine', vol: 0.3 });
  },
  orb(green) {
    this.tone({ freq: green ? 880 : 660, freq2: green ? 1320 : 990, dur: 0.1, type: 'sine', vol: 0.12 });
  },
  fail() { this.tone({ freq: 140, freq2: 110, dur: 0.15, type: 'square', vol: 0.08 }); },
  furyCharge() { this.tone({ freq: 200, freq2: 800, dur: 0.22, type: 'sawtooth', vol: 0.1, lowpass: 2000 }); },
  furyBlast() {
    this.noise({ dur: 0.8, vol: 0.5, freq: 2000, freq2: 120, filter: 'lowpass' });
    this.tone({ freq: 110, freq2: 30, dur: 0.7, type: 'sine', vol: 0.7 });
    this.tone({ freq: 220, freq2: 55, dur: 0.5, type: 'sawtooth', vol: 0.12, lowpass: 1200 });
  },
  roar(pitch) {
    const p = pitch || 1;
    this.tone({ freq: 95 * p, freq2: 55 * p, dur: 1.2, type: 'sawtooth', vol: 0.25, attack: 0.1, lowpass: 700 });
    this.tone({ freq: 140 * p, freq2: 70 * p, dur: 1.1, type: 'square', vol: 0.08, attack: 0.1, lowpass: 500 });
    this.noise({ dur: 1.1, vol: 0.25, freq: 500, freq2: 200, filter: 'lowpass', attack: 0.1 });
  },
  shoot() { this.tone({ freq: 520, freq2: 180, dur: 0.25, type: 'sine', vol: 0.12 }); },
  fireball() { this.noise({ dur: 0.4, vol: 0.25, freq: 300, freq2: 1200, filter: 'lowpass' }); },
  explode() {
    this.noise({ dur: 0.7, vol: 0.5, freq: 1200, freq2: 80, filter: 'lowpass' });
    this.tone({ freq: 80, freq2: 30, dur: 0.6, type: 'sine', vol: 0.5 });
  },
  crash() { // minotauro batendo na parede
    this.noise({ dur: 0.9, vol: 0.6, freq: 800, freq2: 60, filter: 'lowpass' });
    this.tone({ freq: 60, freq2: 25, dur: 0.8, type: 'sine', vol: 0.7 });
  },
  portal() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.1, delay: i * 0.09 }));
  },
  win() {
    [392, 523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.6, type: 'triangle', vol: 0.12, delay: i * 0.12 }));
    this.tone({ freq: 131, dur: 1.4, type: 'sawtooth', vol: 0.08, lowpass: 600, delay: 0.1 });
  },
  select() { this.tone({ freq: 600, freq2: 900, dur: 0.07, type: 'triangle', vol: 0.1 }); },
  step() { this.noise({ dur: 0.06, vol: 0.05, freq: 300 + Math.random() * 200, filter: 'lowpass' }); },
  thunder() {
    this.noise({ dur: 0.15, vol: 0.5, freq: 2500, filter: 'highpass' });
    this.noise({ dur: 1.2, vol: 0.45, freq: 400, freq2: 80, filter: 'lowpass' });
    this.tone({ freq: 70, freq2: 35, dur: 0.9, type: 'sawtooth', vol: 0.12, lowpass: 300 });
  },
  chest() { this.tone({ freq: 200, freq2: 120, dur: 0.25, type: 'square', vol: 0.06, lowpass: 900 }); this.win(); },
  chain() { this.noise({ dur: 0.12, vol: 0.06, freq: 3000, freq2: 6000, q: 4 }); },

  arrow() { this.noise({ dur: 0.35, vol: 0.12, freq: 5200, freq2: 1800, q: 9 }); },     // flecha assobiando
  heartbeat() {                                                                           // coração com pouca vida
    this.tone({ freq: 62, freq2: 40, dur: 0.16, type: 'sine', vol: 0.35 });
    this.tone({ freq: 58, freq2: 38, dur: 0.18, type: 'sine', vol: 0.25, delay: 0.2 });
  },
  menu() { this.tone({ freq: 440, freq2: 660, dur: 0.06, type: 'triangle', vol: 0.06 }); },

  // ---------- volumes (salvos nas opções) ----------
  volMusic: 0.32, volSfx: 0.8,
  setVolumes(music, sfx) {
    this.volMusic = music; this.volSfx = sfx;
    if (!this.ctx) return;
    this.music.gain.value = music;
    this.sfx.gain.value = sfx;
  },

  // =========================================================
  // MÚSICA PROCEDURAL — composta na hora, nota a nota
  //  • escala frígia dominante (som "grego/épico")
  //  • melodia + baixo + ACORDES de fundo (pad) + CORO ("aah")
  //  • tambores de guerra; uma CAMADA DE COMBATE cresce quando há
  //    inimigos por perto (setIntensity) e a dos chefes é mais pesada
  // mood: 'calm' | 'dark' | 'epic'
  // =========================================================
  intensity: 0, intensityTarget: 0,
  setIntensity(v) { this.intensityTarget = clamp(v, 0, 1); },

  startMusic(theme) {
    if (!this.ctx) return;
    this.stopMusic();
    this.music.gain.value = this.volMusic;
    const rng = makeRng(theme.seed || 1);
    const melody = [];
    let deg = 4;
    for (let i = 0; i < 64; i++) {
      if (i % 2 === 0 && rng() < 0.55) { deg = clamp(deg + Math.floor(rng() * 5) - 2, 0, 9); melody.push(deg); }
      else melody.push(null);
    }
    // 4 acordes (graus da escala) que se repetem a cada 2 compassos
    const prog = [0, choose([3, 5]), choose([4, 6]), choose([1, 5])];
    this.musicTheme = Object.assign({ tempo: 96, root: 50, mood: 'epic', boss: false }, theme, { melody, prog, baseTempo: theme.tempo || 96 });
    this.musicStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduler(), 30);
  },
  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  },
  setBossMusic(on) {
    if (!this.musicTheme) return;
    this.musicTheme.boss = on;
    this.musicTheme.tempo = on ? Math.max(128, this.musicTheme.baseTempo + 30) : this.musicTheme.baseTempo;
  },
  scheduler() {
    if (!this.ctx || !this.musicTheme) return;
    this.intensity += (this.intensityTarget - this.intensity) * 0.04;
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.musicStep, this.nextNoteTime);
      this.nextNoteTime += 60 / this.musicTheme.tempo / 4; // semicolcheia
      this.musicStep++;
    }
  },
  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  // uma voz de "coro": dente-de-serra passando por filtros de formantes da vogal "a"
  voice(freq, t, dur, vol) {
    const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = freq;
    const vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = 5; vg.gain.value = freq * 0.012; vib.connect(vg); vg.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [f, q, k] of [[730, 8, 1], [1090, 10, 0.6], [2440, 12, 0.25]]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const kg = c.createGain(); kg.gain.value = k;
      osc.connect(bp); bp.connect(kg); kg.connect(g);
    }
    g.connect(this.music);
    osc.start(t); vib.start(t); osc.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  },

  playStep(step, t) {
    const th = this.musicTheme, s = step % 32, bar2 = Math.floor(step / 32) % 4;
    const scale = [0, 1, 4, 5, 7, 8, 10]; // frígio dominante
    const note = (deg, oct) => th.root + 12 * (oct || 1) + scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
    const dest = this.music, boss = th.boss, dark = th.mood === 'dark', calm = th.mood === 'calm';
    const I = boss ? 1 : this.intensity;
    const chord = th.prog[bar2];

    // ACORDES de fundo (pad): 3 notas, duas ondas levemente desafinadas
    if (s === 0) {
      for (const d of [0, 2, 4]) {
        const f = this.midi(note(chord + d, 0));
        for (const det of [1, 1.006]) this.tone({ at: t, freq: f * det, dur: 60 / th.tempo * 8, type: 'sawtooth', vol: dark ? 0.035 : 0.028, attack: 0.6, lowpass: dark ? 500 : 800, dest });
      }
    }
    // CORO: entra nas partes épicas, com os chefes e no combate
    if ((s === 0 || s === 16) && (th.mood === 'epic' || boss || I > 0.5)) {
      this.voice(this.midi(note(chord + (s ? 2 : 4), 1)), t, 60 / th.tempo * 4, boss ? 0.05 : 0.035);
    }
    // bumbo de guerra
    const kick = boss ? (s % 4 === 0 || s === 14 || s === 30) : calm ? (s % 16 === 0) : (s % 8 === 0 || s === 22);
    if (kick) this.tone({ at: t, freq: 120, freq2: 40, dur: 0.3, type: 'sine', vol: 0.7, dest });
    // tambor de pele
    if (s % 8 === 4 || (boss && s % 8 === 6)) this.noise({ at: t, dur: 0.15, vol: calm ? 0.15 : 0.25, freq: 900, filter: 'bandpass', q: 0.8, dest });
    // CAMADA DE COMBATE: tom-tons e chocalho, mais fortes quanto maior a tensão
    if (I > 0.15) {
      if (s % 2 === 0) this.noise({ at: t, dur: 0.04, vol: 0.08 * I, freq: 7000, filter: 'highpass', dest });
      if ([3, 7, 10, 11, 19, 23, 26, 27].includes(s)) this.tone({ at: t, freq: s % 4 === 3 ? 150 : 110, freq2: 60, dur: 0.18, type: 'sine', vol: 0.4 * I, dest });
    }
    // baixo contínuo (segue o acorde)
    if (s % 16 === 0) this.tone({ at: t, freq: this.midi(note(chord, -1)), dur: 1.8, type: 'sawtooth', vol: 0.12, attack: 0.05, lowpass: 380, dest });
    if (boss && s % 4 === 2) this.tone({ at: t, freq: this.midi(note(chord, -1)), dur: 0.2, type: 'square', vol: 0.06, lowpass: 500, dest });
    // melodia (lira); nas calmas toca uma oitava mais alta e mais suave
    const m = th.melody[(step % 64)];
    if (m !== null && m !== undefined) {
      this.tone({ at: t, freq: this.midi(note(m, calm ? 2 : 1)), dur: 0.4, type: 'triangle', vol: calm ? 0.07 : 0.09, attack: 0.01, dest });
      if (boss || I > 0.6) this.tone({ at: t, freq: this.midi(note(m, 0)), dur: 0.3, type: 'sawtooth', vol: 0.04, lowpass: 1200, dest });
    }
  },
};
