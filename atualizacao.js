// Atualização automática pelos Releases do GitHub (electron-updater).
// Baixa a versão nova em segundo plano e instala quando o app é fechado — nunca no meio do culto.
// A versão portátil não se atualiza sozinha (é só um .exe solto).
const { app, ipcMain } = require('electron');

let atualizador = null;
let pronta = null;          // versão já baixada, esperando o app fechar
let baixando = null;

function iniciar(janelas) {
  ipcMain.handle('atualizacao:estado', () => ({ pronta, baixando, ativa: !!atualizador }));
  ipcMain.on('atualizacao:instalar', () => { if (atualizador && pronta) atualizador.quitAndInstall(false, true); });

  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR) return;
  try { atualizador = require('electron-updater').autoUpdater; } catch (e) { return; }
  atualizador.autoDownload = true;
  atualizador.autoInstallOnAppQuit = true;
  atualizador.logger = null;

  const avisar = () => janelas().forEach(w => { if (w && !w.isDestroyed()) w.webContents.send('atualizacao', { pronta, baixando }); });
  atualizador.on('update-available', i => { baixando = i.version; avisar(); });
  atualizador.on('update-downloaded', i => { pronta = i.version; baixando = null; avisar(); });
  atualizador.on('error', () => { baixando = null; });

  const verificar = () => atualizador.checkForUpdates().catch(() => {});
  setTimeout(verificar, 20000);
  setInterval(verificar, 6 * 3600 * 1000).unref();
}

module.exports = { iniciar };
