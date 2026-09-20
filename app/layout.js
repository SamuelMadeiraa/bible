// Layout em blocos (estilo Premiere): cada painel pode ser arrastado pela aba para qualquer
// lado, dividido, empilhado em abas, redimensionado, escondido e mostrado de novo.
// O layout fica salvo sozinho; o operador ainda pode guardar um "Meu layout".
window.Layout = (function () {
  const DV = window['dockview-core'];
  const doca = $('doca');
  const estacionamento = $('estacionamento');
  const CHAVE = 'bibleStudioLayout';
  const CHAVE_MEU = 'bibleStudioMeuLayout';

  const PAINEIS = {
    biblia:   { titulo: 'Bíblia',    icone: 'book-open',          bloco: 'blocoBiblia' },
    previa:   { titulo: 'Prévia',    icone: 'eye',                bloco: 'monPrev' },
    aovivo:   { titulo: 'Ao vivo',   icone: 'radio',              bloco: 'monLive' },
    comandos: { titulo: 'Comandos',  icone: 'sliders-horizontal', bloco: 'blocoComandos' },
    palavras: { titulo: 'Palavras',  icone: 'highlighter',        bloco: 'blocoPalavras' },
    roteiro:  { titulo: 'Roteiro',   icone: 'list-video',         bloco: 'blocoRoteiro' },
    midia:    { titulo: 'Mídia',     icone: 'clapperboard',       bloco: 'blocoMidia' },
    ajustes:  { titulo: 'Ajustes',   icone: 'palette',            bloco: 'blocoAjustes' },
    musicas:  { titulo: 'Músicas',   icone: 'music',              bloco: 'blocoMusicas' },
  };
  // a playlist de músicas está em teste: só aparece no BibleLyrics DEV
  if (!(window.bridge && window.bridge.teste)) { delete PAINEIS.musicas; $('blocoMusicas')?.remove(); }

  if (!DV || !DV.createDockview) {
    // sem a biblioteca: mostra os blocos empilhados, para o app continuar funcionando
    doca.classList.add('sem-doca');
    Object.values(PAINEIS).forEach(p => doca.appendChild($(p.bloco)));
    toast('Layout em blocos indisponível — usando layout fixo');
    return { aplicarModo() {}, aplicarLayout() {} };
  }

  const api = DV.createDockview(doca, {
    theme: DV.themeDark,
    defaultRenderer: 'always',              // mantém todos os controles no documento, mesmo em abas escondidas
    // aba padrão do dockview (fechar, arrastar) com o ícone do painel na frente do título
    defaultTabComponent: 'comIcone',
    createTabComponent: ({ id }) => {
      const aba = new DV.DefaultTab();
      const def = PAINEIS[id];
      aba.element.classList.add('aba-' + id);
      if (def && def.icone) {
        const t = document.createElement('template');
        t.innerHTML = icone(def.icone, 'aba-ico');
        aba.element.insertBefore(t.content.firstChild, aba.element.firstChild);
      }
      return aba;
    },
    disableFloatingGroups: false,
    createComponent: opcoes => {
      const element = document.createElement('div');
      element.className = 'dv-bloco';
      let bloco = null;
      return {
        element,
        init() {
          const def = PAINEIS[opcoes.id];
          bloco = def && $(def.bloco);
          if (bloco) element.appendChild(bloco);
        },
        dispose() {
          if (bloco) estacionamento.appendChild(bloco);   // painel fechado: o bloco volta para o estacionamento
        },
      };
    },
  });

  function add(id, position, extra = {}) {
    if (api.getPanel(id)) return api.getPanel(id);
    const opcoes = { id, component: 'bloco', title: PAINEIS[id].titulo, renderer: 'always', ...extra };
    if (position) opcoes.position = position;
    return api.addPanel(opcoes);
  }
  function largura(id, px) { try { api.getPanel(id)?.group.api.setSize({ width: px }); } catch (e) {} }
  function altura(id, px) { try { api.getPanel(id)?.group.api.setSize({ height: px }); } catch (e) {} }

  const LAYOUTS = {
    padrao() {
      add('previa');
      add('aovivo', { referencePanel: 'previa', direction: 'right' });
      add('comandos', { direction: 'below' });
      add('palavras', { referencePanel: 'comandos', direction: 'below' });
      add('roteiro', { direction: 'below' });
      add('midia', { referencePanel: 'roteiro', direction: 'right' });
      add('biblia', { direction: 'left' });
      add('ajustes', { direction: 'right' });
      largura('biblia', 300); largura('ajustes', 320); largura('midia', 290);
      altura('comandos', 62); altura('palavras', 92); altura('roteiro', 320);
    },
    simples() {
      add('previa');
      add('aovivo', { referencePanel: 'previa', direction: 'right' });
      add('comandos', { direction: 'below' });
      add('roteiro', { direction: 'below' });
      add('midia', { referencePanel: 'roteiro', direction: 'within' }, { inactive: true });
      add('biblia', { direction: 'left' });
      largura('biblia', 320);
      altura('comandos', 76); altura('roteiro', 340);
    },
    transmissao() {
      add('aovivo');
      add('previa', { referencePanel: 'aovivo', direction: 'left' });
      add('comandos', { direction: 'below' });
      add('roteiro', { direction: 'below' });
      add('midia', { referencePanel: 'roteiro', direction: 'right' });
      add('biblia', { direction: 'left' });
      add('ajustes', { referencePanel: 'biblia', direction: 'within' }, { inactive: true });
      add('palavras', { referencePanel: 'biblia', direction: 'within' }, { inactive: true });
      largura('biblia', 300); largura('midia', 280); largura('previa', Math.round(doca.clientWidth * 0.3));
      altura('comandos', 62); altura('roteiro', 260);
    },
  };

  let salvarT;
  function salvarAuto() {
    clearTimeout(salvarT);
    salvarT = setTimeout(() => {
      try { localStorage.setItem(CHAVE, JSON.stringify(api.toJSON())); } catch (e) {}
    }, 400);
  }

  function aplicarLayout(nome) {
    api.clear();
    (LAYOUTS[nome] || LAYOUTS.padrao)();
    salvarAuto();
    montarMenuPaineis();
  }

  function restaurar(json) {
    try {
      api.clear();
      api.fromJSON(json);
      // layouts salvos por versões antigas guardam o título antigo (com emoji): usa sempre o atual
      api.panels.forEach(p => { if (PAINEIS[p.id]) p.api.setTitle(PAINEIS[p.id].titulo); });
      // painéis que não vieram no layout salvo continuam disponíveis pelo menu
      montarMenuPaineis();
      return api.panels.length > 0;
    } catch (e) {
      return false;
    }
  }

  // modo simples liga/desliga um layout mais enxuto
  function aplicarModo() {
    if (CFG.simples) return aplicarLayout('simples');
    let meu = null;
    try { meu = JSON.parse(localStorage.getItem(CHAVE_MEU) || 'null'); } catch (e) {}
    if (!(meu && restaurar(meu))) aplicarLayout('padrao');
    salvarAuto();
  }

  // ---------- menu "Layout" ----------
  function montarMenuPaineis() {
    const box = $('listaPaineis');
    if (!box) return;
    box.innerHTML = '';
    Object.entries(PAINEIS).forEach(([id, p]) => {
      const aberto = !!api.getPanel(id);
      const b = document.createElement('button');
      b.className = 'painel-item' + (aberto ? ' on' : '');
      b.innerHTML = `<span class="marca">${aberto ? icone('check') : ''}</span>${icone(p.icone, 'ico-antes painel-ico')}${p.titulo}`;
      b.onclick = e => {
        e.stopPropagation();
        const painel = api.getPanel(id);
        if (painel) api.removePanel(painel);
        else add(id, { direction: 'right' }, { initialWidth: 320 });
        salvarAuto();
        montarMenuPaineis();
      };
      box.appendChild(b);
    });
  }

  $('btnJanelas').onclick = e => { montarMenuPaineis(); alternarMenu('menuJanelas', e.currentTarget); };
  document.querySelectorAll('#menuJanelas [data-layout]').forEach(b => b.onclick = () => {
    $('menuJanelas').classList.remove('on');
    aplicarLayout(b.dataset.layout);
    toast('Layout: ' + b.textContent.replace(/\s+/g, ' ').trim().split(' ').slice(1, 2).join(' '));
  });
  $('btnSalvarLayout').onclick = () => {
    try { localStorage.setItem(CHAVE_MEU, JSON.stringify(api.toJSON())); toast('“Meu layout” guardado'); }
    catch (e) { toast('Não foi possível guardar o layout'); }
    $('menuJanelas').classList.remove('on');
  };
  $('btnMeuLayout').onclick = () => {
    $('menuJanelas').classList.remove('on');
    let meu = null;
    try { meu = JSON.parse(localStorage.getItem(CHAVE_MEU) || 'null'); } catch (e) {}
    if (!meu) return toast('Você ainda não guardou um layout');
    if (restaurar(meu)) { salvarAuto(); toast('“Meu layout” restaurado'); }
  };

  api.onDidLayoutChange(() => { salvarAuto(); });
  api.onDidRemovePanel?.(() => montarMenuPaineis());
  api.onDidAddPanel?.(() => montarMenuPaineis());

  // ---------- início ----------
  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) {}
  if (!(salvo && restaurar(salvo))) aplicarLayout(CFG.simples ? 'simples' : 'padrao');
  montarMenuPaineis();

  return { aplicarModo, aplicarLayout, api };
})();
