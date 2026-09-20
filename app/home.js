// Tela Início: atalhos para a operação, presets, playlist programada, criador de vídeo e celular.
// Os dados (presets, roteiro, programação) são os mesmos que a operação guarda neste computador.
const $ = id => document.getElementById(id);
const ponte = window.bridge;
const BIBLIA = window.BIBLIA_ACF || [];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ler = (chave, padrao) => { try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch (e) { return padrao; } };
const gravar = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); return true; } catch (e) { return false; } };
const novoId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// abre a operação levando um pedido (preset, programação, janela) que a operação aplica ao carregar
function operar(pedido) {
  if (pedido) gravar('bibleStudioAbrir', pedido);
  if (ponte && ponte.navegar) ponte.navegar('operador');
  else location.href = 'operador.html';
}

// ---------- rótulos dos eventos ----------
const ROMANOS = ['I', 'II', 'III'];
function refDe(ev) {
  const l = BIBLIA[ev.b];
  if (!l) return 'Versículo';
  const nome = l.name.replace(/^(\d)\s/, (m, d) => ROMANOS[d - 1] + ' ');
  return `${nome} ${ev.c + 1}:${ev.v1 + 1}${ev.v2 > ev.v1 ? '-' + (ev.v2 + 1) : ''}`;
}
function rotulo(ev) {
  if (ev.ref) return { titulo: ev.ref, sub: 'versículo', icone: 'book-open' };
  switch (ev.tipo) {
    case 'versiculo': {
      const t = (BIBLIA[ev.b]?.chapters[ev.c] || [])[ev.v1] || '';
      return { titulo: refDe(ev), sub: t.slice(0, 80), icone: 'book-open' };
    }
    case 'texto': return { titulo: ev.titulo || 'Aviso', sub: ev.texto || 'aviso', icone: 'message-square-text' };
    case 'preta': return { titulo: 'Tela preta', sub: '', icone: 'eye-off' };
    case 'fundo': return { titulo: 'Só o fundo', sub: '', icone: 'wallpaper' };
    case 'audio': return { titulo: ev.nome, sub: 'áudio', icone: 'music' };
    case 'imagem': return { titulo: ev.nome, sub: 'foto', icone: 'image' };
    case 'web': return { titulo: ev.nome || ev.url, sub: 'transmissão / link', icone: 'radio-tower' };
    default: return { titulo: ev.nome, sub: 'vídeo', icone: 'clapperboard' };
  }
}
function contagem(itens) {
  const n = { versiculo: 0, aviso: 0, midia: 0, link: 0 };
  (itens || []).forEach(ev => {
    if (ev.ref || ev.tipo === 'versiculo') n.versiculo++;
    else if (ev.tipo === 'texto') n.aviso++;
    else if (ev.tipo === 'web') n.link++;
    else if (['video', 'imagem', 'audio'].includes(ev.tipo)) n.midia++;
  });
  const p = (q, um, v) => q ? `${q} ${q === 1 ? um : v}` : '';
  return [p(n.versiculo, 'versículo', 'versículos'), p(n.aviso, 'aviso', 'avisos'), p(n.midia, 'mídia', 'mídias'), p(n.link, 'link', 'links')].filter(Boolean);
}

// ---------- topo e status ----------
function relogio() {
  const d = new Date();
  $('relogio').textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const h = d.getHours();
  $('saudacao').textContent = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ' • ' +
    d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

const roteiroAtual = () => (ler('bibleStudioMidia', {}).itens || []);
let presets = [];
const carregarPresets = () => { presets = ler('bibleStudioPresets', []); presets.forEach(p => { if (!p.id) p.id = novoId(); }); };
const salvarPresets = () => gravar('bibleStudioPresets', presets) || toast('Não foi possível salvar o preset');

function status() {
  const itens = roteiroAtual();
  $('stRoteiroTxt').textContent = itens.length ? `${itens.length} ${itens.length === 1 ? 'evento' : 'eventos'}` : 'Vazio';
  const ativo = presets.find(p => p.id === localStorage.getItem('bibleStudioPresetAtivo'));
  $('stRoteiroSub').textContent = ativo ? 'Preset: ' + ativo.nome : (contagem(itens).join(' • ') || 'Monte na operação ou abra um preset');

  const prog = ler('bibleStudioProg', {});
  const item = $('stProg');
  if (prog.armado) {
    $('stProgTxt').textContent = prog.inicio ? `Pré-culto às ${prog.inicio}` : 'Abertura agendada';
    $('stProgSub').textContent = (prog.culto ? `Abertura às ${prog.culto} • ` : '') + 'roda com a operação aberta';
    item.className = 'status-item ok';
  } else {
    $('stProgTxt').textContent = 'Nada agendado';
    $('stProgSub').textContent = 'Monte a playlist programada abaixo';
    item.className = 'status-item';
  }
}

async function telas() {
  if (!ponte) return;
  try {
    const d = await ponte.displays();
    const tv = d.find(m => !m.primary);
    const item = $('stProjecao');
    if (tv) {
      $('stProjecaoTxt').textContent = tv.label;
      $('stProjecaoSub').textContent = `${tv.width}×${tv.height} • a projeção abre em tela cheia nessa tela`;
      item.className = 'status-item ok';
    } else {
      $('stProjecaoTxt').textContent = 'Só um monitor';
      $('stProjecaoSub').textContent = 'Ligue a TV ou o projetor; sem ela, a projeção abre em janela';
      item.className = 'status-item alerta';
    }
  } catch (e) {}
  try {
    const info = await ponte.serverInfo();
    $('versao').textContent = 'v' + info.versao;
    $('rodapeVersao').textContent = 'BibleLyrics ' + info.versao;
  } catch (e) {}
}

let infoCelular = null;
async function celular() {
  if (!ponte) return;
  try { infoCelular = await ponte.remoteInfo(); } catch (e) { return; }
  const e = infoCelular.enderecos[0];
  $('stCelularTxt').textContent = e ? `Senha ${infoCelular.pin}` : 'Sem rede Wi-Fi';
  $('stCelularSub').textContent = e ? e.host + ' • mesmo Wi-Fi' : 'Conecte o computador numa rede';
}
function abrirQr() {
  const e = infoCelular && infoCelular.enderecos[0];
  $('qr').innerHTML = e ? e.qrApp : '<p style="color:#333;padding:20px;text-align:center">Sem rede</p>';
  $('pin').textContent = infoCelular ? infoCelular.pin : '----';
  abrir('modalCelular');
}

// ---------- presets ----------
function montarPresets() {
  carregarPresets();
  const box = $('listaPresets');
  box.innerHTML = '';
  if (!presets.length) {
    box.innerHTML = '<div class="vazio"><b>Nenhum preset ainda</b>Crie o primeiro: dê um nome, monte a reunião na operação e clique em “Salvar no preset”.</div>';
    return;
  }
  presets.forEach(p => {
    const d = document.createElement('div');
    d.className = 'preset';
    const data = new Date(p.alterado || p.criado || Date.now()).toLocaleDateString('pt-BR');
    const chips = contagem(p.itens);
    d.innerHTML = `
      <div class="preset-cab"><i data-i="folder-open"></i><div><b>${esc(p.nome)}</b><span>alterado em ${data}</span></div></div>
      <div class="preset-chips">${chips.length ? chips.map(c => `<span class="chip">${c}</span>`).join('') : '<span class="chip">vazio</span>'}</div>
      <div class="preset-acoes">
        <button class="btn primario" data-a="usar"><i data-i="play"></i>Usar no culto</button>
        <button class="btn" data-a="editar" title="Abrir na operação para editar"><i data-i="pencil"></i></button>
        <button class="btn so" data-a="exportar" title="Salvar como arquivo .bible (com as mídias)"><i data-i="upload"></i></button>
        <button class="btn perigo" data-a="excluir" title="Excluir"><i data-i="trash-2"></i></button>
      </div>`;
    d.querySelector('[data-a=usar]').onclick = () => usarPreset(p);
    d.querySelector('[data-a=editar]').onclick = () => usarPreset(p, true);
    d.querySelector('[data-a=exportar]').onclick = () => Biblioteca.exportarPreset(p);
    d.querySelector('[data-a=excluir]').onclick = () => {
      if (!confirm(`Excluir o preset “${p.nome}”? Isso não pode ser desfeito.`)) return;
      presets = presets.filter(x => x.id !== p.id);
      salvarPresets();
      montarPresets();
      montarBases();
      toast('Preset excluído');
    };
    box.appendChild(d);
  });
}
function usarPreset(p, editar) {
  const atual = roteiroAtual().length;
  if (atual && !confirm(`Trocar o roteiro aberto (${atual} eventos) pelo preset “${p.nome}”?`)) return;
  operar({ preset: p.id, editar: !!editar });
}

$('btnNovoPreset').onclick = () => {
  $('formPreset').hidden = false;
  $('btnNovoPreset').hidden = true;
  $('basePreset').value = roteiroAtual().length ? 'roteiro' : 'vazio';
  $('basePreset').options[1].disabled = !roteiroAtual().length;
  $('nomePreset').value = '';
  $('presetErro').textContent = '';
  $('nomePreset').focus();
};
$('btnCancelarPreset').onclick = () => { $('formPreset').hidden = true; $('btnNovoPreset').hidden = false; };
$('formPreset').onsubmit = e => {
  e.preventDefault();
  carregarPresets();
  const nome = $('nomePreset').value.trim();
  if (!nome) return ($('presetErro').textContent = 'Digite um nome para o preset.');
  if (presets.some(p => p.nome.toLowerCase() === nome.toLowerCase())) return ($('presetErro').textContent = `Já existe um preset chamado “${nome}”.`);
  const agora = Date.now();
  const itens = $('basePreset').value === 'roteiro' ? roteiroAtual() : [];
  const p = { id: novoId(), nome, criado: agora, alterado: agora, itens };
  presets.unshift(p);
  if (!salvarPresets()) return;
  // o roteiro aberto já é o conteúdo: só marca o preset como "em edição"
  if (itens.length) { try { localStorage.setItem('bibleStudioPresetAtivo', p.id); } catch (err) {} operar(); }
  else operar({ preset: p.id, editar: true });
};

// ---------- playlist programada ----------
function baseAtual() {
  const v = $('progBase').value;
  if (v === 'roteiro') return roteiroAtual();
  return (presets.find(p => p.id === v) || {}).itens || [];
}
function montarBases() {
  const sel = $('progBase');
  const antes = sel.value;
  const n = roteiroAtual().length;
  sel.innerHTML = `<option value="roteiro">Roteiro aberto agora (${n} ${n === 1 ? 'evento' : 'eventos'})</option>`
    + presets.map(p => `<option value="${p.id}">Preset: ${esc(p.nome)} (${p.itens.length})</option>`).join('');
  sel.value = [...sel.options].some(o => o.value === antes) ? antes : 'roteiro';
  montarEventosProg();
}
function montarEventosProg() {
  const itens = baseAtual();
  const prog = ler('bibleStudioProg', {});
  const doRoteiro = $('progBase').value === 'roteiro';
  const box = $('progLista');
  box.innerHTML = '';
  const candidatos = itens.map((ev, i) => ({ ev, i })).filter(({ ev }) => ev.tipo !== 'web');
  if (!candidatos.length) box.innerHTML = '<p class="prog-vazio">Sem eventos aqui. Monte o roteiro na operação (dá para arrastar vídeos e fotos do Windows) ou escolha um preset.</p>';
  candidatos.forEach(({ ev, i }) => {
    const r = rotulo(ev);
    const marcado = doRoteiro && ev.id && (prog.itens || []).includes(ev.id);
    const l = document.createElement('label');
    l.className = 'prog-item';
    l.innerHTML = `<input type="checkbox" value="${i}"${marcado ? ' checked' : ''}><i data-i="${r.icone}"></i><span><b>${esc(r.titulo || '')}</b><small>${esc(r.sub || '')}</small></span>`;
    box.appendChild(l);
  });
  $('progAbertura').innerHTML = '<option value="-1">Nada — só encerra o pré-culto</option>'
    + itens.map((ev, i) => `<option value="${i}">${esc(rotulo(ev).titulo || '')}</option>`).join('');
  const ab = doRoteiro ? itens.findIndex(ev => ev.id && ev.id === prog.abertura) : -1;
  $('progAbertura').value = ab;
  resumoProg();
}
function resumoProg() {
  const n = $('progLista').querySelectorAll('input:checked').length;
  const ab = +$('progAbertura').value;
  const itens = baseAtual();
  const partes = [];
  partes.push(n ? `${n} ${n === 1 ? 'evento' : 'eventos'} no pré-culto` : 'Nenhum evento marcado');
  if ($('progInicio').value) partes.push(`começa às ${$('progInicio').value}`);
  if ($('progCulto').value) partes.push(`abertura às ${$('progCulto').value}${ab >= 0 && itens[ab] ? ': ' + rotulo(itens[ab]).titulo : ''}`);
  $('progResumo').textContent = partes.join(' • ');
}
function lerProg(acao) {
  const itensIdx = [...$('progLista').querySelectorAll('input:checked')].map(x => +x.value);
  const g = {
    inicio: $('progInicio').value, culto: $('progCulto').value,
    repetir: $('progRepetir').checked, seg: Math.max(3, Math.min(600, +$('progSeg').value || 10)),
    itensIdx, aberturaIdx: +$('progAbertura').value, acao,
  };
  const agora = new Date(), hm = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  if (acao === 'agora' && !itensIdx.length) return 'Marque pelo menos um evento para o pré-culto.';
  if (acao !== 'agora') {
    if (!g.inicio && !g.culto) return 'Coloque o horário de início ou o horário do culto.';
    if (g.culto && g.culto <= hm) return `O horário do culto (${g.culto}) já passou hoje.`;
    if (g.inicio && g.culto && g.inicio >= g.culto) return 'O pré-culto precisa começar antes do horário do culto.';
    if (g.inicio && !itensIdx.length) return 'Marque o que passa no pré-culto.';
  }
  return g;
}
function enviarProg(acao) {
  const g = lerProg(acao);
  if (typeof g === 'string') { $('progErro').textContent = g; return; }
  $('progErro').textContent = '';
  const base = $('progBase').value;
  const pedido = { prog: g };
  if (base !== 'roteiro') {
    const p = presets.find(x => x.id === base);
    const atual = roteiroAtual().length;
    if (atual && !confirm(`A programação usa o preset “${p.nome}”: o roteiro aberto (${atual} eventos) será trocado por ele. Continuar?`)) return;
    pedido.preset = base;
  }
  // salva também os horários para a próxima vez
  gravar('bibleStudioHomeProg', { inicio: g.inicio, culto: g.culto, repetir: g.repetir, seg: g.seg });
  operar(pedido);
}
$('progBase').onchange = montarEventosProg;
$('progLista').addEventListener('change', resumoProg);
['progInicio', 'progCulto', 'progAbertura'].forEach(id => $(id).addEventListener('input', resumoProg));
$('progAgendar').onclick = () => enviarProg('agendar');
$('progAgora').onclick = () => enviarProg('agora');

// ---------- ferramentas ----------
const ACOES = {
  operar: () => operar(),
  presets: () => $('presets').scrollIntoView({ behavior: 'smooth' }),
  programacao: () => $('programacao').scrollIntoView({ behavior: 'smooth' }),
  criador: () => ponte && ponte.abrirCriador(),
  celular: abrirQr,
  pastaCelular: () => ponte && ponte.mostrarPasta('celular'),
  pastaVideos: () => ponte && ponte.mostrarPasta('videos'),
  atalhos: () => abrir('modalAtalhos'),
};
document.querySelectorAll('.ferramenta').forEach(b => b.onclick = () => ACOES[b.dataset.acao]());
$('btnOperar').onclick = () => operar();
$('btnOperarTopo').onclick = () => operar();
$('btnCriador').onclick = ACOES.criador;
$('btnCelular').onclick = abrirQr;
$('btnCelularTopo').onclick = abrirQr;
$('btnSite').onclick = () => ponte && ponte.abrirSite();

// ---------- pasta e backups ----------
async function montarPasta(info) {
  if (!ponte || !ponte.pastaInfo) return;
  info = info || await ponte.pastaInfo();
  $('pastaCaminho').textContent = info.pasta;
  $('pastaSub').innerHTML = Object.values(info.subpastas).map(n => `<span>${esc(n)}</span>`).join('');
  $('optCopiar').checked = info.copiarMidias;
  $('optBackupAuto').checked = info.backupAuto;
  $('backupInfo').textContent = info.ultimoBackup
    ? 'Último backup automático: ' + new Date(info.ultimoBackup).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Nenhum backup automático ainda';
}
$('btnMudarPasta').onclick = async () => { const info = await ponte.escolherPasta(); montarPasta(info); toast('Pasta: ' + info.pasta); };
$('btnAbrirPasta').onclick = () => ponte.mostrarPasta('base');
$('optCopiar').onchange = e => ponte.pastaConfig({ copiarMidias: e.target.checked }).then(montarPasta);
$('optBackupAuto').onchange = e => ponte.pastaConfig({ backupAuto: e.target.checked }).then(montarPasta);
$('btnBackup').onclick = async () => {
  const b = $('btnBackup');
  b.disabled = true;
  try { await Biblioteca.fazerBackup($('optMidiasBackup').checked); } catch (e) { toast('Não deu para fazer o backup: ' + (e.message || e)); }
  b.disabled = false;
};
async function abrirBible(caminho) {
  const r = await Biblioteca.abrir(caminho);
  if (!r) return;
  montarPresets(); montarBases(); status(); montarPasta();
  if (r.tipo === 'preset') $('presets').scrollIntoView({ behavior: 'smooth' });
}
$('btnRestaurar').onclick = () => abrirBible();
$('btnAbrirBible').onclick = () => abrirBible();

// ---------- atualização automática ----------
// mostra em que pé está a atualização: procurando, baixando, pronta ou em dia
let avisoPedido = false;             // "em dia" e erros só aparecem quando o operador mandou procurar
function mostrarAtualizacao(a) {
  if (!a) return;
  const caixa = $('avisoAtualizacao'), txt = $('avisoAtualizacaoTxt');
  const barra = $('avisoBarra'), botao = $('btnReiniciar');
  const versao = a.versao || a.pronta || a.baixando || '';
  barra.hidden = true;
  botao.hidden = true;
  caixa.classList.remove('calma');
  if (a.fase === 'pronta' || a.pronta) {
    txt.textContent = `A versão ${versao} do BibleLyrics já foi baixada. Ela é instalada quando você fechar o app — ou agora:`;
    botao.hidden = false;
  } else if (a.fase === 'baixando') {
    txt.textContent = `Versão ${versao} disponível — baixando sozinho${a.porcento ? ` (${a.porcento}%)` : ''}. Aviso quando estiver pronta.`;
    barra.hidden = false;
    barra.firstElementChild.style.width = (a.porcento || 3) + '%';
  } else if (a.fase === 'procurando' && avisoPedido) {
    txt.textContent = 'Procurando uma versão nova…';
    caixa.classList.add('calma');
  } else if (a.fase === 'em-dia' && avisoPedido) {
    txt.textContent = 'Você já está na versão mais nova do BibleLyrics.';
    caixa.classList.add('calma');
    setTimeout(() => { if (caixa.classList.contains('calma')) caixa.hidden = true; }, 6000);
  } else if (a.fase === 'erro' && avisoPedido) {
    txt.textContent = 'Não consegui verificar agora — veja a conexão com a internet e tente de novo.';
    caixa.classList.add('calma');
  } else if (!a.ativa && avisoPedido) {
    txt.textContent = 'Esta é a versão portátil: ela não se atualiza sozinha. Baixe a nova pelo site.';
    caixa.classList.add('calma');
  } else { caixa.hidden = true; return; }
  caixa.hidden = false;
}
$('btnReiniciar').onclick = () => ponte.instalarAtualizacao();
$('btnVerificar').onclick = async () => {
  if (!ponte || !ponte.verificarAtualizacao) return;
  avisoPedido = true;
  mostrarAtualizacao({ fase: 'procurando', ativa: true });
  mostrarAtualizacao(await ponte.verificarAtualizacao());
};

// ---------- janelas ----------
function abrir(id) { $(id).classList.add('on'); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
  if (e.target === m || e.target.closest('[data-fechar]')) m.classList.remove('on');
}));
addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));
  // Enter fora de campos de texto = iniciar operação
  if (e.key === 'Enter' && !e.target.closest('input, select, textarea, button, form') && !document.querySelector('.modal.on')) operar();
});

// ---------- início ----------
(function iniciar() {
  const salvo = ler('bibleStudioHomeProg', {});
  const prog = ler('bibleStudioProg', {});
  $('progInicio').value = prog.armado ? prog.inicio || '' : salvo.inicio || '';
  $('progCulto').value = prog.armado ? prog.culto || '' : salvo.culto || '';
  $('progRepetir').checked = (prog.repetir ?? salvo.repetir) !== false;
  $('progSeg').value = prog.seg || salvo.seg || 10;
  relogio();
  setInterval(relogio, 15000);
  montarPresets();
  montarBases();
  status();
  telas();
  celular();
  if (ponte) ponte.on('displays-changed', telas);
  if (ponte && ponte.pastaInfo) {
    montarPasta();
    ponte.estadoAtualizacao().then(mostrarAtualizacao);
    ponte.on('atualizacao', mostrarAtualizacao);
    Biblioteca.ouvirArquivosAbertos(() => { montarPresets(); montarBases(); status(); });
    setTimeout(() => Biblioteca.backupAutomatico().then(() => montarPasta()), 4000);
  }
  // a lista de presets muda se a janela do criador (ou outra) mexer nos dados
  addEventListener('storage', () => { montarPresets(); montarBases(); status(); });
})();
