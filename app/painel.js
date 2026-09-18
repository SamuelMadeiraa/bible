// Presets de roteiro (prontos e salvos pelo operador) e tela de configurações.

// ---------- presets ----------
const PRESETS_KEY = 'bibleStudioPresets';
let meusPresets = [];
try { meusPresets = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch (e) {}
function salvarPresets() {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(meusPresets)); }
  catch (e) { toast('Não foi possível salvar o roteiro'); }
}

// transforma os eventos de um preset em eventos do roteiro (resolvendo as referências)
function eventosDoPreset(lista) {
  const saida = [];
  const naoAchei = [];
  for (const ev of lista || []) {
    if (ev.ref) {
      const r = parseRef(ev.ref);
      if (r) saida.push({ tipo: 'versiculo', ...r });
      else naoAchei.push(ev.ref);
    } else if (ev.tipo) {
      saida.push(limparEvento({ ...ev, id: undefined }));
    }
  }
  if (naoAchei.length) toast('Referências não encontradas: ' + naoAchei.join(', '));
  return saida.map(ev => ({ ...ev, id: novoId() }));
}

function usarPreset(eventos, modo) {
  const novos = eventosDoPreset(eventos);
  if (!novos.length) return toast('Esse roteiro está vazio');
  if (modo === 'substituir') {
    if (MP.itens.length && !confirm('Trocar o roteiro atual por este? (o atual será substituído)')) return;
    pararMidia();
    MP.itens = [];
    MP.idx = R.prevIdx = R.liveIdx = -1;
    esconderPreviaEvento();
  }
  const inicio = MP.itens.length;
  MP.itens.push(...novos);
  novos.forEach(detectar);
  registrar();
  salvarMidia();
  montarLista();
  fecharModal('modalPresets');
  if (modo === 'substituir') selecionarPrevia(0);
  toast(modo === 'substituir' ? `Roteiro carregado: ${novos.length} eventos` : `${novos.length} eventos adicionados`);
  return inicio;
}

function resumoEventos(lista) {
  const n = { versiculo: 0, texto: 0, midia: 0 };
  (lista || []).forEach(ev => {
    if (ev.ref || ev.tipo === 'versiculo') n.versiculo++;
    else if (ev.tipo === 'texto') n.texto++;
    else if (TIPOS_MIDIA.includes(ev.tipo)) n.midia++;
  });
  return [n.versiculo && `${n.versiculo} versículos`, n.texto && `${n.texto} avisos`, n.midia && `${n.midia} mídias`]
    .filter(Boolean).join(' • ') || 'vazio';
}

function cartao(titulo, descricao, acoes) {
  const d = document.createElement('div');
  d.className = 'cartao';
  d.innerHTML = `<div class="c-txt"><b>${esc(titulo)}</b><small>${esc(descricao)}</small></div>`;
  const bt = document.createElement('div');
  bt.className = 'c-acoes';
  acoes.forEach(([rotulo, fn, cls]) => {
    const b = document.createElement('button');
    b.textContent = rotulo;
    if (cls) b.className = cls;
    b.onclick = fn;
    bt.appendChild(b);
  });
  d.appendChild(bt);
  return d;
}

function montarPresets() {
  const pr = $('listaProntos');
  pr.innerHTML = '';
  (window.PRESETS_PRONTOS || []).forEach(p => {
    pr.appendChild(cartao(p.nome, `${p.descricao} ${resumoEventos(p.eventos)}.`, [
      ['Usar', () => usarPreset(p.eventos, 'substituir'), 'primary'],
      ['＋ Adicionar', () => usarPreset(p.eventos, 'adicionar')],
    ]));
  });

  const meus = $('listaMeus');
  meus.innerHTML = '';
  if (!meusPresets.length) {
    meus.innerHTML = '<p class="hint">Nenhum roteiro salvo ainda. Monte o roteiro do culto e clique em “Salvar roteiro atual”.</p>';
  }
  meusPresets.forEach((p, i) => {
    const data = p.criado ? new Date(p.criado).toLocaleDateString('pt-BR') : '';
    meus.appendChild(cartao(p.nome, `${resumoEventos(p.itens)}${data ? ' • ' + data : ''}`, [
      ['Usar', () => usarPreset(p.itens, 'substituir'), 'primary'],
      ['＋ Adicionar', () => usarPreset(p.itens, 'adicionar')],
      ['⬆', () => exportarArquivo(p.nome, p.itens)],
      ['Excluir', () => {
        if (!confirm(`Excluir o roteiro “${p.nome}”?`)) return;
        meusPresets.splice(i, 1);
        salvarPresets();
        montarPresets();
      }, 'danger'],
    ]));
  });
}

function exportarArquivo(nome, itens) {
  const dados = { app: 'Bible Studio', tipo: 'roteiro', versao: 1, nome, itens: itens.map(limparEvento) };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'roteiro-' + (nome || 'culto').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

$('btnSalvarPreset').onclick = () => {
  if (!MP.itens.length) return toast('O roteiro está vazio');
  const nome = $('nomePreset').value.trim() || 'Culto ' + new Date().toLocaleDateString('pt-BR');
  const existente = meusPresets.findIndex(p => p.nome.toLowerCase() === nome.toLowerCase());
  const novo = { nome, criado: Date.now(), itens: MP.itens.map(limparEvento) };
  if (existente >= 0) {
    if (!confirm(`Já existe “${nome}”. Substituir?`)) return;
    meusPresets[existente] = novo;
  } else meusPresets.unshift(novo);
  salvarPresets();
  $('nomePreset').value = '';
  montarPresets();
  toast('Roteiro salvo: ' + nome);
};
$('btnExportar').onclick = () => {
  if (!MP.itens.length) return toast('O roteiro está vazio');
  exportarArquivo($('nomePreset').value.trim() || 'culto', MP.itens);
};
$('inImportar').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const dados = JSON.parse(await f.text());
    const itens = Array.isArray(dados) ? dados : dados.itens || dados.eventos;
    if (!Array.isArray(itens)) throw new Error('formato');
    meusPresets.unshift({ nome: dados.nome || f.name.replace(/\.json$/i, ''), criado: Date.now(), itens });
    salvarPresets();
    montarPresets();
    toast('Roteiro importado');
  } catch (err) {
    toast('Arquivo inválido — use um roteiro exportado pelo Bible Studio');
  }
});

function abrirPresets(aba) {
  montarPresets();
  if (aba) document.querySelector(`#modalPresets .tabs button[data-tab="${aba}"]`)?.click();
  abrirModal('modalPresets');
}
$('btnPresets').onclick = () => abrirPresets();
$('btnPresets2').onclick = () => abrirPresets();

// ---------- configurações ----------
function aplicarCfg() {
  document.body.classList.toggle('simples', !!CFG.simples);
  document.body.classList.toggle('sem-dicas', !CFG.dicas);
  $('btnGo').innerHTML = '✂ CORTE <kbd>' + (CFG.teclaCorte === 'enter' ? 'Enter' : 'Espaço') + '</kbd>';
  const chk = $('chkSimples');
  if (chk) chk.checked = !!CFG.simples;
}

function ligarSegCfg(id, chave) {
  const box = $(id);
  const upd = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === CFG[chave]));
  box.querySelectorAll('button').forEach(b => b.onclick = () => { CFG[chave] = b.dataset.v; salvarCfg(); upd(); aplicarCfg(); });
  upd();
}
function ligarCheckCfg(id, chave, depois) {
  const el = $(id);
  el.checked = !!CFG[chave];
  el.addEventListener('change', () => { CFG[chave] = el.checked; salvarCfg(); aplicarCfg(); depois?.(); el.blur(); });
}
ligarSegCfg('cfgTecla', 'teclaCorte');
ligarSegCfg('cfgPassador', 'passador');
ligarCheckCfg('cfgAvancar', 'avancar');
ligarCheckCfg('cfgDicas', 'dicas');
ligarCheckCfg('cfgSimples', 'simples', () => { if (window.Layout) Layout.aplicarModo(); });

// atalho do modo simples no topo
$('chkSimples').addEventListener('change', e => {
  CFG.simples = e.target.checked;
  $('cfgSimples').checked = CFG.simples;
  salvarCfg();
  aplicarCfg();
  if (window.Layout) Layout.aplicarModo();
  e.target.blur();
});

$('cfgPadrao').onclick = () => {
  if (!confirm('Voltar todas as configurações para o padrão?')) return;
  Object.assign(CFG, CFG_PADRAO);
  salvarCfg();
  ['cfgAvancar', 'cfgDicas', 'cfgSimples'].forEach(id => { $(id).checked = !!CFG[{ cfgAvancar: 'avancar', cfgDicas: 'dicas', cfgSimples: 'simples' }[id]]; });
  ligarSegCfg('cfgTecla', 'teclaCorte');
  ligarSegCfg('cfgPassador', 'passador');
  aplicarCfg();
  if (window.Layout) Layout.aplicarModo();
  toast('Configurações restauradas');
};

$('btnConfig').onclick = () => abrirModal('modalConfig');

aplicarCfg();
