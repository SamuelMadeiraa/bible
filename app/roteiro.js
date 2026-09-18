// Roteiro do culto (playout).
// Cada evento é um versículo, um aviso (texto livre), um vídeo, uma foto, um áudio,
// "tela preta" ou "só o fundo". A PRÉVIA (verde) mostra o próximo evento; o CORTE
// (Espaço) coloca a prévia no ar (vermelho) e já prepara o seguinte na prévia.

// ---------- configurações gerais ----------
const CFG_PADRAO = {
  teclaCorte: 'ambos',   // 'ambos' | 'espaco' | 'enter'
  avancar: true,         // depois do corte, a prévia vai para o próximo evento
  passador: 'cortar',    // PageDown/PageUp do passador: 'cortar' ou 'previa'
  simples: false,        // modo simples: menos painéis, botões maiores
  dicas: true,           // mostra os textos de ajuda
};
const CFG = { ...CFG_PADRAO };
try { Object.assign(CFG, JSON.parse(localStorage.getItem('bibleStudioCfg') || '{}')); } catch (e) {}
const salvarCfg = () => { try { localStorage.setItem('bibleStudioCfg', JSON.stringify(CFG)); } catch (e) {} };

// ---------- estado do roteiro ----------
const MP = {
  itens: [],          // eventos do roteiro (ver tipos acima)
  idx: -1,            // mídia que está tocando agora (-1 = nenhuma)
  overlay: false,     // versículo por cima do vídeo
  cover: false,       // preencher a tela (corta as bordas)
  auto: true,         // mídias em sequência: ao terminar, se o próximo evento for mídia, toca sozinho
  loop: false,        // repetir a mídia atual
  volume: 80,
  imgSeg: 8,
};
try { Object.assign(MP, JSON.parse(localStorage.getItem('bibleStudioMidia') || '{}')); } catch (e) {}
const CAMPOS = ['id', 'tipo', 'caminho', 'nome', 'dur', 'semSuporte', 'b', 'c', 'v1', 'v2', 'titulo', 'texto', 'url', 'cheia', 'embed', 'externo'];
const limparEvento = ev => Object.fromEntries(CAMPOS.filter(k => ev[k] !== undefined).map(k => [k, ev[k]]));
const salvarMidia = () => {
  try {
    localStorage.setItem('bibleStudioMidia', JSON.stringify({ ...MP, itens: MP.itens.map(limparEvento), idx: -1 }));
  } catch (e) {}
};

const R = { prevIdx: -1, liveIdx: -1 };   // evento na prévia / no ar
const TIPOS_MIDIA = ['video', 'imagem', 'audio'];
const ehMidia = ev => !!ev && TIPOS_MIDIA.includes(ev.tipo);
const ehVisual = ev => !!ev && (ev.tipo === 'video' || ev.tipo === 'imagem');

let tocando = false, tAtual = 0, durAtual = 0;
let imgTimer = null, imgIni = 0, barraTimer = null, arrastandoSeek = false;
let aplicandoEvento = false, aplicandoCorte = false;
let webNoAr = -1;          // índice do evento de transmissão que está na projeção (-1 = nenhum)
let webTocando = false;
let webT = 0, webDur = 0, webPoll = null;
let noArDesde = Date.now(); // quando o último corte aconteceu (para o cronômetro)
const marcarNoAr = () => { noArDesde = Date.now(); };
const ehProtegido = url => /univervideo\.com/i.test(url || '');

const mvLive = $('mvLive'), miLive = $('miLive');

// ---------- utilidades ----------
const EXT_VIDEO = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts'];
const EXT_AUDIO = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus', 'flac'];
const EXT_IMG = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
const AVISO_FORMATO = 'Formatos que tocam: vídeo MP4 (H.264) e WebM; áudio MP3, M4A, AAC, WAV, OGG; foto JPG, PNG, WebP e GIF.';

const extDe = c => (c.split('.').pop() || '').toLowerCase();
function tipoDe(caminho) {
  const e = extDe(caminho);
  if (EXT_VIDEO.includes(e)) return 'video';
  if (EXT_AUDIO.includes(e)) return 'audio';
  if (EXT_IMG.includes(e)) return 'imagem';
  return 'video';
}
function idDe(caminho) {
  let h = 5381;
  for (let i = 0; i < caminho.length; i++) h = ((h << 5) + h + caminho.charCodeAt(i)) | 0;
  return 'm' + (h >>> 0).toString(36) + caminho.length.toString(36);
}
const novoId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const urlArquivo = c => 'file:///' + encodeURI(c.replace(/\\/g, '/')).replace(/#/g, '%23');
const nomeDe = c => c.split(/[\\/]/).pop();
function fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60), x = Math.floor(s % 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(x).padStart(2, '0')}`
    : `${m}:${String(x).padStart(2, '0')}`;
}
const itemAtual = () => MP.itens[MP.idx] || null;
const hostDe = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url || ''; } };
function idYoutube(url) {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0];
    if (!h.endsWith('youtube.com')) return null;
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]{6,})/);
    return m ? m[1] : null;
  } catch (e) { return null; }
}
const miniaturaWeb = ev => { const id = idYoutube(ev.url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null; };
const eventoDaPrevia = () => (R.prevIdx >= 0 ? MP.itens[R.prevIdx] : null) || null;

function status(msg, tipo = '') {
  const el = $('pStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'p-status ' + tipo;
}

// título e subtítulo de cada evento, para a lista, a prévia e o celular
function rotulo(ev) {
  switch (ev.tipo) {
    case 'versiculo': {
      const cap = BIBLIA[ev.b] && BIBLIA[ev.b].chapters[ev.c];
      const t = cap ? cap[ev.v1] || '' : '';
      return { titulo: refDe(ev), sub: t.length > 90 ? t.slice(0, 90) + '…' : t, icone: '📖' };
    }
    case 'texto': return { titulo: ev.titulo || 'Aviso', sub: ev.texto || '', icone: '📝' };
    case 'preta': return { titulo: 'Tela preta', sub: 'Apaga toda a projeção', icone: '⬛' };
    case 'fundo': return { titulo: 'Só o fundo', sub: 'Tira o texto e deixa o fundo', icone: '🌄' };
    case 'audio': return { titulo: ev.nome, sub: 'áudio • toca sem tapar a tela', icone: '🎵' };
    case 'web': return { titulo: ev.nome || hostDe(ev.url), sub: 'transmissão / link • ' + hostDe(ev.url), icone: '📡' };
    case 'imagem': return { titulo: ev.nome, sub: 'foto', icone: '🖼' };
    default: return { titulo: ev.nome, sub: 'vídeo', icone: '🎬' };
  }
}

// ---------- adicionar eventos ----------
function adicionarEvento(ev) {
  ev.id = ev.id || novoId();
  MP.itens.push(ev);
  detectar(ev);
  salvarMidia();
  montarLista();
  const box = $('playlist');
  if (box) box.lastElementChild?.scrollIntoView({ block: 'nearest' });
  return MP.itens.length - 1;
}

async function adicionarMidias() {
  if (!ponte) return toast('Abra pelo aplicativo para usar o player.');
  const paths = await ponte.pickMedia();
  if (!paths.length) return;
  for (const caminho of paths) {
    const item = { id: idDe(caminho), tipo: tipoDe(caminho), caminho, nome: nomeDe(caminho), dur: null };
    MP.itens.push(item);
    detectar(item);
  }
  registrar();
  salvarMidia();
  montarLista();
  toast(`${paths.length} mídia(s) no roteiro`);
}

function adicionarVersiculoDaPrevia() {
  adicionarEvento({ tipo: 'versiculo', b: P.b, c: P.c, v1: P.v1, v2: P.v2 });
  toast('No roteiro: ' + refDe(P));
}
function adicionarEspecial(tipo) {
  adicionarEvento({ tipo });
  toast(tipo === 'preta' ? 'Tela preta no roteiro' : 'Só o fundo no roteiro');
}

// lê a duração e faz uma miniatura, quando o formato é suportado
function detectar(item) {
  if (item.tipo === 'web') { item.thumb = miniaturaWeb(item); return; }
  if (!ehMidia(item)) return;
  if (item.tipo === 'imagem') { item.thumb = urlArquivo(item.caminho); return agendarLista(); }
  const el = document.createElement(item.tipo === 'audio' ? 'audio' : 'video');
  el.preload = 'metadata';
  el.muted = true;
  el.src = urlArquivo(item.caminho);
  el.addEventListener('loadedmetadata', () => {
    item.dur = isFinite(el.duration) ? el.duration : null;
    item.semSuporte = false;
    if (item.tipo === 'video') {
      el.currentTime = Math.min(2, (el.duration || 4) / 3);
      el.addEventListener('seeked', () => {
        try {
          const c = document.createElement('canvas');
          c.width = 160; c.height = 90;
          c.getContext('2d').drawImage(el, 0, 0, 160, 90);
          item.thumb = c.toDataURL('image/jpeg', 0.7);
        } catch (err) {}
        el.removeAttribute('src');
        agendarLista();
        salvarMidia();
        if (eventoDaPrevia() === item) mostrarPreviaEvento(item);
      }, { once: true });
    } else { agendarLista(); salvarMidia(); }
  }, { once: true });
  el.addEventListener('error', () => {
    item.semSuporte = true;
    agendarLista();
    salvarMidia();
  }, { once: true });
}
const registrar = () => ponte?.registerMedia(MP.itens.filter(ehMidia).map(({ id, caminho }) => ({ id, caminho })));

// ---------- lista do roteiro ----------
let listaAgendada = false;
function agendarLista() {
  if (listaAgendada) return;
  listaAgendada = true;
  requestAnimationFrame(() => { listaAgendada = false; montarLista(); });
}

function montarLista() {
  const box = $('playlist');
  if (!box) return;
  box.innerHTML = '';
  MP.itens.forEach((ev, i) => {
    const r = rotulo(ev);
    const d = document.createElement('div');
    d.className = 'mi-item tipo-' + ev.tipo
      + (i === R.prevIdx ? ' prox' : '')
      + (i === R.liveIdx ? ' ar' : '')
      + (i === MP.idx && tocando ? ' tocando' : '');
    d.draggable = true;

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i + 1;

    const th = document.createElement('div');
    th.className = 'thumb';
    if (ev.thumb) th.style.backgroundImage = `url("${ev.thumb}")`;
    else th.textContent = r.icone;

    const nome = document.createElement('div');
    nome.className = 'nome';
    nome.innerHTML = `${esc(r.titulo || '')}<small>${esc(r.sub || '')}${ev.semSuporte ? ' • formato não suportado' : ''}</small>`;

    d.append(num, th, nome);

    const selos = document.createElement('span');
    selos.className = 'selos';
    if (i === R.liveIdx) selos.insertAdjacentHTML('beforeend', '<b class="badge ar">NO AR</b>');
    if (i === R.prevIdx) selos.insertAdjacentHTML('beforeend', '<b class="badge prox">PRÓXIMO</b>');
    if (i === MP.idx && tocando && ev.tipo === 'audio') selos.insertAdjacentHTML('beforeend', '<b class="badge som">♪</b>');
    if (ev.tipo === 'web') selos.insertAdjacentHTML('beforeend', '<b class="badge web">LINK</b>');
    d.appendChild(selos);

    if (ehMidia(ev)) {
      const dur = document.createElement('span');
      dur.className = 'dur';
      dur.textContent = ev.tipo === 'imagem' ? (MP.auto ? `${MP.imgSeg}s` : 'fixa') : ev.dur ? fmt(ev.dur) : '—';
      d.appendChild(dur);
    }
    if (ev.semSuporte) {
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = '!';
      t.title = 'Este arquivo não toca no player. ' + AVISO_FORMATO;
      d.appendChild(t);
    }
    if (ev.tipo === 'web') {
      const ed = document.createElement('span');
      ed.className = 'x';
      ed.textContent = '✎';
      ed.title = 'Editar transmissão';
      ed.onclick = e => { e.stopPropagation(); abrirEditorWeb(i); };
      d.appendChild(ed);
    }
    if (ev.tipo === 'texto') {
      const ed = document.createElement('span');
      ed.className = 'x';
      ed.textContent = '✎';
      ed.title = 'Editar aviso';
      ed.onclick = e => { e.stopPropagation(); abrirEditorTexto(i); };
      d.appendChild(ed);
    }

    const x = document.createElement('span');
    x.className = 'x';
    x.textContent = '×';
    x.title = 'Remover do roteiro';
    x.onclick = e => { e.stopPropagation(); removerEvento(i); };
    d.appendChild(x);

    d.onclick = () => selecionarPrevia(i);
    d.ondblclick = () => { selecionarPrevia(i); cortar(); };

    d.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', i); d.classList.add('arrastando'); });
    d.addEventListener('dragend', () => d.classList.remove('arrastando'));
    d.addEventListener('dragover', e => e.preventDefault());
    d.addEventListener('drop', e => {
      e.preventDefault();
      const de = +e.dataTransfer.getData('text/plain');
      if (isNaN(de) || de === i) return;
      moverEvento(de, i);
    });

    box.appendChild(d);
  });
  $('roteiroVazio')?.classList.toggle('on', !MP.itens.length);
  atualizarPainel();
}

// mantém prévia/no ar/tocando apontando para os mesmos eventos depois de mexer na lista
function reindexar(fn) {
  const prev = MP.itens[R.prevIdx], ar = MP.itens[R.liveIdx], toc = MP.itens[MP.idx];
  fn();
  R.prevIdx = prev ? MP.itens.indexOf(prev) : -1;
  R.liveIdx = ar ? MP.itens.indexOf(ar) : -1;
  MP.idx = toc ? MP.itens.indexOf(toc) : -1;
  salvarMidia();
  montarLista();
}
function moverEvento(de, para) {
  reindexar(() => { const [mov] = MP.itens.splice(de, 1); MP.itens.splice(para, 0, mov); });
}
function removerEvento(i) {
  if (i === MP.idx) pararMidia();
  if (i === R.prevIdx) esconderPreviaEvento();
  reindexar(() => MP.itens.splice(i, 1));
}
function limparRoteiro() {
  if (!MP.itens.length) return;
  if (!confirm('Tirar todos os eventos do roteiro?')) return;
  pararMidia();
  MP.itens = [];
  MP.idx = R.prevIdx = R.liveIdx = -1;
  esconderPreviaEvento();
  salvarMidia();
  montarLista();
}

// ---------- prévia (verde) ----------
function definirTextoLivre(titulo, corpo) {
  texto = corpo || '';
  referencia = titulo || '';
  $('txt').value = texto;
  $('refTxt').value = referencia;
  cliques = {};
  mudou(true);
}

function selecionarPrevia(i) {
  const ev = MP.itens[i];
  if (!ev) {
    R.prevIdx = -1;
    esconderPreviaEvento();
    agendarLista();
    return;
  }
  R.prevIdx = i;
  aplicandoEvento = true;
  try {
    if (ev.tipo === 'versiculo') irPara(ev.b, ev.c, ev.v1, ev.v2);
    else if (ev.tipo === 'texto') definirTextoLivre(ev.titulo, ev.texto);
  } finally { aplicandoEvento = false; }
  mostrarPreviaEvento(ev);
  agendarLista();
  $('playlist')?.children[i]?.scrollIntoView({ block: 'nearest' });
}

function previaRelativa(passoN) {
  if (!MP.itens.length) return passo(passoN);
  const base = R.prevIdx >= 0 ? R.prevIdx : (R.liveIdx >= 0 ? R.liveIdx : -1);
  const i = Math.min(MP.itens.length - 1, Math.max(0, base + passoN));
  selecionarPrevia(base < 0 ? 0 : i);
}

function mostrarPreviaEvento(ev) {
  const box = $('prevEvento');
  const mon = $('monPrev');
  if (!box) return;
  if (!ev || ev.tipo === 'versiculo' || ev.tipo === 'texto') { esconderPreviaEvento(); return; }
  const r = rotulo(ev);
  box.className = 'prev-evento on ev-' + ev.tipo;
  box.style.backgroundImage = ev.thumb ? `url("${ev.thumb}")` : '';
  if (ev.tipo === 'web') box.classList.add('ev-web');
  box.innerHTML = `<span>${r.icone} ${esc(r.titulo)}</span>`;
  mon?.classList.add('com-evento');
  $('prevEvNome').textContent = r.titulo;
}
function esconderPreviaEvento() {
  const box = $('prevEvento');
  if (box) { box.className = 'prev-evento'; box.style.backgroundImage = ''; box.innerHTML = ''; }
  $('monPrev')?.classList.remove('com-evento');
  const n = $('prevEvNome'); if (n) n.textContent = '';
}

// ---------- corte (prévia → ao vivo) ----------
function tirarMidiaVisualDoAr() {
  if (ehVisual(itemAtual())) pararMidia();
  fecharWeb();
}
function definirModo(modo) {
  const base = live.slide ? { ...live.slide } : montarSlide('live');
  if (!live.slide) base.text = { tokens: [], colors: [], ref: '' };
  publicar({ ...base, mode: modo }, S.trans);
}

function executar(ev, i) {
  switch (ev.tipo) {
    case 'versiculo':
    case 'texto':
      aplicandoCorte = true;
      try { enviarAoVivo(); } finally { aplicandoCorte = false; }
      break;
    case 'preta':
    case 'fundo':
      tirarMidiaVisualDoAr();
      definirModo(ev.tipo === 'preta' ? 'black' : 'clear');
      break;
    case 'web':
      abrirWeb(ev, i);
      break;
    default:
      tocarItem(i);
  }
}

// ---------- transmissões ao vivo / links ----------
async function abrirWeb(ev, i) {
  if (!ponte) return;
  if (!saida.open) {
    status('A projeção está fechada — abra a projeção para a transmissão aparecer na TV.', 'erro');
    return toast('Abra a projeção primeiro');
  }
  if (ehVisual(itemAtual()) || (itemAtual() && itemAtual().tipo === 'audio')) pararMidia();
  webNoAr = i;
  webTocando = true;
  status('Carregando: ' + (ev.nome || hostDe(ev.url)) + '…');
  agendarLista();
  marcarNoAr();
  webT = 0; webDur = 0;
  const externo = ev.externo ?? ehProtegido(ev.url);
  const r = await ponte.webAbrir({ url: ev.url, cheia: ev.cheia !== false, embed: ev.embed !== false, externo, volume: MP.volume });
  if (r.erro) { webNoAr = -1; webTocando = false; status(r.erro, 'erro'); toast(r.erro); agendarLista(); return; }
  status(r.aviso || ('No ar: ' + (ev.nome || hostDe(ev.url)) + (r.youtube ? ' (YouTube)' : r.externo ? ' (no ' + r.navegador + ')' : '')), r.aviso ? 'erro' : 'ok');
  // lê o tempo do vídeo da transmissão para o cronômetro
  clearInterval(webPoll);
  webPoll = setInterval(async () => {
    if (webNoAr < 0) return clearInterval(webPoll);
    const e = await ponte.webCmd('estado');
    if (e && e.r) { webT = e.r.t || 0; webDur = e.r.dur || 0; webTocando = !!e.r.tocando; }
  }, 1000);
  agendarLista();
}
function fecharWeb() {
  if (webNoAr < 0) return;
  if (R.liveIdx === webNoAr) R.liveIdx = -1;
  webNoAr = -1;
  webTocando = false;
  clearInterval(webPoll);
  webT = webDur = 0;
  ponte?.webFechar();
  status('');
  pararEspelho();
  agendarLista();
}

function cortar() {
  marcarNoAr();
  const ev = eventoDaPrevia();
  if (!ev) {                                   // prévia montada à mão (versículo/texto)
    enviarAoVivo();
    if (CFG.avancar && !S.autoLive) passo(1);
    agendarLista();
    return;
  }
  const i = R.prevIdx;
  executar(ev, i);
  R.liveIdx = i;
  if (CFG.avancar && !S.autoLive) {
    if (i + 1 < MP.itens.length) selecionarPrevia(i + 1);
    else { R.prevIdx = -1; esconderPreviaEvento(); }
  }
  agendarLista();
}

// volta um evento e já coloca no ar (passador: PageUp)
function voltarUm() {
  if (R.liveIdx > 0) { selecionarPrevia(R.liveIdx - 1); cortar(); return; }
  if (live.pos) { irPara(live.pos.b, live.pos.c, Math.max(0, live.pos.v1 - 1)); cortar(); }
}

// qualquer mudança manual de versículo tira o evento do roteiro da prévia
const _irPara = irPara;
window.irPara = function (...args) {
  if (!aplicandoEvento && R.prevIdx >= 0) { R.prevIdx = -1; esconderPreviaEvento(); agendarLista(); }
  return _irPara.apply(this, args);
};
// mandar versículo ao vivo por qualquer caminho tira vídeo/foto da tela
const _enviarAoVivo = enviarAoVivo;
window.enviarAoVivo = function (...args) {
  if (!aplicandoCorte) marcarNoAr();
  tirarMidiaVisualDoAr();
  if (!aplicandoCorte) R.liveIdx = -1;
  const r = _enviarAoVivo.apply(this, args);
  agendarLista();
  return r;
};

// ---------- reprodução de mídia ----------
function tocarItem(i, t = 0) {
  if (!ponte) return;
  const item = MP.itens[i];
  if (!ehMidia(item)) return;
  fecharWeb();                     // transmissão no ar sai para a mídia entrar
  MP.idx = i;
  R.liveIdx = i;
  limparTimers();
  if (!saida.open) status('A projeção está fechada — clique em “Abrir projeção” no topo para a mídia aparecer na TV.', 'erro');

  if (item.semSuporte) {
    status('“' + item.nome + '” não toca no player. ' + AVISO_FORMATO, 'erro');
    toast('Formato não suportado');
    tocando = false;
    agendarLista();
    return;
  }

  ponte.sendMedia({
    a: 'load', item: { id: item.id, tipo: item.tipo, caminho: item.caminho, nome: item.nome },
    t, play: true, volume: MP.volume, overlay: MP.overlay, cover: MP.cover, loop: MP.loop,
  });
  tocando = true;
  tAtual = t;
  durAtual = item.tipo === 'imagem' ? MP.imgSeg : (item.dur || 0);
  if (item.tipo === 'imagem' && MP.auto && !MP.loop) {
    imgIni = Date.now() - t * 1000;
    imgTimer = setTimeout(aoFim, Math.max(200, (MP.imgSeg - t) * 1000));
  }
  espelhar(item, t);
  iniciarBarra();
  agendarLista();
  if (saida.open) status('No ar: ' + item.nome, 'ok');
}

function alternarPlay() {
  if (!ponte) return;
  if (webNoAr >= 0) {
    webTocando = !webTocando;
    ponte.webCmd(webTocando ? 'play' : 'pause');
    atualizarPainel();
    return;
  }
  if (MP.idx < 0) {
    const prev = eventoDaPrevia();
    if (ehMidia(prev)) return cortar();
    const primeira = MP.itens.findIndex(ehMidia);
    if (primeira >= 0) { selecionarPrevia(primeira); return cortar(); }
    return toast('Não há mídia no roteiro');
  }
  const item = itemAtual();
  if (!item) return;
  if (item.tipo === 'imagem') {
    if (tocando) { clearTimeout(imgTimer); imgTimer = null; }
    else if (MP.auto && !MP.loop) { imgIni = Date.now() - tAtual * 1000; imgTimer = setTimeout(aoFim, Math.max(200, (MP.imgSeg - tAtual) * 1000)); }
    tocando = !tocando;
  } else {
    ponte.sendMedia({ a: tocando ? 'pause' : 'play' });
    tocando = !tocando;
    if (mvLive.src) tocando ? mvLive.play().catch(() => {}) : mvLive.pause();
  }
  atualizarPainel();
  agendarLista();
}

function pararMidia() {
  status('');
  fecharWeb();
  limparTimers();
  if (R.liveIdx === MP.idx) R.liveIdx = -1;
  tocando = false;
  tAtual = durAtual = 0;
  MP.idx = -1;
  if (ponte) ponte.sendMedia({ a: 'stop' });
  pararEspelho();
  atualizarPainel();
  agendarLista();
}

// ⏮ ⏭: pula para a mídia anterior/seguinte do roteiro
function proximaMidia(dir = 1) {
  if (!MP.itens.some(ehMidia)) return;
  let i = MP.idx >= 0 ? MP.idx : (R.prevIdx >= 0 ? R.prevIdx - dir : -1);
  for (let n = 0; n < MP.itens.length; n++) {
    i += dir;
    if (i >= MP.itens.length || i < 0) return;
    if (ehMidia(MP.itens[i])) { selecionarPrevia(i); cortar(); return; }
  }
}

function aoFim() {
  const i = MP.idx;
  const prox = MP.itens[i + 1];
  if (MP.auto && ehMidia(prox)) {             // sequência de mídias: segue sozinho
    tocarItem(i + 1);
    if (R.prevIdx === i + 1) selecionarPrevia(i + 2 < MP.itens.length ? i + 2 : -1);
    return;
  }
  pararMidia();                               // volta para o que está por baixo (versículo/fundo)
}

function limparTimers() {
  clearTimeout(imgTimer); imgTimer = null;
  clearInterval(barraTimer); barraTimer = null;
}
function iniciarBarra() {
  clearInterval(barraTimer);
  barraTimer = setInterval(() => {
    const item = itemAtual();
    if (item && item.tipo === 'imagem' && tocando && imgTimer) {
      tAtual = Math.min(MP.imgSeg, (Date.now() - imgIni) / 1000);
      durAtual = MP.imgSeg;
    }
    atualizarPainel();
  }, 250);
}

// ---------- espelho no monitor "ao vivo" ----------
function espelhar(item, t) {
  pararEspelho();
  if (item.tipo === 'video') {
    mvLive.src = urlArquivo(item.caminho);
    mvLive.currentTime = t || 0;
    mvLive.loop = MP.loop;
    mvLive.classList.toggle('cover', MP.cover);
    mvLive.classList.add('on');
    mvLive.play().catch(() => {});
  } else if (item.tipo === 'imagem') {
    miLive.src = urlArquivo(item.caminho);
    miLive.classList.toggle('cover', MP.cover);
    miLive.classList.add('on');
  }
}
function pararEspelho() {
  mvLive.pause();
  mvLive.classList.remove('on');
  mvLive.removeAttribute('src');
  miLive.classList.remove('on');
  miLive.removeAttribute('src');
}

// ---------- painel de mídia ----------
function atualizarPainel() {
  const item = itemAtual();
  if (!$('pNow')) return;
  const web = MP.itens[webNoAr];
  if (web) {
    $('pNow').textContent = `${webTocando ? '📡' : '⏸'} ${rotulo(web).titulo}`;
    $('pPlay').textContent = webTocando ? '⏸' : '▶';
    $('pT').textContent = 'AO VIVO';
    $('pD').textContent = hostDe(web.url);
    $('vVol').textContent = MP.volume + '%';
    return;
  }
  $('pNow').textContent = item ? `${tocando ? '▶' : '⏸'} ${item.nome}` : 'Nenhuma mídia tocando';
  $('pPlay').textContent = tocando ? '⏸' : '▶';
  $('pT').textContent = fmt(tAtual);
  $('pD').textContent = fmt(durAtual);
  if (!arrastandoSeek) $('pSeek').value = durAtual ? Math.round(tAtual / durAtual * 1000) : 0;
  $('vVol').textContent = MP.volume + '%';
}

// ---------- cronômetro digital embaixo do "ao vivo" ----------
function atualizarCronometro() {
  const cron = $('cron');
  if (!cron) return;
  let restante = null, total = 0, feito = 0, rotuloTxt = '', detalhe = '', modo = 'parado';
  const web = MP.itens[webNoAr];
  const item = itemAtual();
  const midiaComTempo = item && (tocando || tAtual > 0) && durAtual > 0 && (item.tipo !== 'imagem' || imgTimer);
  if (web) {
    if (webDur > 0 && isFinite(webDur)) {
      restante = webDur - webT; total = webDur; feito = webT; modo = 'midia';
      rotuloTxt = webTocando ? 'falta para acabar' : 'pausado — falta';
    } else {
      feito = (Date.now() - noArDesde) / 1000; modo = 'aovivo';
      rotuloTxt = '● transmissão ao vivo — no ar há';
    }
    detalhe = rotulo(web).titulo;
  } else if (midiaComTempo) {
    restante = durAtual - tAtual; total = durAtual; feito = tAtual; modo = 'midia';
    rotuloTxt = tocando ? 'falta para acabar' : 'pausado — falta';
    detalhe = item.nome;
  } else {
    feito = (Date.now() - noArDesde) / 1000;
    rotuloTxt = 'no ar há';
    detalhe = $('liveRef') ? $('liveRef').textContent : '';
  }
  if (restante !== null) {
    restante = Math.max(0, restante);
    $('cronValor').textContent = '−' + fmt(restante);
    detalhe += ` • ${fmt(feito)} de ${fmt(total)}`;
    if (restante <= 10) modo += ' fim';
    else if (restante <= 30) modo += ' aviso';
  } else {
    $('cronValor').textContent = fmt(feito);
  }
  cron.className = 'cron ' + modo;
  $('cronRotulo').textContent = rotuloTxt;
  $('cronDetalhe').textContent = detalhe;
  $('cronBarra').style.width = total ? Math.min(100, feito / total * 100) + '%' : '0%';
}
setInterval(atualizarCronometro, 250);

// ---------- editor de aviso (texto livre) ----------
let editandoTexto = -1;
function abrirEditorTexto(i = -1) {
  editandoTexto = i;
  const ev = MP.itens[i];
  $('txtTitulo').value = ev ? ev.titulo || '' : '';
  $('txtCorpo').value = ev ? ev.texto || '' : '';
  $('modalTextoTitulo').textContent = ev ? 'Editar aviso' : 'Novo aviso';
  abrirModal('modalTexto');
  setTimeout(() => $('txtTitulo').focus(), 50);
}
$('btnSalvarTexto').onclick = () => {
  const titulo = $('txtTitulo').value.trim();
  const corpo = $('txtCorpo').value.trim();
  if (!titulo && !corpo) return toast('Escreva um título ou um texto');
  const ev = MP.itens[editandoTexto];
  if (ev) {
    ev.titulo = titulo; ev.texto = corpo;
    salvarMidia();
    if (R.prevIdx === editandoTexto) selecionarPrevia(editandoTexto);
    montarLista();
  } else {
    adicionarEvento({ tipo: 'texto', titulo, texto: corpo });
  }
  fecharModal('modalTexto');
};

// ---------- editor de transmissão / link ----------
let editandoWeb = -1;
function abrirEditorWeb(i = -1) {
  editandoWeb = i;
  const ev = MP.itens[i];
  $('webUrl').value = ev ? ev.url || '' : '';
  $('webNome').value = ev ? ev.nome || '' : '';
  $('webEmbed').checked = ev ? ev.embed !== false : true;
  $('webCheia').checked = ev ? ev.cheia !== false : true;
  $('webExterno').checked = ev ? !!(ev.externo ?? ehProtegido(ev.url)) : false;
  $('modalWebTitulo').textContent = ev ? 'Editar transmissão' : 'Nova transmissão ao vivo / link';
  abrirModal('modalWeb');
  setTimeout(() => $('webUrl').focus(), 50);
}
// colar um link da Univer já marca "plataforma protegida"
$('webUrl').addEventListener('input', e => { if (ehProtegido(e.target.value)) $('webExterno').checked = true; });
$('btnSalvarWeb').onclick = () => {
  const url = $('webUrl').value.trim();
  if (!/^https?:\/\//i.test(url)) return toast('Cole o endereço completo (começando com https://)');
  const dados = { url, nome: $('webNome').value.trim(), embed: $('webEmbed').checked, cheia: $('webCheia').checked, externo: $('webExterno').checked };
  const ev = MP.itens[editandoWeb];
  if (ev) { Object.assign(ev, dados); ev.thumb = miniaturaWeb(ev); salvarMidia(); montarLista(); }
  else { const n = { tipo: 'web', ...dados }; n.thumb = miniaturaWeb(n); adicionarEvento(n); }
  fecharModal('modalWeb');
};
$('btnLoginWeb').onclick = async () => {
  const url = $('webUrl').value.trim();
  if (!/^https?:\/\//i.test(url)) return toast('Cole o endereço do site primeiro');
  const r = await ponte?.webLogin(url, $('webExterno').checked);
  if (r && r.erro) toast(r.erro);
  else toast(r && r.externo ? 'Entre na sua conta no navegador que abriu e depois feche o navegador' : 'Entre na sua conta na janela que abriu; depois é só fechá-la');
};

// ---------- menu "Adicionar" ----------
function alternarMenu(id, ancora) {
  const m = $(id);
  const abrir = !m.classList.contains('on');
  document.querySelectorAll('.menu.on').forEach(x => x.classList.remove('on'));
  if (!abrir) return;
  const r = ancora.getBoundingClientRect();
  m.style.left = Math.min(r.left, innerWidth - 260) + 'px';
  m.style.top = (r.bottom + 4) + 'px';
  m.classList.add('on');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.menu') && !e.target.closest('[data-menu]')) {
    document.querySelectorAll('.menu.on').forEach(x => x.classList.remove('on'));
  }
});
$('btnAddEvento').onclick = e => alternarMenu('menuAdd', e.currentTarget);
document.querySelectorAll('#menuAdd [data-add]').forEach(b => b.onclick = () => {
  $('menuAdd').classList.remove('on');
  const a = b.dataset.add;
  if (a === 'versiculo') adicionarVersiculoDaPrevia();
  else if (a === 'midia') adicionarMidias();
  else if (a === 'texto') abrirEditorTexto(-1);
  else if (a === 'web') abrirEditorWeb(-1);
  else adicionarEspecial(a);
});
$('btnAddVers').onclick = adicionarVersiculoDaPrevia;
$('btnLimparMidia').onclick = limparRoteiro;

// ---------- ligações dos controles ----------
$('btnGo').onclick = cortar;
$('pPlay').onclick = alternarPlay;
$('pStop').onclick = pararMidia;
$('pNext').onclick = () => proximaMidia(1);
$('pPrev').onclick = () => proximaMidia(-1);

$('pSeek').addEventListener('pointerdown', () => arrastandoSeek = true);
$('pSeek').addEventListener('change', () => {
  arrastandoSeek = false;
  if (!durAtual) return;
  const t = +$('pSeek').value / 1000 * durAtual;
  tAtual = t;
  const item = itemAtual();
  if (item?.tipo === 'imagem') {
    imgIni = Date.now() - t * 1000;
    if (tocando && imgTimer) { clearTimeout(imgTimer); imgTimer = setTimeout(aoFim, Math.max(200, (MP.imgSeg - t) * 1000)); }
  } else { ponte?.sendMedia({ a: 'seek', t }); if (mvLive.src) mvLive.currentTime = t; }
});

$('pVol').value = MP.volume;
$('pVol').addEventListener('input', e => {
  MP.volume = +e.target.value;
  ponte?.sendMedia({ a: 'volume', volume: MP.volume });
  if (webNoAr >= 0) ponte?.webCmd('volume', MP.volume);
  atualizarPainel();
  salvarMidia();
});

function ligarCheck(id, chave, depois) {
  const el = $(id);
  el.checked = MP[chave];
  el.addEventListener('change', () => { MP[chave] = el.checked; salvarMidia(); depois?.(); el.blur(); });
}
ligarCheck('pOverlay', 'overlay', () => ponte?.sendMedia({ a: 'overlay', overlay: MP.overlay }));
ligarCheck('pCover', 'cover', () => {
  ponte?.sendMedia({ a: 'cover', cover: MP.cover });
  mvLive.classList.toggle('cover', MP.cover);
  miLive.classList.toggle('cover', MP.cover);
});
ligarCheck('pAuto', 'auto', agendarLista);
ligarCheck('pLoop', 'loop');

$('pImgSeg').value = MP.imgSeg;
$('pImgSeg').addEventListener('change', e => {
  MP.imgSeg = Math.min(600, Math.max(1, +e.target.value || 8));
  e.target.value = MP.imgSeg;
  salvarMidia();
  agendarLista();
});

// atalhos de mídia: Ctrl+Espaço toca/pausa, Ctrl+setas trocam de mídia
addEventListener('keydown', e => {
  if (!e.ctrlKey) return;
  if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); alternarPlay(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); proximaMidia(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); proximaMidia(-1); }
}, true);

// ---------- retorno da tela de projeção ----------
if (ponte) {
  ponte.on('web:aviso', msg => { status(msg, 'erro'); toast('YouTube bloqueou o player incorporado — usando a página normal'); });
  ponte.on('web:quadro', src => {
    if (webNoAr < 0) return;
    miLive.src = src;
    miLive.classList.remove('cover');
    miLive.classList.add('on');
  });
  ponte.on('media:progress', info => {
    if (info.erro) {
      const item = itemAtual();
      if (item) { item.semSuporte = true; salvarMidia(); }
      status('“' + (item ? item.nome : '') + '” não tocou (codec sem suporte). ' + AVISO_FORMATO, 'erro');
      toast('Formato não suportado');
      tocando = false;
      agendarLista();
      return;
    }
    tAtual = info.t || 0;
    if (info.dur) durAtual = info.dur;
    tocando = !!info.tocando;
    if (mvLive.src && Math.abs(mvLive.currentTime - tAtual) > 0.5) mvLive.currentTime = tAtual;
    if (info.fim) return aoFim();
    atualizarPainel();
  });
  registrar();
}

// ---------- modais (usados pelo painel de presets e configurações) ----------
function abrirModal(id) { $(id).classList.add('on'); }
function fecharModal(id) { $(id).classList.remove('on'); }
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-fechar]')) fecharModal(m.id); });
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const aberto = document.querySelector('.modal.on');
  if (aberto) { e.preventDefault(); e.stopPropagation(); fecharModal(aberto.id); }
}, true);

// ---------- início ----------
MP.idx = -1;
MP.itens.forEach(ev => { if (!ev.id) ev.id = novoId(); detectar(ev); });
$('pDica').textContent = 'Clique num evento para colocá-lo na PRÉVIA (verde) e aperte ESPAÇO para cortar para o AO VIVO (vermelho). '
  + 'Duplo clique corta direto. Arraste para mudar a ordem. ' + AVISO_FORMATO;
montarLista();
