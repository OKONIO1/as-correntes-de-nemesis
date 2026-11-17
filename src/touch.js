// =============================================================
// touch.js — CONTROLES DE CELULAR (Android e iPhone).
//
//   • Analógico virtual: toque e arraste no lado ESQUERDO da tela
//   • Botões à direita: ATACAR, GIRO, PULO, ESQUIVA, PODER, USAR
//   • Toque nos ícones dos poderes (1–4) para usar cada um
//   • Botão ❚❚ no topo = pausa
//
// Os botões "apertam" as mesmas teclas do teclado (J, K, Espaço…),
// então o resto do jogo funciona igual. O analógico dá direção
// em qualquer ângulo (Input.stick).
// Para testar no computador: abra o jogo com ?touch=1 no endereço.
// =============================================================

const Touch = {
  enabled: (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search),

  init() {
    if (!this.enabled) return;
    document.body.classList.add('touch');
    const root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = `
      <div id="stickZone"><div id="stickBase"><div id="stickKnob"></div></div></div>
      <div id="tbtns">
        <button class="tb big" data-key="KeyJ" id="tbAttack"><span>⚔</span><small>ATACAR</small></button>
        <button class="tb" data-key="KeyK" id="tbHeavy"><span>⟳</span><small>GIRO</small></button>
        <button class="tb" data-key="Space" id="tbJump"><span>▲</span><small>PULO</small></button>
        <button class="tb" data-key="ShiftLeft" id="tbDash"><span>»</span><small>ESQUIVA</small></button>
        <button class="tb small" data-key="KeyQ" id="tbPower"><span>✦</span><small>PODER</small></button>
        <button class="tb small hidden" data-key="KeyE" id="tbUse"><span>✋</span><small>USAR</small></button>
      </div>
      <button id="tbPause">❚❚</button>`;
    document.body.appendChild(root);

    // ---------- botões (multitoque: cada dedo é um "pointer") ----------
    for (const b of root.querySelectorAll('.tb')) {
      const key = b.dataset.key;
      const down = (e) => { e.preventDefault(); Sound.init(); Input.just.add(key); Input.held.add(key); b.classList.add('on'); };
      const up = (e) => { e.preventDefault(); Input.held.delete(key); b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    }
    document.getElementById('tbPause').addEventListener('pointerdown', (e) => { e.preventDefault(); if (game.state === 'playing') pauseGame(); });

    // ---------- analógico ----------
    const zone = document.getElementById('stickZone'), base = document.getElementById('stickBase'), knob = document.getElementById('stickKnob');
    let id = null, cx = 0, cy = 0;
    const R = 55; // raio de alcance do polegar (px)
    const move = (x, y) => {
      let dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const k = Math.min(1, d / R);
      // zona morta pequena; passa a direção para o jogo (y para cima = frente)
      Input.stick = k < 0.15 ? null : { x: dx / R, y: -dy / R };
    };
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault(); Sound.init();
      id = e.pointerId; try { zone.setPointerCapture(id); } catch (err) { /* ok */ }
      cx = e.clientX; cy = e.clientY;
      base.style.left = (cx - 70) + 'px'; base.style.top = (cy - 70) + 'px';
      base.classList.add('on');
      move(cx, cy);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) { e.preventDefault(); move(e.clientX, e.clientY); } });
    const end = (e) => { if (e.pointerId !== id) return; id = null; Input.stick = null; knob.style.transform = ''; base.classList.remove('on'); };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // ---------- ícones dos poderes viram botões ----------
    document.getElementById('powers').addEventListener('pointerdown', (e) => {
      const p = e.target.closest('.power'); if (!p) return;
      e.preventDefault();
      const k = 'Digit' + (+p.dataset.i + 1);
      Input.just.add(k);
    });

    // não deixar o navegador dar zoom / rolar a tela
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  },

  // a cada quadro: mostra os controles só durante o jogo; botão USAR só perto de algo
  update() {
    if (!this.enabled) return;
    document.body.classList.toggle('playing', game.state === 'playing');
    const prompt = document.getElementById('prompt');
    document.getElementById('tbUse').classList.toggle('hidden', !prompt.classList.contains('show'));
    document.getElementById('tbPower').classList.toggle('hidden', ![0, 1, 2, 3].some(i => Powers.unlocked(i)));
  },

  // troca textos de teclado por textos de toque
  text(s) {
    if (!this.enabled || !s) return s;
    return s
      .replace(/WASD anda/g, 'Analógico (lado esquerdo) anda')
      .replace(/ESPAÇO pula \(aperte de novo no ar = PULO DUPLO\)/g, 'PULO (de novo no ar = PULO DUPLO)')
      .replace(/SHIFT esquiva/g, 'ESQUIVA')
      .replace(/J ou clique: combo de 4 golpes/g, 'ATACAR: combo de 4 golpes')
      .replace(/K ou clique direito: giro pesado/g, 'GIRO: golpe pesado')
      .replace(/aperte E/gi, 'toque em USAR')
      .replace(/\(E\)/g, '(USAR)')
      .replace(/E — /g, 'USAR — ')
      .replace(/Tecla (\d)/g, 'Toque no ícone $1')
      .replace(/Clique, ENTER ou ESPAÇO para continuar/g, 'Toque para continuar');
  },

  // celular: tela cheia + deitado (Android; no iPhone use "Adicionar à Tela de Início")
  goFullscreen() {
    if (!this.enabled) return;
    const el = document.documentElement;
    try { const r = (el.requestFullscreen || el.webkitRequestFullscreen); if (r && !document.fullscreenElement) { const pr = r.call(el); if (pr && pr.catch) pr.catch(() => {}); } } catch (e) { /* ok */ }
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ok */ }
  },
};
