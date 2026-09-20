// Pasta do BibleLyrics e arquivos .bible (presets e backups).
// A pasta (escolhida pelo operador) guarda tudo: Mídias, Presets, Backups, Vídeos de louvor e Do celular.
// Um .bible é um ZIP com manifest.json (o que é), dados.json (o conteúdo) e, se pedido, as mídias
// em midias/ — assim o preset ou o backup funciona em outro computador.
const { app, dialog, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { once } = require('events');
const { Zip, ZipPassThrough, Unzip, strToU8, strFromU8 } = require('fflate');

const SUBPASTAS = { midias: 'Mídias', presets: 'Presets', backups: 'Backups', videos: 'Vídeos de louvor', celular: 'Do celular' };
const MANTER_BACKUPS_AUTO = 10;

// ---------- configuração ----------
const arqConfig = () => path.join(app.getPath('userData'), 'biblioteca.json');
let cfg = null;
function config() {
  if (cfg) return cfg;
  const nomePasta = /dev/i.test(app.getName()) ? 'BibleLyrics TESTE' : 'BibleLyrics';
  cfg = { pasta: path.join(app.getPath('documents'), nomePasta), copiarMidias: true, backupAuto: true, ultimoBackup: 0 };
  try { Object.assign(cfg, JSON.parse(fs.readFileSync(arqConfig(), 'utf8'))); } catch (e) {}
  return cfg;
}
function salvarConfig() {
  try { fs.mkdirSync(path.dirname(arqConfig()), { recursive: true }); fs.writeFileSync(arqConfig(), JSON.stringify(cfg, null, 1)); } catch (e) {}
}
// caminho da pasta base ou de uma subpasta (criada na hora, se preciso)
function pasta(qual) {
  const p = qual && SUBPASTAS[qual] ? path.join(config().pasta, SUBPASTAS[qual]) : config().pasta;
  try { fs.mkdirSync(p, { recursive: true }); } catch (e) {}
  return p;
}
const dentroDaPasta = c => { const r = path.relative(config().pasta, c); return !!r && !r.startsWith('..') && !path.isAbsolute(r); };
const nomeLimpo = n => String(n || 'BibleLyrics').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'BibleLyrics';
function nomeLivre(dir, nome) {
  const ext = path.extname(nome), base = path.basename(nome, ext);
  let destino = path.join(dir, nome);
  for (let n = 2; fs.existsSync(destino); n++) destino = path.join(dir, `${base} (${n})${ext}`);
  return destino;
}
function mesmoArquivo(a, b) {
  try { return fs.statSync(a).size === fs.statSync(b).size; } catch (e) { return false; }
}

// ---------- mídias: uma cópia fica guardada na pasta ----------
async function guardarMidia(caminho) {
  if (!config().copiarMidias || !caminho || dentroDaPasta(caminho)) return caminho;
  try {
    const st = await fs.promises.stat(caminho);
    if (!st.isFile() || st.size === 0) return caminho;          // vazio ou sumiu: o player explica o motivo
    const dir = pasta('midias');
    const mesmoNome = path.join(dir, path.basename(caminho));
    if (mesmoArquivo(caminho, mesmoNome)) return mesmoNome;     // já copiado antes
    const destino = nomeLivre(dir, path.basename(caminho));
    await fs.promises.copyFile(caminho, destino);
    return destino;
  } catch (e) { return caminho; }
}

// ---------- criar um .bible ----------
async function exportar({ tipo, nome, dados, midias = [], incluirMidias = false, auto = false }, janela) {
  const data = new Date().toLocaleDateString('sv');
  let destino;
  // o automático do dia tem nome fixo (um por dia); os outros (ex.: "Antes de restaurar") nunca sobrescrevem
  const doDia = auto && nome === 'Backup automático';
  if (doDia) destino = path.join(pasta('backups'), `Backup automático ${data}.bible`);
  else if (auto) destino = nomeLivre(pasta('backups'), `${nomeLimpo(nome)} ${data}.bible`);
  else {
    const padrao = path.join(pasta(tipo === 'preset' ? 'presets' : 'backups'), nomeLimpo(nome) + '.bible');
    const r = await dialog.showSaveDialog(janela, {
      title: tipo === 'preset' ? 'Salvar o preset' : 'Salvar o backup', defaultPath: padrao,
      filters: [{ name: 'Arquivo do BibleLyrics', extensions: ['bible'] }],
    });
    if (r.canceled || !r.filePath) return null;
    destino = r.filePath;
  }

  // só entram mídias que existem; cada uma ganha um nome único dentro do arquivo
  const lista = [];
  if (incluirMidias) {
    const vistos = new Set();
    for (const c of midias) {
      if (!c || vistos.has(c)) continue;
      vistos.add(c);
      try { if ((await fs.promises.stat(c)).isFile()) lista.push(c); } catch (e) {}
    }
  }
  const mapa = {};
  lista.forEach((c, i) => { mapa[c] = `midias/${i + 1}-${path.basename(c)}`; });
  const manifest = { app: 'BibleLyrics', formato: 1, tipo, nome, criado: Date.now(), versao: app.getVersion(), midias: mapa };

  const temp = destino + '.parcial';
  const saida = fs.createWriteStream(temp);
  let erro = null;
  const zip = new Zip((e, pedaco, final) => {
    if (e) { erro = e; return; }
    saida.write(pedaco);
    if (final) saida.end();
  });
  const texto = (nomeZip, conteudo) => { const f = new ZipPassThrough(nomeZip); zip.add(f); f.push(strToU8(conteudo), true); };
  texto('manifest.json', JSON.stringify(manifest, null, 1));
  texto('dados.json', JSON.stringify(dados));
  let bytes = 0;
  for (const c of lista) {
    const f = new ZipPassThrough(mapa[c]);
    zip.add(f);
    for await (const pedaco of fs.createReadStream(c, { highWaterMark: 1 << 20 })) {
      f.push(new Uint8Array(pedaco.buffer, pedaco.byteOffset, pedaco.byteLength));
      bytes += pedaco.byteLength;
      if (saida.writableNeedDrain) await once(saida, 'drain');
      if (erro) throw erro;
    }
    f.push(new Uint8Array(0), true);
  }
  zip.end();
  await once(saida, 'close');
  if (erro) { fs.rm(temp, { force: true }, () => {}); throw erro; }
  await fs.promises.rename(temp, destino);

  if (auto) {
    // backups automáticos: guarda só os mais recentes
    const dir = pasta('backups');
    const autos = fs.readdirSync(dir).filter(n => /^Backup automático .*\.bible$/.test(n)).sort().reverse();
    autos.slice(MANTER_BACKUPS_AUTO).forEach(n => fs.rm(path.join(dir, n), { force: true }, () => {}));
    if (doDia) { cfg.ultimoBackup = Date.now(); salvarConfig(); }
  }
  return { caminho: destino, midias: lista.length, bytes: (await fs.promises.stat(destino)).size, mbMidias: Math.round(bytes / 1048576) };
}

// ---------- abrir um .bible (ou um preset .json antigo) ----------
async function ler(caminho, janela) {
  if (!caminho) {
    const r = await dialog.showOpenDialog(janela, {
      title: 'Abrir preset ou backup', properties: ['openFile'],
      filters: [{ name: 'Arquivo do BibleLyrics', extensions: ['bible', 'json'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    caminho = r.filePaths[0];
  }
  // presets exportados pelas versões antigas (.json)
  if (/\.json$/i.test(caminho)) {
    const d = JSON.parse(await fs.promises.readFile(caminho, 'utf8'));
    const itens = Array.isArray(d) ? d : d.itens || d.eventos;
    if (!Array.isArray(itens)) throw new Error('Arquivo inválido');
    const nome = d.nome || path.basename(caminho, '.json');
    return { manifest: { tipo: 'preset', nome }, dados: { preset: { nome, itens } }, mapa: {}, caminho };
  }

  const textos = {};
  const escritas = [];
  const mapa = {};
  let manifest = null;
  let destinoMidias = null;
  let erro = null;
  const unzip = new Unzip();
  unzip.onfile = f => {
    if (f.name === 'manifest.json' || f.name === 'dados.json') {
      const partes = [];
      f.ondata = (e, pedaco, final) => {
        if (e) { erro = e; return; }
        partes.push(pedaco);
        if (final) {
          const tudo = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
          let pos = 0; partes.forEach(p => { tudo.set(p, pos); pos += p.length; });
          textos[f.name] = strFromU8(tudo);
          if (f.name === 'manifest.json') manifest = JSON.parse(textos[f.name]);
        }
      };
      return f.start();
    }
    if (!f.name.startsWith('midias/')) return;               // nada fora do combinado é gravado
    if (!destinoMidias) destinoMidias = path.join(pasta('midias'), nomeLimpo(manifest && manifest.nome));
    fs.mkdirSync(destinoMidias, { recursive: true });
    const original = Object.keys((manifest && manifest.midias) || {}).find(k => manifest.midias[k] === f.name);
    const nome = path.basename(f.name).replace(/^\d+-/, '');  // só o nome: nada de pastas vindas do arquivo
    const alvo = path.join(destinoMidias, nome);
    if (original) mapa[original] = alvo;
    const w = fs.createWriteStream(alvo + '.parcial');
    escritas.push(once(w, 'close').then(() => fs.promises.rename(alvo + '.parcial', alvo)));
    f.ondata = (e, pedaco, final) => {
      if (e) { erro = e; return; }
      w.write(pedaco);
      if (final) w.end();
    };
    f.start();
  };
  for await (const pedaco of fs.createReadStream(caminho, { highWaterMark: 1 << 20 })) {
    unzip.push(new Uint8Array(pedaco.buffer, pedaco.byteOffset, pedaco.byteLength));
    if (erro) throw erro;
  }
  unzip.push(new Uint8Array(0), true);
  await Promise.all(escritas);
  if (erro) throw erro;
  if (!manifest || manifest.app !== 'BibleLyrics' || !textos['dados.json']) throw new Error('Este arquivo não é um .bible do BibleLyrics');
  return { manifest, dados: JSON.parse(textos['dados.json']), mapa, caminho };
}

// ---------- ligações com as telas ----------
function iniciar() {
  const janelaDe = e => BrowserWindow.fromWebContents(e.sender);
  const info = () => ({ ...config(), subpastas: SUBPASTAS });
  ipcMain.handle('pasta:info', info);
  ipcMain.handle('pasta:escolher', async e => {
    const r = await dialog.showOpenDialog(janelaDe(e), {
      title: 'Escolher a pasta do BibleLyrics', defaultPath: config().pasta, properties: ['openDirectory', 'createDirectory'],
    });
    if (!r.canceled && r.filePaths[0]) {
      // escolher uma pasta chamada "BibleLyrics" usa ela; qualquer outra ganha uma "BibleLyrics" dentro
      const escolhida = r.filePaths[0];
      config().pasta = /bible ?lyrics$/i.test(path.basename(escolhida)) ? escolhida : path.join(escolhida, 'BibleLyrics');
      salvarConfig();
      pasta();
    }
    return info();
  });
  ipcMain.handle('pasta:config', (e, mudancas) => {
    for (const k of ['copiarMidias', 'backupAuto']) if (k in (mudancas || {})) config()[k] = !!mudancas[k];
    salvarConfig();
    return info();
  });
  ipcMain.handle('midia:guardar', (e, caminhos) => Promise.all((caminhos || []).map(guardarMidia)));
  ipcMain.handle('bible:exportar', (e, opcoes) => exportar(opcoes || {}, janelaDe(e)));
  ipcMain.handle('bible:ler', (e, caminho) => ler(caminho, janelaDe(e)));
}

module.exports = { iniciar, pasta, config };
