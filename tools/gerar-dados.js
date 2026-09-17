// Gera os arquivos que as telas carregam por <script>:
//   bible_acf.json + fundo.jpg  ->  app/bible_acf.js + app/fundo.js
// Rode com:  node tools/gerar-dados.js
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const destinos = [raiz, path.join(raiz, 'app')];   // raiz = versão web (bible.html)

const json = fs.readFileSync(path.join(raiz, 'bible_acf.json'), 'utf8').replace(/^﻿/, '');
const biblia = JSON.parse(json);
if (biblia.length !== 66) console.warn(`Atenção: ${biblia.length} livros (esperado 66).`);

const jpg = fs.readFileSync(path.join(raiz, 'fundo.jpg')).toString('base64');

for (const dir of destinos) {
  fs.writeFileSync(path.join(dir, 'bible_acf.js'), `window.BIBLIA_ACF=${JSON.stringify(biblia)};\n`);
  fs.writeFileSync(path.join(dir, 'fundo.js'), `window.FUNDO_PADRAO="data:image/jpeg;base64,${jpg}";\n`);
}
console.log(`ok — ${biblia.length} livros, fundo com ${Math.round(jpg.length / 1024)} KB em base64`);
