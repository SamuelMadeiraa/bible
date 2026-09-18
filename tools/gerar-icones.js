// Gera app/icones.js (e a cópia do app do celular no site) com os ícones Lucide usados no app.
// Os desenhos vêm do lucide-react instalado no site: node tools/gerar-icones.js
const fs = require('fs');
const path = require('path');

const USADOS = [
  'monitor', 'monitor-off', 'folder-open', 'layout-dashboard', 'chevron-down', 'chevron-up', 'chevron-left',
  'chevron-right', 'image-down', 'smartphone', 'settings', 'scissors', 'plus', 'skip-back', 'skip-forward',
  'play', 'pause', 'square', 'volume-2', 'rotate-ccw', 'book-open', 'message-square-text', 'clapperboard',
  'image', 'music', 'radio-tower', 'wallpaper', 'eye-off', 'panel-top', 'tv-minimal', 'save', 'undo-2',
  'upload', 'download', 'key-round', 'wifi', 'refresh-cw', 'search', 'list-video', 'check', 'pencil',
  'camera', 'keyboard', 'ellipsis-vertical', 'share', 'x', 'square-stop',
  // abas dos painéis
  'eye', 'radio', 'sliders-horizontal', 'highlighter', 'palette',
];

const PASTA = path.join(__dirname, '..', 'site', 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');
const attrs = o => Object.entries(o).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ');

const icones = {};
for (const nome of USADOS) {
  const src = fs.readFileSync(path.join(PASTA, nome + '.mjs'), 'utf8');
  const dados = src.match(/const __iconData = (\{[\s\S]*?\n\});/);
  if (!dados) throw new Error('não entendi o ícone ' + nome);
  const lista = Function('return ' + dados[1])().node;
  icones[nome] = lista.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('');
}

const saida = `// Ícones Lucide (https://lucide.dev, licença ISC). Arquivo gerado por tools/gerar-icones.js — não edite à mão.
// Uso: <i data-i="play"></i> no HTML (vira SVG sozinho) ou icone('play') no JS.
const ICONES = ${JSON.stringify(icones, null, 0).replace(/","/g, '",\n  "').replace(/^\{/, '{\n  ').replace(/\}$/, '\n}')};

function icone(nome, classe = '') {
  return '<svg class="ico ' + classe + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONES[nome] || '') + '</svg>';
}

// põe só o ícone num botão (ex.: tocar/pausar), sem refazer o SVG se nada mudou
function porIcone(el, nome) {
  if (!el || el.dataset.ico === nome) return;
  el.dataset.ico = nome;
  el.innerHTML = icone(nome, 'ico-so');
}

// troca cada <i data-i="nome"> pelo SVG; o espaço entre ícone e texto depende de onde o texto está
function aplicarIcones(raiz) {
  const tem = n => n && (n.nodeType === 1 || n.textContent.trim());
  (raiz || document).querySelectorAll('i[data-i]').forEach(el => {
    const lado = tem(el.nextSibling) ? 'ico-antes' : tem(el.previousSibling) ? 'ico-depois' : 'ico-so';
    const t = document.createElement('template');
    t.innerHTML = icone(el.dataset.i, lado + (el.className ? ' ' + el.className : ''));
    el.replaceWith(t.content.firstChild);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  aplicarIcones();
  new MutationObserver(ms => {
    for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) aplicarIcones(n.parentNode || n);
  }).observe(document.body, { childList: true, subtree: true });
});
`;

for (const destino of ['app/icones.js', 'site/public/controle/icones.js']) {
  fs.writeFileSync(path.join(__dirname, '..', destino), saida);
  console.log('gerado', destino, Object.keys(icones).length, 'ícones');
}
