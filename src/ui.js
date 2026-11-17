// =============================================================
// ui.js — HUD (vida, mana, fúria, poderes, combo), números de dano
// flutuantes, avisos e telas. Tudo em HTML/CSS por cima da cena 3D.
// =============================================================

const UI = {
  init() {
    this.$ = (id) => document.getElementById(id);
    this.hp = document.querySelector('.bar.hp .fill');
    this.hpGhost = document.querySelector('.bar.hp .ghost');
    this.mana = document.querySelector('.bar.mana .fill');
    this.fury = document.querySelector('.bar.fury .fill');
    this.furyBar = document.querySelector('.bar.fury');
    this.comboEl = this.$('combo');
    this.promptEl = this.$('prompt');
    this.toastEl = this.$('toast');
    this.bannerEl = this.$('banner');
    this.dmgLayer = this.$('dmg');
    this.nums = [];
    const box = this.$('powers');
    box.innerHTML = POWERS.map((p, i) =>
      `<div class="power locked" data-i="${i}" title="${p.name}: ${p.desc}">
         <div class="cd"></div><span class="icon">${p.icon}</span>
         <span class="key">${p.key}</span><span class="name">${p.name}</span>
       </div>`).join('');
    this.powerEls = [...box.querySelectorAll('.power')];
    this.flashEl = document.createElement('div');
    Object.assign(this.flashEl.style, { position: 'fixed', inset: '0', pointerEvents: 'none', opacity: '0' });
    document.body.appendChild(this.flashEl);
  },

  show(id, on) { this.$(id).classList.toggle('hidden', !on); },

  flash(color) {
    this.flashEl.style.transition = 'none';
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = '1';
    requestAnimationFrame(() => { this.flashEl.style.transition = 'opacity 0.45s'; this.flashEl.style.opacity = '0'; });
  },

  // mensagem curta perto dos poderes
  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth; // reinicia a animação
    this.toastEl.classList.add('show');
  },

  // faixa grande no meio da tela
  banner(title, sub) {
    this.bannerEl.innerHTML = `<div class="t">${title}</div><div class="s">${Touch.text(sub || '')}</div>`;
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
  },

  // escurece a tela, executa fn no escuro e clareia de novo
  fade(fn) {
    const el = this.$('fade');
    el.classList.add('on');
    setTimeout(() => { fn(); requestAnimationFrame(() => el.classList.remove('on')); }, 380);
  },

  // abertura cinematográfica da fase
  intro(i, title, sub) {
    const el = this.$('intro');
    el.querySelector('.num').textContent = 'FASE ' + (i + 1);
    el.querySelector('.name').textContent = title || '';
    el.querySelector('.sub').textContent = sub || '';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },

  // dica da fase (fica uns segundos no topo da tela)
  hint(text) {
    const el = this.$('hint');
    el.textContent = Touch.text(text);
    el.classList.add('show');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => el.classList.remove('show'), 6500);
  },

  prompt(text) {
    if (text) { this.promptEl.textContent = Touch.text(text); this.promptEl.classList.add('show'); }
    else this.promptEl.classList.remove('show');
  },

  setRage(on) { document.body.classList.toggle('rage', on); },

  // número de dano que sobe a partir de um ponto 3D
  damage(pos, text, color, scale) {
    const el = document.createElement('div');
    el.className = 'dmgnum';
    el.textContent = text;
    el.style.color = color || '#fff';
    el.style.fontSize = Math.round(20 * (scale || 1)) + 'px';
    this.dmgLayer.appendChild(el);
    this.nums.push({ el, pos: pos.clone(), t: 0, dx: rand(-0.3, 0.3) });
  },

  update(game, dt) {
    const p = game.player;
    this.hp.style.width = (p.hp / HERO.maxHp * 100) + '%';
    this.hpGhost.style.width = (p.hpGhost / HERO.maxHp * 100) + '%';
    this.mana.style.width = (p.mana / HERO.maxMana * 100) + '%';
    this.fury.style.width = (p.fury / HERO.maxFury * 100) + '%';
    this.furyBar.classList.toggle('full', p.fury >= HERO.maxFury && p.rage <= 0);
    if (game.combo > 1 && game.comboT > 0) {
      this.comboEl.textContent = game.combo + ' ACERTOS';
      this.comboEl.style.opacity = '1';
    } else this.comboEl.style.opacity = '0';

    // ícones dos poderes
    POWERS.forEach((P, i) => {
      const el = this.powerEls[i];
      const unlocked = Powers.unlocked(i);
      el.classList.toggle('locked', !unlocked);
      el.classList.toggle('selected', Powers.selected === i && unlocked);
      const ready = P.fury ? p.fury >= HERO.maxFury || p.rage > 0 : p.mana >= P.cost;
      el.classList.toggle('nomana', unlocked && !ready);
      el.classList.toggle('active', P.fury && p.rage > 0);
      const frac = Powers.cd[i] / P.cd;
      el.firstElementChild.style.background = frac > 0 ? `conic-gradient(rgba(0,0,0,0.7) ${frac * 360}deg, transparent 0)` : 'none';
    });

    // vida baixa: bordas vermelhas pulsando
    document.body.classList.toggle('lowhp', !p.dead && p.hp < HERO.maxHp * 0.25 && game.state === 'playing');

    // progresso na fase (marcas = altares; acesos ficam azuis)
    const L = game.level;
    if (L && L.length) {
      const pr = this.$('progress');
      if (pr._level !== L) {
        pr._level = L;
        pr.querySelectorAll('.cp, .end').forEach(e => e.remove());
        for (const cp of L.checkpoints) { const m = document.createElement('div'); m.className = 'cp'; m.style.left = (cp.pos.x / L.length * 100) + '%'; pr.appendChild(m); cp.marker = m; }
        const end = document.createElement('div'); end.className = 'end'; end.textContent = L.bossRoom ? '☠' : 'Ω'; pr.appendChild(end);
      }
      for (const cp of L.checkpoints) if (cp.marker) cp.marker.classList.toggle('lit', cp.lit);
      pr.querySelector('.me').style.left = clamp(p.pos.x / L.length * 100, 0, 100) + '%';
    }

    // barra de vida do chefe
    const b = game.boss;
    this.$('bossbar').classList.toggle('hidden', !(b && !b.dead && game.state === 'playing'));
    if (b) {
      const name = b.name + ', ' + b.title + (b.stage ? '  —  ESTÁGIO ' + b.stage : '');
      const nm = this.$('bossbar').firstElementChild;
      if (nm.textContent !== name) nm.textContent = name;
      this.$('bossbar').querySelector('.fill').style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
      this.$('bossbar').classList.toggle('s2', b.stage === 2);
    }

    // números de dano acompanham o mundo 3D
    const w = innerWidth, h = innerHeight;
    for (const n of this.nums) {
      n.t += dt;
      const v = n.pos.clone(); v.y += n.t * 1.3; v.x += n.dx * n.t;
      v.project(game.camera);
      n.el.style.transform = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px) translate(-50%, -50%) scale(${n.t < 0.1 ? 1.5 - n.t * 5 : 1})`;
      n.el.style.opacity = String(Math.min(1, (0.9 - n.t) * 3));
      if (n.t > 0.9 || v.z > 1) n.el.remove();
    }
    this.nums = this.nums.filter(n => n.t <= 0.9 && n.el.isConnected);
  },
};
