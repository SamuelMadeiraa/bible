const { app, BrowserWindow, ipcMain, screen, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// BibleLyrics se chamava "Bible Studio": na primeira vez, traz os dados (presets, roteiro, estilos,
// senha do celular…) da pasta antiga. Os caches do navegador ficam para trás.
(function migrarDados() {
  try {
    const nova = app.getPath('userData');
    const antiga = path.join(app.getPath('appData'), 'Bible Studio');
    if (fs.existsSync(nova) || !fs.existsSync(antiga)) return;
    const pular = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'Crashpad', 'blob_storage', 'Shared Dictionary']);
    fs.cpSync(antiga, nova, { recursive: true, filter: origem => !pular.has(path.basename(origem)) });
  } catch (e) {}
})();

const analytics = require('./analytics');
const biblioteca = require('./biblioteca');
const atualizacao = require('./atualizacao');

let opWin = null;
let outWin = null;
let outDisplayId = null;
let lastSlide = null;
const images = new Map();      // id -> dataURL das imagens de fundo
const midias = new Map();      // id -> caminho do arquivo de mídia no disco
const clients = new Set();     // conexões SSE (OBS / navegador / outro PC)
let serverPort = null;
let ultimaMidia = null;        // último comando de mídia (para quem conectar depois)
let estadoRemoto = null;       // resumo do app para o controle no celular
const celularesVistos = new Set();   // aparelhos que já entraram no controle nesta sessão
const SITE_CONTROLE = 'https://biblelyrics.vercel.app/controle/';   // app do celular (PWA)

// acesso do controle remoto: a senha de 4 números (para digitar) e uma chave longa que só vai
// dentro do QR code. As duas ficam guardadas, para o app do celular continuar entrando depois.
const { PIN, CHAVE } = (() => {
  const arq = path.join(app.getPath('userData'), 'controle-remoto.json');
  let d = {};
  try { d = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (e) {}
  let mudou = false;
  if (!/^\d{4}$/.test(d.pin || '')) { d.pin = String(crypto.randomInt(1000, 10000)); mudou = true; }
  if (!/^[0-9a-f]{32}$/.test(d.chave || '')) { d.chave = crypto.randomBytes(16).toString('hex'); mudou = true; }
  if (mudou) try { fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, JSON.stringify(d)); } catch (e) {}
  return { PIN: d.pin, CHAVE: d.chave };
})();

// errar a senha 5 vezes bloqueia aquele aparelho por 1 minuto (e o bloqueio dobra a cada nova rodada)
const tentativas = new Map();     // ip -> { falhas, ate }
function autorizar(req, valor) {
  const ip = req.socket.remoteAddress;
  const t = tentativas.get(ip);
  if (t && t.ate > Date.now()) return 'bloqueado';
  if (valor && (valor === PIN || valor === CHAVE)) { tentativas.delete(ip); return 'ok'; }
  const falhas = (t ? t.falhas : 0) + 1;
  tentativas.set(ip, { falhas, ate: falhas >= 5 ? Date.now() + Math.min(30 * 60000, 60000 * 2 ** (falhas - 5)) : 0 });
  return 'negado';
}
function recusar(res, r) {
  res.writeHead(r === 'bloqueado' ? 429 : 401, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ erro: r === 'bloqueado' ? 'Muitas tentativas erradas. Espere um pouco e tente de novo.' : 'pin' }));
}

// sem isso o Chromium bloqueia tocar áudio/vídeo sem um clique do operador na janela
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const PRELOAD = path.join(__dirname, 'preload.js');
const ICON = path.join(__dirname, 'app', 'icon.ico');

// ---------------- janelas ----------------
function createOperator() {
  opWin = new BrowserWindow({
    width: 1600, height: 950, minWidth: 1100, minHeight: 680,
    backgroundColor: '#0e0e10',
    title: 'BibleLyrics',
    autoHideMenuBar: true,
    show: false,
    icon: ICON,
    webPreferences: { preload: PRELOAD, backgroundThrottling: false },
  });
  opWin.once('ready-to-show', () => { opWin.maximize(); opWin.show(); });
  opWin.loadFile(path.join(__dirname, 'app', 'home.html'));
  opWin.on('closed', () => {
    if (criadorWin && !criadorWin.isDestroyed()) criadorWin.destroy();
    opWin = null;
    if (outWin) outWin.destroy();
    app.quit();
  });
}

function listDisplays() {
  const primary = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: d.label || `Monitor ${i + 1}`,
    width: Math.round(d.bounds.width * d.scaleFactor),
    height: Math.round(d.bounds.height * d.scaleFactor),
    primary: d.id === primary,
  }));
}

function outputState() {
  if (!outWin) return { open: false };
  const [w, h] = outWin.getContentSize();
  return { open: true, displayId: outDisplayId, width: w, height: h, fullscreen: outWin.isFullScreen() };
}
function notifyOutputState() {
  if (opWin) opWin.webContents.send('output:state', outputState());
}

// fade da janela da projeção (aparece e some suavemente na TV)
const FADE_MS = 700;
let fadeTimer = null;
function fadeJanela(win, de, para, ms, fim) {
  clearInterval(fadeTimer);
  const ini = Date.now();
  win.setOpacity(de);
  fadeTimer = setInterval(() => {
    if (win.isDestroyed()) { clearInterval(fadeTimer); return; }
    const k = Math.min(1, (Date.now() - ini) / ms);
    win.setOpacity(de + (para - de) * k * k * (3 - 2 * k));     // curva suave
    if (k >= 1) { clearInterval(fadeTimer); if (fim) fim(); }
  }, 16);
}
function fecharProjecao() {
  if (!outWin || outWin.isDestroyed()) return;
  const w = outWin;
  fadeJanela(w, w.getOpacity(), 0, FADE_MS * 0.6, () => { if (!w.isDestroyed()) w.destroy(); });
}

function openOutput(displayId) {
  const primary = screen.getPrimaryDisplay();
  const all = screen.getAllDisplays();
  const d = all.find(x => x.id === displayId)
    || all.find(x => x.id !== primary.id)
    || primary;
  const external = d.id !== primary.id;

  fecharWeb();
  if (outWin) outWin.destroy();
  outDisplayId = d.id;
  analytics.enviar('projecao_aberta', { monitor_externo: external });

  const b = d.bounds;
  outWin = new BrowserWindow({
    x: external ? b.x : b.x + Math.round(b.width * 0.45),
    y: external ? b.y : b.y + Math.round(b.height * 0.45),
    width: external ? b.width : 960,
    height: external ? b.height : 540,
    frame: !external,
    fullscreen: external,
    opacity: 0,
    backgroundColor: '#000000',
    title: 'BibleLyrics — Projeção',
    autoHideMenuBar: true,
    show: false,
    skipTaskbar: external,
    icon: ICON,
    webPreferences: { preload: PRELOAD, backgroundThrottling: false },
  });
  outWin.loadFile(path.join(__dirname, 'app', 'saida.html'));
  outWin.once('ready-to-show', () => {
    if (external) { outWin.setBounds(b); outWin.setFullScreen(true); }
    outWin.showInactive();
    fadeJanela(outWin, 0, 1, FADE_MS);
    if (opWin) opWin.focus();
    notifyOutputState();
  });
  outWin.on('resize', () => { notifyOutputState(); ajustarWeb(); });
  outWin.on('closed', () => { fecharWeb(); fecharNavegador(); outWin = null; outDisplayId = null; notifyOutputState(); });
  return true;
}

// ---------------- IPC ----------------
ipcMain.handle('displays', () => listDisplays());
ipcMain.handle('output:open', (e, id) => openOutput(id));
ipcMain.handle('output:close', () => { fecharProjecao(); return true; });
ipcMain.handle('output:state', () => outputState());
ipcMain.on('output:fullscreen-toggle', () => {
  if (outWin) { outWin.setFullScreen(!outWin.isFullScreen()); notifyOutputState(); }
});

ipcMain.on('slide', (e, slide) => {
  lastSlide = slide;
  if (outWin) outWin.webContents.send('slide', slide);
  broadcast(slide);
});
ipcMain.handle('slide:last', () => lastSlide);

ipcMain.on('image:put', (e, id, data) => { images.set(id, data); });
ipcMain.handle('image:get', (e, id) => images.get(id) || null);

// ---------------- mídia (player interno) ----------------
ipcMain.handle('media:pick', async () => {
  const r = await dialog.showOpenDialog(opWin, {
    title: 'Escolher vídeos, fotos ou áudios',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Todas as mídias', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts', 'mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus', 'flac', 'm4b', 'oga', 'weba', 'mka', 'wma', 'aif', 'aiff', 'amr', 'ac3', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] },
      { name: 'Vídeos', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts'] },
      { name: 'Áudios', extensions: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus', 'flac', 'm4b', 'oga', 'weba', 'mka', 'wma', 'aif', 'aiff', 'amr', 'ac3'] },
      { name: 'Fotos', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
  });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.on('media:register', (e, lista) => {
  for (const { id, caminho } of lista || []) midias.set(id, caminho);
});
ipcMain.on('media', (e, cmd) => {
  ultimaMidia = cmd.a === 'stop' ? null : cmd;
  if (outWin) outWin.webContents.send('media', cmd);
  broadcast(cmd, 'media');
});
ipcMain.handle('media:last', () => ultimaMidia);
// por que um arquivo não toca: sumiu do disco? está vazio (download incompleto)?
ipcMain.handle('media:info', (e, caminho) => {
  try { const st = fs.statSync(caminho); return { existe: true, tamanho: st.size }; }
  catch (err) { return { existe: false, tamanho: 0 }; }
});
ipcMain.on('media:progress', (e, info) => { if (opWin) opWin.webContents.send('media:progress', info); });

// ---------------- transmissões ao vivo / links (YouTube, Univer Vídeo, etc.) ----------------
// A página abre numa camada nativa (WebContentsView) por cima da janela de projeção.
// Não depende de o site permitir <iframe> e guarda o login numa sessão própria.
const { WebContentsView, session } = require('electron');
const PARTICAO_WEB = 'persist:transmissoes';
let webView = null;
let webTimer = null;
let webUrl = null;

function youtubeEmbed(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(?:live|shorts|embed|v)\/([\w-]{6,})/);
        if (m && m[1] !== 'live_stream') id = m[1];
        const canal = u.pathname.match(/^\/channel\/(UC[\w-]+)(?:\/live)?/);
        if (canal) return `https://www.youtube.com/embed/live_stream?channel=${canal[1]}&autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;
      }
    }
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0`;
  } catch (e) { return null; }
}

// deixa o maior vídeo da página ocupando a tela toda e tocando (para sites que não são o player do YouTube)
function scriptTelaCheia(volume) {
  return `(() => {
    const aplicar = tocar => {
      const vids = [...document.querySelectorAll('video')];
      if (!vids.length) return false;
      const v = vids.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
      let st = document.getElementById('__bs_cheia');
      if (!st) { st = document.createElement('style'); st.id = '__bs_cheia'; document.documentElement.appendChild(st); }
      document.querySelectorAll('video[data-bs-alvo]').forEach(x => x !== v && x.removeAttribute('data-bs-alvo'));
      v.setAttribute('data-bs-alvo', '1');
      st.textContent = 'video[data-bs-alvo]{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;z-index:2147483647!important;background:#000!important;object-fit:contain!important;transform:none!important;margin:0!important}html,body{overflow:hidden!important;background:#000!important}';
      if (tocar) { v.muted = false; v.volume = ${Math.max(0, Math.min(1, volume))}; v.play().catch(() => {}); }
      return true;
    };
    // só dá play quando acha o vídeo; depois só reaplica o tamanho (para não desfazer uma pausa do operador)
    if (!aplicar(true)) { let n = 0; const t = setInterval(() => { if (aplicar(true) || ++n > 90) clearInterval(t); }, 1000); }
    else { let n = 0; const t = setInterval(() => { aplicar(false); if (++n > 20) clearInterval(t); }, 1500); }
    return true;
  })()`;
}

function ajustarWeb() {
  if (!webView || !outWin) return;
  const [w, h] = outWin.getContentSize();
  webView.setBounds({ x: 0, y: 0, width: w, height: h });
}

function fecharWeb() {
  clearInterval(webTimer);
  webTimer = null;
  webUrl = null;
  if (webView) {
    try { if (outWin && !outWin.isDestroyed()) outWin.contentView.removeChildView(webView); } catch (e) {}
    try { webView.webContents.close(); } catch (e) {}
    webView = null;
  }
  broadcast({ a: 'webFechar' }, 'media');
}

function prepararSessaoWeb() {
  const s = session.fromPartition(PARTICAO_WEB);
  // nada de câmera, microfone ou notificações; só o necessário para vídeo
  s.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'fullscreen'));
  return s;
}

ipcMain.handle('web:abrir', async (e, { url, cheia = true, volume = 80, embed = true, externo = false }) => {
  if (!outWin) return { erro: 'A projeção está fechada — abra a projeção primeiro.' };
  if (!/^https?:\/\//i.test(url || '')) return { erro: 'Endereço inválido (precisa começar com http:// ou https://)' };
  fecharWeb();
  const tipoLink = externo ? 'navegador' : (embed && youtubeEmbed(url)) ? 'youtube' : 'pagina';
  analytics.enviar('transmissao_aberta', { tipo: tipoLink });
  if (externo) return abrirNoNavegador(url, volume);
  fecharNavegador();
  prepararSessaoWeb();
  const yt = embed ? youtubeEmbed(url) : null;
  const alvo = yt || url;
  webUrl = alvo;
  webView = new WebContentsView({
    webPreferences: { partition: PARTICAO_WEB, sandbox: true, contextIsolation: true, backgroundThrottling: false },
  });
  webView.setBackgroundColor('#000000');
  webView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));   // sem pop-ups na projeção
  outWin.contentView.addChildView(webView);
  ajustarWeb();
  const vol = volume / 100;
  let modoPagina = !yt;            // true = página normal do site com o vídeo em tela cheia
  const injetar = () => {
    if (!webView) return;
    if (modoPagina && (cheia || yt)) webView.webContents.executeJavaScript(scriptTelaCheia(vol), true).catch(() => {});
    else webView.webContents.executeJavaScript(`(() => { const v = document.querySelector('video'); if (v) { v.muted = false; v.volume = ${vol}; v.play().catch(() => {}); } })()`, true).catch(() => {});
  };
  webView.webContents.on('dom-ready', injetar);
  webView.webContents.on('did-finish-load', injetar);

  // Muitos vídeos do YouTube (clipes, gravadoras, algumas lives) não deixam usar o player
  // incorporado e mostram "Este vídeo não está disponível". Nesse caso abre a página normal
  // do YouTube e deixa o vídeo em tela cheia.
  if (yt) {
    const viewAtual = webView;
    const idYt = (yt.match(/\/embed\/([\w-]{6,})/) || [])[1];
    const paginaNormal = idYt && idYt !== 'live_stream' ? `https://www.youtube.com/watch?v=${idYt}` : url;
    const verificar = async tentativa => {
      if (webView !== viewAtual || modoPagina) return;
      let falhou = false;
      try {
        falhou = await viewAtual.webContents.executeJavaScript(`(() => {
          const v = document.querySelector('video');
          if (v && v.readyState >= 2 && (v.currentTime > 0 || !v.paused)) return false;   // está tocando
          const txt = (document.body && document.body.innerText) || '';
          return !!document.querySelector('.ytp-error, .ytp-embed-error')
            || /não está disponível|indisponível|unavailable|not available|reprodução.*desativad|playback.*disabled/i.test(txt);
        })()`, true);
      } catch (err) {}
      if (falhou) {
        modoPagina = true;
        if (opWin) opWin.webContents.send('web:aviso', 'O YouTube não libera o player incorporado deste vídeo — abrindo a página normal em tela cheia.');
        viewAtual.webContents.loadURL(paginaNormal).catch(() => {});
      } else if (tentativa < 4) {
        setTimeout(() => verificar(tentativa + 1), 2500);
      }
    };
    viewAtual.webContents.once('did-finish-load', () => setTimeout(() => verificar(1), 1500));
  }
  // espelho de baixa resolução no monitor "ao vivo" do operador
  webTimer = setInterval(async () => {
    if (!webView || !opWin) return;
    try {
      const img = await webView.webContents.capturePage();
      if (!img.isEmpty()) opWin.webContents.send('web:quadro', img.resize({ width: 480 }).toDataURL());
    } catch (err) {}
  }, 1000);
  broadcast({ a: 'web', url: alvo }, 'media');
  try {
    await webView.webContents.loadURL(alvo, { httpReferrer: `http://127.0.0.1:${serverPort || 7777}/` });
  } catch (err) {
    if (!webView) return { ok: false };
    return { ok: true, aviso: 'A página demorou ou falhou ao carregar: ' + (err.code || err.message) };
  }
  return { ok: true, url: alvo, youtube: !!yt };
});

// ---------------- navegador externo (plataformas com DRM, como a Univer Vídeo) ----------------
// O Electron não tem o Widevine (proteção de vídeo). Para essas plataformas o app abre o
// Chrome/Edge em tela cheia no monitor da projeção, com um perfil próprio (o login fica
// guardado), e controla a página pelo protocolo de depuração do navegador.
const { spawn } = require('child_process');
const CAMINHOS_NAVEGADOR = [
  path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
  path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
];
const acharNavegador = () => CAMINHOS_NAVEGADOR.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
const perfilNavegador = () => path.join(app.getPath('userData'), 'navegador-transmissoes');

let nav = null;   // { proc, porta, ws, seq, pend, timer }

function navCdp(metodo, params = {}) {
  return new Promise((ok, erro) => {
    if (!nav || !nav.ws || nav.ws.readyState !== 1) return erro(new Error('sem conexão com o navegador'));
    const id = ++nav.seq;
    nav.pend.set(id, { ok, erro });
    nav.ws.send(JSON.stringify({ id, method: metodo, params }));
    setTimeout(() => { if (nav && nav.pend.has(id)) { nav.pend.delete(id); erro(new Error('tempo esgotado')); } }, 6000);
  });
}
async function navEval(expr) {
  const r = await navCdp('Runtime.evaluate', { expression: expr, userGesture: true, awaitPromise: true, returnByValue: true });
  return r && r.result ? r.result.value : undefined;
}

function fecharNavegador() {
  if (!nav) return;
  const n = nav;
  nav = null;
  clearInterval(n.timer);
  try { n.ws && n.ws.close(); } catch (e) {}
  try { n.proc && n.proc.kill(); } catch (e) {}
}

async function conectarNavegador(n, volume) {
  // espera o navegador abrir a porta de depuração e pega a aba da página
  let alvo = null;
  for (let i = 0; i < 40 && !alvo && nav === n; i++) {
    await new Promise(r => setTimeout(r, 300));
    alvo = await new Promise(res => {
      http.get({ host: '127.0.0.1', port: n.porta, path: '/json' }, r => {
        let t = '';
        r.on('data', d => t += d);
        r.on('end', () => { try { res(JSON.parse(t).find(x => x.type === 'page')); } catch (e) { res(null); } });
      }).on('error', () => res(null));
    });
  }
  if (!alvo || nav !== n) return false;
  n.ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok, erro) => { n.ws.onopen = ok; n.ws.onerror = () => erro(new Error('falha ao conectar')); });
  n.ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && n.pend.has(m.id)) { const p = n.pend.get(m.id); n.pend.delete(m.id); m.error ? p.erro(new Error(m.error.message)) : p.ok(m.result); }
    if (m.method === 'Page.loadEventFired' || m.method === 'Page.navigatedWithinDocument') {
      navEval(scriptTelaCheia(volume)).catch(() => {});
    }
  };
  await navCdp('Page.enable').catch(() => {});
  navEval(scriptTelaCheia(volume)).catch(() => {});
  // espelho no monitor "ao vivo" do operador (vídeo protegido pode aparecer preto aqui; na TV aparece normal)
  n.timer = setInterval(async () => {
    if (nav !== n || !opWin) return;
    try {
      const r = await navCdp('Page.captureScreenshot', { format: 'jpeg', quality: 45 });
      if (r && r.data) opWin.webContents.send('web:quadro', 'data:image/jpeg;base64,' + r.data);
    } catch (e) {}
  }, 1500);
  return true;
}

async function abrirNoNavegador(url, volume) {
  const exe = acharNavegador();
  if (!exe) return { erro: 'Chrome ou Edge não encontrado — instale o Google Chrome para tocar plataformas protegidas.' };
  if (!outWin) return { erro: 'A projeção está fechada — abra a projeção primeiro.' };
  fecharNavegador();
  const porta = 9500 + Math.floor(Math.random() * 400);
  // mesmo lugar da janela de projeção: tela cheia no monitor da TV, ou janela do mesmo tamanho
  const tela = screen.getAllDisplays().find(d => d.id === outDisplayId);
  const naTv = outWin.isFullScreen() && tela && tela.id !== screen.getPrimaryDisplay().id;
  const b = naTv ? tela.bounds : outWin.getBounds();
  const args = [
    `--user-data-dir=${perfilNavegador()}`,
    `--remote-debugging-port=${porta}`,
    '--no-first-run', '--no-default-browser-check', '--noerrdialogs',
    '--disable-session-crashed-bubble', '--hide-crash-restore-bubble', '--disable-infobars',
    '--autoplay-policy=no-user-gesture-required', '--disable-features=Translate',
    `--window-position=${b.x},${b.y}`, `--window-size=${b.width},${b.height}`,
    ...(naTv ? ['--kiosk'] : []),
    `--app=${url}`,
  ];
  const n = { proc: spawn(exe, args, { stdio: 'ignore', windowsHide: false }), porta, ws: null, seq: 0, pend: new Map(), timer: null };
  nav = n;
  n.proc.on('exit', () => {
    if (nav === n) { nav = null; clearInterval(n.timer); if (opWin) opWin.webContents.send('web:aviso', 'O navegador da transmissão foi fechado.'); }
  });
  try {
    const ok = await conectarNavegador(n, volume / 100);
    if (!ok) return { ok: true, aviso: 'Navegador aberto, mas sem controle pelo app (tocar/pausar/volume).' };
  } catch (e) {
    return { ok: true, aviso: 'Navegador aberto, mas sem controle pelo app: ' + e.message };
  }
  return { ok: true, url, externo: true, navegador: path.basename(exe, '.exe') };
}

ipcMain.handle('web:fechar', () => { fecharWeb(); fecharNavegador(); return true; });

ipcMain.handle('web:cmd', async (e, cmd, valor) => {
  if (!webView && !nav) return { erro: 'nada no ar' };
  const js = {
    pause: `(() => { const v = document.querySelector('video[data-bs-alvo]') || document.querySelector('video'); if (v) v.pause(); return !!v; })()`,
    play: `(() => { const v = document.querySelector('video[data-bs-alvo]') || document.querySelector('video'); if (v) v.play(); return !!v; })()`,
    volume: `(() => { document.querySelectorAll('video').forEach(v => { v.muted = false; v.volume = ${Math.max(0, Math.min(1, (valor || 0) / 100))}; }); return true; })()`,
    estado: `(() => { const v = document.querySelector('video[data-bs-alvo]') || document.querySelector('video'); return v ? { tocando: !v.paused, t: v.currentTime || 0, dur: isFinite(v.duration) ? v.duration : 0, largura: v.videoWidth } : null; })()`,
  }[cmd];
  if (!js) return { erro: 'comando' };
  if (nav) {
    try { return { ok: true, r: await navEval(js) }; } catch (err) { return { erro: err.message }; }
  }
  try { return { ok: true, r: await webView.webContents.executeJavaScript(js, true) }; }
  catch (err) { return { erro: err.message }; }
});

// janela para entrar na conta do site (ex.: Univer Vídeo); o login fica guardado na mesma sessão
ipcMain.handle('web:login', (e, url, externo) => {
  if (!/^https?:\/\//i.test(url || '')) return { erro: 'Endereço inválido' };
  if (externo) {
    // login no mesmo perfil do navegador usado na projeção (janela normal, no monitor do operador)
    const exe = acharNavegador();
    if (!exe) return { erro: 'Chrome ou Edge não encontrado' };
    if (nav) return { erro: 'Feche a transmissão (volte para um versículo) antes de entrar no site' };
    spawn(exe, [`--user-data-dir=${perfilNavegador()}`, '--no-first-run', '--no-default-browser-check', '--new-window', url],
      { stdio: 'ignore', detached: true }).unref();
    return { ok: true, externo: true };
  }
  prepararSessaoWeb();
  const w = new BrowserWindow({
    width: 1100, height: 820, parent: opWin, title: 'Entrar no site — BibleLyrics', autoHideMenuBar: true, icon: ICON,
    webPreferences: { partition: PARTICAO_WEB, sandbox: true, contextIsolation: true },
  });
  w.loadURL(url);
  return { ok: true };
});

// ---------------- controle pelo celular ----------------
ipcMain.on('estado:put', (e, st) => {
  estadoRemoto = st;
  broadcast(st, 'estado');
});
function qrSvg(texto) {
  const qrcode = require('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
}
// um QR por endereço de rede: "app" abre o app instalável do site; "direto" abre o controle
// servido pelo próprio PC (funciona mesmo sem internet no celular)
ipcMain.handle('remote:info', () => {
  const nome = os.hostname();
  const enderecos = !serverPort ? [] : lanUrls().slice(1).map(u => {
    const host = new URL(u).host;                                  // ip:porta
    const direto = `${u}controle?pin=${CHAVE}`;
    const app = `${SITE_CONTROLE}#pc=${encodeURIComponent(host)}&pin=${CHAVE}&nome=${encodeURIComponent(nome)}`;
    return { host, direto, app, qrApp: qrSvg(app), qrDireto: qrSvg(direto) };
  });
  return { pin: PIN, nome, urls: lanUrls().map(u => u + 'controle'), enderecos };
});

// ---------------- estatísticas de uso (Google Analytics) ----------------
ipcMain.on('analytics:evento', (e, nome, params) => analytics.enviar(nome, params));

ipcMain.handle('server:info', () => ({ port: serverPort, urls: lanUrls(), versao: app.getVersion(), empacotado: app.isPackaged }));
// ---------------- tela Início, criador de vídeo e arquivos ----------------
let criadorWin = null;
const TELAS = { home: 'home.html', operador: 'operador.html' };
ipcMain.on('navegar', (e, destino) => {
  if (opWin && TELAS[destino]) opWin.loadFile(path.join(__dirname, 'app', TELAS[destino]));
});
ipcMain.on('janela:criador', () => {
  if (criadorWin && !criadorWin.isDestroyed()) { if (criadorWin.isMinimized()) criadorWin.restore(); return criadorWin.focus(); }
  criadorWin = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700, show: false,
    title: 'BibleLyrics — Criador de vídeo de louvor', autoHideMenuBar: true, icon: ICON,
    backgroundColor: '#0c0e12',
    webPreferences: { preload: PRELOAD, backgroundThrottling: false },
  });
  criadorWin.once('ready-to-show', () => { criadorWin.maximize(); criadorWin.show(); });
  criadorWin.loadFile(path.join(__dirname, 'app', 'criador.html'));
  criadorWin.on('closed', () => { criadorWin = null; });
  // se a página do criador cair (ex.: falta de memória no vídeo), recarrega em vez de ficar em branco
  criadorWin.webContents.on('render-process-gone', (e, d) => {
    console.error('criador caiu:', d.reason, d.exitCode);
    if (criadorWin && !criadorWin.isDestroyed()) criadorWin.reload();
  });
});

const FILTROS = {
  audio: [{ name: 'Músicas', extensions: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus', 'flac', 'm4b', 'oga', 'weba'] }],
  imagem: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }],
};
ipcMain.handle('arquivo:escolher', async (e, tipo) => {
  const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: tipo === 'audio' ? 'Escolher a música' : 'Escolher a imagem',
    properties: ['openFile'], filters: FILTROS[tipo] || [],
  });
  return r.canceled ? null : r.filePaths[0];
});
// lê um arquivo local para a tela (música para o vídeo, imagem de fundo/logo)
const LIMITE_LEITURA = 400 * 1024 * 1024;
ipcMain.handle('arquivo:ler', async (e, caminho) => {
  const st = await fs.promises.stat(caminho);
  if (st.size > LIMITE_LEITURA) throw new Error('Arquivo grande demais');
  const buf = await fs.promises.readFile(caminho);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});
const pastaDeVideos = () => biblioteca.pasta('videos');
ipcMain.handle('video:destino', async (e, nome) => {
  const limpo = String(nome || 'Louvor').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80) || 'Louvor';
  const r = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Salvar o vídeo', defaultPath: path.join(pastaDeVideos(), limpo + '.mp4'),
    filters: [{ name: 'Vídeo MP4', extensions: ['mp4'] }],
  });
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('video:gravar', async (e, caminho, dados) => {
  await fs.promises.writeFile(caminho, Buffer.from(dados));
  analytics.enviar('video_louvor_gerado', { mb: Math.round(dados.byteLength / 1048576) });
  return true;
});
ipcMain.on('pasta:mostrar', (e, qual, caminho) => {
  if (qual === 'arquivo' && caminho) return shell.showItemInFolder(caminho);
  shell.openPath(biblioteca.pasta(qual === 'base' ? null : qual));
});
// coloca um arquivo no roteiro: na hora, se a operação estiver aberta; senão, o app guarda para depois
ipcMain.handle('roteiro:adicionar', (e, caminho) => {
  const naOperacao = opWin && /operador\.html/.test(opWin.webContents.getURL());
  if (naOperacao) opWin.webContents.send('remoto', { acao: 'arquivoRecebido', caminho });
  return naOperacao;
});
ipcMain.on('abrir-site', (e, pagina) => {
  const raiz = SITE_CONTROLE.replace(/controle\/$/, '');
  shell.openExternal(pagina === 'privacidade' ? raiz + 'privacidade/' : raiz);
});

ipcMain.on('open-external', (e, url) => {
  if (/^http:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+):\d+\/?$/.test(url)) shell.openExternal(url);
});

// ---------------- servidor da rede (OBS / outro PC / TV) ----------------
// o endereço mais provável de ser o Wi-Fi/cabo da igreja vem primeiro
// (placas virtuais, VPN e endereços sem rede ficam por último)
// prefixos de MAC de placas virtuais (VirtualBox, VMware, Hyper-V, Parallels), que às vezes se chamam só "Ethernet 3"
const MAC_VIRTUAL = /^(0a:00:27|08:00:27|00:50:56|00:0c:29|00:05:69|00:1c:14|00:15:5d|00:1c:42)/i;
function notaRede(nome, ip, mac) {
  let n = 0;
  if (/virtual|vmware|vbox|hyper-v|vethernet|wsl|docker|loopback|bluetooth|tailscale|zerotier|hamachi|radmin|vpn/i.test(nome)) n += 10;
  if (MAC_VIRTUAL.test(mac || '')) n += 10;
  if (/wi-?fi|wlan|wireless|sem fio/i.test(nome)) n -= 1;
  if (ip.startsWith('169.254.')) n += 20;
  if (ip.startsWith('192.168.')) n -= 3;
  else if (ip.startsWith('10.')) n -= 2;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) n -= 1;
  return n;
}
function lanUrls() {
  const lista = [];
  for (const [nome, list] of Object.entries(os.networkInterfaces())) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) lista.push({ ip: n.address, nota: notaRede(nome, n.address, n.mac) });
    }
  }
  lista.sort((a, b) => a.nota - b.nota);
  return [`http://localhost:${serverPort}/`, ...lista.map(x => `http://${x.ip}:${serverPort}/`)];
}

function broadcast(dados, evento = 'slide') {
  const msg = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;
  for (const res of clients) if (evento !== 'estado' || res.autorizado) res.write(msg);
}

// Envia o arquivo de mídia aceitando Range (necessário para avançar o vídeo).
function servirMidia(req, res, arquivo) {
  fs.stat(arquivo, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
    const tipo = TIPOS_MIDIA[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const ini = range[1] ? parseInt(range[1], 10) : 0;
      const fim = range[2] ? parseInt(range[2], 10) : st.size - 1;
      if (ini >= st.size || fim >= st.size || ini > fim) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': tipo, 'Content-Length': fim - ini + 1,
        'Content-Range': `bytes ${ini}-${fim}/${st.size}`, 'Accept-Ranges': 'bytes',
      });
      return fs.createReadStream(arquivo, { start: ini, end: fim }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(arquivo).pipe(res);
  });
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json; charset=utf-8',
};
const TIPOS_MIDIA = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.wmv': 'video/x-ms-wmv',
  '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg', '.ts': 'video/mp2t',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.flac': 'audio/flac', '.m4b': 'audio/mp4', '.oga': 'audio/ogg',
  '.weba': 'audio/webm', '.mka': 'audio/x-matroska', '.wma': 'audio/x-ms-wma', '.aif': 'audio/aiff',
  '.aiff': 'audio/aiff', '.amr': 'audio/amr', '.ac3': 'audio/ac3',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.bmp': 'image/bmp',
};
const PUBLICOS = new Set(['saida.html', 'saida.js', 'engine.js', 'fonts.css',
  'controle.html', 'controle.js', 'controle.css', 'icones.js', 'logo-header.png', 'icon.png',
  'icon-512.png', 'manifest.webmanifest', 'sw.js']);

// ---------------- arquivos enviados pelo celular ----------------
const EXT_RECEBIDAS = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts',
  'mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus', 'flac', 'm4b', 'oga', 'weba', 'mka', 'wma', 'aif', 'aiff', 'amr', 'ac3', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']);
const LIMITE_UPLOAD = 4 * 1024 * 1024 * 1024;     // 4 GB por arquivo
const pastaDoCelular = () => biblioteca.pasta('celular');

function receberArquivo(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const responder = (codigo, obj) => { res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
  const acesso = autorizar(req, q.get('pin'));
  if (acesso !== 'ok') { req.resume(); return recusar(res, acesso); }
  // nome limpo (sem pastas nem caracteres proibidos no Windows) e só vídeo, foto ou áudio
  const original = path.basename(String(q.get('nome') || '')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 150);
  const ext = path.extname(original).slice(1).toLowerCase();
  if (!original || !EXT_RECEBIDAS.has(ext)) { req.resume(); return responder(415, { erro: 'Só vídeos, fotos e áudios' }); }
  const tamanho = +req.headers['content-length'] || 0;
  if (tamanho > LIMITE_UPLOAD) { req.resume(); return responder(413, { erro: 'Arquivo grande demais (máximo 4 GB)' }); }

  const pasta = pastaDoCelular();
  try { fs.mkdirSync(pasta, { recursive: true }); } catch (e) { req.resume(); return responder(500, { erro: 'Não consegui criar a pasta' }); }
  const base = path.basename(original, path.extname(original));
  let destino = path.join(pasta, original);
  for (let n = 2; fs.existsSync(destino); n++) destino = path.join(pasta, `${base} (${n}).${ext}`);
  const temp = destino + '.parcial';

  let recebido = 0;
  const saida = fs.createWriteStream(temp);
  const cancelar = motivo => { saida.destroy(); fs.rm(temp, { force: true }, () => {}); if (!res.headersSent) responder(400, { erro: motivo }); };
  req.on('data', d => { recebido += d.length; if (recebido > LIMITE_UPLOAD) { req.destroy(); cancelar('Arquivo grande demais'); } });
  req.on('aborted', () => cancelar('Envio interrompido'));
  saida.on('error', () => cancelar('Não consegui gravar o arquivo (disco cheio?)'));
  saida.on('finish', () => {
    if (res.headersSent) return;
    fs.rename(temp, destino, err => {
      if (err) return responder(500, { erro: 'Não consegui gravar o arquivo' });
      if (opWin) opWin.webContents.send('remoto', { acao: 'arquivoRecebido', caminho: destino });
      analytics.enviar('arquivo_do_celular', { tipo: ext, mb: Math.round(recebido / 1048576) });
      responder(200, { ok: true, nome: path.basename(destino) });
    });
  });
  req.pipe(saida);
}

function servirArquivo(res, arquivo) {
  fs.readFile(arquivo, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': arquivo.endsWith('.woff2') ? 'max-age=86400' : 'no-cache',
    });
    res.end(data);
  });
}

function startServer(port, tentativas = 10) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);

    if (url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('retry: 1000\n\n');
      // a tela da projeção (OBS, outra TV) é pública; o estado do roteiro só vai para o celular com a senha
      const chaveEventos = new URL(req.url, 'http://x').searchParams.get('pin');
      res.autorizado = !!chaveEventos && autorizar(req, chaveEventos) === 'ok';
      if (lastSlide) res.write(`event: slide\ndata: ${JSON.stringify(lastSlide)}\n\n`);
      if (estadoRemoto && res.autorizado) res.write(`event: estado\ndata: ${JSON.stringify(estadoRemoto)}\n\n`);
      if (ultimaMidia) res.write(`event: media\ndata: ${JSON.stringify(ultimaMidia)}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (url.startsWith('/img/')) {
      const data = images.get(url.slice(5));
      const m = data && data.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': m[1], 'Cache-Control': 'max-age=31536000' });
      return res.end(Buffer.from(m[2], 'base64'));
    }

    // ---- controle pelo celular ----
    if (url === '/controle' || url === '/controle/') {
      return servirArquivo(res, path.join(__dirname, 'app', 'controle.html'));
    }
    if (url === '/api/estado') {
      const acesso = autorizar(req, new URL(req.url, 'http://x').searchParams.get('pin'));
      if (acesso !== 'ok') return recusar(res, acesso);
      const quem = req.socket.remoteAddress;
      if (!celularesVistos.has(quem)) { celularesVistos.add(quem); analytics.enviar('celular_conectado', { celulares: celularesVistos.size }); }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(JSON.stringify(estadoRemoto || {}));
    }
    // arquivo enviado pelo celular: vai para Documentos\BibleLyrics\Do celular e entra no roteiro
    if (url === '/api/upload' && req.method === 'POST') return receberArquivo(req, res);

    if (url === '/api/cmd' && req.method === 'POST') {
      let corpo = '';
      req.on('data', d => { corpo += d; if (corpo.length > 1e6) req.destroy(); });
      req.on('end', () => {
        let cmd;
        try { cmd = JSON.parse(corpo); } catch (e) { res.writeHead(400); return res.end(); }
        const acesso = autorizar(req, cmd.pin);
        if (acesso !== 'ok') return recusar(res, acesso);
        delete cmd.pin;
        if (cmd.acao === 'arquivoRecebido') { res.writeHead(400); return res.end(); }   // só o próprio PC avisa isso
        if (opWin) opWin.webContents.send('remoto', cmd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      });
      return;
    }

    if (url.startsWith('/media/')) {
      const arquivo = midias.get(url.slice(7));
      if (!arquivo) { res.writeHead(404); return res.end(); }
      return servirMidia(req, res, arquivo);
    }

    if (url.startsWith('/node_modules/@fontsource/')) {
      const base = path.join(__dirname, 'node_modules', '@fontsource');
      const arq = path.normalize(path.join(__dirname, url));
      if (!arq.startsWith(base)) { res.writeHead(403); return res.end(); }
      return servirArquivo(res, arq);
    }

    const nome = url === '/' ? 'saida.html' : url.slice(1);
    if (!PUBLICOS.has(nome)) { res.writeHead(404); return res.end(); }
    servirArquivo(res, path.join(__dirname, 'app', nome));
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE' && tentativas > 0) startServer(port + 1, tentativas - 1);
  });
  server.listen(port, '0.0.0.0', () => { serverPort = port; });
}

// mantém as conexões SSE vivas
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20000);

// ---------------- arquivos .bible abertos pelo Windows (duplo clique) ----------------
const acharBible = argv => (argv || []).find(a => /\.bible$/i.test(a) && fs.existsSync(a)) || null;
let bibleParaAbrir = acharBible(process.argv);
ipcMain.handle('bible:pendente', () => { const c = bibleParaAbrir; bibleParaAbrir = null; return c; });

// ---------------- ciclo de vida ----------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (e, argv) => {
    const c = acharBible(argv);
    if (c) { bibleParaAbrir = c; if (opWin) opWin.webContents.send('bible:abrir'); }
    if (opWin) { if (opWin.isMinimized()) opWin.restore(); opWin.focus(); }
  });

  app.setAppUserModelId('com.samuelmadeira.bibleacfstudio');
  app.whenReady().then(() => {
    biblioteca.iniciar();
    startServer(7777);
    createOperator();
    analytics.iniciar();
    atualizacao.iniciar(() => [opWin, criadorWin]);
    const avisar = () => { if (opWin) opWin.webContents.send('displays-changed', listDisplays()); };
    screen.on('display-added', avisar);
    screen.on('display-removed', (e, d) => {
      if (outWin && d.id === outDisplayId) outWin.destroy();
      avisar();
    });
    screen.on('display-metrics-changed', avisar);
  });

  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => fecharNavegador());
}
