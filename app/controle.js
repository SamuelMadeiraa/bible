// Controle do Bible Studio pelo celular: fala com o PC pela rede (porta 7777).
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// o QR code do PC traz a senha no endereço (?pin=1234): entra direto, sem digitar
const pinDoLink = new URLSearchParams(location.search).get('pin');
if (/^\d{4}$/.test(pinDoLink || '')) {
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
    if (r.status === 401) return pedirSenha('Senha incorreta.');
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
  es = new EventSource('events');
  es.addEventListener('estado', ev => {
    try { aplicarEstado(JSON.parse(ev.data)); } catch (e) {}
  });
  es.onerror = () => conectado(false);
}

async function carregarEstado() {
  try {
    const r = await fetch('api/estado?pin=' + encodeURIComponent(PIN));
    if (r.status === 401) return pedirSenha('Senha incorreta.');
    const st = await r.json();
    if (st && st.livro !== undefined) aplicarEstado(st);
    abrirApp();
    ouvirEventos();
  } catch (e) {
    pedirSenha('Não consegui falar com o PC. Confira se o app está aberto e se o celular está na mesma rede.');
  }
}

// ---------- telas ----------
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
      d.innerHTML = `<b>${i + 1}</b><span>${t}</span>`;
      const b = document.createElement('button');
      b.className = 'tocar';
      b.textContent = 'AO VIVO';
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
  $('chkAuto').checked = !!st.auto;
  $('chkProjecao').checked = !!st.projecao;
  $('infoTela').textContent = st.projecao
    ? 'Projetando em ' + (st.monitor || 'monitor') + '.'
    : 'A projeção está fechada — nada aparece na TV.';

  // resultados da busca
  const rb = $('resultados');
  const res = st.resultados || [];
  if (rb.dataset.n !== String(res.length) + (res[0] ? res[0].ref : '')) {
    rb.dataset.n = String(res.length) + (res[0] ? res[0].ref : '');
    rb.innerHTML = '';
    res.forEach(r => {
      const d = document.createElement('div');
      d.className = 'item';
      d.innerHTML = `<span><b>${r.ref}</b><br>${r.t}</span>`;
      const b = document.createElement('button');
      b.className = 'tocar';
      b.textContent = 'AO VIVO';
      b.onclick = ev => { ev.stopPropagation(); enviar('projetar', { b: r.b, c: r.c, v1: r.v }); };
      d.appendChild(b);
      d.onclick = () => { enviar('preview', { b: r.b, c: r.c, v1: r.v }); trocarAba('versiculo'); };
      rb.appendChild(d);
    });
  }

  desenharMidia(st.midia);
  desenharRoteiro(st);
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
      box.innerHTML = '<p class="dica">O roteiro está vazio. Monte no computador (botões Adicionar ou Roteiros).</p>';
    }
    lista.forEach((ev, i) => {
      const d = document.createElement('div');
      d.className = 'item';
      d.dataset.i = i;
      d.innerHTML = `<b>${icone(ev.icone)}</b><span>${ev.nome}<i class="selos"></i><small>${ev.sub || ''}</small></span>`;
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

// ---------- botões ----------
$('btnEntrar').onclick = () => {
  PIN = $('pin').value.trim();
  if (PIN.length !== 4) return ($('loginErro').textContent = 'A senha tem 4 números.');
  localStorage.setItem('bibleStudioPin', PIN);
  carregarEstado();
};
$('pin').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnEntrar').click(); });

$('btnEnviar').onclick = () => { enviar('corte'); toast('No ar'); };
$('btnCorte').onclick = () => { enviar('corte'); toast('No ar'); };
$('btnEvProx').onclick = () => enviar('previaProx');
$('btnEvAnt').onclick = () => enviar('previaAnt');
$('btnProximo').onclick = () => enviar('proximo');
$('btnAnterior').onclick = () => enviar('anterior');
$('btnIr').onclick = () => {
  const ref = $('quick').value.trim();
  if (ref) { enviar('ir', { ref }); $('quick').blur(); }
};
$('quick').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnIr').click(); });
$('selLivro').onchange = e => enviar('preview', { b: +e.target.value, c: 0, v1: 0 });
$('selCap').onchange = e => enviar('preview', { b: E ? E.livroIdx : 0, c: +e.target.value, v1: 0 });

$('btnPreta').onclick = () => enviar('preta');
$('btnLimpar').onclick = () => enviar('limpar');
$('btnAoVivo').onclick = () => enviar('aoVivo');
$('chkAuto').onchange = e => enviar('auto', { valor: e.target.checked });
$('chkProjecao').onchange = e => enviar('projecao', { valor: e.target.checked });

$('btnBuscar').onclick = () => enviar('buscar', { q: $('busca').value });
$('busca').addEventListener('keydown', e => { if (e.key === 'Enter') { $('btnBuscar').click(); e.target.blur(); } });

$('mPlay').onclick = () => enviar('midiaPlay');
$('mParar').onclick = () => enviar('midiaParar');
$('mProxima').onclick = () => enviar('midiaProxima');
$('mAnterior').onclick = () => enviar('midiaAnterior');
$('mVol').addEventListener('change', e => enviar('midiaVolume', { valor: +e.target.value }));

$('btnSair').onclick = () => {
  localStorage.removeItem('bibleStudioPin');
  PIN = '';
  $('pin').value = '';
  pedirSenha('');
};

document.addEventListener('touchstart', () => { ultimoToque = Date.now(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden && PIN) carregarEstado(); });

// ---------- início ----------
if (PIN) { $('pin').value = PIN; carregarEstado(); } else pedirSenha('');

// permite instalar o controle como app no Android
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
