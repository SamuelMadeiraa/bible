// Presets de reunião (criados pelo operador) e tela de configurações.

// ---------- presets de reunião ----------
// Cada preset é { id, nome, criado, alterado, itens } e fica guardado neste computador.
const PRESETS_KEY = 'bibleStudioPresets';
let meusPresets = [];
try { meusPresets = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch (e) {}
meusPresets.forEach(p => { if (!p.id) p.id = novoId(); });
let presetEditando = null;     // id do preset que está sendo renomeado
// preset aberto para edição: o roteiro montado pode ser salvo nele com um clique
let presetAtivo = null;
try { presetAtivo = localStorage.getItem('bibleStudioPresetAtivo') || null; } catch (e) {}
function definirPresetAtivo(id) {
  presetAtivo = id || null;
  try { id ? localStorage.setItem('bibleStudioPresetAtivo', id) : localStorage.removeItem('bibleStudioPresetAtivo'); } catch (e) {}
  mostrarPresetAtivo();
}
function mostrarPresetAtivo() {
  const p = presetAtivo && meusPresets.find(x => x.id === presetAtivo);
  if (presetAtivo && !p) presetAtivo = null;
  const barra = document.getElementById('presetAtivo');
  if (!barra) return;
  barra.hidden = !p;
  if (p) document.getElementById('presetAtivoNome').textContent = p.nome;
}

function salvarPresets() {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(meusPresets)); return true; }
  catch (e) { toast('Não foi possível salvar o preset'); return false; }
}
const acharPreset = id => meusPresets.find(p => p.id === id);
const nomeRepetido = (nome, id) => meusPresets.some(p => p.id !== id && p.nome.toLowerCase() === nome.toLowerCase());

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

function usarPreset(p, modo) {
  const novos = eventosDoPreset(p.itens);
  if (!novos.length) return toast('Esse preset está vazio — use “Atualizar” para guardar o roteiro atual nele');
  if (modo === 'substituir') {
    if (MP.itens.length && !confirm(`Trocar o roteiro atual pelo preset “${p.nome}”?`)) return;
    pararMidia();
    MP.itens = [];
    MP.idx = R.prevIdx = R.liveIdx = -1;
    esconderPreviaEvento();
  }
  MP.itens.push(...novos);
  novos.forEach(detectar);
  registrar();
  salvarMidia();
  montarLista();
  fecharModal('modalPresets');
  if (modo === 'substituir') { selecionarPrevia(0); definirPresetAtivo(p.id); }
  toast(modo === 'substituir' ? `Preset “${p.nome}” carregado: ${novos.length} eventos` : `${novos.length} eventos adicionados`);
  analytics('preset_usado', { modo, eventos: novos.length });
}

function resumoEventos(lista) {
  const n = { versiculo: 0, texto: 0, midia: 0, web: 0 };
  (lista || []).forEach(ev => {
    if (ev.ref || ev.tipo === 'versiculo') n.versiculo++;
    else if (ev.tipo === 'texto') n.texto++;
    else if (ev.tipo === 'web') n.web++;
    else if (TIPOS_MIDIA.includes(ev.tipo)) n.midia++;
  });
  const plural = (q, um, varios) => q && `${q} ${q === 1 ? um : varios}`;
  return [plural(n.versiculo, 'versículo', 'versículos'), plural(n.texto, 'aviso', 'avisos'),
    plural(n.midia, 'mídia', 'mídias'), plural(n.web, 'link', 'links')].filter(Boolean).join(' • ') || 'vazio';
}

function botao(rotulo, fn, cls, titulo) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = rotulo;               // os rótulos são fixos do app (podem ter ícone)
  if (cls) b.className = cls;
  if (titulo) b.title = titulo;
  b.onclick = fn;
  return b;
}

function cartaoPreset(p) {
  const d = document.createElement('div');
  d.className = 'cartao';
  const data = new Date(p.alterado || p.criado || Date.now()).toLocaleDateString('pt-BR');
  const txt = document.createElement('div');
  txt.className = 'c-txt';

  if (presetEditando === p.id) {
    // renomear no próprio cartão
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.maxLength = 60;
    inp.value = p.nome;
    const confirmar = () => {
      const nome = inp.value.trim();
      if (!nome) return toast('Digite um nome');
      if (nomeRepetido(nome, p.id)) return toast(`Já existe um preset chamado “${nome}”`);
      p.nome = nome;
      p.alterado = Date.now();
      presetEditando = null;
      salvarPresets();
      montarPresets();
      toast('Preset renomeado');
    };
    const cancelar = () => { presetEditando = null; montarPresets(); };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelar(); }
    });
    txt.appendChild(inp);
    const acoes = document.createElement('div');
    acoes.className = 'c-acoes';
    acoes.append(botao(icone('check', 'ico-antes') + 'Salvar nome', confirmar, 'primary'), botao('Cancelar', cancelar));
    d.append(txt, acoes);
    setTimeout(() => { inp.focus(); inp.select(); });
    return d;
  }

  txt.innerHTML = `<b>${esc(p.nome)}</b><small>${esc(resumoEventos(p.itens))} • alterado em ${data}</small>`;
  const acoes = document.createElement('div');
  acoes.className = 'c-acoes';
  acoes.append(
    botao('Usar', () => usarPreset(p, 'substituir'), 'primary', 'Troca o roteiro atual por este preset'),
    botao(icone('plus', 'ico-antes') + 'Adicionar', () => usarPreset(p, 'adicionar'), '', 'Coloca os eventos no fim do roteiro atual'),
    botao(icone('save'), () => atualizarPreset(p), 'so-icone empurra', 'Atualizar: guarda o roteiro que está aberto agora neste preset'),
    botao(icone('pencil'), () => { presetEditando = p.id; montarPresets(); }, 'so-icone', 'Renomear'),
    botao(icone('upload'), () => exportarArquivo(p.nome, p.itens), 'so-icone', 'Exportar para arquivo (levar para outro computador)'),
    botao(icone('x'), () => excluirPreset(p), 'so-icone danger', 'Excluir'),
  );
  d.append(txt, acoes);
  return d;
}

function montarPresets() {
  const lista = $('listaMeus');
  lista.innerHTML = '';
  if (!meusPresets.length) {
    lista.innerHTML = '<p class="hint presets-vazio">Nenhum preset ainda. Monte a reunião no roteiro e clique em <b>Novo preset</b> para guardá-la.</p>';
    return;
  }
  meusPresets.forEach(p => lista.appendChild(cartaoPreset(p)));
}

// ---------- criar ----------
function abrirFormPreset() {
  const n = MP.itens.length;
  $('presetQtd').textContent = n ? `${n} ${n === 1 ? 'evento' : 'eventos'}` : 'está vazio';
  $('presetComRoteiro').checked = n > 0;
  $('presetComRoteiro').disabled = !n;
  $('presetErro').textContent = '';
  $('nomePreset').value = '';
  $('formPreset').hidden = false;
  $('btnNovoPreset').hidden = true;
  $('nomePreset').focus();
}
function fecharFormPreset() {
  $('formPreset').hidden = true;
  $('btnNovoPreset').hidden = false;
}
$('btnNovoPreset').onclick = abrirFormPreset;
$('btnCancelarPreset').onclick = fecharFormPreset;
$('nomePreset').addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharFormPreset(); }
});
$('formPreset').addEventListener('submit', e => {
  e.preventDefault();
  const nome = $('nomePreset').value.trim();
  if (!nome) { $('presetErro').textContent = 'Digite um nome para o preset.'; return $('nomePreset').focus(); }
  if (nomeRepetido(nome)) { $('presetErro').textContent = `Já existe um preset chamado “${nome}”.`; return $('nomePreset').focus(); }
  const agora = Date.now();
  const itens = $('presetComRoteiro').checked ? MP.itens.map(limparEvento) : [];
  meusPresets.unshift({ id: novoId(), nome, criado: agora, alterado: agora, itens });
  if (!salvarPresets()) return;
  fecharFormPreset();
  montarPresets();
  toast('Preset criado: ' + nome);
  analytics('preset_criado', { eventos: itens.length });
});

// ---------- atualizar / excluir ----------
function atualizarPreset(p) {
  if (!MP.itens.length) return toast('O roteiro está vazio — monte a reunião antes de atualizar o preset');
  if (!confirm(`Guardar o roteiro que está aberto agora (${MP.itens.length} eventos) no preset “${p.nome}”?\nO conteúdo anterior do preset será substituído.`)) return;
  p.itens = MP.itens.map(limparEvento);
  p.alterado = Date.now();
  salvarPresets();
  montarPresets();
  mostrarPresetAtivo();
  toast('Preset salvo: ' + p.nome);
}
function excluirPreset(p) {
  if (!confirm(`Excluir o preset “${p.nome}”? Isso não pode ser desfeito.`)) return;
  meusPresets = meusPresets.filter(x => x.id !== p.id);
  if (presetAtivo === p.id) definirPresetAtivo(null);
  salvarPresets();
  montarPresets();
  toast('Preset excluído');
}

// ---------- arquivo ----------
function exportarArquivo(nome, itens) {
  const dados = { app: 'Bible Studio', tipo: 'preset', versao: 1, nome, itens: itens.map(limparEvento) };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'preset-' + (nome || 'reuniao').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
$('inImportar').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const dados = JSON.parse(await f.text());
    const itens = Array.isArray(dados) ? dados : dados.itens || dados.eventos;
    if (!Array.isArray(itens)) throw new Error('formato');
    let nome = (dados.nome || f.name.replace(/\.json$/i, '')).slice(0, 60);
    const base = nome;
    for (let n = 2; nomeRepetido(nome); n++) nome = `${base} (${n})`;
    const agora = Date.now();
    meusPresets.unshift({ id: novoId(), nome, criado: agora, alterado: agora, itens });
    salvarPresets();
    montarPresets();
    toast('Preset importado: ' + nome);
  } catch (err) {
    toast('Arquivo inválido — use um preset exportado pelo Bible Studio');
  }
});

function abrirPresets() {
  presetEditando = null;
  fecharFormPreset();
  montarPresets();
  abrirModal('modalPresets');
}
$('btnPresets').onclick = () => abrirPresets();
$('presetAtivoSalvar').onclick = () => { const p = acharPreset(presetAtivo); if (p) atualizarPreset(p); };
$('presetAtivoFechar').onclick = () => definirPresetAtivo(null);
mostrarPresetAtivo();
$('btnPresets2').onclick = () => abrirPresets();

// ---------- configurações ----------
function aplicarCfg() {
  document.body.classList.toggle('simples', !!CFG.simples);
  document.body.classList.toggle('sem-dicas', !CFG.dicas);
  $('btnGo').innerHTML = icone('scissors', 'ico-antes') + 'CORTE <kbd>' + (CFG.teclaCorte === 'enter' ? 'Enter' : 'Espaço') + '</kbd>';
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
