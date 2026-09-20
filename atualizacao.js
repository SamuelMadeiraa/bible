// Atualização automática pelos Releases do GitHub (electron-updater).
// Baixa a versão nova em segundo plano e instala quando o app é fechado — nunca no meio do culto.
// A tela Início mostra em que pé está: procurando, baixando, pronta ou em dia.
// A versão portátil não se atualiza sozinha (é só um .exe solto).
const { app, ipcMain } = require('electron');

let atualizador = null;
// fase: 'desligada' | 'procurando' | 'baixando' | 'pronta' | 'em-dia' | 'erro'
let estado = { fase: 'desligada', versao: null, porcento: 0, pronta: null, baixando: null, ativa: false };

function iniciar(janelas) {
  const avisar = () => janelas().forEach(w => { if (w && !w.isDestroyed()) w.webContents.send('atualizacao', { ...estado }); });

  ipcMain.handle('atualizacao:estado', () => ({ ...estado }));
  ipcMain.on('atualizacao:instalar', () => { if (atualizador && estado.pronta) atualizador.quitAndInstall(false, true); });
  ipcMain.handle('atualizacao:verificar', async () => {
    if (!atualizador) return { ...estado };
    estado = { ...estado, fase: 'procurando' };
    avisar();
    try { await atualizador.checkForUpdates(); } catch (e) { estado = { ...estado, fase: 'erro' }; avisar(); }
    return { ...estado };
  });

  // a versão de teste (BibleLyrics DEV) nunca se atualiza sozinha
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR || /dev/i.test(app.getName())) return;
  try { atualizador = require('electron-updater').autoUpdater; } catch (e) { return; }
  atualizador.autoDownload = true;
  atualizador.autoInstallOnAppQuit = true;
  atualizador.logger = null;
  estado.ativa = true;

  atualizador.on('checking-for-update', () => { estado = { ...estado, fase: 'procurando' }; avisar(); });
  atualizador.on('update-available', i => { estado = { ...estado, fase: 'baixando', versao: i.version, baixando: i.version, porcento: 0 }; avisar(); });
  atualizador.on('update-not-available', () => { estado = { ...estado, fase: 'em-dia', baixando: null, porcento: 0 }; avisar(); });
  atualizador.on('download-progress', p => { estado = { ...estado, fase: 'baixando', porcento: Math.round(p.percent || 0) }; avisar(); });
  atualizador.on('update-downloaded', i => { estado = { ...estado, fase: 'pronta', versao: i.version, pronta: i.version, baixando: null, porcento: 100 }; avisar(); });
  atualizador.on('error', () => { estado = { ...estado, fase: 'erro', baixando: null }; avisar(); });

  const verificar = () => atualizador.checkForUpdates().catch(() => {});
  setTimeout(verificar, 20000);
  setInterval(verificar, 6 * 3600 * 1000).unref();
}

module.exports = { iniciar };
