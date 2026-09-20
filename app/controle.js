// Controle do BibleLyrics pelo celular: fala com o PC pela rede (porta 7777).
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// o QR code do PC traz uma chave longa no endereço (?pin=…): entra direto, sem digitar.
// A senha de 4 números continua valendo para quem digita.
const SENHA_OK = /^(\d{4}|[0-9a-f]{32})$/;
const pinDoLink = new URLSearchParams(location.search).get('pin');
if (SENHA_OK.test(pinDoLink || '')) {
  localStorage.setItem('bibleStudioPin', pinDoLink);
  history.replaceState(null, '', location.pathname);
}
let PIN = localStorage.getItem('bibleStudioPin') || '';
let E = null;              // último estado recebido do PC
let es = null;             // conexão de eventos
let ultimoToque = 0;

const fmt = s => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60), x = Math.floor(s % 60);
  return `${m}:${String(x).padStart(2, '0')}`;
};
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1600);
}
function vibrar(ms = 12) { if (navigator.vibrate) navigator.vibrate(ms); }

// ---------- comunicação ----------
async function enviar(acao, extra = {}) {
  vibrar();
  try {
    const r = await fetch('api/cmd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: PIN, acao, ...extra }),
    });
    if (r.status === 401 || r.status === 429) return pedirSenha(await motivo(r));
    if (!r.ok) toast('Falha ao enviar');
  } catch (e) {
    conectado(false);
    toast('Sem conexão com o PC');
  }
}

function conectado(ok, noAr) {
  const s = document.querySelector('.status');
  s.classList.toggle('on', !!ok && !noAr);
  s.classList.toggle('no-ar', !!noAr);
  $('statusTxt').textContent = ok ? (noAr ? 'no ar' : 'conectado') : 'sem conexão';
}

function ouvirEventos() {
  if (es) es.close();
  es = new EventSource('events?pin=' + encodeURIComponent(PIN));
  es.addEventListener('estado', ev => {
    try { aplicarEstado(JSON.parse(ev.data)); } catch (e) {}
  });
  es.onerror = () => conectado(false);
}

async function carregarEstado() {
  try {
    const r = await fetch('api/estado?pin=' + encodeURIComponent(PIN));
    if (r.status === 401 || r.status === 429) return pedirSenha(await motivo(r));
    const st = await r.json();
    if (st && st.livro !== undefined) aplicarEstado(st);
    abrirApp();
    ouvirEventos();
  } catch (e) {
    pedirSenha('Não consegui falar com o PC. Confira se o app está aberto e se o celular está na mesma rede.');
  }
}

// ---------- telas ----------
// 429: o PC bloqueou este celular por um tempo depois de várias senhas erradas
async function motivo(r) {
  if (r.status !== 429) return 'Senha incorreta.';
  try { return (await r.json()).erro; } catch (e) { return 'Muitas tentativas erradas. Espere um pouco e tente de novo.'; }
}
function pedirSenha(msg) {
  $('login').classList.remove('oculto');
  $('app').classList.add('oculto');
  $('loginErro').textContent = msg || '';
}
function abrirApp() {
  $('login').classList.add('oculto');
  $('app').classList.remove('oculto');
}

// ---------- desenhar o estado ----------
function aplicarEstado(st) {
  E = st;
  conectado(true, st.modo === 'live' && st.projecao);
  $('liveRef').textContent = st.modo === 'black' ? 'TELA PRETA'
    : st.modo === 'clear' ? 'SÓ FUNDO'
    : (st.liveRef || '—');
  if (st.cron) { $('cronCel').textContent = st.cron.valor; $('cronCel').className = 'cron-cel' + (/fim/.test(st.cron.classe) ? ' fim' : /aviso/.test(st.cron.classe) ? ' aviso' : ''); }
  $('prevRef').textContent = st.prevRef || '—';
  $('prevTexto').textContent = st.prevTexto || '';

  // livros e capítulos
  const sl = $('selLivro');
  if (sl.options.length !== (st.livros || []).length) {
    sl.innerHTML = (st.livros || []).map((n, i) => `<option value="${i}">${n}</option>`).join('');
  }
  sl.value = st.livroIdx;
  const sc = $('selCap');
  if (sc.options.length !== st.caps) {
    sc.innerHTML = Array.from({ length: st.caps }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('');
  }
  sc.value = st.cap;

  // versículos do capítulo
  const box = $('versiculos');
  const chave = st.livroIdx + ':' + st.cap + ':' + (st.versiculos || []).length;
  if (box.dataset.chave !== chave) {
    box.dataset.chave = chave;
    box.innerHTML = '';
    (st.versiculos || []).forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'item';
      d.dataset.i = i;
      d.innerHTML = `<b>${i + 1}</b><span>${esc(t)}</span>`;
      const b = document.createElement('button');
      b.className = 'tocar';
      b.textContent = 'NO AR';
      b.onclick = ev => { ev.stopPropagation(); enviar('projetar', { b: st.livroIdx, c: st.cap, v1: i }); };
      d.appendChild(b);
      d.onclick = () => enviar('preview', { b: st.livroIdx, c: st.cap, v1: i });
      box.appendChild(d);
    });
  }
  box.querySelectorAll('.item').forEach(d => {
    const i = +d.dataset.i;
    d.classList.toggle('sel', i >= st.v1 && i <= st.v2);
  });
  if (Date.now() - ultimoToque > 4000) {
    const alvo = box.querySelector(`.item[data-i="${st.v1}"]`);
    if (alvo && !emVista(alvo)) alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // aba tela
  document.querySelectorAll('.modo').forEach(b => b.classList.toggle('on', b.dataset.modo === st.modo));
  $('chkAuto').checked = !!st.auto;
  $('chkProjecao').checked = !!st.projecao;
  $('infoTela').textContent = st.projecao
    ? 'Projetando em ' + (st.monitor || 'monitor')
    : 'Fechada — nada aparece na TV';

  // resultados da busca
  const rb = $('resultados');
  const res = st.resultados || [];
  if (rb.dataset.n !== String(res.length) + (res[0] ? res[0].ref : '')) {
    rb.dataset.n = String(res.length) + (res[0] ? res[0].ref : '');
    rb.innerHTML = '';
    res.forEach(r => {
      const d = document.createElement('div');
      d.className = 'item';
      d.innerHTML = `<span><strong class="ref-busca">${esc(r.ref)}</strong>${esc(r.t)}</span>`;
      const b = document.createElement('button');
      b.className = 'tocar';
      b.textContent = 'NO AR';
      b.onclick = ev => { ev.stopPropagation(); enviar('projetar', { b: r.b, c: r.c, v1: r.v }); };
      d.appendChild(b);
      d.onclick = () => { enviar('preview', { b: r.b, c: r.c, v1: r.v }); trocarSub('nav'); };
      rb.appendChild(d);
    });
  }

  desenharMidia(st.midia);
  desenharMusica(st.musicas);
  desenharRoteiro(st);
  desenharProgramacao(st.programacao);
}

function desenharRoteiro(st) {
  const lista = st.roteiro || [];
  const prox = lista[st.prevIdx];
  $('rotProx').innerHTML = prox ? icone(prox.icone, 'ico-antes') + esc(prox.nome) : (st.prevRef ? icone('book-open', 'ico-antes') + esc(st.prevRef) : '—');
  const box = $('roteiroLista');
  const chave = lista.map(e => e.tipo + e.nome).join('|');
  if (box.dataset.chave !== chave) {
    box.dataset.chave = chave;
    box.innerHTML = '';
    if (!lista.length) {
      box.innerHTML = '<div class="cartao dica">O roteiro está vazio. Monte no computador (Adicionar ou Presets) ou envie vídeos e fotos pela aba <b>Mídia</b>.</div>';
    }
    lista.forEach((ev, i) => {
      const d = document.createElement('div');
      d.className = 'item';
      d.dataset.i = i;
      d.innerHTML = `<b>${icone(ev.icone)}</b><span>${esc(ev.nome || '')}<i class="selos"></i><small>${esc(ev.sub || '')}</small></span>`;
      const b = document.createElement('button');
      b.className = 'tocar';
      b.textContent = 'NO AR';
      b.onclick = e => { e.stopPropagation(); enviar('noAr', { i }); };
      d.appendChild(b);
      d.onclick = () => enviar('previa', { i });
      box.appendChild(d);
    });
  }
  box.querySelectorAll('.item').forEach(d => {
    const i = +d.dataset.i;
    d.classList.toggle('prox', i === st.prevIdx);
    d.classList.toggle('live', i === st.liveIdx);
    const s = d.querySelector('.selos');
    if (s) s.innerHTML = (i === st.liveIdx ? '<b class="selo ar">NO AR</b>' : '') + (i === st.prevIdx ? '<b class="selo prox">PRÓXIMO</b>' : '');
  });
}

function desenharProgramacao(pg) {
  // aparece quando há algo agendado/rodando, ou quando dá para começar o pré-culto agora
  const mostrar = !!pg && (pg.fase !== 'parada' || pg.temSequencia);
  $('progCel').hidden = !mostrar;
  if (!mostrar) return;
  $('progCelTxt').textContent = pg.texto || 'Pré-culto pronto para começar';
  $('progCelIniciar').hidden = !(pg.fase === 'parada' || pg.fase === 'agendada');
  $('progCelRetomar').hidden = !(pg.fase === 'pausada' || pg.fase === 'aguardando');
  $('progCelParar').hidden = pg.fase === 'parada';
  $('progCel').className = 'prog-cel fase-' + pg.fase;
}

function emVista(el) {
  const r = el.getBoundingClientRect();
  return r.top >= 60 && r.bottom <= innerHeight - 120;
}

function desenharMidia(m) {
  if (!m) return;
  const item = m.itens[m.idx];
  $('midiaAgora').innerHTML = item ? icone(m.tocando ? 'play' : 'pause', 'ico-antes') + esc(item.nome) : 'Nada tocando';
  porIcone($('mPlay'), m.tocando ? 'pause' : 'play');
  $('midiaT').textContent = fmt(m.t);
  $('midiaD').textContent = fmt(m.dur);
  $('midiaBarra').style.width = m.dur ? (m.t / m.dur * 100) + '%' : '0%';
  if (document.activeElement !== $('mVol')) $('mVol').value = m.volume;
  $('mVolTxt').textContent = m.volume + '%';
  $('midiaStatus').textContent = m.status || '';

}

// ---------- abas ----------
function trocarAba(nome) {
  document.querySelectorAll('.abas button').forEach(b => b.classList.toggle('on', b.dataset.tab === nome));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === nome));
}
document.querySelectorAll('.abas button').forEach(b => b.onclick = () => { vibrar(); trocarAba(b.dataset.tab); });
const abaAtual = () => document.querySelector('.abas button.on')?.dataset.tab;

// Bíblia: "Capítulo" ou "Buscar palavra"
function trocarSub(nome) {
  document.querySelectorAll('#segBiblia button').forEach(b => b.classList.toggle('on', b.dataset.v === nome));
  document.querySelectorAll('.sub-pane').forEach(p => p.classList.toggle('on', p.dataset.sub === nome));
  if (nome === 'busca') setTimeout(() => $('busca').focus(), 50);
}
document.querySelectorAll('#segBiblia button').forEach(b => b.onclick = () => { vibrar(); trocarSub(b.dataset.v); });

// ---------- botões ----------
$('btnEntrar').onclick = () => {
  PIN = $('pin').value.trim();
  if (!SENHA_OK.test(PIN)) return ($('loginErro').textContent = 'A senha tem 4 números.');
  localStorage.setItem('bibleStudioPin', PIN);
  carregarEstado();
};
$('pin').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnEntrar').click(); });

// barra de corte: as setas andam nos versículos (aba Bíblia) ou nos eventos do roteiro (outras abas)
$('btnCorte').onclick = () => { enviar('corte'); toast('No ar'); };
const andaNoRoteiro = () => abaAtual() !== 'versiculo' && E && (E.roteiro || []).length > 0;
$('btnDepois').onclick = () => enviar(andaNoRoteiro() ? 'previaProx' : 'proximo');
$('btnAntes').onclick = () => enviar(andaNoRoteiro() ? 'previaAnt' : 'anterior');
$('formIr').onsubmit = e => {
  e.preventDefault();
  const ref = $('quick').value.trim();
  if (ref) { enviar('ir', { ref }); $('quick').value = ''; $('quick').blur(); trocarSub('nav'); }
};
$('selLivro').onchange = e => enviar('preview', { b: +e.target.value, c: 0, v1: 0 });
$('selCap').onchange = e => enviar('preview', { b: E ? E.livroIdx : 0, c: +e.target.value, v1: 0 });

$('btnPreta').onclick = () => enviar('preta');
$('btnLimpar').onclick = () => enviar('limpar');
$('btnAoVivo').onclick = () => enviar('aoVivo');
$('chkAuto').onchange = e => enviar('auto', { valor: e.target.checked });
$('chkProjecao').onchange = e => enviar('projecao', { valor: e.target.checked });

$('formBusca').onsubmit = e => {
  e.preventDefault();
  const q = $('busca').value.trim();
  if (q.length < 3) return toast('Digite pelo menos 3 letras');
  enviar('buscar', { q });
  $('busca').blur();
};

// ---------- música (playlist do computador) ----------
function desenharMusica(m) {
  const aba = $('abaMusica');
  if (aba) aba.hidden = !m;                       // só aparece quando o PC tem a playlist
  if (!m) return;
  $('musAgora').innerHTML = m.nome ? icone(m.tocando ? 'play' : 'pause', 'ico-antes') + esc(m.nome) : 'Nada tocando';
  $('musT').textContent = fmt(m.t);
  $('musD').textContent = fmt(m.dur);
  $('musBarra').style.width = m.dur ? (m.t / m.dur * 100) + '%' : '0%';
  porIcone($('muPlay'), m.tocando ? 'pause' : 'play');
  $('muVolTxt').textContent = m.volume + '%';
  if (document.activeElement !== $('muVol')) $('muVol').value = m.volume;
  const box = $('musLista');
  const html = (m.itens || []).map((x, i) =>
    `<button class="linha${i === m.idx ? ' on' : ''}" data-i="${i}">
       <span class="n">${i + 1}</span>
       <span class="txt">${esc(x.nome)}${x.erro ? `<small>${esc(x.erro)}</small>` : ''}</span>
       <span class="dur">${x.dur ? fmt(x.dur) : ''}</span>
     </button>`).join('');
  box.innerHTML = html || '<p class="dica">Nenhuma música na playlist ainda.</p>';
  box.querySelectorAll('.linha').forEach(b => b.onclick = () => enviar('musTocar', { i: +b.dataset.i }));
}
$('muPlay').onclick = () => enviar('musPlay');
$('muParar').onclick = () => enviar('musParar');
$('muProx').onclick = () => enviar('musProx');
$('muAnt').onclick = () => enviar('musAnt');
$('muMais').onclick = () => enviar('musVolume', { d: 5 });
$('muMenos').onclick = () => enviar('musVolume', { d: -5 });
$('muVol').addEventListener('change', e => enviar('musVolume', { valor: +e.target.value }));
// controles Bluetooth que mandam teclas de volume (os botões do próprio celular
// o Android e o iPhone não entregam para a página — use os botões + e − da tela)
addEventListener('keydown', e => {
  if (!E || !E.musicas) return;
  if (e.key === 'AudioVolumeUp') { e.preventDefault(); enviar('musVolume', { d: 5 }); }
  else if (e.key === 'AudioVolumeDown') { e.preventDefault(); enviar('musVolume', { d: -5 }); }
});

$('mPlay').onclick = () => enviar('midiaPlay');
$('mParar').onclick = () => enviar('midiaParar');
$('mProxima').onclick = () => enviar('midiaProxima');
$('mAnterior').onclick = () => enviar('midiaAnterior');
$('mVol').addEventListener('change', e => enviar('midiaVolume', { valor: +e.target.value }));

$('progCelIniciar').onclick = () => { enviar('progIniciar'); toast('Pré-culto começando'); };
$('progCelRetomar').onclick = () => enviar('progRetomar');
$('progCelParar').onclick = () => { if (confirm('Parar a programação?')) enviar('progParar'); };

// ---------- enviar vídeos, fotos e áudios para o computador ----------
const tamanho = b => b > 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b > 1048576 ? (b / 1048576).toFixed(0) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
let filaEnvio = Promise.resolve();
function enviarArquivo(arquivo) {
  const item = document.createElement('div');
  item.className = 'envio-item';
  item.innerHTML = '<div class="nome"><span></span><span>na fila</span></div><div class="barra"><div></div></div>';
  item.querySelector('.nome span').textContent = arquivo.name;
  const info = item.querySelector('.nome span:last-child');
  const barra = item.querySelector('.barra div');
  $('envios').prepend(item);
  return new Promise(pronto => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'api/upload?pin=' + encodeURIComponent(PIN) + '&nome=' + encodeURIComponent(arquivo.name));
    xhr.upload.onprogress = e => {
      if (!e.lengthComputable) return;
      const pct = Math.round(e.loaded / e.total * 100);
      barra.style.width = pct + '%';
      info.textContent = pct + '% de ' + tamanho(e.total);
    };
    xhr.onload = () => {
      let r = {};
      try { r = JSON.parse(xhr.responseText); } catch (e) {}
      if (xhr.status === 200) { item.classList.add('ok'); barra.style.width = '100%'; info.textContent = 'no roteiro'; }
      else if (xhr.status === 401) { item.classList.add('erro'); info.textContent = 'senha incorreta'; pedirSenha('Senha incorreta.'); }
      else if (xhr.status === 429) { item.classList.add('erro'); info.textContent = 'bloqueado'; pedirSenha(r.erro); }
      else { item.classList.add('erro'); info.textContent = r.erro || 'falhou'; }
      pronto();
    };
    xhr.onerror = () => { item.classList.add('erro'); info.textContent = 'sem conexão com o PC'; pronto(); };
    info.textContent = 'enviando…';
    xhr.send(arquivo);
  });
}
$('inArquivos').addEventListener('change', e => {
  const arquivos = [...e.target.files];
  e.target.value = '';
  if (!arquivos.length) return;
  toast(arquivos.length === 1 ? 'Enviando 1 arquivo' : `Enviando ${arquivos.length} arquivos`);
  // um por vez, para não travar o Wi-Fi da igreja
  arquivos.forEach(a => { filaEnvio = filaEnvio.then(() => enviarArquivo(a)); });
});

$('btnSair').onclick = () => {
  localStorage.removeItem('bibleStudioPin');
  PIN = '';
  $('pin').value = '';
  pedirSenha('');
};

document.addEventListener('touchstart', () => { ultimoToque = Date.now(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden && PIN) carregarEstado(); });

// ---------- início ----------
if (PIN) { if (/^\d{4}$/.test(PIN)) $('pin').value = PIN; carregarEstado(); } else pedirSenha('');

// permite instalar o controle como app no Android
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
