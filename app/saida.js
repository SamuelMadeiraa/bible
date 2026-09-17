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

if (ponte) {
  ponte.on('slide', receber);
  ponte.lastSlide().then(s => { if (s) receber(s); else document.body.classList.add('offline'); });
} else {
  document.body.classList.add('offline');
  const conectar = () => {
    const es = new EventSource('events');
    es.onmessage = ev => receber(JSON.parse(ev.data));
    es.onerror = () => document.body.classList.add('offline');
  };
  conectar();
}
