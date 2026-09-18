// Tela do operador: escolhe a passagem, edita o estilo e envia para a projeção.
const BIBLIA = window.BIBLIA_ACF || [];
const ponte = window.bridge;
const $ = id => document.getElementById(id);
const norm = Engine.norm;

const HL_CORES = ['#FFD400', '#FF8A00', '#FF3B3B', '#FF4FA3', '#B388FF', '#4FC3F7', '#5BE584', '#FFFFFF'];
const GRADS = [
  ['#0f2027', '#2c5364'], ['#000000', '#434343'], ['#1a0b2e', '#6a2c70'], ['#3a1c05', '#c67c2b'],
  ['#021b1a', '#1f6f5c'], ['#141e30', '#243b55'], ['#42275a', '#734b6d'], ['#1d0000', '#8e0e00'],
];
const FORMATOS = { '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920] };
const ESTILO_KEYS = ['font', 'weight', 'textColor', 'refColor', 'shadowColor', 'upper', 'shadow', 'auto', 'size',
  'refSize', 'lh', 'ls', 'align', 'valign', 'margin', 'width', 'area', 'hlBold'];

const PADRAO = {
  font: 'Barlow Condensed', weight: '600', textColor: '#ffffff', refColor: '#ffffff', shadowColor: '#000000',
  upper: true, shadow: true, auto: true, size: 96, refSize: 58, lh: 118, ls: 0,
  align: 'left', valign: 'top', margin: 5, width: 100, area: 78, hlBold: true,
  bgType: 'image', bgColor: '#0b0b0d', grad1: '#0f2027', grad2: '#2c5364', ang: 135,
  fx: 50, fy: 50, zoom: 100, blur: 0, overlay: 0,
  format: '16:9', refStyle: 'roman', version: false, showRef: true, verseNums: false,
  hlColor: '#FFD400', autoLive: false, trans: 350, imgId: 'padrao', monitor: null,
};
let S = { ...PADRAO };
try { Object.assign(S, JSON.parse(localStorage.getItem('bibleStudioOp') || '{}')); } catch (e) {}
const salvar = () => { try { localStorage.setItem('bibleStudioOp', JSON.stringify(S)); } catch (e) {} };

// ---------- estado ----------
let P = { b: 11, c: 1, v1: 20, v2: 20 };
try { Object.assign(P, JSON.parse(localStorage.getItem('bibleStudioPos') || '{}')); } catch (e) {}
let texto = '', referencia = '';
let regras = [];          // [{txt, parts, cor}]
let cliques = {};         // índice -> cor | 'off'
let caixasPrev = [];
let aspecto = 16 / 9;
let saida = { open: false };
let live = { slide: null, pos: null };
let historico = [];
let slideSeq = 0;

// ---------- imagens de fundo ----------
const imagens = new Map();   // id -> {src, img}
function addImagem(id, src) {
  const img = new Image();
  img.src = src;
  imagens.set(id, { src, img });
  if (ponte) ponte.putImage(id, src);
  img.decode().then(() => { renderPrev(); renderLive(); }).catch(() => {});
}
if (window.FUNDO_PADRAO) addImagem('padrao', window.FUNDO_PADRAO);
function carregarImagensSalvas() {
  try {
    const lista = JSON.parse(localStorage.getItem('bibleStudioImgs') || '[]');
    lista.forEach(({ id, src }) => addImagem(id, src));
  } catch (e) {}
}
function salvarImagens() {
  const lista = [...imagens].filter(([id]) => id !== 'padrao').map(([id, v]) => ({ id, src: v.src }));
  try { localStorage.setItem('bibleStudioImgs', JSON.stringify(lista)); }
  catch (e) { toast('Imagem usada, mas grande demais para ficar salva ao reabrir.'); }
}

// ---------- utilidades ----------
const tokens = () => texto.split(/\s+/).filter(Boolean);
const ROMANOS = ['I', 'II', 'III'];
function nomeLivro(i) {
  const n = BIBLIA[i].name;
  return S.refStyle === 'roman' ? n.replace(/^(\d)\s/, (m, d) => ROMANOS[d - 1] + ' ') : n;
}
function refDe(p) {
  return `${nomeLivro(p.b)} ${p.c + 1}:${p.v1 + 1}${p.v2 > p.v1 ? '-' + (p.v2 + 1) : ''}` + (S.version ? ' (ACF)' : '');
}
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- navegação ----------
function montarLivros() {
  $('selLivro').innerHTML = BIBLIA.map((l, i) =>
    (i === 0 ? '<optgroup label="Antigo Testamento">' : i === 39 ? '</optgroup><optgroup label="Novo Testamento">' : '')
    + `<option value="${i}">${l.name}</option>`).join('') + '</optgroup>';
}
function montarCapitulos() {
  const n = BIBLIA[P.b].chapters.length;
  const box = $('chapters');
  box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.textContent = i + 1;
    b.className = i === P.c ? 'on' : '';
    b.onclick = () => irPara(P.b, i, 0);
    box.appendChild(b);
  }
  box.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
}
function montarVersiculos() {
  const cap = BIBLIA[P.b].chapters[P.c];
  const box = $('verses');
  box.innerHTML = '';
  const frag = document.createDocumentFragment();
  cap.forEach((t, i) => {
    const d = document.createElement('div');
    d.dataset.i = i;
    d.innerHTML = `<b>${i + 1}</b>${esc(t)}`;
    frag.appendChild(d);
  });
  box.appendChild(frag);
  marcarVersiculos(true);
}
function marcarVersiculos(rolar) {
  const lp = live.pos;
  $('verses').querySelectorAll('div').forEach(d => {
    const i = +d.dataset.i;
    d.classList.toggle('sel', i >= P.v1 && i <= P.v2);
    d.classList.toggle('live', !!lp && live.slide?.mode !== 'black' && lp.b === P.b && lp.c === P.c && i >= lp.v1 && i <= lp.v2);
  });
  if (rolar) $('verses').querySelector(`div[data-i="${P.v1}"]`)?.scrollIntoView({ block: 'nearest' });
}
$('verses').addEventListener('click', e => {
  const d = e.target.closest('div[data-i]');
  if (!d) return;
  const i = +d.dataset.i;
  if (e.shiftKey) irPara(P.b, P.c, Math.min(P.v1, i), Math.max(P.v1, i), false);
  else irPara(P.b, P.c, i, i, false);
});
$('verses').addEventListener('dblclick', e => {
  if (e.target.closest('div[data-i]')) enviarAoVivo();
});

function irPara(b, c, v1, v2 = v1, rolar = true) {
  const mudouCap = b !== P.b || c !== P.c;
  P = { b, c, v1, v2 };
  try { localStorage.setItem('bibleStudioPos', JSON.stringify(P)); } catch (e) {}
  $('selLivro').value = b;
  if (mudouCap || !$('verses').children.length) { montarCapitulos(); montarVersiculos(); }
  else marcarVersiculos(rolar);
  carregarTexto();
}
$('selLivro').onchange = e => irPara(+e.target.value, 0, 0);

function carregarTexto() {
  const cap = BIBLIA[P.b].chapters[P.c];
  const partes = [];
  for (let i = P.v1; i <= P.v2; i++) partes.push((S.verseNums && P.v2 > P.v1 ? (i + 1) + ' ' : '') + cap[i]);
  texto = partes.join(' ');
  referencia = refDe(P);
  $('txt').value = texto;
  $('refTxt').value = referencia;
  cliques = {};
  mudou(true);
}

function passo(dir) {
  let { b, c } = P;
  let v = dir > 0 ? P.v2 + 1 : P.v1 - 1;
  if (v >= BIBLIA[b].chapters[c].length) {
    v = 0; c++;
    if (c >= BIBLIA[b].chapters.length) { c = 0; b = (b + 1) % BIBLIA.length; }
  }
  if (v < 0) {
    c--;
    if (c < 0) { b = (b - 1 + BIBLIA.length) % BIBLIA.length; c = BIBLIA[b].chapters.length - 1; }
    v = BIBLIA[b].chapters[c].length - 1;
  }
  irPara(b, c, v);
}
$('btnNext').onclick = () => passo(1);
$('btnPrev').onclick = () => passo(-1);

// "Ir para" rápido: "jo 3 16", "2rs 2:21", "ii reis 2 21-23", "salmos 23"
const chaveLivro = s => semAcento(s).replace(/[^a-z0-9]/g, '');
const LIVROS_IDX = BIBLIA.map((l, i) => ({ i, nome: chaveLivro(l.name), abbrev: chaveLivro(l.abbrev) }));
function acharLivro(q) {
  let s = q.trim().replace(/^(i{1,3})\s+/i, (m, r) => r.length + ' ');
  const k = chaveLivro(s);
  if (!k) return null;
  const exato = s.toLowerCase().replace(/\s+/g, '');
  const porAbrev = BIBLIA.findIndex(l => l.abbrev === exato);   // "jo" = João, "jó" = Jó
  if (porAbrev >= 0) return porAbrev;
  return (LIVROS_IDX.find(l => l.abbrev === k)
    || LIVROS_IDX.find(l => l.nome === k)
    || LIVROS_IDX.find(l => l.nome.startsWith(k))
    || LIVROS_IDX.find(l => l.nome.includes(k)))?.i ?? null;
}
// "jo 3 16", "2rs 2:21-23", "salmos 23" -> {b, c, v1, v2} (índices a partir de 0) ou null
function parseRef(q) {
  const m = String(q || '').match(/^\s*(.*?\p{L}.*?)\s*(\d+)?(?:\s*[:.,\s]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/u);
  if (!m) return null;
  const b = acharLivro(m[1]);
  if (b === null) return null;
  const livro = BIBLIA[b];
  const c = Math.min(Math.max((+m[2] || 1) - 1, 0), livro.chapters.length - 1);
  const n = livro.chapters[c].length;
  const v1 = Math.min(Math.max((+m[3] || 1) - 1, 0), n - 1);
  const v2 = m[4] ? Math.min(Math.max(+m[4] - 1, v1), n - 1) : v1;
  return { b, c, v1, v2 };
}
function irParaTexto(q) {
  const r = parseRef(q);
  if (!r) return false;
  irPara(r.b, r.c, r.v1, r.v2);
  return true;
}
$('quickRef').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (irParaTexto(e.target.value)) {
      if (e.ctrlKey || e.shiftKey) enviarAoVivo();
      e.target.value = '';
      e.target.blur();
    } else toast('Referência não encontrada');
  } else if (e.key === 'Escape') e.target.blur();
});

// ---------- busca ----------
let buscaT;
function buscar() {
  const q = semAcento($('busca').value.trim());
  const box = $('results');
  if (q.length < 3) { box.innerHTML = '<p class="hint">Digite pelo menos 3 letras.</p>'; return; }
  const escopo = $('buscaEscopo').value;
  const [ini, fim] = escopo === 'at' ? [0, 39] : escopo === 'nt' ? [39, 66] : escopo === 'livro' ? [P.b, P.b + 1] : [0, 66];
  const res = [];
  fora: for (let b = ini; b < fim; b++)
    for (let c = 0; c < BIBLIA[b].chapters.length; c++)
      for (let v = 0; v < BIBLIA[b].chapters[c].length; v++) {
        const t = BIBLIA[b].chapters[c][v];
        const pos = semAcento(t).indexOf(q);
        if (pos >= 0) { res.push({ b, c, v, t, pos }); if (res.length >= 200) break fora; }
      }
  box.innerHTML = res.length ? '' : '<p class="hint">Nada encontrado.</p>';
  const frag = document.createDocumentFragment();
  res.forEach(r => {
    const d = document.createElement('div');
    // semAcento preserva o comprimento para o português, então o índice vale no texto original
    d.innerHTML = `<strong>${esc(BIBLIA[r.b].name)} ${r.c + 1}:${r.v + 1}</strong>`
      + esc(r.t.slice(0, r.pos)) + '<mark>' + esc(r.t.slice(r.pos, r.pos + q.length)) + '</mark>' + esc(r.t.slice(r.pos + q.length));
    d.onclick = () => irPara(r.b, r.c, r.v);
    d.ondblclick = () => { irPara(r.b, r.c, r.v); enviarAoVivo(); };
    frag.appendChild(d);
  });
  box.appendChild(frag);
  if (res.length >= 200) box.insertAdjacentHTML('beforeend', '<p class="hint">Mostrando os 200 primeiros.</p>');
}
$('busca').addEventListener('input', () => { clearTimeout(buscaT); buscaT = setTimeout(buscar, 250); });
$('buscaEscopo').onchange = buscar;

function montarHistorico() {
  const box = $('historico');
  box.innerHTML = historico.length ? '' : '<p class="hint">Os versículos enviados ao vivo aparecem aqui.</p>';
  historico.forEach(h => {
    const d = document.createElement('div');
    d.innerHTML = `<strong>${esc(h.ref)}</strong>${esc(h.texto.slice(0, 90))}${h.texto.length > 90 ? '…' : ''}`;
    d.onclick = () => irPara(h.pos.b, h.pos.c, h.pos.v1, h.pos.v2);
    d.ondblclick = () => { irPara(h.pos.b, h.pos.c, h.pos.v1, h.pos.v2); enviarAoVivo(); };
    box.appendChild(d);
  });
}

// ---------- texto editável ----------
$('txt').addEventListener('input', e => { texto = e.target.value; cliques = {}; mudou(true); });
$('refTxt').addEventListener('input', e => { referencia = e.target.value; mudou(true); });

// ---------- destaque ----------
function mapaDestaque(tks, usarCliques = true) {
  const nt = tks.map(norm);
  const cores = new Array(tks.length).fill(null);
  for (const r of regras) {
    const L = r.parts.length;
    for (let s = 0; s + L <= nt.length; s++) {
      let ok = true;
      for (let k = 0; k < L; k++) if (nt[s + k] !== r.parts[k]) { ok = false; break; }
      if (ok) for (let k = 0; k < L; k++) cores[s + k] = r.cor;
    }
  }
  if (usarCliques) for (const i in cliques) if (i < cores.length) cores[i] = cliques[i] === 'off' ? null : cliques[i];
  return cores;
}
function alternarPalavra(i) {
  const tks = tokens();
  const atual = mapaDestaque(tks)[i];
  const porRegra = mapaDestaque(tks, false)[i];
  if (atual) {
    if (atual.toLowerCase() !== S.hlColor.toLowerCase()) cliques[i] = S.hlColor;
    else if (porRegra) cliques[i] = 'off';
    else delete cliques[i];
  } else {
    if (porRegra && porRegra.toLowerCase() === S.hlColor.toLowerCase()) delete cliques[i];
    else cliques[i] = S.hlColor;
  }
  mudou(false);
}
function addRegra() {
  const v = $('novaPalavra').value.trim();
  const parts = v.split(/\s+/).map(norm).filter(Boolean);
  if (!parts.length) return;
  regras = regras.filter(r => r.parts.join(' ') !== parts.join(' '));
  regras.push({ txt: v, parts, cor: S.hlColor });
  $('novaPalavra').value = '';
  montarRegras();
  mudou(false);
}
$('btnAddPalavra').onclick = addRegra;
$('novaPalavra').addEventListener('keydown', e => { if (e.key === 'Enter') addRegra(); });
function montarRegras() {
  const box = $('chipsRegras');
  box.innerHTML = '';
  regras.forEach((r, idx) => {
    const c = document.createElement('span');
    c.className = 'chip';
    const dot = document.createElement('i');
    dot.style.background = r.cor;
    const x = document.createElement('b');
    x.textContent = '×';
    x.title = 'Remover';
    x.onclick = () => { regras.splice(idx, 1); montarRegras(); mudou(false); };
    c.append(dot, document.createTextNode(r.txt), x);
    box.appendChild(c);
  });
  if (regras.length || Object.keys(cliques).length) {
    const b = document.createElement('button');
    b.textContent = 'Limpar destaques';
    b.style.padding = '3px 10px';
    b.onclick = () => { regras = []; cliques = {}; montarRegras(); mudou(false); };
    box.appendChild(b);
  }
}
function montarHlSwatches() {
  const box = $('hlSwatches');
  box.innerHTML = '';
  HL_CORES.forEach(c => {
    const b = document.createElement('button');
    b.className = 'sw' + (c.toLowerCase() === S.hlColor.toLowerCase() ? ' on' : '');
    b.style.background = c;
    b.title = c;
    b.onclick = () => { S.hlColor = c; salvar(); montarHlSwatches(); };
    box.appendChild(b);
  });
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = S.hlColor;
  inp.title = 'Outra cor';
  inp.oninput = e => {
    S.hlColor = e.target.value; salvar();
    box.querySelectorAll('.sw').forEach(s => s.classList.remove('on'));
  };
  box.appendChild(inp);
}

// ---------- slides ----------
function montarSlide(mode) {
  const tks = tokens();
  const style = {};
  ESTILO_KEYS.forEach(k => style[k] = S[k]);
  return {
    mode,
    text: { tokens: tks, colors: mapaDestaque(tks), ref: S.showRef ? referencia : '' },
    style,
    bg: {
      type: S.bgType, imgId: S.bgType === 'image' ? S.imgId : null, color: S.bgColor,
      grad1: S.grad1, grad2: S.grad2, ang: S.ang, fx: S.fx, fy: S.fy, zoom: S.zoom, blur: S.blur, overlay: S.overlay,
    },
  };
}
const imgDe = slide => slide.bg.type === 'image' ? imagens.get(slide.bg.imgId)?.img : null;

function dimensionarTela(cv, largura) {
  const W = largura, H = Math.round(largura / aspecto);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  return [W, H];
}

let prevPendente = false;
function renderPrev() {
  if (prevPendente) return;
  prevPendente = true;
  requestAnimationFrame(async () => {
    prevPendente = false;
    const slide = montarSlide('live');
    await Engine.ensureFonts(slide.style);
    const cv = $('cvPrev');
    const [W, H] = dimensionarTela(cv, 1280);
    const ctx = cv.getContext('2d');
    const r = Engine.drawSlide(ctx, W, H, slide, imgDe(slide));
    caixasPrev = r.caixas;
    if (S.auto && r.size) { $('rTam').value = Math.round(r.size); $('vTam').textContent = Math.round(r.size); }
    $('prevRef').textContent = referencia;
    montarPalavras(slide.text.tokens, slide.text.colors);
  });
}
async function renderLive() {
  const cv = $('cvLive');
  const [W, H] = dimensionarTela(cv, 960);
  const ctx = cv.getContext('2d');
  if (!live.slide) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
  await Engine.ensureFonts(live.slide.style);
  Engine.drawSlide(ctx, W, H, live.slide, imgDe(live.slide));
}

function publicar(slide, ms) {
  slide.id = ++slideSeq;
  slide.ms = ms;
  live.slide = slide;
  if (ponte) ponte.sendSlide(slide);
  renderLive();
  $('btnBlack').classList.toggle('on', slide.mode === 'black');
  $('btnClear').classList.toggle('on', slide.mode === 'clear');
  $('monLive').classList.toggle('pulse', slide.mode === 'live');
  $('liveRef').textContent = slide.mode === 'black' ? 'TELA PRETA' : slide.mode === 'clear' ? 'SÓ FUNDO' : (live.ref || '—');
  marcarVersiculos(false);
}

function enviarAoVivo() {
  const slide = montarSlide('live');
  const mudouTexto = !live.slide || JSON.stringify(live.slide.text) !== JSON.stringify(slide.text);
  live.pos = { ...P };
  live.ref = referencia;
  live.texto = texto;
  if (mudouTexto) {
    historico = [{ pos: { ...P }, ref: referencia, texto }, ...historico.filter(h => h.ref !== referencia)].slice(0, 40);
    montarHistorico();
  }
  publicar(slide, S.trans);
}

// modo = 'clear' | 'black' — alterna com o modo ao vivo
function alternarModo(modo) {
  const base = live.slide ? { ...live.slide } : montarSlide('live');
  const novo = live.slide?.mode === modo ? 'live' : modo;
  if (!live.slide) base.text = { tokens: [], colors: [], ref: '' };
  publicar({ ...base, mode: novo }, S.trans);
}
$('btnGo').onclick = enviarAoVivo;
$('btnClear').onclick = () => alternarModo('clear');
$('btnBlack').onclick = () => alternarModo('black');

// chamado a cada mudança na prévia
function mudou(textoMudou) {
  renderPrev();
  montarRegras();
  if (S.autoLive && live.slide) {
    // no automático, mantém tela preta/só fundo até o operador liberar
    const slide = montarSlide(live.slide.mode);
    if (textoMudou) {
      live.pos = { ...P }; live.ref = referencia; live.texto = texto;
    }
    publicar(slide, textoMudou ? S.trans : 0);
  }
}

// clique na prévia destaca a palavra
$('cvPrev').addEventListener('click', e => {
  const cv = e.currentTarget;
  const r = cv.getBoundingClientRect();
  // o canvas usa object-fit: contain — calcula a área realmente desenhada
  const escala = Math.min(r.width / cv.width, r.height / cv.height);
  const ox = (r.width - cv.width * escala) / 2, oy = (r.height - cv.height * escala) / 2;
  const x = (e.clientX - r.left - ox) / escala;
  const y = (e.clientY - r.top - oy) / escala;
  const hit = caixasPrev.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  if (hit) alternarPalavra(hit.i);
});

function montarPalavras(tks, cores) {
  const box = $('words');
  box.innerHTML = '';
  tks.forEach((t, i) => {
    const s = document.createElement('span');
    s.textContent = t;
    if (cores[i]) { s.style.background = cores[i]; s.style.color = contraste(cores[i]); }
    s.onclick = () => alternarPalavra(i);
    box.appendChild(s);
  });
}
function contraste(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255 > 0.6 ? '#111' : '#fff';
}

// ---------- controles ----------
function ligarRange(id, chave, valId, fmt) {
  const el = $(id);
  const show = () => { if (valId) $(valId).textContent = fmt ? fmt(+el.value) : el.value; };
  el.value = S[chave];
  show();
  el.addEventListener('input', () => {
    S[chave] = +el.value;
    show();
    if (chave === 'size') { S.auto = false; $('chkTamAuto').checked = false; }
    salvar();
    mudou(false);
  });
}
function ligarInput(id, chave, prop = 'value', recarregar) {
  const el = $(id);
  el[prop] = S[chave];
  el.addEventListener(prop === 'checked' ? 'change' : 'input', () => {
    S[chave] = el[prop];
    salvar();
    if (recarregar) recarregarTexto(); else mudou(false);
  });
}
function ligarSeg(id, chave, cb) {
  const box = $(id);
  const upd = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S[chave]));
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    S[chave] = b.dataset.v; upd(); salvar();
    cb ? cb() : mudou(false);
  });
  upd();
}
function recarregarTexto() {
  const c = cliques;
  carregarTexto();
  if (!S.verseNums) { cliques = c; mudou(false); }
}

ligarRange('rTam', 'size', 'vTam');
ligarRange('rRefTam', 'refSize', 'vRefTam', v => v + '%');
ligarRange('rLh', 'lh', 'vLh', v => (v / 100).toFixed(2));
ligarRange('rLs', 'ls', 'vLs');
ligarRange('rMargem', 'margin', 'vMargem', v => v + '%');
ligarRange('rLarg', 'width', 'vLarg', v => v + '%');
ligarRange('rArea', 'area', 'vArea', v => v + '%');
ligarRange('rFx', 'fx', 'vFx', v => v + '%');
ligarRange('rFy', 'fy', 'vFy', v => v + '%');
ligarRange('rZoom', 'zoom', 'vZoom', v => v + '%');
ligarRange('rBlur', 'blur', 'vBlur');
ligarRange('rOverlay', 'overlay', 'vOverlay', v => v + '%');
ligarRange('rAng', 'ang', 'vAng', v => v + '°');
ligarInput('selFonte', 'font');
ligarInput('selPeso', 'weight');
ligarInput('corTexto', 'textColor');
ligarInput('corRef', 'refColor');
ligarInput('corSombra', 'shadowColor');
ligarInput('corFundo', 'bgColor');
ligarInput('grad1', 'grad1');
ligarInput('grad2', 'grad2');
ligarInput('chkUpper', 'upper', 'checked');
ligarInput('chkSombra', 'shadow', 'checked');
ligarInput('chkTamAuto', 'auto', 'checked');
ligarInput('chkHlBold', 'hlBold', 'checked');
ligarInput('chkRef', 'showRef', 'checked');
ligarInput('chkVersao', 'version', 'checked', true);
ligarInput('chkNum', 'verseNums', 'checked', true);
ligarSeg('segAlign', 'align');
ligarSeg('segVAlign', 'valign');
ligarSeg('segRefStyle', 'refStyle', recarregarTexto);
ligarSeg('segBg', 'bgType', () => { mostrarBgBox(); mudou(false); });
ligarSeg('segFormato', 'format', () => {});

// transição e automático
$('rTrans').value = S.trans;
const mostrarTrans = () => $('vTrans').textContent = S.trans ? `${S.trans} ms` : 'corte';
mostrarTrans();
$('rTrans').addEventListener('input', e => { S.trans = +e.target.value; mostrarTrans(); salvar(); });
$('chkAuto').checked = S.autoLive;
$('chkAuto').addEventListener('change', e => {
  S.autoLive = e.target.checked; salvar();
  if (S.autoLive) enviarAoVivo();
});

function mostrarBgBox() {
  $('bgImageBox').style.display = S.bgType === 'image' ? 'flex' : 'none';
  $('bgSolidBox').style.display = S.bgType === 'solid' ? 'flex' : 'none';
  $('bgGradBox').style.display = S.bgType === 'gradient' ? 'flex' : 'none';
}
function montarImgSwatches() {
  const box = $('imgSwatches');
  box.innerHTML = '';
  for (const [id, im] of imagens) {
    const b = document.createElement('button');
    b.className = 'bgsw' + (id === S.imgId ? ' on' : '');
    b.style.backgroundImage = `url("${im.src}")`;
    b.onclick = () => { S.imgId = id; salvar(); montarImgSwatches(); mudou(false); };
    if (id !== 'padrao') {
      const x = document.createElement('span');
      x.className = 'x';
      x.textContent = '×';
      x.title = 'Remover imagem';
      x.onclick = ev => {
        ev.stopPropagation();
        imagens.delete(id);
        if (S.imgId === id) S.imgId = 'padrao';
        salvar(); salvarImagens(); montarImgSwatches(); mudou(false);
      };
      b.appendChild(x);
    }
    box.appendChild(b);
  }
}
function montarGradSwatches() {
  const box = $('gradSwatches');
  box.innerHTML = '';
  GRADS.forEach(([a, b]) => {
    const el = document.createElement('button');
    el.className = 'bgsw';
    el.style.background = `linear-gradient(135deg, ${a}, ${b})`;
    el.onclick = () => { S.grad1 = a; S.grad2 = b; $('grad1').value = a; $('grad2').value = b; salvar(); mudou(false); };
    box.appendChild(el);
  });
}

// imagens enviadas são reduzidas para no máximo 3840px (rápido de transmitir)
function reduzirImagem(file) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 3840 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = erro;
    img.src = url;
  });
}
$('upFundo').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  for (const f of files) {
    try {
      const src = await reduzirImagem(f);
      const id = 'img' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      addImagem(id, src);
      S.imgId = id;
    } catch (err) { toast('Não foi possível abrir ' + f.name); }
  }
  S.bgType = 'image';
  salvar(); salvarImagens();
  document.querySelectorAll('#segBg button').forEach(b => b.classList.toggle('on', b.dataset.v === 'image'));
  mostrarBgBox(); montarImgSwatches(); mudou(false);
});

$('btnReset').onclick = () => {
  const manter = { format: S.format, autoLive: S.autoLive, trans: S.trans, imgId: S.imgId, monitor: S.monitor, hlColor: S.hlColor };
  S = { ...PADRAO, ...manter };
  salvar();
  location.reload();
};

// abas
document.querySelectorAll('.tabs').forEach(tabs => {
  const aside = tabs.parentElement;
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => {
    tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    aside.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
    if (b.dataset.tab === 'busca') $('busca').focus();
  });
});

// ---------- PNG ----------
$('btnPng').onclick = async () => {
  const [W, H] = FORMATOS[S.format];
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const slide = montarSlide('live');
  await Engine.ensureFonts(slide.style);
  Engine.drawSlide(cv.getContext('2d'), W, H, slide, imgDe(slide));
  const nome = (referencia || 'versiculo').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[:\s\-]+/g, '_').replace(/[^\w]/g, '').toUpperCase() || 'VERSICULO';
  cv.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${nome}_${S.format.replace(':', 'x')}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }, 'image/png');
};

// ---------- saída / monitores ----------
let monitores = [];
function definirAspecto(w, h) {
  const a = w && h ? w / h : 16 / 9;
  if (Math.abs(a - aspecto) < 0.001) return;
  aspecto = a;
  document.querySelectorAll('.screen').forEach(s => s.style.aspectRatio = `${w} / ${h}`);
  renderPrev();
  renderLive();
}
function montarMonitores() {
  const sel = $('selMonitor');
  sel.innerHTML = monitores.map((m, i) =>
    `<option value="${m.id}">${i + 1}. ${esc(m.label)}${m.primary ? ' (principal)' : ''} — ${m.width}×${m.height}</option>`).join('');
  const preferido = monitores.find(m => m.id === S.monitor) || monitores.find(m => !m.primary) || monitores[0];
  if (preferido) sel.value = preferido.id;

  const box = $('listaMonitores');
  box.innerHTML = '';
  monitores.forEach((m, i) => {
    const d = document.createElement('div');
    const ativo = saida.open && saida.displayId === m.id;
    d.className = 'monitor-item' + (ativo ? ' on' : '');
    d.innerHTML = `<div><b>${i + 1}. ${esc(m.label)}</b><br><small>${m.width}×${m.height}${m.primary ? ' • principal (operador)' : ''}</small></div>`;
    const b = document.createElement('button');
    b.textContent = ativo ? 'Fechar' : 'Projetar aqui';
    b.className = ativo ? 'danger' : '';
    b.onclick = () => ativo ? ponte.closeOutput() : abrirProjecao(m.id);
    d.appendChild(b);
    box.appendChild(d);
  });
  if (!preferido) return;
  if (!saida.open) definirAspecto(preferido.width, preferido.height);
}
async function abrirProjecao(id) {
  S.monitor = id; salvar();
  await ponte.openOutput(id);
  if (!live.slide) alternarModo('clear');
}
$('selMonitor').onchange = e => {
  S.monitor = +e.target.value; salvar();
  if (saida.open) abrirProjecao(S.monitor);
  else { const m = monitores.find(x => x.id === S.monitor); if (m) definirAspecto(m.width, m.height); }
};
$('btnProjecao').onclick = () => {
  if (!ponte) return toast('Abra pelo aplicativo para projetar.');
  if (saida.open) ponte.closeOutput();
  else abrirProjecao(+$('selMonitor').value);
};
function atualizarSaida(st) {
  saida = st;
  const pill = $('pillSaida');
  pill.classList.toggle('on', st.open);
  const m = monitores.find(x => x.id === st.displayId);
  pill.querySelector('span').textContent = st.open
    ? `Projetando${m ? ' em ' + m.label : ''}` : 'Projeção fechada';
  $('btnProjecao').textContent = st.open ? '✕ Fechar projeção' : '🖥 Abrir projeção';
  $('btnProjecao').classList.toggle('primary', !st.open);
  if (st.open && st.width && st.height) definirAspecto(st.width, st.height);
  montarMonitores();
}
async function montarLinks() {
  const info = await ponte.serverInfo();
  if (info.versao) $('versao').textContent = 'v' + info.versao + (info.empacotado ? '' : ' (dev)');
  // porta diferente da padrão = outra cópia do app provavelmente está aberta
  if (info.port && info.port !== 7777) {
    $('versao').textContent += ' • porta ' + info.port;
    $('versao').title = 'Outra cópia do Bible ACF Studio parece estar aberta (a porta 7777 já estava em uso). '
      + 'Feche as outras cópias para não projetar pela janela errada.';
    $('versao').style.color = '#ff9b9d';
  }
  const box = $('links');
  box.innerHTML = '';
  if (!info.port) { box.innerHTML = '<p class="hint">Servidor de rede indisponível.</p>'; return; }
  info.urls.forEach((u, i) => {
    const d = document.createElement('div');
    d.className = 'link';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.readOnly = true; inp.value = u;
    const cp = document.createElement('button');
    cp.textContent = 'Copiar';
    cp.onclick = () => navigator.clipboard.writeText(u).then(() => toast('Link copiado!'));
    const ab = document.createElement('button');
    ab.textContent = 'Abrir';
    ab.onclick = () => ponte.openExternal(u);
    d.append(inp, cp, ab);
    box.appendChild(d);
    if (i === 0) box.insertAdjacentHTML('beforeend', '<small class="hint">↑ neste PC (OBS) • ↓ outros aparelhos da rede</small>');
  });
}

// ---------- teclado ----------
document.addEventListener('keydown', e => {
  const alvo = e.target instanceof Element ? e.target : document.body;
  const digitando = alvo.matches('input[type=text], input[type=search], input[type=number], textarea, select');
  if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) return;
  if (document.querySelector('.modal.on')) return;            // janela aberta: atalhos pausados
  if (digitando) {
    if (e.key === 'Escape') alvo.blur();
    return;
  }
  // setas num controle deslizante continuam mexendo nele
  if (alvo.matches('input[type=range]') && e.key.startsWith('Arrow')) return;
  if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); $('quickRef').focus(); return; }
  switch (e.key) {
    case 'Enter':
      e.preventDefault(); if (CFG.teclaCorte !== 'espaco') cortar(); break;
    case ' ':
      e.preventDefault(); if (CFG.teclaCorte !== 'enter') cortar(); break;
    case 'ArrowDown': e.preventDefault(); previaRelativa(1); break;
    case 'ArrowUp': e.preventDefault(); previaRelativa(-1); break;
    case 'ArrowRight': e.preventDefault(); passo(1); break;
    case 'ArrowLeft': e.preventDefault(); passo(-1); break;
    case 'PageDown': e.preventDefault(); if (CFG.passador === 'cortar') cortar(); else previaRelativa(1); break;
    case 'PageUp': e.preventDefault(); if (CFG.passador === 'cortar') voltarUm(); else previaRelativa(-1); break;
    case 'b': case 'B': case '.': alternarModo('black'); break;
    case 'c': case 'C': case 'Escape': alternarModo('clear'); break;
    case '/': e.preventDefault(); $('quickRef').focus(); break;
    default:
      // começar a digitar uma letra abre o "Ir para"
      if (e.key.length === 1 && /[\p{L}\d]/u.test(e.key) && !e.ctrlKey && !e.altKey) $('quickRef').focus();
  }
});

// ---------- início ----------
function iniciar() {
  if (!BIBLIA.length) { document.body.innerHTML = '<p style="padding:30px">bible_acf.js não encontrado.</p>'; return; }
  carregarImagensSalvas();
  if (!imagens.has(S.imgId)) S.imgId = 'padrao';
  montarLivros();
  montarHlSwatches();
  montarGradSwatches();
  montarImgSwatches();
  mostrarBgBox();
  montarHistorico();
  const { b, c, v1, v2 } = P;
  P = { b: -1 };
  irPara(b, c, v1, v2);
  renderLive();
  document.fonts.ready.then(() => { renderPrev(); renderLive(); });

  if (ponte) {
    ponte.displays().then(d => { monitores = d; montarMonitores(); });
    ponte.outputState().then(atualizarSaida);
    ponte.on('displays-changed', d => { monitores = d; montarMonitores(); });
    ponte.on('output:state', atualizarSaida);
    montarLinks();
    setTimeout(montarLinks, 1500);
  } else {
    $('selMonitor').innerHTML = '<option>Abra pelo aplicativo</option>';
  }
}
iniciar();
