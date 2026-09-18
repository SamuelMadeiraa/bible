// Tela de projeção. Funciona dentro do app (2º monitor) e no navegador/OBS (via rede).
const ponte = window.bridge;
const camadas = {
  bg: [document.getElementById('bg0'), document.getElementById('bg1')],
  tx: [document.getElementById('tx0'), document.getElementById('tx1')],
};
const frente = { bg: 0, tx: 0 };
const black = document.getElementById('black');
const imgCache = new Map();

let atual = null;        // última slide recebida
let chaveBg = null;      // identifica o fundo desenhado
let chaveTx = null;      // identifica o texto desenhado
let fila = Promise.resolve();

function carregarImagem(id) {
  if (!id) return Promise.resolve(null);
  if (imgCache.has(id)) return imgCache.get(id);
  const p = (async () => {
    const src = ponte ? await ponte.getImage(id) : `img/${encodeURIComponent(id)}`;
    if (!src) return null;
    const img = new Image();
    img.src = src;
    try { await img.decode(); } catch (e) { return null; }
    return img;
  })();
  imgCache.set(id, p);
  p.then(img => { if (!img) imgCache.delete(id); });
  return p;
}

function dimensionar(cv) {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  return [W, H];
}

// Desenha na camada escondida e faz a troca com transição.
function trocar(tipo, desenhar, ms, crossfade) {
  const velho = camadas[tipo][frente[tipo]];
  const novo = camadas[tipo][1 - frente[tipo]];
  const [W, H] = dimensionar(novo);
  const ctx = novo.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  desenhar(ctx, W, H);

  const base = tipo === 'bg' ? 1 : 5;
  novo.style.zIndex = base + 1;
  velho.style.zIndex = base;
  novo.style.transition = 'none';
  novo.style.opacity = 0;
  void novo.offsetWidth;
  novo.style.transition = `opacity ${ms}ms ease`;
  novo.style.opacity = 1;
  if (crossfade || ms === 0) {
    velho.style.transition = `opacity ${ms}ms ease`;
    velho.style.opacity = 0;
  } else {
    // fundo: o antigo só some depois que o novo cobriu a tela (sem "piscar" preto)
    velho.style.transition = 'none';
    clearTimeout(velho._t);
    velho._t = setTimeout(() => { if (camadas[tipo][frente[tipo]] !== velho) velho.style.opacity = 0; }, ms + 30);
  }
  frente[tipo] = 1 - frente[tipo];
}

async function aplicar(slide, forcar) {
  const ms = forcar ? 0 : Math.max(0, slide.ms || 0);
  const img = slide.bg.type === 'image' ? await carregarImagem(slide.bg.imgId) : null;
  await Engine.ensureFonts(slide.style);

  const kBg = JSON.stringify(slide.bg);
  if (forcar || kBg !== chaveBg) {
    trocar('bg', (ctx, W, H) => Engine.drawBackground(ctx, W, H, slide.bg, img), ms, false);
    chaveBg = kBg;
  }

  const mostrarTexto = slide.mode === 'live';
  const kTx = mostrarTexto ? JSON.stringify([slide.text, slide.style]) : 'vazio';
  if (forcar || kTx !== chaveTx) {
    trocar('tx', (ctx, W, H) => { if (mostrarTexto) Engine.drawText(ctx, W, H, slide); }, ms, true);
    chaveTx = kTx;
  }

  black.style.transition = `opacity ${ms}ms ease`;
  black.style.opacity = slide.mode === 'black' ? 1 : 0;
  document.body.classList.remove('offline');
}

function receber(slide) {
  if (!slide) return;
  atual = slide;
  fila = fila.then(() => aplicar(slide, false)).catch(console.error);
}

let resizeT;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (atual) fila = fila.then(() => aplicar(atual, true)); }, 60);
});

// F11 / duplo clique: tela cheia
function alternarTelaCheia() {
  if (ponte) return ponte.toggleFullscreen();
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}
addEventListener('dblclick', alternarTelaCheia);
addEventListener('keydown', e => { if (e.key === 'F11' || e.key === 'f') { e.preventDefault(); alternarTelaCheia(); } });

// ---------------- mídia (vídeo, foto, áudio) ----------------
const midia = document.getElementById('midia');
const mv = document.getElementById('mv');
const mi = document.getElementById('mi');
const mau = document.getElementById('mau');
let itemAtual = null;

function urlDe(item) {
  if (ponte && item.caminho) return 'file:///' + encodeURI(item.caminho.replace(/\\/g, '/')).replace(/#/g, '%23');
  return 'media/' + encodeURIComponent(item.id);
}
function elementoDe(tipo) { return tipo === 'video' ? mv : tipo === 'audio' ? mau : null; }

function avisarProgresso(extra) {
  if (!ponte || !itemAtual) return;
  const el = elementoDe(itemAtual.tipo);
  ponte.mediaProgress({
    id: itemAtual.id,
    t: el ? el.currentTime : 0,
    dur: el && isFinite(el.duration) ? el.duration : 0,
    tocando: el ? !el.paused : true,
    ...extra,
  });
}
let ultimoAviso = 0;
const aoTempo = () => { const agora = Date.now(); if (agora - ultimoAviso > 250) { ultimoAviso = agora; avisarProgresso(); } };
[mv, mau].forEach(el => {
  el.addEventListener('timeupdate', aoTempo);
  el.addEventListener('ended', () => avisarProgresso({ fim: true }));
  el.addEventListener('play', () => avisarProgresso());
  el.addEventListener('pause', () => avisarProgresso());
  el.addEventListener('loadedmetadata', () => avisarProgresso());
  el.addEventListener('error', () => avisarProgresso({ erro: 'formato não suportado pelo player interno' }));
});

function pararMidia() {
  itemAtual = null;
  midia.style.opacity = 0;
  midia.className = '';
  mv.pause(); mau.pause();
  setTimeout(() => { if (!itemAtual) { mv.removeAttribute('src'); mv.load(); mi.removeAttribute('src'); } }, 300);
}

function mostrarWeb(url) {
  let f = document.getElementById('webFrame');
  if (!url) { if (f) f.remove(); return; }
  if (!f) {
    f = document.createElement('iframe');
    f.id = 'webFrame';
    f.allow = 'autoplay; fullscreen; encrypted-media';
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:9;background:#000';
    document.body.appendChild(f);
  }
  f.src = url;
}

function receberMidia(cmd) {
  if (!cmd) return;
  document.body.classList.remove('offline');
  switch (cmd.a) {
    case 'load': {
      const item = cmd.item;
      itemAtual = item;
      midia.className = (item.tipo === 'audio' ? '' : item.tipo) + (cmd.cover ? ' cover' : '') + (cmd.overlay ? '' : ' acima');
      const url = urlDe(item);
      if (item.tipo === 'video') {
        mau.pause();
        if (mv.getAttribute('src') !== url) { mv.src = url; }
        mv.loop = !!cmd.loop;
        mv.volume = (cmd.volume ?? 100) / 100;
        mv.currentTime = cmd.t || 0;
        if (cmd.play !== false) mv.play().catch(() => {});
        midia.style.opacity = 1;
      } else if (item.tipo === 'imagem') {
        mv.pause();
        mi.src = url;
        midia.style.opacity = 1;
      } else {                                  // áudio: a tela continua mostrando o versículo
        mv.pause();
        midia.style.opacity = 0;
        midia.className = '';
        if (mau.getAttribute('src') !== url) mau.src = url;
        mau.loop = !!cmd.loop;
        mau.volume = (cmd.volume ?? 100) / 100;
        mau.currentTime = cmd.t || 0;
        if (cmd.play !== false) mau.play().catch(() => {});
      }
      break;
    }
    case 'play': { const el = elementoDe(itemAtual?.tipo); if (el) el.play().catch(() => {}); break; }
    case 'pause': { const el = elementoDe(itemAtual?.tipo); if (el) el.pause(); break; }
    case 'seek': { const el = elementoDe(itemAtual?.tipo); if (el) el.currentTime = cmd.t || 0; break; }
    case 'volume': { mv.volume = mau.volume = Math.min(1, Math.max(0, (cmd.volume ?? 100) / 100)); break; }
    case 'overlay': midia.classList.toggle('acima', !cmd.overlay); break;
    case 'cover': midia.classList.toggle('cover', !!cmd.cover); break;
    case 'stop': pararMidia(); break;
    // no navegador/OBS a transmissão aparece num iframe (no app ela é uma camada nativa)
    case 'web': if (!ponte) mostrarWeb(cmd.url); break;
    case 'webFechar': if (!ponte) mostrarWeb(null); break;
  }
}

if (ponte) {
  ponte.on('slide', receber);
  ponte.on('media', receberMidia);
  ponte.lastSlide().then(s => { if (s) receber(s); else document.body.classList.add('offline'); });
  ponte.lastMedia().then(m => { if (m) receberMidia(m); });
} else {
  document.body.classList.add('offline');
  const es = new EventSource('events');
  es.addEventListener('slide', ev => receber(JSON.parse(ev.data)));
  es.addEventListener('media', ev => receberMidia(JSON.parse(ev.data)));
  es.onmessage = ev => receber(JSON.parse(ev.data));     // compatibilidade
  es.onerror = () => document.body.classList.add('offline');
}
