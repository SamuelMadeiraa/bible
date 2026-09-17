const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

let opWin = null;
let outWin = null;
let outDisplayId = null;
let lastSlide = null;
const images = new Map();      // id -> dataURL das imagens de fundo
const clients = new Set();     // conexões SSE (OBS / navegador / outro PC)
let serverPort = null;

const PRELOAD = path.join(__dirname, 'preload.js');
const ICON = path.join(__dirname, 'app', 'icon.ico');

// ---------------- janelas ----------------
function createOperator() {
  opWin = new BrowserWindow({
    width: 1600, height: 950, minWidth: 1100, minHeight: 680,
    backgroundColor: '#0e0e10',
    title: 'Bible ACF Studio — Operador',
    autoHideMenuBar: true,
    show: false,
    icon: ICON,
    webPreferences: { preload: PRELOAD, backgroundThrottling: false },
  });
  opWin.once('ready-to-show', () => { opWin.maximize(); opWin.show(); });
  opWin.loadFile(path.join(__dirname, 'app', 'operador.html'));
  opWin.on('closed', () => {
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

function openOutput(displayId) {
  const primary = screen.getPrimaryDisplay();
  const all = screen.getAllDisplays();
  const d = all.find(x => x.id === displayId)
    || all.find(x => x.id !== primary.id)
    || primary;
  const external = d.id !== primary.id;

  if (outWin) outWin.destroy();
  outDisplayId = d.id;

  const b = d.bounds;
  outWin = new BrowserWindow({
    x: external ? b.x : b.x + Math.round(b.width * 0.45),
    y: external ? b.y : b.y + Math.round(b.height * 0.45),
    width: external ? b.width : 960,
    height: external ? b.height : 540,
    frame: !external,
    fullscreen: external,
    backgroundColor: '#000000',
    title: 'Bible ACF Studio — Projeção',
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
    if (opWin) opWin.focus();
    notifyOutputState();
  });
  outWin.on('resize', notifyOutputState);
  outWin.on('closed', () => { outWin = null; outDisplayId = null; notifyOutputState(); });
  return true;
}

// ---------------- IPC ----------------
ipcMain.handle('displays', () => listDisplays());
ipcMain.handle('output:open', (e, id) => openOutput(id));
ipcMain.handle('output:close', () => { if (outWin) outWin.destroy(); return true; });
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

ipcMain.handle('server:info', () => ({ port: serverPort, urls: lanUrls() }));
ipcMain.on('open-external', (e, url) => {
  if (/^http:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+):\d+\/?$/.test(url)) shell.openExternal(url);
});

// ---------------- servidor da rede (OBS / outro PC / TV) ----------------
function lanUrls() {
  const urls = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) urls.push(`http://${n.address}:${serverPort}/`);
    }
  }
  return [`http://localhost:${serverPort}/`, ...urls];
}

function broadcast(slide) {
  const msg = `data: ${JSON.stringify(slide)}\n\n`;
  for (const res of clients) res.write(msg);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const PUBLICOS = new Set(['saida.html', 'saida.js', 'engine.js', 'fonts.css']);

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
      if (lastSlide) res.write(`data: ${JSON.stringify(lastSlide)}\n\n`);
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

// ---------------- ciclo de vida ----------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (opWin) { if (opWin.isMinimized()) opWin.restore(); opWin.focus(); } });

  app.setAppUserModelId('com.samuelmadeira.bibleacfstudio');
  app.whenReady().then(() => {
    startServer(7777);
    createOperator();
    const avisar = () => { if (opWin) opWin.webContents.send('displays-changed', listDisplays()); };
    screen.on('display-added', avisar);
    screen.on('display-removed', (e, d) => {
      if (outWin && d.id === outDisplayId) outWin.destroy();
      avisar();
    });
    screen.on('display-metrics-changed', avisar);
  });

  app.on('window-all-closed', () => app.quit());
}
