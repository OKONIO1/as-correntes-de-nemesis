// =============================================================
// menus.js — telas e botões (início, pausa, opções, morte,
// fase concluída, créditos) e as OPÇÕES salvas no navegador.
// =============================================================

// ---------- OPÇÕES ----------
const Options = {
  KEY: 'nemesis3d-opcoes',
  data: { music: 0.6, sfx: 0.8, camDist: 15, quality: 'alta', shake: true, fps: false },
  load() {
    if (Touch.enabled) Object.assign(this.data, { quality: 'media', camDist: 13 }); // celular: mais leve e câmera mais perto
    try { Object.assign(this.data, JSON.parse(localStorage.getItem(this.KEY)) || {}); } catch (e) { /* sem storage */ }
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ok */ } },

  // aplica tudo no jogo (volume, câmera, qualidade, FPS)
  apply() {
    const d = this.data;
    Sound.setVolumes(d.music * 0.55, d.sfx);
    game.camDist = d.camDist;
    const q = { alta: { pr: 1.5, shadow: 2048 }, media: { pr: 1, shadow: 1024 }, baixa: { pr: 0.75, shadow: 0 } }[d.quality] || { pr: 1.5, shadow: 2048 };
    renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
    resize();
    const wantShadow = q.shadow > 0;
    if (sun.castShadow !== wantShadow || (wantShadow && sun.shadow.mapSize.x !== q.shadow)) {
      sun.castShadow = wantShadow;
      if (wantShadow) {
        sun.shadow.mapSize.set(q.shadow, q.shadow);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
    }
    Post.setQuality(d.quality);
    setFpsMeter(d.fps);
  },

  // liga os controles da tela de opções
  bind() {
    const $ = (id) => document.getElementById(id);
    const d = this.data;
    const fields = [['optMusic', 'music', 'value'], ['optSfx', 'sfx', 'value'], ['optCam', 'camDist', 'value'], ['optQuality', 'quality', 'value'], ['optShake', 'shake', 'checked'], ['optFps', 'fps', 'checked']];
    for (const [id, key, prop] of fields) {
      const el = $(id);
      el[prop] = d[key];
      el.addEventListener('input', () => {
        d[key] = prop === 'checked' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value);
        this.apply(); this.save();
        if (id === 'optSfx') Sound.menu();
      });
    }
  },
};

// ---------- FLUXO ENTRE TELAS ----------
const BOSS_PHASES = [1, 3, 5, 7, 9]; // fases (0..9) que terminam com chefe
const OVERLAYS = ['start', 'pause', 'complete', 'dead', 'options'];
function hideOverlays() { for (const id of OVERLAYS) UI.show(id, false); }

// Começa (ou recomeça) uma fase: escurece, monta, mostra a abertura
// story = true: antes de jogar, mostra o capítulo da história (e o prólogo na fase 1)
function playLevel(i, story) {
  Touch.goFullscreen();
  Sound.init();
  Sound.select();
  UI.fade(() => {
    hideOverlays();
    loadLevel(i);
    Options.apply();
    game.camYaw = -0.35;
    Sound.startMusic(game.level.music || { tempo: 90, root: 50, seed: 3 });
    const begin = () => {
      game.state = 'playing';
      UI.show('hud', true);
      UI.intro(i, game.level.title, game.level.sub);
      last = performance.now();
    };
    // capítulo = cena animada (cine_story.js), com a música da própria fase
    const chapter = () => { game.state = 'story'; Cine.play([CHAPTER_SHOTS[i]], begin, { music: false }); };
    if (story && i === 0) {
      // fase 1: primeiro o PRÓLOGO ANIMADO, depois o capítulo I
      game.state = 'story';
      Cine.play(SHOTS.concat([CHAPTER_SHOTS[0]]), () => { Sound.startMusic(game.level.music || { tempo: 90, root: 50, seed: 3 }); begin(); });
    } else if (story) chapter();
    else begin();
    last = performance.now();
  });
}
// (nome antigo usado em outros lugares)
function startGame(i) { playLevel(i || 0, true); }

function backToMenu() {
  Sound.stopMusic();
  UI.fade(() => { location.reload(); }); // recarrega: volta ao menu com tudo limpo (o progresso fica salvo)
}

const Menus = {
  optionsFrom: 'start',

  page(name) {
    for (const p of document.querySelectorAll('#start .page')) p.classList.add('hidden');
    document.getElementById('page-' + name).classList.remove('hidden');
    Sound.menu();
  },

  openOptions(from) {
    this.optionsFrom = from;
    UI.show(from, false);
    UI.show('options', true);
  },
  closeOptions() {
    UI.show('options', false);
    UI.show(this.optionsFrom, true);
    Sound.menu();
  },

  buildLevelGrid() {
    const grid = document.getElementById('levelGrid');
    grid.innerHTML = '';
    PHASES.forEach((P, i) => {
      const b = document.createElement('button');
      const locked = i + 1 > Save.data.unlocked;
      b.className = 'level-btn' + (locked ? ' locked' : '') + (BOSS_PHASES.includes(i) ? ' boss' : '');
      b.disabled = locked;
      b.title = P.sub || '';
      b.innerHTML = `<span class="num">${locked ? '🔒' : i + 1}</span><span class="lname">${P.name}${BOSS_PHASES.includes(i) ? ' <small>(chefe)</small>' : ''}</span>`;
      b.addEventListener('click', () => playLevel(i, true));
      grid.appendChild(b);
    });
    // gancho para a continuação: as próximas fases entram aqui (PHASES + CHAPTER_SHOTS)
    const next = document.createElement('button');
    next.className = 'level-btn locked part2'; next.disabled = true;
    next.innerHTML = '<span class="num">II</span><span class="lname">Parte II — em breve <small>(a espada de Ares voltou a arder…)</small></span>';
    grid.appendChild(next);
    const cont = document.getElementById('btnContinue');
    cont.classList.toggle('hidden', Save.data.unlocked <= 1);
    cont.textContent = 'Continuar — Fase ' + Save.data.unlocked + ': ' + PHASES[Save.data.unlocked - 1].name;
  },

  init() {
    const $ = (id) => document.getElementById(id);
    Story.init();
    if (Touch.enabled) for (const el of document.querySelectorAll('#story .next')) el.textContent = 'Toque para continuar';
    Cine.init();
    for (const b of document.querySelectorAll('#start [data-page]')) b.addEventListener('click', () => this.page(b.dataset.page));
    this.buildLevelGrid();
    $('btnPlay').addEventListener('click', () => playLevel(0, true));
    $('btnContinue').addEventListener('click', () => playLevel(Save.data.unlocked - 1, true));
    $('btnReset').addEventListener('click', () => { if (confirm('Apagar os poderes e as fases liberadas?')) { Save.reset(); location.reload(); } });
    $('btnOptionsStart').addEventListener('click', () => this.openOptions('start'));
    $('btnOptionsPause').addEventListener('click', () => this.openOptions('pause'));
    $('btnOptionsBack').addEventListener('click', () => this.closeOptions());
    // pausa
    $('btnResume').addEventListener('click', resumeGame);
    $('btnCheckpoint').addEventListener('click', () => {
      if (!game.checkpoint) return;
      UI.fade(() => { UI.show('pause', false); if (Sound.ctx) Sound.ctx.resume(); Phase.respawnAtCheckpoint(game); game.state = 'playing'; last = performance.now(); });
    });
    $('btnRestart').addEventListener('click', () => { if (Sound.ctx) Sound.ctx.resume(); playLevel(game.levelKey); });
    // fim de fase, morte
    $('btnRetry').addEventListener('click', retryLevel);
    $('btnNext').addEventListener('click', () => playLevel(game.levelKey + 1, true));
    $('btnCredits').addEventListener('click', () => { UI.show('complete', false); UI.show('start', true); this.page('credits'); });
    for (const id of ['btnMenuPause', 'btnMenuDead', 'btnMenuComplete']) $(id).addEventListener('click', () => { if (Sound.ctx) Sound.ctx.resume(); backToMenu(); });
    // som nos botões
    for (const b of document.querySelectorAll('button')) b.addEventListener('mouseenter', () => Sound.ctx && Sound.menu());

    addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && game.state === 'start' && !document.getElementById('start').classList.contains('hidden')) playLevel(Math.max(0, Save.data.unlocked - 1), true);
      if ((e.code === 'Enter' || e.code === 'KeyR') && game.state === 'dead') retryLevel();
      if (e.code === 'Enter' && game.state === 'complete' && game.levelKey < PHASES.length - 1) playLevel(game.levelKey + 1, true);
    });
  },
};
