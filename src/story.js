// =============================================================
// story.js — A HISTÓRIA do jogo.
//
//   PROLOGUE  → cinemática do começo (Nova jornada)
//   CHAPTERS  → um "capítulo" narrado antes de cada fase
//   LINES     → falas durante a fase (por posição no percurso,
//               ao pegar um poder, quando o chefe aparece/cai)
//   EPILOGUE  → o final, depois que Ares cai
//
// Personagens: TERON (o herói), NÊMESIS (a deusa que cobra as
// dívidas e deu as correntes a ele), ARES (o vilão), IONE (a
// filha de Teron), e os chefes BRONTES e ASTÉRION.
// =============================================================

const PROLOGUE = [
  { chap: 'PRÓLOGO', title: 'A Grande Trégua', text: 'Há muito tempo, os deuses do Olimpo juraram a Grande Trégua: nenhum deus levaria a guerra ao mundo dos homens.' },
  { chap: 'PRÓLOGO', title: 'O Deus que não aceitou a paz', text: 'Ares, o Deus da Guerra, nunca se conformou. Em segredo, abriu as portas do mundo dos mortos e ergueu um exército de ossos e bronze.' },
  { chap: 'PRÓLOGO', title: 'Argos em chamas', text: 'Argos foi a primeira cidade a cair. Entre as cinzas, o soldado Teron perdeu tudo: a casa, os irmãos de armas… e sua filha, Ione.' },
  { chap: 'PRÓLOGO', title: 'A voz de ferro', who: 'NÊMESIS', text: 'Ferido de morte numa praia, Teron ouviu uma voz fria como ferro: "Eu sou Nêmesis, a que cobra as dívidas. Os deuses quebraram a trégua. Você será as minhas correntes."' },
  { chap: 'PRÓLOGO', title: 'As Correntes de Nêmesis', text: 'As correntes da deusa se fundiram aos braços de Teron, com uma lâmina em cada ponta. Ele se ergueu outra vez. E a dívida de Ares começou a ser cobrada.' },
];

const CHAPTERS = [
  { title: 'A Costa em Chamas', text: 'Os navios negros de Ares chegam a Atenas. Soldados de ossos sobem pela praia. Se Atenas cair, a Grécia inteira cai junto.' },
  { title: 'O Templo Esquecido', text: 'No templo em ruínas de Atena, a estátua da deusa ainda guarda o caminho. Mas Ares envenenou o mármore: os olhos de pedra agora queimam em vermelho.' },
  { title: 'Olhos de Pedra', text: 'A trilha do templo termina no pântano das Górgonas. Ares comprou a lealdade delas com a promessa de um mundo inteiro feito de pedra.' },
  { title: 'O Gigante Acorrentado', text: 'Sob as montanhas vive Brontes, o Ciclope que forjava os raios de Zeus. Ares o acorrentou no escuro até ele enlouquecer. Agora ele guarda a passagem.' },
  { title: 'O Altar da Guerra', text: 'Além das cavernas, os ventos uivam entre pontes estreitas. Ali fica um antigo altar do próprio Ares… e um pedaço do seu poder, esquecido.' },
  { title: 'O Touro de Creta', text: 'O caminho até o rio dos mortos passa pelo Labirinto de Creta, onde Astérion, o Minotauro, vive preso. Ares lhe prometeu a liberdade em troca de sangue.' },
  { title: 'A Margem dos Mortos', text: 'Para chegar às forjas de Ares, Teron precisa seguir a margem do Estige. Entre as almas na névoa, uma voz conhecida chama o seu nome.' },
  { title: 'O Coração do Vulcão', text: 'Dentro do Monte Etna, Ares fabrica soldados de bronze sem parar. E no fundo da forja trabalha Talos, o gigante de bronze com uma fornalha no peito.' },
  { title: 'Mil Degraus', text: 'As forjas se calaram. Resta subir a escadaria do Olimpo, onde os deuses fingem não ver o que Ares fez.' },
  { title: 'A Dívida Inteira', text: 'No topo do Olimpo, Ares espera sentado num trono feito de armas quebradas. Chegou a hora de cobrar a dívida inteira.' },
];

// at = fração do percurso (0 = começo, 1 = fim)
const LINES = [
  { // 1 praia
    at: [
      [0.02, 'NÊMESIS', 'Levante-se, Teron. Suas correntes têm fome.'],
      [0.02, 'TERON', 'O que você fez comigo… deusa?'],
      [0.03, 'NÊMESIS', 'Dei a você uma segunda vida. Use-a para cobrar o que Ares deve.'],
      [0.85, 'ARES', 'Um morto arrastando correntes? Nêmesis deve estar desesperada.'],
    ],
  },
  { // 2 templo
    at: [
      [0.08, 'TERON', 'Atena… você também nos abandonou?'],
      [0.5, 'NÊMESIS', 'Os deuses têm medo de Ares. Por isso precisam de alguém que não tem mais nada a perder.'],
      [0.8, 'ARES', 'Volte para a sua cova, soldado. Ou eu mesmo mando você de volta.'],
    ],
    boss: [['A SENTINELA', 'QUEM… PERTURBA… O TEMPLO?'], ['NÊMESIS', 'Não é mais Atena ali dentro, Teron. É o veneno de Ares. Quebre o mármore.']],
    bossDeath: [['TERON', 'Me perdoe, deusa. Era a única forma.']],
  },
  { // 3 pântano
    at: [
      [0.06, 'NÊMESIS', 'Não encare as Górgonas. Nem a morte desfaz a pedra.'],
      [0.8, 'TERON', 'Ione adorava histórias de Górgonas. Dizia que eu venceria todas.'],
    ],
  },
  { // 4 cavernas (chefe: Brontes)
    at: [
      [0.08, 'TERON', 'Esse cheiro de ferro quente… tem uma forja aqui embaixo.'],
      [0.5, 'NÊMESIS', 'Brontes forjou os raios de Zeus. Ares o prendeu no escuro até ele esquecer quem era.'],
    ],
    boss: [['BRONTES', 'CORRENTES… MAIS CORRENTES?! NUNCA MAIS!']],
    bossDeath: [['NÊMESIS', 'Ele está livre agora. Às vezes, cobrar uma dívida também é libertar.']],
  },
  { // 5 desfiladeiro
    at: [
      [0.06, 'ARES', 'Você está chegando perto do meu altar, Teron. Ninguém toca no que é meu.'],
      [0.88, 'NÊMESIS', 'Depois dos ventos fica Creta. E o touro que Ares alimenta.'],
    ],
  },
  { // 6 labirinto (chefe: Astérion)
    at: [
      [0.08, 'TERON', 'Paredes que se fecham… isto não é um palácio. É uma armadilha.'],
      [0.5, 'NÊMESIS', 'Astérion foi preso aqui por um rei, não por um deus. Ares só abriu a porta.'],
    ],
    boss: [['ASTÉRION', 'Ares prometeu o céu aberto a quem levar a sua cabeça!']],
    bossDeath: [['TERON', 'Descanse. Ninguém mais vai prender você aqui.']],
  },
  { // 7 Estige
    at: [
      [0.12, 'IONE', 'Pai…? Pai, é você?'],
      [0.13, 'TERON', 'Ione! Espere… eu vou tirar você daqui!'],
      [0.14, 'NÊMESIS', 'Ela não pode atravessar o rio enquanto Ares prender as almas da guerra. Vença-o, e ela terá paz.'],
      [0.85, 'IONE', 'Vai, pai. Eu espero do outro lado.'],
    ],
  },
  { // 8 forjas
    at: [
      [0.06, 'ARES', 'Cada soldado de bronze daqui leva o nome de uma cidade que eu queimei. Inclusive Argos.'],
      [0.1, 'TERON', 'Então vou derrubar um por um.'],
      [0.75, 'NÊMESIS', 'Ouça… o martelo parou. Ele sentiu você chegar.'],
    ],
    boss: [['TALOS', 'NENHUM HOMEM… ENTRA NA FORJA… E SAI.'], ['TERON', 'Então eu vou ser o primeiro.']],
    bossDeath: [['NÊMESIS', 'Sem Talos, as forjas se apagam. O exército de Ares não cresce mais.']],
  },
  { // 9 Olimpo
    at: [
      [0.06, 'NÊMESIS', 'Os deuses estão olhando. Nenhum vai ajudar… mas nenhum vai impedir.'],
      [0.5, 'TERON', 'Mil degraus. Subi mais do que isso para voltar da morte.'],
      [0.9, 'ARES', 'Suba, então. Quero ver o seu rosto quando cair.'],
    ],
  },
  { // 10 trono (chefe: Ares)
    at: [
      [0.04, 'NÊMESIS', 'Este é o fim do caminho, Teron. Depois daqui, a dívida estará paga.'],
    ],
    boss: [['ARES', 'Eu SOU a guerra! Enquanto existirem homens, eu existirei!'], ['TERON', 'Isso é por Argos. E por Ione.']],
    bossDeath: [['ARES', 'Isto não é o fim… sempre haverá… guerra…'], ['NÊMESIS', 'Talvez. Mas não hoje.']],
  },
];

// falas ao receber cada poder (índice do poder)
const SHRINE_LINES = [
  [['NÊMESIS', 'Zeus jurou a trégua e deixou Ares quebrá-la. O raio dele agora é seu: faz parte da dívida.']],
  [['TERON', 'A força de Ares… contra o próprio Ares.'], ['NÊMESIS', 'Toda arma pode se voltar contra quem a forjou.']],
  [['NÊMESIS', 'O olhar da Medusa agora é seu. Que os servos de Ares virem pedra.']],
  [['NÊMESIS', 'Esta é a minha própria fúria. Use-a quando a dor for grande demais.']],
];

const EPILOGUE = [
  { chap: 'EPÍLOGO', title: 'A Dívida Paga', text: 'Com a queda de Ares, as correntes que prendiam as almas da guerra se partiram. Nas margens do Estige, milhares de sombras enfim atravessaram o rio.' },
  { chap: 'EPÍLOGO', title: 'Do outro lado', who: 'IONE', text: 'Entre elas estava Ione. Antes de seguir, ela olhou para trás e sorriu para o pai.' },
  { chap: 'EPÍLOGO', title: 'A última palavra da deusa', who: 'NÊMESIS', text: 'Nêmesis apareceu mais uma vez: "A dívida está paga, Teron de Argos. Devolva-me as correntes… mas saiba que, se os deuses voltarem a quebrar a trégua, elas voltarão a você."' },
  { chap: 'EPÍLOGO', title: 'Um homem comum', text: 'Teron devolveu as correntes à deusa e desceu o Olimpo a pé, como um homem comum.' },
  { chap: 'FIM DA PARTE I', title: 'As Correntes de Nêmesis', text: 'Argos foi reconstruída pelas mãos de um soldado de braços marcados. Por um tempo, nenhum deus ousou quebrar a Grande Trégua…' },
  { chap: 'MUITO LONGE DALI…', title: 'O Trono Vazio', text: 'No Olimpo, ninguém viu a sombra que subiu do Tártaro até o trono partido de Ares. Ela ergueu a espada caída… e a lâmina voltou a arder.' },
];

const WHO_COLORS = { 'NÊMESIS': '#9fd4ff', 'TERON': '#f7e2a0', 'ARES': '#ff6a4a', 'IONE': '#d8f4ff', 'BRONTES': '#ffb070', 'ASTÉRION': '#ffb070', 'A SENTINELA': '#ffb0a0', 'TALOS': '#ffb070' };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const Story = {
  // ---------- CINEMÁTICA (telas com texto) ----------
  active: false,

  chapterPanels(i, withPrologue) {
    const C = CHAPTERS[i];
    const ch = { chap: 'CAPÍTULO ' + ROMAN[i], title: C.title, text: C.text };
    return withPrologue ? PROLOGUE.concat([ch]) : [ch];
  },

  play(panels, onDone) {
    const $ = (id) => document.getElementById(id);
    this.active = true;
    this.panels = panels; this.idx = -1; this.onDone = onDone;
    $('dialog').classList.remove('show'); this.cur = null; this.queue = [];
    $('story').classList.remove('hidden');
    document.body.classList.add('cinema');
    this.next();
  },

  next() {
    const el = document.getElementById('story');
    // ainda digitando? primeiro mostra o texto inteiro
    if (this.typing) { this.finishTyping(); return; }
    this.idx++;
    if (this.idx >= this.panels.length) { this.end(); return; }
    const P = this.panels[this.idx];
    el.querySelector('.chap').textContent = P.chap || '';
    el.querySelector('.title').textContent = P.title || '';
    const t = el.querySelector('.text');
    t.style.color = P.who ? WHO_COLORS[P.who] || '' : '';
    el.querySelector('.dots').innerHTML = this.panels.map((_, k) => `<i class="${k === this.idx ? 'on' : ''}"></i>`).join('');
    const box = el.querySelector('.box');
    box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    if (Sound.ctx) Sound.menu();
    // efeito máquina de escrever
    this.full = P.text; this.shown = 0; this.typing = true;
    t.textContent = '';
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.shown += 2;
      t.textContent = this.full.slice(0, this.shown);
      if (this.shown >= this.full.length) this.finishTyping();
    }, 30);
  },

  finishTyping() {
    clearInterval(this.timer);
    this.typing = false;
    document.querySelector('#story .text').textContent = this.full;
  },

  end() {
    clearInterval(this.timer); this.typing = false;
    if (!this.active) return;
    this.active = false;
    document.getElementById('story').classList.add('hidden');
    document.body.classList.remove('cinema');
    const fn = this.onDone; this.onDone = null;
    if (fn) fn();
  },

  // ---------- FALAS DURANTE A FASE ----------
  reset(i) {
    this.phase = i;
    this.queue = []; this.cur = null; this.curT = 0; this.gap = 0.6;
    const L = LINES[i] || {};
    this.pending = (L.at || []).map(([at, who, text]) => ({ at, who, text }));
    const el = document.getElementById('dialog');
    if (el) el.classList.remove('show');
  },

  say(who, text) { this.queue.push({ who, text }); },
  event(name) {
    const L = LINES[this.phase] || {};
    if (name === 'bossDeath') this.queue = []; // o chefe caiu: falas antigas na fila perdem a vez
    for (const [who, text] of L[name] || []) this.say(who, text);
  },
  // nada falando nem esperando para falar?
  idle() { return !this.cur && !this.queue.length; },
  shrine(power) { for (const [who, text] of SHRINE_LINES[power] || []) this.say(who, text); },

  update(dt, game) {
    const L = game.level, p = game.player;
    if (!L || !this.pending) return;
    // gatilhos por posição
    for (const ln of this.pending) if (!ln.done && p.pos.x > ln.at * L.length) { ln.done = true; this.say(ln.who, ln.text); }
    // mostra uma fala de cada vez
    const el = document.getElementById('dialog');
    if (this.cur) {
      this.curT -= dt;
      this.typed = Math.min(this.cur.text.length, this.typed + dt * 55);
      el.querySelector('.text').textContent = this.cur.text.slice(0, Math.ceil(this.typed));
      if (this.curT <= 0) { this.cur = null; el.classList.remove('show'); this.gap = 0.35; }
    } else if (this.queue.length && (this.gap -= dt) <= 0) {
      this.cur = this.queue.shift();
      this.curT = 2.2 + this.cur.text.length * 0.05;
      this.typed = 0;
      const who = el.querySelector('.who');
      who.textContent = this.cur.who;
      who.style.color = WHO_COLORS[this.cur.who] || '#f7e2a0';
      el.querySelector('.text').textContent = '';
      el.classList.add('show');
      if (this.cur.who === 'ARES' && Sound.ctx) Sound.thunder && Sound.thunder();
    }
  },

  init() {
    const el = document.getElementById('story');
    el.addEventListener('click', (e) => { if (e.target.id !== 'btnSkip') this.next(); });
    document.getElementById('btnSkip').addEventListener('click', () => this.end());
    addEventListener('keydown', (e) => {
      if (!this.active || e.repeat) return;
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); this.next(); }
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.end(); }
    }, true);
  },
};
