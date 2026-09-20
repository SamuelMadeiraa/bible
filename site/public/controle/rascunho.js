// Montar o roteiro no celular sem estar conectado ao computador.
// A lista fica guardada no próprio celular; quando você abre o controle de um PC,
// ela vai junto e vira um preset novo lá.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CHAVE = 'bibleLyricsRascunho';

  let R = { nome: '', itens: [] };
  try { Object.assign(R, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) {}
  R.itens = R.itens || [];
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(R)); } catch (e) {} };

  const BIBLIA = window.BIBLIA_ACF || [];
  const livro = i => BIBLIA[i] || null;
  const refDe = ev => {
    const l = livro(ev.b);
    if (!l) return '—';
    const v = ev.v1 === ev.v2 ? ev.v1 + 1 : `${ev.v1 + 1}-${ev.v2 + 1}`;
    return `${l.name} ${ev.c + 1}:${v}`;
  };
  const rotulo = ev => (ev.tipo === 'versiculo' ? refDe(ev)
    : ev.tipo === 'texto' ? (ev.titulo || 'Aviso')
    : ev.tipo === 'preta' ? 'Tela preta' : 'Só o fundo');

  // ---------- escolher a passagem ----------
  let b = 42, c = 2, v1 = 15, v2 = 15;
  function montarLivros() {
    if (!BIBLIA.length) return;
    $('rLivro').innerHTML = BIBLIA.map((l, i) => `<option value="${i}">${esc(l.name)}</option>`).join('');
    $('rLivro').value = b;
    montarCaps();
  }
  function montarCaps() {
    const l = livro(b);
    if (!l) return;
    c = Math.min(c, l.chapters.length - 1);
    $('rCap').innerHTML = l.chapters.map((_, i) => `<option value="${i}">${i + 1}</option>`).join('');
    $('rCap').value = c;
    montarVersos();
  }
  function montarVersos() {
    const cap = livro(b).chapters[c];
    const op = cap.map((_, i) => `<option value="${i}">${i + 1}</option>`).join('');
    v1 = Math.min(v1, cap.length - 1);
    v2 = Math.max(v1, Math.min(v2, cap.length - 1));
    $('rV1').innerHTML = op; $('rV1').value = v1;
    $('rV2').innerHTML = op; $('rV2').value = v2;
    previa();
  }
  function previa() {
    const cap = livro(b).chapters[c];
    const t = cap.slice(v1, v2 + 1).join(' ');
    $('rPrevia').textContent = t.length > 220 ? t.slice(0, 220) + '…' : t;
    $('rRef').textContent = refDe({ b, c, v1, v2 });
  }

  // ---------- lista ----------
  function montarLista() {
    const box = $('rLista');
    box.innerHTML = R.itens.map((ev, i) => `
      <div class="r-item">
        <span class="r-n">${i + 1}</span>
        <span class="r-txt">${esc(rotulo(ev))}${ev.tipo === 'texto' ? `<small>${esc((ev.texto || '').slice(0, 60))}</small>` : ''}</span>
        <button data-a="sobe" data-i="${i}" aria-label="Subir">▲</button>
        <button data-a="desce" data-i="${i}" aria-label="Descer">▼</button>
        <button data-a="tira" data-i="${i}" aria-label="Tirar">×</button>
      </div>`).join('') || '<p class="dica">Nada aqui ainda. Escolha um versículo acima e toque em <b>Pôr na lista</b>.</p>';
    box.querySelectorAll('button').forEach(bt => bt.onclick = () => {
      const i = +bt.dataset.i;
      if (bt.dataset.a === 'tira') R.itens.splice(i, 1);
      else if (bt.dataset.a === 'sobe' && i > 0) R.itens.splice(i - 1, 0, R.itens.splice(i, 1)[0]);
      else if (bt.dataset.a === 'desce' && i < R.itens.length - 1) R.itens.splice(i + 1, 0, R.itens.splice(i, 1)[0]);
      salvar(); montarLista(); atualizarResumo();
    });
    $('rQuantos').textContent = R.itens.length;
    $('rLimpar').hidden = !R.itens.length;
  }
  function atualizarResumo() {
    const aviso = $('rascunhoAviso');
    if (!aviso) return;
    aviso.hidden = !R.itens.length;
    if (R.itens.length) $('rascunhoQtd').textContent = R.itens.length;
  }
  const por = ev => { R.itens.push(ev); salvar(); montarLista(); atualizarResumo(); };

  // ---------- botões ----------
  function ligar() {
    if (!BIBLIA.length) { $('telaRascunho').hidden = true; return; }
    montarLivros();
    montarLista();
    atualizarResumo();
    $('rNome').value = R.nome || '';
    $('rNome').addEventListener('input', e => { R.nome = e.target.value.slice(0, 60); salvar(); });
    $('rLivro').onchange = e => { b = +e.target.value; c = 0; v1 = v2 = 0; montarCaps(); };
    $('rCap').onchange = e => { c = +e.target.value; v1 = v2 = 0; montarVersos(); };
    $('rV1').onchange = e => { v1 = +e.target.value; if (v2 < v1) v2 = v1; montarVersos(); };
    $('rV2').onchange = e => { v2 = Math.max(v1, +e.target.value); previa(); };
    $('rPor').onclick = () => por({ tipo: 'versiculo', b, c, v1, v2 });
    $('rPreta').onclick = () => por({ tipo: 'preta' });
    $('rFundo').onclick = () => por({ tipo: 'fundo' });
    $('rAviso').onclick = () => {
      const texto = $('rAvisoTexto').value.trim();
      if (!texto) return;
      por({ tipo: 'texto', titulo: $('rAvisoTitulo').value.trim().slice(0, 80), texto: texto.slice(0, 600) });
      $('rAvisoTitulo').value = ''; $('rAvisoTexto').value = '';
    };
    $('rLimpar').onclick = () => { if (confirm('Apagar a lista montada no celular?')) { R.itens = []; salvar(); montarLista(); atualizarResumo(); } };
    $('rAbrir').onclick = () => { $('telaRascunho').hidden = false; $('rAbrir').hidden = true; $('telaRascunho').scrollIntoView({ behavior: 'smooth' }); };
  }

  // o app leva a lista para o computador ao conectar (vai no endereço, depois do #)
  window.Rascunho = {
    temItens: () => R.itens.length,
    paraLink() {
      if (!R.itens.length) return '';
      const dados = { nome: R.nome || '', itens: R.itens };
      try { return '#rascunho=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(dados))))); } catch (e) { return ''; }
    },
  };

  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', ligar) : ligar();
})();
