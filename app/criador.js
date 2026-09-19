// Criador de vídeo de louvor: música + fundo + letra sincronizada -> MP4 (H.264 + AAC).
// A mesma função desenha a prévia e cada quadro do vídeo, então o que se vê é o que sai no arquivo.
const $ = id => document.getElementById(id);
const ponte = window.bridge;
const CHAVE = 'bibleStudioCriador';
const FPS = 30;
const FADE = 0.35;                      // segundos da troca de estrofe

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
const fmt = s => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const fmtPreciso = s => (s == null || !isFinite(s)) ? '' : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
function lerTempo(txt) {
  const m = String(txt).trim().match(/^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  return (+m[1] || 0) * 60 + parseFloat(m[2].replace(',', '.'));
}
const urlArquivo = c => 'file:///' + encodeURI(c.replace(/\\/g, '/')).replace(/#/g, '%23');
const nomeDe = c => c.split(/[\\/]/).pop();

// ---------- estado (fica guardado para continuar depois) ----------
const E = {
  musica: null,            // { caminho, nome, dur }
  titulo: '', letra: '', tempos: [],
  fundo: 'azul', fundoImagem: null, escurecer: 15, movimento: true,
  fonte: 'Barlow Condensed|800', alinhar: 'esquerda', tamanho: 100, corTexto: '#ffffff', maiusculas: true, sombra: true,
  rodape: '', corRodape: '#e3b65a', logo: null, intro: true, qualidade: '1080',
};
try { Object.assign(E, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) {}
let salvarT = null;
const salvar = () => { clearTimeout(salvarT); salvarT = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) {} }, 300); };

// estrofes = blocos separados por linha em branco
let estrofes = [];
function lerEstrofes() {
  estrofes = E.letra.split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
  E.tempos.length = estrofes.length;
  for (let i = 0; i < estrofes.length; i++) if (E.tempos[i] === undefined) E.tempos[i] = null;
  const longas = estrofes.filter(b => b.length > 5).length;
  $('letraInfo').textContent = estrofes.length
    ? `${estrofes.length} ${estrofes.length === 1 ? 'tela' : 'telas'}` + (longas ? ` • ${longas} com mais de 5 linhas (a letra fica menor)` : '') + '. Uma linha em branco separa as telas.'
    : 'Uma linha em branco separa as telas. Até 4 ou 5 linhas por tela ficam melhor.';
}

// ---------- fundos prontos (desenhados, ficam nítidos em qualquer resolução) ----------
function aleatorio(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function brilho(ctx, x, y, rx, ry, ang, cor) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, cor); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}
function faixa(ctx, W, H, y0, curva, espessura, cor) {
  // faixa de luz suave atravessando a tela (como as ondas do fundo azul clássico)
  ctx.save();
  ctx.filter = `blur(${Math.round(H * 0.05)}px)`;
  ctx.beginPath();
  ctx.moveTo(-W * 0.1, y0);
  ctx.bezierCurveTo(W * 0.3, y0 - curva, W * 0.65, y0 + curva, W * 1.1, y0 - curva * 0.4);
  ctx.lineTo(W * 1.1, y0 - curva * 0.4 + espessura);
  ctx.bezierCurveTo(W * 0.65, y0 + curva + espessura, W * 0.3, y0 - curva + espessura, -W * 0.1, y0 + espessura);
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.restore();
}
const FUNDOS = {
  azul: { nome: 'Azul real', desenhar(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#030b26'); g.addColorStop(0.45, '#08206b'); g.addColorStop(1, '#0b2f8f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    faixa(ctx, W, H, H * 0.18, H * 0.12, H * 0.16, 'rgba(70,120,230,.18)');
    faixa(ctx, W, H, H * 0.62, -H * 0.1, H * 0.2, 'rgba(60,110,220,.14)');
    brilho(ctx, W * 0.82, H * 0.78, W * 0.45, H * 0.35, -0.3, 'rgba(40,90,210,.35)');
    brilho(ctx, W * 0.1, H * 0.1, W * 0.4, H * 0.3, 0.2, 'rgba(0,0,0,.45)');
  } },
  noite: { nome: 'Noite', desenhar(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#02040d'); g.addColorStop(1, '#0c1838');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    brilho(ctx, W * 0.7, H * 1.05, W * 0.7, H * 0.5, 0, 'rgba(60,90,200,.35)');
    const r = aleatorio(7);
    for (let i = 0; i < 260; i++) {
      const s = r() * 1.6 + 0.3;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`;
      ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.85, s * H / 1080, 0, 7); ctx.fill();
    }
  } },
  purpura: { nome: 'Púrpura', desenhar(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#12061f'); g.addColorStop(0.6, '#3b1060'); g.addColorStop(1, '#5c1f7a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    faixa(ctx, W, H, H * 0.3, H * 0.1, H * 0.18, 'rgba(180,90,255,.14)');
    brilho(ctx, W * 0.85, H * 0.2, W * 0.4, H * 0.35, 0.4, 'rgba(230,120,255,.22)');
  } },
  aurora: { nome: 'Aurora', desenhar(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#01110f'); g.addColorStop(0.55, '#063a36'); g.addColorStop(1, '#0d5c4f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    faixa(ctx, W, H, H * 0.25, H * 0.14, H * 0.14, 'rgba(60,230,170,.14)');
    faixa(ctx, W, H, H * 0.55, -H * 0.12, H * 0.12, 'rgba(90,160,239,.12)');
  } },
  brasa: { nome: 'Dourado', desenhar(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#120702'); g.addColorStop(0.6, '#3f1906'); g.addColorStop(1, '#6b2e0a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    brilho(ctx, W * 0.8, H * 0.85, W * 0.55, H * 0.4, -0.2, 'rgba(255,170,60,.25)');
    faixa(ctx, W, H, H * 0.2, H * 0.1, H * 0.14, 'rgba(255,190,90,.1)');
  } },
  grafite: { nome: 'Grafite', desenhar(ctx, W, H) {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, W * 0.75);
    g.addColorStop(0, '#2a2e36'); g.addColorStop(1, '#07080a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } },
  preto: { nome: 'Preto', desenhar(ctx, W, H) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },
};

// imagens carregadas pelo processo principal (sem restrição de arquivo local no canvas)
const imagens = {};   // caminho -> ImageBitmap
async function carregarImagem(caminho) {
  if (!caminho) return null;
  if (imagens[caminho]) return imagens[caminho];
  const dados = await ponte.lerArquivo(caminho);
  const bmp = await createImageBitmap(new Blob([dados]));
  imagens[caminho] = bmp;
  return bmp;
}

// ---------- camadas em cache (fundo, rodapé e texto de cada estrofe) ----------
const cache = new Map();
const limparCache = () => cache.clear();
function camada(chave, W, H, desenhar) {
  const k = `${chave}|${W}x${H}`;
  if (cache.has(k)) return cache.get(k);
  if (cache.size > 40) cache.clear();          // mexer nos controles cria camadas novas: não deixa acumular
  const c = new OffscreenCanvas(W, H);
  desenhar(c.getContext('2d'), W, H);
  cache.set(k, c);
  return c;
}
const MARGEM_MOV = 1.08;                 // o fundo é desenhado um pouco maior para poder se mover
function camadaFundo(W, H) {
  const bw = Math.round(W * MARGEM_MOV), bh = Math.round(H * MARGEM_MOV);
  return camada(`fundo:${E.fundo}:${E.fundoImagem}:${E.escurecer}`, bw, bh, (ctx, w, h) => {
    const img = E.fundo === 'imagem' && imagens[E.fundoImagem];
    if (img) {
      const s = Math.max(w / img.width, h / img.height);
      ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
    } else (FUNDOS[E.fundo] || FUNDOS.azul).desenhar(ctx, w, h);
    if (E.escurecer) { ctx.fillStyle = `rgba(0,0,0,${E.escurecer / 100})`; ctx.fillRect(0, 0, w, h); }
  });
}
const [familiaDe, pesoDe] = [() => E.fonte.split('|')[0], () => E.fonte.split('|')[1] || '700'];
const textoRodape = () => (E.rodape || E.titulo || '').trim();
function camadaRodape(W, H) {
  return camada(`rodape:${textoRodape()}:${E.corRodape}:${E.logo}`, W, H, (ctx, w, h) => {
    const base = h * 0.905, x0 = w * 0.052;
    let x = x0;
    const logo = E.logo && imagens[E.logo];
    if (logo) {
      const lh = h * 0.085, lw = logo.width * lh / logo.height;
      ctx.drawImage(logo, x, base - lh * 0.72, lw, lh);
      x += lw + w * 0.018;
    }
    const txt = textoRodape().toUpperCase();
    if (!txt) return;
    const tam = h * 0.044;
    ctx.font = `700 ${tam}px "Playfair Display", serif`;
    ctx.textBaseline = 'alphabetic';
    const g = ctx.createLinearGradient(0, base - tam, 0, base);
    g.addColorStop(0, clarear(E.corRodape, 0.35)); g.addColorStop(1, E.corRodape);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = h * 0.01; ctx.shadowOffsetY = h * 0.003;
    ctx.fillStyle = g;
    ctx.fillText(txt, x, base);
  });
}
function clarear(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * k));
  return `rgb(${c.join(',')})`;
}
// texto de uma tela (estrofe ou o título da introdução)
function camadaTexto(chave, linhas, W, H, titulo) {
  return camada(`txt:${chave}:${linhas.join('/')}:${E.fonte}:${E.alinhar}:${E.tamanho}:${E.corTexto}:${E.maiusculas}:${E.sombra}`, W, H, (ctx, w, h) => {
    const ls = linhas.map(l => E.maiusculas ? l.toLocaleUpperCase('pt-BR') : l);
    const familia = familiaDe(), peso = pesoDe();
    let tam = h * (titulo ? 0.12 : 0.098) * E.tamanho / 100;
    const larguraMax = w * (E.alinhar === 'centro' ? 0.86 : 0.8);
    const alturaMax = h * 0.66;
    const medir = () => { ctx.font = `${peso} ${tam}px "${familia}"`; return Math.max(...ls.map(l => ctx.measureText(l).width)); };
    let maior = medir();
    while ((maior > larguraMax || ls.length * tam * 1.13 > alturaMax) && tam > h * 0.03) { tam *= 0.95; maior = medir(); }
    const alt = tam * 1.13;
    const topo = h * 0.45 - (ls.length * alt) / 2 + tam * 0.8;
    const x = E.alinhar === 'centro' ? w / 2 : w * 0.052;
    ctx.textAlign = E.alinhar === 'centro' ? 'center' : 'left';
    ctx.textBaseline = 'alphabetic';
    if (E.sombra) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = h * 0.014; ctx.shadowOffsetY = h * 0.005; }
    ctx.fillStyle = E.corTexto;
    ls.forEach((l, i) => ctx.fillText(l, x, topo + i * alt));
  });
}

// ---------- o quadro no instante t (prévia e exportação usam a mesma função) ----------
function telasNoTempo() {
  // lista de telas com início: [introdução?] + estrofes com tempo marcado, em ordem
  const lista = [];
  const primeiro = E.tempos.find(t => t != null);
  if (E.intro && E.titulo.trim()) lista.push({ chave: 'intro', linhas: [E.titulo.trim()], ini: 0, titulo: true });
  estrofes.forEach((linhas, i) => { if (E.tempos[i] != null) lista.push({ chave: 'e' + i, linhas, ini: E.tempos[i] }); });
  lista.sort((a, b) => a.ini - b.ini);
  if (lista[0] && lista[0].chave === 'intro' && primeiro === 0) lista.shift();
  return lista;
}
function desenharQuadro(ctx, W, H, t, dur, telas) {
  // fundo (com movimento lento de zoom e deslocamento)
  const f = camadaFundo(W, H);
  if (E.movimento && dur > 0) {
    const k = t / dur;
    const z = 1 + 0.06 * k;                                  // aproxima devagar ao longo da música
    const dw = W * MARGEM_MOV / z, dh = H * MARGEM_MOV / z;
    const ox = (f.width - dw) * (0.5 + 0.35 * Math.sin(t / 23)), oy = (f.height - dh) * (0.5 + 0.35 * Math.cos(t / 31));
    ctx.drawImage(f, ox, oy, dw, dh, 0, 0, W, H);
  } else {
    ctx.drawImage(f, (f.width - W) / 2, (f.height - H) / 2, W, H, 0, 0, W, H);
  }
  // texto: a tela atual aparece com fade enquanto a anterior some
  let k = -1;
  for (let i = 0; i < telas.length; i++) if (telas[i].ini <= t) k = i;
  const fim = dur > 0 ? dur : Infinity;
  const saida = Math.max(0, Math.min(1, (fim - t) / 1.5));  // no fim da música o texto some
  if (k >= 0) {
    const atual = telas[k];
    const a = Math.min(1, (t - atual.ini) / FADE);
    if (a < 1 && k > 0) {
      ctx.globalAlpha = (1 - a) * saida;
      ctx.drawImage(camadaTexto(telas[k - 1].chave, telas[k - 1].linhas, W, H, telas[k - 1].titulo), 0, 0);
    }
    ctx.globalAlpha = a * saida;
    ctx.drawImage(camadaTexto(atual.chave, atual.linhas, W, H, atual.titulo), 0, 0);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(camadaRodape(W, H), 0, 0);
}

// ---------- prévia ----------
const cv = $('previa');
const cx = cv.getContext('2d');
const audio = new Audio();
audio.preload = 'auto';
let desenhando = false;
function desenharPrevia() {
  const t = audio.currentTime || 0, dur = E.musica ? E.musica.dur : 0;
  desenharQuadro(cx, cv.width, cv.height, t, dur, telasNoTempo());
  $('tempo').textContent = `${fmt(t)} / ${fmt(dur)}`;
  $('progresso').style.width = dur ? (t / dur * 100) + '%' : '0';
  $('telaVazia').hidden = !!(E.musica || estrofes.length);
  marcarEstrofeAtual(t);
}
function loop() {
  desenharPrevia();
  if (!audio.paused) requestAnimationFrame(loop); else desenhando = false;
}
function redesenhar() { if (!desenhando) requestAnimationFrame(desenharPrevia); }
audio.addEventListener('play', () => { porIcone($('btnPlay'), 'pause'); if (!desenhando) { desenhando = true; requestAnimationFrame(loop); } });
audio.addEventListener('pause', () => porIcone($('btnPlay'), 'play'));
audio.addEventListener('ended', () => { porIcone($('btnPlay'), 'play'); if (sinc.ativa) pararSinc(); });
audio.addEventListener('seeked', redesenhar);
$('btnPlay').onclick = () => {
  if (!E.musica) return toast('Escolha a música primeiro');
  audio.paused ? audio.play() : audio.pause();
};
$('linhaTempo').addEventListener('pointerdown', e => {
  if (!E.musica) return;
  const r = e.currentTarget.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * E.musica.dur;
});

// ---------- lista de estrofes e sincronia ----------
function montarEstrofes() {
  const box = $('estrofes');
  box.innerHTML = '';
  if (!estrofes.length) { box.innerHTML = '<p class="estrofes-vazio">Cole a letra no passo 2 — cada estrofe aparece aqui para você marcar quando ela começa.</p>'; montarMarcas(); return; }
  estrofes.forEach((linhas, i) => {
    const d = document.createElement('div');
    d.className = 'estrofe';
    d.dataset.i = i;
    d.innerHTML = `<b>${i + 1}</b><div class="txt"><span></span><small></small></div><input type="text" placeholder="0:00.0" title="Quando esta estrofe começa (minutos:segundos)"><button class="btn" title="Ouvir a partir daqui"><i data-i="play"></i></button>`;
    d.querySelector('span').textContent = linhas[0];
    d.querySelector('small').textContent = linhas.slice(1).join(' / ');
    const inp = d.querySelector('input');
    inp.value = fmtPreciso(E.tempos[i]);
    inp.classList.toggle('vazio', E.tempos[i] == null);
    inp.addEventListener('change', () => {
      const v = lerTempo(inp.value);
      E.tempos[i] = inp.value.trim() === '' ? null : v;
      if (inp.value.trim() && v == null) toast('Use o formato minutos:segundos, ex: 1:23.5');
      inp.value = fmtPreciso(E.tempos[i]);
      inp.classList.toggle('vazio', E.tempos[i] == null);
      salvar(); montarMarcas(); redesenhar();
    });
    d.querySelector('button').onclick = () => {
      if (!E.musica) return toast('Escolha a música primeiro');
      audio.currentTime = Math.max(0, (E.tempos[i] ?? 0) - 1);
      audio.play();
    };
    box.appendChild(d);
  });
  montarMarcas();
}
function montarMarcas() {
  const box = $('marcas');
  box.innerHTML = '';
  const dur = E.musica ? E.musica.dur : 0;
  if (!dur) return;
  E.tempos.forEach(t => { if (t != null) { const i = document.createElement('i'); i.style.left = (t / dur * 100) + '%'; box.appendChild(i); } });
}
let ultimaAtual = -2;
function marcarEstrofeAtual(t) {
  let k = -1;
  E.tempos.forEach((v, i) => { if (v != null && v <= t && (k < 0 || v >= E.tempos[k])) k = i; });
  if (k === ultimaAtual && !sinc.ativa) return;
  ultimaAtual = k;
  document.querySelectorAll('.estrofe').forEach(d => {
    d.classList.toggle('atual', +d.dataset.i === k);
    d.classList.toggle('proxima', sinc.ativa && +d.dataset.i === sinc.idx);
  });
  const el = document.querySelector(sinc.ativa ? `.estrofe[data-i="${sinc.idx}"]` : '.estrofe.atual');
  if (el && !audio.paused) el.scrollIntoView({ block: 'nearest' });
}

// distribuir: começa depois da introdução e reparte o resto da música entre as estrofes
$('btnAuto').onclick = () => {
  if (!E.musica) return toast('Escolha a música primeiro');
  if (!estrofes.length) return toast('Cole a letra primeiro');
  if (E.tempos.some(t => t != null) && !confirm('Trocar os tempos marcados por uma distribuição automática?')) return;
  const ini = E.intro && E.titulo.trim() ? Math.min(8, E.musica.dur * 0.08) : 0.5;
  const fimUtil = E.musica.dur - Math.min(6, E.musica.dur * 0.04);
  const passo = (fimUtil - ini) / estrofes.length;
  E.tempos = estrofes.map((_, i) => +(ini + i * passo).toFixed(1));
  salvar(); montarEstrofes(); redesenhar();
  toast('Tempos distribuídos — ajuste ouvindo, se precisar');
};

// sincronizar tocando: a música toca do começo e cada toque marca o início da próxima estrofe
const sinc = { ativa: false, idx: 0 };
function atualizarSinc() {
  $('marcarTxt').textContent = sinc.idx < estrofes.length ? `Começou a estrofe ${sinc.idx + 1}: “${estrofes[sinc.idx][0].slice(0, 38)}”` : 'Todas marcadas';
  $('btnMarcar').disabled = sinc.idx >= estrofes.length;
  marcarEstrofeAtual(audio.currentTime);
}
$('btnSinc').onclick = () => {
  if (!E.musica) return toast('Escolha a música primeiro');
  if (!estrofes.length) return toast('Cole a letra primeiro');
  sinc.ativa = true; sinc.idx = 0;
  E.tempos = estrofes.map(() => null);
  montarEstrofes();
  $('sincAtiva').hidden = false;
  audio.currentTime = 0;
  audio.play();
  atualizarSinc();
};
function marcar() {
  if (!sinc.ativa || sinc.idx >= estrofes.length) return;
  E.tempos[sinc.idx] = +Math.max(0, audio.currentTime - 0.15).toFixed(1);   // compensa o tempo de reação
  const inp = document.querySelector(`.estrofe[data-i="${sinc.idx}"] input`);
  if (inp) { inp.value = fmtPreciso(E.tempos[sinc.idx]); inp.classList.remove('vazio'); }
  sinc.idx++;
  salvar(); montarMarcas(); atualizarSinc();
  if (sinc.idx >= estrofes.length) toast('Todas as estrofes marcadas — confira na prévia');
}
function desfazerMarca() {
  if (!sinc.ativa || sinc.idx === 0) return;
  sinc.idx--;
  E.tempos[sinc.idx] = null;
  const inp = document.querySelector(`.estrofe[data-i="${sinc.idx}"] input`);
  if (inp) { inp.value = ''; inp.classList.add('vazio'); }
  salvar(); montarMarcas(); atualizarSinc();
}
function pararSinc() {
  sinc.ativa = false;
  $('sincAtiva').hidden = true;
  audio.pause();
  marcarEstrofeAtual(audio.currentTime);
}
$('btnMarcar').onclick = marcar;
$('btnDesfazerMarca').onclick = desfazerMarca;
$('btnPararSinc').onclick = pararSinc;
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select') || document.querySelector('.modal.on')) return;
  if (e.code === 'Space') { e.preventDefault(); if (sinc.ativa) marcar(); else $('btnPlay').click(); }
  if (e.key === 'Backspace' && sinc.ativa) { e.preventDefault(); desfazerMarca(); }
  if (e.key === 'Escape' && sinc.ativa) pararSinc();
});

// ---------- passos (formulário) ----------
async function definirMusica(caminho) {
  audio.src = urlArquivo(caminho);
  const dur = await new Promise(ok => {
    audio.addEventListener('loadedmetadata', () => ok(audio.duration), { once: true });
    audio.addEventListener('error', () => ok(null), { once: true });
  });
  if (!dur || !isFinite(dur)) { toast('Não consegui abrir essa música (arquivo vazio ou formato sem suporte)'); return false; }
  E.musica = { caminho, nome: nomeDe(caminho), dur };
  if (!E.titulo) { E.titulo = nomeDe(caminho).replace(/\.[^.]+$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim(); $('titulo').value = E.titulo; }
  mostrarMusica();
  salvar(); montarMarcas(); redesenhar();
  return true;
}
function mostrarMusica() {
  $('musicaInfo').hidden = !E.musica;
  if (!E.musica) return;
  $('musicaNome').textContent = E.musica.nome;
  $('musicaDur').textContent = 'duração ' + fmt(E.musica.dur);
}
$('btnMusica').onclick = async () => {
  const c = await ponte.escolherArquivo('audio');
  if (c) definirMusica(c);
};
$('titulo').addEventListener('input', e => { E.titulo = e.target.value; salvar(); redesenhar(); });
$('letra').addEventListener('input', e => { E.letra = e.target.value; lerEstrofes(); salvar(); montarEstrofes(); redesenhar(); });

function montarFundos() {
  const box = $('fundos');
  box.innerHTML = '';
  Object.entries(FUNDOS).forEach(([id, f]) => {
    const b = document.createElement('button');
    b.className = 'fundo' + (E.fundo === id ? ' on' : '');
    const c = document.createElement('canvas');
    c.width = 192; c.height = 108;
    f.desenhar(c.getContext('2d'), 192, 108);
    b.append(c);
    b.insertAdjacentHTML('beforeend', `<span>${f.nome}</span>`);
    b.onclick = () => { E.fundo = id; salvar(); montarFundos(); redesenhar(); };
    box.appendChild(b);
  });
  const img = document.createElement('button');
  img.className = 'fundo' + (E.fundo === 'imagem' ? ' on' : '') + (E.fundoImagem && imagens[E.fundoImagem] ? '' : ' arquivo-fundo');
  if (E.fundoImagem && imagens[E.fundoImagem]) {
    const c = document.createElement('canvas');
    c.width = 192; c.height = 108;
    const bmp = imagens[E.fundoImagem], s = Math.max(192 / bmp.width, 108 / bmp.height);
    c.getContext('2d').drawImage(bmp, (192 - bmp.width * s) / 2, (108 - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
    img.append(c);
    img.insertAdjacentHTML('beforeend', '<span>Minha imagem</span>');
  } else img.innerHTML = icone('image') + '<span>Minha imagem</span>';
  img.title = 'Usar uma imagem do computador (clique de novo para trocar)';
  img.onclick = async () => {
    if (E.fundo === 'imagem' || !E.fundoImagem) {
      const c = await ponte.escolherArquivo('imagem');
      if (!c) return;
      try { await carregarImagem(c); } catch (e) { return toast('Não consegui abrir essa imagem'); }
      E.fundoImagem = c;
    }
    E.fundo = 'imagem';
    salvar(); montarFundos(); redesenhar();
  };
  box.appendChild(img);
}
function ligarSeg(id, campo) {
  const box = $(id);
  const marcar = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === E[campo]));
  box.querySelectorAll('button').forEach(b => b.onclick = () => { E[campo] = b.dataset.v; marcar(); salvar(); redesenhar(); });
  marcar();
}
function ligar(id, campo, tipo = 'value', depois) {
  const el = $(id);
  el[tipo] = E[campo];
  el.addEventListener('input', () => { E[campo] = tipo === 'checked' ? el.checked : el.type === 'range' ? +el.value : el.value; if (depois) depois(); salvar(); redesenhar(); });
}
ligar('escurecer', 'escurecer', 'value', () => { $('escurecerVal').textContent = E.escurecer + '%'; });
ligar('movimento', 'movimento', 'checked');
ligar('fonte', 'fonte', 'value', () => document.fonts.load(`${pesoDe()} 60px "${familiaDe()}"`).then(() => { limparCache(); redesenhar(); }));
ligar('tamanho', 'tamanho', 'value', () => { $('tamanhoVal').textContent = E.tamanho + '%'; });
ligar('corTexto', 'corTexto');
ligar('maiusculas', 'maiusculas', 'checked');
ligar('sombra', 'sombra', 'checked');
ligar('rodape', 'rodape');
ligar('corRodape', 'corRodape');
ligar('intro', 'intro', 'checked');
ligarSeg('alinhar', 'alinhar');
ligarSeg('qualidade', 'qualidade');
$('btnLogo').onclick = async () => {
  const c = await ponte.escolherArquivo('imagem');
  if (!c) return;
  try { await carregarImagem(c); } catch (e) { return toast('Não consegui abrir essa imagem'); }
  E.logo = c; $('btnSemLogo').hidden = false; salvar(); redesenhar();
};
$('btnSemLogo').onclick = () => { E.logo = null; $('btnSemLogo').hidden = true; salvar(); redesenhar(); };
$('btnNovo').onclick = () => {
  if (!confirm('Começar um vídeo novo? A música, a letra e os tempos atuais saem daqui (os estilos continuam).')) return;
  audio.pause(); audio.removeAttribute('src');
  Object.assign(E, { musica: null, titulo: '', letra: '', tempos: [] });
  $('titulo').value = ''; $('letra').value = '';
  lerEstrofes(); mostrarMusica(); montarEstrofes(); salvar(); redesenhar();
};

// ---------- gerar o MP4 ----------
let cancelado = false;
let ultimoVideo = null;
function progresso(pct, txt) {
  $('gerarBarra').style.width = pct.toFixed(1) + '%';
  $('gerarPct').textContent = Math.floor(pct) + '%';
  if (txt) $('gerarTxt').textContent = txt;
}
$('btnCancelar').onclick = () => { cancelado = true; $('gerarTxt').textContent = 'Cancelando…'; };
$('btnFecharPronto').onclick = () => $('modalGerar').classList.remove('on');
$('btnAbrirPasta').onclick = () => ultimoVideo && ponte.mostrarPasta('arquivo', ultimoVideo);
$('btnNoRoteiro').onclick = async () => {
  if (!ultimoVideo) return;
  const agora = await ponte.adicionarAoRoteiro(ultimoVideo);
  if (!agora) {
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem('bibleStudioPendentes') || '[]'); } catch (e) {}
    if (!lista.includes(ultimoVideo)) lista.push(ultimoVideo);
    try { localStorage.setItem('bibleStudioPendentes', JSON.stringify(lista)); } catch (e) {}
  }
  toast(agora ? 'Vídeo colocado no roteiro' : 'O vídeo entra no roteiro quando você abrir a operação');
};

async function gerar(destinoPronto) {
  if (!E.musica) return toast('Escolha a música (passo 1)');
  if (!estrofes.length) return toast('Cole a letra (passo 2)');
  if (!window.VideoEncoder || !window.AudioEncoder || !window.Mp4Muxer) return toast('Este computador não consegue gerar o vídeo');
  if (!E.tempos.some(t => t != null)) {
    if (!confirm('Nenhuma estrofe foi sincronizada. Distribuir a letra automaticamente ao longo da música?')) return;
    $('btnAuto').click();
    if (!E.tempos.some(t => t != null)) return;
  } else if (E.tempos.some(t => t == null) && !confirm('Algumas estrofes estão sem tempo e não vão aparecer. Gerar assim mesmo?')) return;

  const destino = typeof destinoPronto === 'string' ? destinoPronto : await ponte.destinoVideo(E.titulo || 'Louvor');
  if (!destino) return;
  audio.pause();
  cancelado = false;
  $('gerando').hidden = false; $('pronto').hidden = true;
  $('gerarTitulo').innerHTML = icone('film', 'ico-antes') + 'Gerando o vídeo';
  $('modalGerar').classList.add('on');
  progresso(0, 'Lendo a música…');
  const inicio = performance.now();

  const [W, H] = E.qualidade === '720' ? [1280, 720] : [1920, 1080];
  let video, som;
  try {
    // fontes e imagens prontas antes de desenhar
    await document.fonts.load(`${pesoDe()} 80px "${familiaDe()}"`);
    await document.fonts.load('700 40px "Playfair Display"');
    if (E.fundo === 'imagem') await carregarImagem(E.fundoImagem);
    if (E.logo) await carregarImagem(E.logo);

    // áudio: decodifica a música inteira em 48 kHz
    const bruto = await ponte.lerArquivo(E.musica.caminho);
    const actx = new AudioContext({ sampleRate: 48000 });
    const buf = await actx.decodeAudioData(bruto);
    actx.close();
    const dur = buf.duration;
    const canais = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)];

    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: W, height: H, frameRate: FPS },
      audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });
    let erro = null;
    video = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { erro = e; } });
    video.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: W > 1280 ? 8e6 : 5e6, framerate: FPS, avc: { format: 'avc' } });
    som = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { erro = e; } });
    som.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });

    // áudio em blocos de 0,1 s
    progresso(1, 'Preparando o áudio…');
    const BLOCO = 4800;
    for (let ini = 0; ini < buf.length; ini += BLOCO) {
      const n = Math.min(BLOCO, buf.length - ini);
      const dados = new Float32Array(n * 2);
      dados.set(canais[0].subarray(ini, ini + n), 0);
      dados.set(canais[1].subarray(ini, ini + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(ini / 48000 * 1e6), data: dados });
      som.encode(ad);
      ad.close();
      if (erro) throw erro;
    }
    await som.flush();

    // vídeo quadro a quadro (o texto e o fundo ficam em cache, então é bem mais rápido que a música)
    const tela = new OffscreenCanvas(W, H);
    const ctx = tela.getContext('2d', { alpha: false });
    const telas = telasNoTempo();
    const total = Math.ceil(dur * FPS);
    for (let i = 0; i < total; i++) {
      if (cancelado) throw new Error('cancelado');
      if (erro) throw erro;
      const t = i / FPS;
      desenharQuadro(ctx, W, H, t, dur, telas);
      const quadro = new VideoFrame(tela, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
      video.encode(quadro, { keyFrame: i % (FPS * 2) === 0 });
      quadro.close();
      while (video.encodeQueueSize > 12) await new Promise(r => setTimeout(r, 2));
      if (i % 15 === 0) {
        const pct = 2 + (i / total) * 93;
        const gasto = (performance.now() - inicio) / 1000;
        const resta = i > 60 ? gasto / (i / total) - gasto : null;
        progresso(pct, `Gerando o vídeo — ${fmt(t)} de ${fmt(dur)}` + (resta != null ? ` • falta cerca de ${Math.max(1, Math.round(resta))} s` : ''));
        await new Promise(r => setTimeout(r, 0));
      }
    }
    progresso(96, 'Finalizando…');
    await video.flush();
    muxer.finalize();
    const arquivo = muxer.target.buffer;
    progresso(98, 'Salvando o arquivo…');
    await ponte.gravarVideo(destino, arquivo);
    progresso(100, 'Pronto');
    ultimoVideo = destino;
    $('gerando').hidden = true; $('pronto').hidden = false;
    $('prontoCaminho').textContent = `${destino} • ${(arquivo.byteLength / 1048576).toFixed(1)} MB • gerado em ${Math.round((performance.now() - inicio) / 1000)} s`;
    $('gerarTitulo').innerHTML = icone('circle-check', 'ico-antes') + 'Vídeo gerado';
  } catch (e) {
    try { video && video.state !== 'closed' && video.close(); } catch (x) {}
    try { som && som.state !== 'closed' && som.close(); } catch (x) {}
    $('modalGerar').classList.remove('on');
    toast(e.message === 'cancelado' ? 'Geração cancelada' : 'Não deu para gerar o vídeo: ' + (e.message || e));
  }
}
$('btnGerar').onclick = () => gerar();

// ---------- início ----------
(async function iniciar() {
  $('titulo').value = E.titulo;
  $('letra').value = E.letra;
  $('escurecerVal').textContent = E.escurecer + '%';
  $('tamanhoVal').textContent = E.tamanho + '%';
  $('btnSemLogo').hidden = !E.logo;
  lerEstrofes();
  if (E.fundoImagem) { try { await carregarImagem(E.fundoImagem); } catch (e) { E.fundoImagem = null; if (E.fundo === 'imagem') E.fundo = 'azul'; } }
  if (E.logo) { try { await carregarImagem(E.logo); } catch (e) { E.logo = null; } }
  montarFundos();
  montarEstrofes();
  if (E.musica) { const ok = await definirMusica(E.musica.caminho); if (!ok) { E.musica = null; mostrarMusica(); } }
  await document.fonts.load(`${pesoDe()} 60px "${familiaDe()}"`);
  await document.fonts.load('700 40px "Playfair Display"');
  limparCache();
  redesenhar();
})();
