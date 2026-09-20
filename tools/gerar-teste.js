// Gera o BibleLyrics DEV: mesmo app, em versão portátil, com dados e pasta separados.
// Serve para experimentar coisas novas sem mexer na versão que a igreja usa.
// Use: npm run teste
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));

// parte da configuração oficial e troca só o que precisa (nome, pasta, alvo e saída)
const cfg = {
  ...pkg.build,
  appId: 'com.samuelmadeira.biblelyrics.teste',
  productName: 'BibleLyrics DEV',
  extraMetadata: { name: 'biblelyrics-dev', productName: 'BibleLyrics DEV' },
  directories: { ...pkg.build.directories, output: 'dist-teste' },
  win: { ...pkg.build.win, target: ['portable'] },
  portable: { artifactName: 'BibleLyrics-DEV-${version}-portatil.${ext}' },
  nsis: undefined,
  fileAssociations: undefined,     // não rouba os arquivos .bible da versão oficial
  publish: null,                   // nunca publica nem se atualiza sozinho
};

const arquivo = path.join(raiz, 'build', 'teste.json');
fs.mkdirSync(path.dirname(arquivo), { recursive: true });
fs.writeFileSync(arquivo, JSON.stringify(cfg, null, 2) + '\n');

const builder = path.join(raiz, 'node_modules', 'electron-builder', 'cli.js');
execFileSync(process.execPath, [builder, '--win', '-c', arquivo, '--publish', 'never'], { cwd: raiz, stdio: 'inherit' });

console.log(`\nPronto: dist-teste/BibleLyrics-DEV-${pkg.version}-portatil.exe`);
console.log('É portátil: dá dois cliques e abre, sem instalar.');
