// Produtividade: menu do botão direito (versículos e roteiro) e arrastar para o roteiro
// (vídeos, fotos e áudios do Windows, e versículos da Bíblia, da busca e do histórico).
(function () {
  // ---------- menu do botão direito ----------
  const menu = $('menuContexto');

  function fecharMenu() { menu.classList.remove('on'); }
  function abrirMenu(x, y, titulo, itens) {
    document.querySelectorAll('.menu.on').forEach(m => m.classList.remove('on'));
    menu.innerHTML = '';
    if (titulo) {
      const t = document.createElement('div');
      t.className = 'menu-tit';
      t.textContent = titulo;
      menu.appendChild(t);
    }
    itens.filter(Boolean).forEach(it => {
      if (it === '-') { if (menu.lastElementChild?.tagName !== 'HR') menu.appendChild(document.createElement('hr')); return; }
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = icone(it.icone) + `<span>${esc(it.texto)}</span>` + (it.atalho ? `<kbd>${it.atalho}</kbd>` : '');
      if (it.perigo) b.classList.add('perigo');
      if (it.marcado) b.classList.add('marcado');
      b.onclick = () => { fecharMenu(); it.acao(); };
      menu.appendChild(b);
    });
    if (menu.lastElementChild?.tagName === 'HR') menu.lastElementChild.remove();
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('on');
    const r = menu.getBoundingClientRect();              // não deixa sair da janela
    menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  }
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (menu.classList.contains('on')) { e.stopPropagation(); fecharMenu(); }
    else if (versiculosMarcados()) { e.stopPropagation(); limparMarcados(); }
  }, true);
  addEventListener('blur', fecharMenu);
  document.addEventListener('scroll', fecharMenu, true);

  // ---------- versículos ----------
  // passagem representada por um elemento da Bíblia, da busca ou do histórico
  function passagemDe(el) {
    const v = el.closest('#verses div[data-i]');
    if (v) {
      const i = +v.dataset.i;
      // clicou dentro do intervalo selecionado (Shift+clique): usa o intervalo todo
      if (i >= P.v1 && i <= P.v2) return { b: P.b, c: P.c, v1: P.v1, v2: P.v2 };
      return { b: P.b, c: P.c, v1: i, v2: i };
    }
    const r = el.closest('#results div[data-pos], #historico div[data-pos]');
    if (r) {
      const [b, c, v1, v2] = r.dataset.pos.split(',').map(Number);
      return { b, c, v1, v2 };
    }
    return null;
  }
  const textoDe = p => BIBLIA[p.b].chapters[p.c].slice(p.v1, p.v2 + 1).join(' ');
  // se a passagem é a que está na prévia, leva as palavras destacadas junto
  const destaquesDe = p => (p.b === P.b && p.c === P.c && p.v1 === P.v1 && p.v2 === P.v2 ? destaquesDaPrevia() : undefined);
  // vários versículos marcados com Ctrl/Shift+clique, se o clique caiu num deles
  function marcadosDe(el) {
    const v = el.closest('#verses div[data-i]');
    const lista = v && versiculosMarcados();
    return lista && v.classList.contains('marc') ? lista : null;
  }
  const refsDe = lista => lista.map(refDe).join('; ');

  // onde entra "logo depois do próximo": depois do evento na prévia (ou do que está no ar)
  const depoisDoProximo = () => (R.prevIdx >= 0 ? R.prevIdx + 1 : R.liveIdx >= 0 ? R.liveIdx + 1 : MP.itens.length);

  // p: uma passagem ou uma lista delas (versículos marcados); cada trecho seguido vira um evento
  function versiculoNoRoteiro(p, pos, versoAVerso) {
    const trechos = Array.isArray(p) ? p : [p];
    const lista = trechos.flatMap(t => versoAVerso
      ? Array.from({ length: t.v2 - t.v1 + 1 }, (_, k) => ({ tipo: 'versiculo', b: t.b, c: t.c, v1: t.v1 + k, v2: t.v1 + k }))
      : [{ tipo: 'versiculo', b: t.b, c: t.c, v1: t.v1, v2: t.v2, destaques: destaquesDe(t) }]);
    inserirEventos(lista, pos);
    toast(lista.length > 1 ? `${lista.length} eventos no roteiro` : 'No roteiro: ' + refDe(trechos[0]));
  }

  function menuMarcados(e, lista) {
    const n = lista.length, refs = refsDe(lista);
    const naPlaylist = pos => () => { adicionarVersiculos(lista, pos); limparMarcados(); };
    abrirMenu(e.clientX, e.clientY, `${n} versículos: ${refs.length > 48 ? refs.slice(0, 46) + '…' : refs}`, [
      { icone: 'list-plus', texto: `Adicionar à playlist (${n} versículos)`, acao: naPlaylist() },
      MP.itens.length && { icone: 'corner-down-right', texto: 'Adicionar logo depois do próximo', acao: naPlaylist(depoisDoProximo()) },
      '-',
      { icone: 'copy', texto: 'Copiar texto com as referências', acao: () => navigator.clipboard.writeText(lista.map(p => `${textoDe(p)}\n${refDe(p)}`).join('\n\n')).then(() => toast('Texto copiado')) },
      { icone: 'x', texto: 'Desmarcar', acao: limparMarcados },
    ]);
  }

  function menuVersiculo(e, p) {
    const intervalo = p.v2 > p.v1;
    abrirMenu(e.clientX, e.clientY, refDe(p), [
      { icone: 'eye', texto: 'Mostrar na prévia', acao: () => irPara(p.b, p.c, p.v1, p.v2) },
      { icone: 'zap', texto: 'Colocar no ar agora', acao: () => { irPara(p.b, p.c, p.v1, p.v2); enviarAoVivo(); } },
      '-',
      { icone: 'list-plus', texto: 'Adicionar ao roteiro', acao: () => versiculoNoRoteiro(p) },
      MP.itens.length && { icone: 'corner-down-right', texto: 'Adicionar logo depois do próximo', acao: () => versiculoNoRoteiro(p, depoisDoProximo()) },
      intervalo && { icone: 'list-ordered', texto: `Adicionar verso a verso (${p.v2 - p.v1 + 1} eventos)`, acao: () => versiculoNoRoteiro(p, undefined, true) },
      '-',
      { icone: 'copy', texto: 'Copiar texto com a referência', acao: () => navigator.clipboard.writeText(`${textoDe(p)}\n${refDe(p)}`).then(() => toast('Texto copiado')) },
    ]);
  }

  // ---------- eventos do roteiro ----------
  function menuEvento(e, i) {
    const ev = MP.itens[i];
    if (!ev) return;
    const r = rotulo(ev);
    const prog = window.Programacao;
    abrirMenu(e.clientX, e.clientY, r.titulo, [
      { icone: 'eye', texto: 'Colocar na prévia', acao: () => selecionarPrevia(i) },
      { icone: 'zap', texto: 'Colocar no ar agora', acao: () => { selecionarPrevia(i); cortar(); } },
      ev.tipo === 'texto' && { icone: 'pencil', texto: 'Editar aviso', acao: () => abrirEditorTexto(i) },
      ev.tipo === 'web' && { icone: 'pencil', texto: 'Editar transmissão', acao: () => abrirEditorWeb(i) },
      { icone: 'copy-plus', texto: 'Duplicar', acao: () => { inserirEventos([{ ...limparEvento(ev), id: novoId() }], i + 1); toast('Evento duplicado'); } },
      '-',
      prog && ev.tipo !== 'web' && { icone: 'alarm-clock', texto: prog.noPreCulto(ev.id) ? 'Tirar do pré-culto' : 'Incluir no pré-culto', marcado: prog.noPreCulto(ev.id), acao: () => prog.alternarItem(ev.id) },
      prog && { icone: 'calendar-clock', texto: prog.ehAbertura(ev.id) ? 'Não usar como abertura do culto' : 'Usar como abertura do culto', marcado: prog.ehAbertura(ev.id), acao: () => prog.definirAbertura(ev.id) },
      '-',
      { icone: 'trash-2', texto: 'Remover do roteiro', perigo: true, acao: () => removerEvento(i) },
    ]);
  }

  document.addEventListener('contextmenu', e => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    if (alvo.closest('input, textarea')) return;           // campos de texto: menu normal (copiar/colar)
    const marcados = marcadosDe(alvo);
    if (marcados) { e.preventDefault(); return menuMarcados(e, marcados); }
    const p = passagemDe(alvo);
    if (p) { e.preventDefault(); return menuVersiculo(e, p); }
    const item = alvo.closest('#playlist .mi-item');
    if (item) { e.preventDefault(); return menuEvento(e, +item.dataset.i); }
    e.preventDefault();
    fecharMenu();
  });

  // ---------- arrastar para o roteiro ----------
  const TIPO_PASSAGEM = 'application/x-bible-passagem';
  const solte = $('solte');
  let marcado = null;              // item do roteiro com a linha de "entra aqui"
  const temArquivos = dt => dt && [...dt.types].includes('Files');
  const temPassagem = dt => dt && [...dt.types].includes(TIPO_PASSAGEM);

  document.addEventListener('dragstart', e => {
    const alvo = e.target instanceof Element ? e.target : null;
    const p = alvo && (marcadosDe(alvo) || passagemDe(alvo));
    if (!p) return;
    const lista = Array.isArray(p) ? p : [p];
    e.dataTransfer.setData(TIPO_PASSAGEM, JSON.stringify(p));
    e.dataTransfer.setData('text/plain', lista.map(t => `${textoDe(t)}\n${refDe(t)}`).join('\n\n'));
    e.dataTransfer.effectAllowed = 'copy';
    solte.querySelector('b').textContent = 'Solte no roteiro: ' + refsDe(lista);
  });

  function limparMarca() {
    marcado?.classList.remove('soltar-antes', 'soltar-depois');
    marcado = null;
  }
  // posição no roteiro onde o arrasto vai entrar (antes/depois do item sob o mouse)
  function posicaoDoArrasto(e) {
    const item = e.target instanceof Element && e.target.closest('#playlist .mi-item');
    if (!item) return { pos: MP.itens.length };
    const r = item.getBoundingClientRect();
    const depois = e.clientY > r.top + r.height / 2;
    return { pos: +item.dataset.i + (depois ? 1 : 0), item, depois };
  }
  const noRoteiro = e => e.target instanceof Element && !!e.target.closest('#blocoRoteiro, #blocoMidia');

  // aceitar já no dragenter: em cima dos itens do roteiro (que também são arrastáveis),
  // sem isso o Chromium recusa o drop
  document.addEventListener('dragenter', e => {
    if (temArquivos(e.dataTransfer) || (temPassagem(e.dataTransfer) && noRoteiro(e))) e.preventDefault();
  });
  document.addEventListener('dragover', e => {
    const arquivos = temArquivos(e.dataTransfer), passagem = temPassagem(e.dataTransfer);
    if (!arquivos && !passagem) return;
    // arquivos podem cair em qualquer lugar da janela; versículos só no roteiro/mídia
    if (passagem && !noRoteiro(e)) { limparMarca(); document.body.classList.remove('arrastando-passagem'); return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (arquivos) {
      solte.querySelector('b').textContent = 'Solte para colocar no roteiro';
      solte.classList.add('on');
    } else document.body.classList.add('arrastando-passagem');
    const { item, depois } = posicaoDoArrasto(e);
    if (item !== marcado) limparMarca();
    if (item) { marcado = item; item.classList.toggle('soltar-depois', depois); item.classList.toggle('soltar-antes', !depois); }
  });
  function fimDoArrasto() {
    solte.classList.remove('on');
    document.body.classList.remove('arrastando-passagem');
    limparMarca();
  }
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) fimDoArrasto(); });
  document.addEventListener('dragend', fimDoArrasto);
  document.addEventListener('drop', e => {
    const arquivos = temArquivos(e.dataTransfer), passagem = temPassagem(e.dataTransfer);
    if (!arquivos && !passagem) return;
    e.preventDefault();                                   // sem isso a janela abriria o arquivo
    const { pos } = posicaoDoArrasto(e);
    fimDoArrasto();
    if (arquivos) {
      if (!ponte || !ponte.caminhoDoArquivo) return toast('Abra pelo aplicativo para arrastar arquivos');
      const caminhos = [...e.dataTransfer.files].map(f => ponte.caminhoDoArquivo(f)).filter(Boolean);
      if (caminhos.length) adicionarArquivos(caminhos, pos);
      return;
    }
    if (!noRoteiro(e)) return;
    try { versiculoNoRoteiro(JSON.parse(e.dataTransfer.getData(TIPO_PASSAGEM)), pos); } catch (err) {}
  });
})();
