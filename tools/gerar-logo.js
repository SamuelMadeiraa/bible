// Gera app/logo-header.png e site/public/logo.png (logo BibleLyrics, fundo transparente)
// usando o Edge em modo invisível. Uso: node tools/gerar-logo.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const raiz = path.join(__dirname, '..');
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe']
  .find(p => fs.existsSync(p));
if (!edge) throw new Error('Microsoft Edge não encontrado');

const saida = path.join(os.tmpdir(), 'biblelyrics-logo.png');
const perfil = path.join(os.tmpdir(), 'biblelyrics-logo-perfil');
execFileSync(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${perfil}`,
  '--default-background-color=00000000', '--force-device-scale-factor=1', '--window-size=400,64',
  `--screenshot=${saida}`, 'file:///' + path.join(__dirname, 'logo.html').replace(/\\/g, '/')], { stdio: 'ignore' });
for (const destino of ['app/logo-header.png', 'site/public/logo.png']) fs.copyFileSync(saida, path.join(raiz, destino));
console.log('logo gerado:', fs.statSync(saida).size, 'bytes');
