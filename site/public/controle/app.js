// BibleLyrics Controle — app instalável (PWA) que guarda os computadores e abre o controle.
// O controle em si é servido pelo BibleLyrics no PC (http://IP:porta/controle): o site é https
// e o navegador não deixa uma página https falar com o PC da rede local, então o app abre a
// página do PC já com a senha no endereço.
const $ = id => document.getElementById(id);
const CHAVE = 'bibleControlePcs';
const PORTA_PADRAO = 7777;
const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

let pcs = [];
try { pcs = JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) {}
let pedidoInstalar = null;
let timerAuto = null;

function gravar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(pcs.slice(0, 8))); } catch (e) {}
}
function salvarPc(pc) {
  pcs = [{ ...pc, em: Date.now() }, ...pcs.filter(x => x.host !== pc.host)];
  gravar();
}
function erro(msg) { $('erro').textContent = msg || ''; }

function normalizarHost(txt) {
  let h = (txt || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!h) return null;
  if (!/:\d{2,5}$/.test(h)) h += ':' + PORTA_PADRAO;
  return /^[\w.-]+:\d{2,5}$/.test(h) ? h : null;
}

// aceita o QR do app (…/controle/#pc=IP:porta&pin=…&nome=PC) e o QR direto (http://IP:porta/controle?pin=…).
// O QR traz uma chave longa; quem digita usa a senha de 4 números.
const SENHA_OK = /^(\d{4}|[0-9a-f]{32})$/;
function lerLink(texto) {
  let u;
  try { u = new URL(texto, location.href); } catch (e) { return null; }
  const h = new URLSearchParams(u.hash.slice(1));
  if (h.get('pc')) {
    const host = normalizarHost(h.get('pc'));
    const pin = h.get('pin') || '';
    if (host && SENHA_OK.test(pin)) return { host, pin, nome: h.get('nome') || host.split(':')[0] };
  }
  if (u.protocol === 'http:' && /\/controle\/?$/.test(u.pathname) && SENHA_OK.test(u.searchParams.get('pin') || '')) {
    return { host: u.host, pin: u.searchParams.get('pin'), nome: u.hostname };
  }
  return null;
}

function conectar(pc) {
  clearTimeout(timerAuto);
  salvarPc(pc);
  try { sessionStorage.setItem('conectou', '1'); } catch (e) {}
  // leva o roteiro montado no celular para o computador (vira preset lá)
  const extra = window.Rascunho ? Rascunho.paraLink() : '';
  location.href = `http://${pc.host}/controle?pin=${encodeURIComponent(pc.pin)}${extra}`;
}

// ---------- telas ----------
function desenhar() {
  const atual = pcs[0];
  $('telaAuto').hidden = true;
  $('telaVazia').hidden = !!atual;
  $('telaPc').hidden = !atual;
  if (atual) {
    $('pcNome').textContent = atual.nome || atual.host;
    $('pcHost').textContent = atual.host;
  }

  $('telaInstalar').hidden = instalado;
  $('btnInstalar').hidden = !pedidoInstalar;
  $('instrucoesIos').hidden = !ios;
  $('instrucoesOutros').hidden = ios || !!pedidoInstalar;

  const outros = pcs.slice(1);
  $('telaLista').hidden = !outros.length;
  $('lista').innerHTML = '';
  outros.forEach(pc => {
    const d = document.createElement('div');
    d.className = 'pc';
    d.innerHTML = '<div><b></b><small></small></div><button>Usar</button><button class="apagar" title="Esquecer" aria-label="Esquecer"><i data-i="x"></i></button>';
    d.querySelector('b').textContent = pc.nome || pc.host;
    d.querySelector('small').textContent = pc.host;
    const [usar, apagar] = d.querySelectorAll('button');
    usar.onclick = () => { salvarPc(pc); desenhar(); scrollTo({ top: 0, behavior: 'smooth' }); };
    apagar.onclick = () => { pcs = pcs.filter(x => x.host !== pc.host); gravar(); desenhar(); };
    $('lista').appendChild(d);
  });
}

function conectarSozinho() {
  const pc = pcs[0];
  $('telaPc').hidden = true;
  $('telaAuto').hidden = false;
  $('autoNome').textContent = pc.nome || pc.host;
  timerAuto = setTimeout(() => conectar(pc), 900);
}

// ---------- instalar ----------
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  pedidoInstalar = e;
  desenhar();
});
addEventListener('appinstalled', () => {
  pedidoInstalar = null;
  $('telaInstalar').hidden = true;
  erro('');
});
$('btnInstalar').onclick = async () => {
  if (!pedidoInstalar) return;
  pedidoInstalar.prompt();
  await pedidoInstalar.userChoice.catch(() => {});
  pedidoInstalar = null;
  desenhar();
};

// ---------- botões ----------
$('btnConectar').onclick = () => pcs[0] && conectar(pcs[0]);
$('btnCancelarAuto').onclick = () => { clearTimeout(timerAuto); desenhar(); };

$('btnDigitar').onclick = () => {
  const f = $('telaDigitar');
  f.hidden = !f.hidden;
  if (!f.hidden) {
    if (pcs[0]) { $('inHost').value = pcs[0].host; $('inPin').value = /^\d{4}$/.test(pcs[0].pin) ? pcs[0].pin : ''; }
    $('inHost').focus();
  }
};
$('telaDigitar').onsubmit = e => {
  e.preventDefault();
  const host = normalizarHost($('inHost').value);
  const pin = $('inPin').value.trim();
  if (!host) return erro('Endereço inválido. Exemplo: 192.168.0.10:7777');
  if (!SENHA_OK.test(pin)) return erro('A senha tem 4 números.');
  erro('');
  conectar({ host, pin, nome: host.split(':')[0] });
};

// ---------- leitor de QR (Android/Chrome) ----------
let fluxo = null;
function fecharLeitor() {
  if (fluxo) fluxo.getTracks().forEach(t => t.stop());
  fluxo = null;
  $('telaLeitor').hidden = true;
}
$('btnFecharLeitor').onclick = fecharLeitor;
if ('BarcodeDetector' in window) {
  $('btnLer').hidden = false;
  $('btnLer').onclick = async () => {
    erro('');
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (e) {
      return erro('Não consegui abrir a câmera. Use a câmera do celular ou digite o endereço.');
    }
    const video = $('video');
    video.srcObject = fluxo;
    $('telaLeitor').hidden = false;
    await video.play().catch(() => {});
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const procurar = async () => {
      if (!fluxo) return;
      try {
        for (const c of await detector.detect(video)) {
          const pc = lerLink(c.rawValue);
          if (pc) { fecharLeitor(); salvarPc(pc); desenhar(); return conectar(pc); }
        }
      } catch (e) {}
      setTimeout(procurar, 250);
    };
    procurar();
  };
}

// ---------- início ----------
const doQr = lerLink(location.href);
if (doQr) {
  salvarPc(doQr);
  history.replaceState(null, '', location.pathname);
}
desenhar();

// app instalado: abre o controle sozinho (só uma vez por sessão, para o "voltar" não entrar em loop)
let jaConectou = false;
try { jaConectou = sessionStorage.getItem('conectou') === '1'; } catch (e) {}
if (instalado && pcs[0] && !jaConectou) conectarSozinho();

// voltando do controle pelo botão "voltar"
addEventListener('pageshow', e => { if (e.persisted) { clearTimeout(timerAuto); desenhar(); } });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/controle/sw.js', { scope: '/controle/' }).catch(() => {});
