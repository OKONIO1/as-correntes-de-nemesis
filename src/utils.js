// =============================================================
// utils.js — contas simples usadas por todos os outros arquivos
// =============================================================

function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }
function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function approach(v, target, amount) {
  if (v < target) return Math.min(v + amount, target);
  return Math.max(v - amount, target);
}
// suavização que não depende do FPS (k = quanto falta depois de 1 segundo)
function damp(a, b, k, dt) { return lerp(a, b, 1 - Math.pow(k, dt)); }
// gira um ângulo até outro pelo caminho mais curto
function angleDamp(a, b, k, dt) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * (1 - Math.pow(k, dt));
}
function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }

// números "aleatórios" previsíveis a partir de uma semente (cenário sempre igual)
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
