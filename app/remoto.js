// Ponte com o controle no celular: publica o estado do app e executa os comandos recebidos.
// Roda dentro da tela do operador, então usa as mesmas funções dos botões.

const RESUMO = 140;   // quantas letras de cada versículo vão para o celular

function estadoParaCelular() {
  const cap = BIBLIA[P.b] ? BIBLIA[P.b].chapters[P.c] : [];
  const item = typeof MP !== 'undefined' ? MP.itens[MP.idx] : null;
  return {
    projecao: saida.open,
    monitor: (monitores.find(m => m.id === saida.displayId) || {}).label || '',
    livro: BIBLIA[P.b] ? BIBLIA[P.b].name : '',
    livroIdx: P.b,
    cap: P.c,
    caps: BIBLIA[P.b] ? BIBLIA[P.b].chapters.length : 0,
    v1: P.v1,
    v2: P.v2,
    versiculos: cap.map((t, i) => (t.length > RESUMO ? t.slice(0, RESUMO) + '…' : t)),
    prevRef: referencia,
    prevTexto: texto.length > 260 ? texto.slice(0, 260) + '…' : texto,
    liveRef: live.ref || '',
    modo: live.slide ? live.slide.mode : 'off',
    auto: S.autoLive,
    livros: BIBLIA.map(l => l.name),
    roteiro: typeof MP === 'undefined' ? [] : MP.itens.map(ev => {
      const r = rotulo(ev);
      return { tipo: ev.tipo, nome: r.titulo, sub: (r.sub || '').slice(0, 80), icone: r.icone, semSuporte: !!ev.semSuporte };
    }),
    prevIdx: typeof R === 'undefined' ? -1 : R.prevIdx,
    liveIdx: typeof R === 'undefined' ? -1 : R.liveIdx,
    midia: typeof MP === 'undefined' ? null : {
      itens: MP.itens.map(x => ({ nome: rotulo(x).titulo, tipo: x.tipo, semSuporte: !!x.semSuporte })),
      idx: MP.idx,
      tocando,
      t: Math.round(tAtual),
      dur: Math.round(durAtual),
      volume: MP.volume,
      status: $('pStatus') ? $('pStatus').textContent : '',
    },
    // palavras da prévia com a cor do destaque, para o celular poder destacar também
    palavras: (() => {
      const tks = typeof tokens === 'function' ? tokens() : [];
      const cores = typeof mapaDestaque === 'function' ? mapaDestaque(tks) : [];
      return tks.slice(0, 120).map((t, i) => ({ t, cor: cores[i] || '' }));
    })(),
    presets: typeof meusPresets === 'undefined' ? [] : meusPresets.map(p => ({ id: p.id, nome: p.nome, itens: (p.itens || []).length })),
    presetAtivo: typeof presetAtivo === 'undefined' ? null : presetAtivo,
    musicas: window.Musicas ? Musicas.estado() : null,
    cron: $('cronValor') ? { valor: $('cronValor').textContent, rotulo: $('cronRotulo').textContent, classe: $('cron').className } : null,
    resultados: ultimosResultados,
    programacao: window.Programacao ? Programacao.estado() : null,
    em: Date.now(),
  };
}

let ultimosResultados = [];
let envioAgendado = false;
function publicarEstado() {
  if (!ponte || envioAgendado) return;
  envioAgendado = true;
  setTimeout(() => {
    envioAgendado = false;
    try { ponte.putEstado(estadoParaCelular()); } catch (e) {}
  }, 150);
}

// busca feita pelo celular (devolve no próprio estado)
function buscarParaCelular(q) {
  const termo = semAcento((q || '').trim());
  ultimosResultados = [];
  if (termo.length >= 3) {
    fora: for (let b = 0; b < BIBLIA.length; b++)
      for (let c = 0; c < BIBLIA[b].chapters.length; c++)
        for (let v = 0; v < BIBLIA[b].chapters[c].length; v++) {
          const t = BIBLIA[b].chapters[c][v];
          if (semAcento(t).includes(termo)) {
            ultimosResultados.push({
              b, c, v,
              ref: `${BIBLIA[b].name} ${c + 1}:${v + 1}`,
              t: t.length > RESUMO ? t.slice(0, RESUMO) + '…' : t,
            });
            if (ultimosResultados.length >= 40) break fora;
          }
        }
  }
  publicarEstado();
}

// ---------- comandos vindos do celular ----------
function executarRemoto(cmd) {
  switch (cmd.acao) {
    case 'proximo': passo(1); break;
    case 'anterior': passo(-1); break;
    case 'enviar':
    case 'corte': cortar(); break;
    case 'previa': selecionarPrevia(cmd.i ?? -1); break;
    case 'previaProx': previaRelativa(1); break;
    case 'previaAnt': previaRelativa(-1); break;
    case 'preview': irPara(cmd.b ?? P.b, cmd.c ?? P.c, cmd.v1 ?? P.v1, cmd.v2 ?? cmd.v1 ?? P.v1); break;
    case 'projetar':
      irPara(cmd.b ?? P.b, cmd.c ?? P.c, cmd.v1 ?? P.v1, cmd.v2 ?? cmd.v1 ?? P.v1);
      cortar();
      break;
    case 'ir':
      if (irParaTexto(cmd.ref || '')) { if (cmd.aoVivo) enviarAoVivo(); }
      else toast('Referência não encontrada: ' + (cmd.ref || ''));
      break;
    case 'buscar': buscarParaCelular(cmd.q); break;
    case 'preta': alternarModo('black'); break;
    case 'limpar': alternarModo('clear'); break;
    case 'aoVivo': if (live.slide && live.slide.mode !== 'live') alternarModo(live.slide.mode); break;
    case 'auto':
      S.autoLive = !!cmd.valor;
      $('chkAuto').checked = S.autoLive;
      salvar();
      if (S.autoLive) enviarAoVivo();
      break;
    case 'projecao':
      if (cmd.valor) { if (!saida.open) abrirProjecao(+$('selMonitor').value); }
      else if (saida.open) ponte.closeOutput();
      break;

    // mídia
    case 'midiaTocar':
    case 'noAr': selecionarPrevia(cmd.i ?? 0); cortar(); break;
    case 'midiaPlay': alternarPlay(); break;
    case 'midiaParar': pararMidia(); break;
    case 'midiaProxima': proximaMidia(1); break;
    case 'midiaAnterior': proximaMidia(-1); break;
    case 'midiaVolume': {
      // o celular manda o valor certo (barra) ou um passo de +5/-5 (botões)
      const v = cmd.d != null ? MP.volume + cmd.d : cmd.valor;
      $('pVol').value = Math.max(0, Math.min(100, Math.round(v)));
      $('pVol').dispatchEvent(new Event('input'));
      break;
    }
    // arquivo que o celular enviou (já gravado no PC)
    case 'arquivoRecebido':
      if (!cmd.caminho) break;
      if (cmd.destino === 'musica' && window.Musicas) Musicas.adicionar([cmd.caminho]);
      else adicionarArquivos([cmd.caminho]);
      break;
    // programação (pré-culto automático)
    case 'progIniciar': window.Programacao?.iniciar(); break;
    case 'progRetomar': window.Programacao?.retomar(); break;
    case 'progParar': window.Programacao?.parar(); break;
    // montar o roteiro pelo celular
    case 'addVersiculo':
      if (cmd.b != null) irPara(cmd.b, cmd.c, cmd.v1, cmd.v2 ?? cmd.v1);
      adicionarVersiculoDaPrevia();
      break;
    case 'addEspecial': adicionarEspecial(cmd.tipo === 'fundo' ? 'fundo' : 'preta'); break;
    case 'addTexto':
      if ((cmd.texto || '').trim()) {
        adicionarEvento({ tipo: 'texto', titulo: (cmd.titulo || '').slice(0, 80), texto: cmd.texto.slice(0, 600) });
        toast('Aviso no roteiro');
      }
      break;
    case 'moverEvento': moverEvento(cmd.de, cmd.para); break;
    case 'removerEvento': removerEvento(cmd.i); break;
    case 'limparRoteiro': if (MP.itens.length) { registrar(); MP.itens = []; MP.idx = R.prevIdx = R.liveIdx = -1; pararMidia(); salvarMidia(); montarLista(); toast('Roteiro limpo pelo celular'); } break;
    case 'destacar': if (typeof alternarPalavra === 'function') alternarPalavra(cmd.i); break;
    case 'corDestaque': if (cmd.cor) { S.hlColor = cmd.cor; salvar(); montarHlSwatches(); } break;
    case 'limparDestaques':
      regras = []; cliques = {};
      montarRegras();
      mudou(false);
      if (typeof salvarDestaquesDoEvento === 'function') salvarDestaquesDoEvento();
      break;
    // pelo celular não dá para responder uma pergunta na tela do PC: o operador já
    // confirmou no próprio celular, então aqui a troca é direta
    case 'presetAbrir': {
      const p = typeof acharPreset === 'function' ? acharPreset(cmd.id) : null;
      if (!p) break;
      const trocar = cmd.modo !== 'juntar';
      if (trocar) {
        pararMidia();
        registrar();
        MP.itens = [];
        MP.idx = R.prevIdx = R.liveIdx = -1;
        esconderPreviaEvento();
        salvarMidia();
      }
      usarPreset(p, 'juntar');
      if (trocar) { selecionarPrevia(0); definirPresetAtivo(p.id); }
      break;
    }
    // roteiro montado no celular sem conexão: vira um preset aqui
    case 'presetDoCelular': {
      const limpos = (cmd.itens || []).filter(ev => ev && ['versiculo', 'texto', 'preta', 'fundo'].includes(ev.tipo))
        .map(ev => limparEvento({ ...ev, id: novoId() }))
        .slice(0, 300);
      if (!limpos.length) break;
      let nome = (cmd.nome || 'Do celular').slice(0, 60);
      const base = nome;
      for (let n = 2; typeof nomeRepetido === 'function' && nomeRepetido(nome); n++) nome = `${base} (${n})`;
      const agora = Date.now();
      meusPresets.unshift({ id: novoId(), nome, criado: agora, alterado: agora, itens: limpos });
      salvarPresets();
      if (typeof montarPresets === 'function') montarPresets();
      toast(`Preset "${nome}" criado com o roteiro do celular (${limpos.length} eventos)`);
      break;
    }
    case 'presetSalvar': {
      const nome = (cmd.nome || '').trim().slice(0, 60);
      if (!nome) break;
      if (typeof nomeRepetido === 'function' && nomeRepetido(nome)) { toast('Já existe um preset com esse nome'); break; }
      const agora = Date.now();
      meusPresets.unshift({ id: novoId(), nome, criado: agora, alterado: agora, itens: MP.itens.map(limparEvento) });
      salvarPresets();
      if (typeof montarPresets === 'function') montarPresets();
      toast(`Preset "${nome}" criado pelo celular`);
      break;
    }
    case 'musPlay': window.Musicas?.alternarPlay(); break;
    case 'musParar': window.Musicas?.parar(); break;
    case 'musProx': window.Musicas?.pular(1); break;
    case 'musAnt': window.Musicas?.pular(-1); break;
    case 'musTocar': window.Musicas?.tocar(cmd.i ?? 0); break;
    case 'musVolume':
      if (cmd.d != null) window.Musicas?.mudarVolume(cmd.d);
      else if (cmd.valor != null) window.Musicas?.definirVolume(cmd.valor);
      break;
    case 'midiaSeek':
      $('pSeek').value = cmd.valor;
      $('pSeek').dispatchEvent(new Event('change'));
      break;
  }
  publicarEstado();
}

if (ponte) {
  ponte.on('remoto', executarRemoto);

  // publica o estado sempre que algo muda por aqui também
  const observar = (nome, obj) => {
    const orig = window[nome];
    if (typeof orig !== 'function') return;
    window[nome] = function (...args) {
      const r = orig.apply(this, args);
      publicarEstado();
      return r;
    };
  };
  ['publicar', 'carregarTexto', 'montarLista', 'atualizarPainel', 'atualizarSaida', 'selecionarPrevia', 'cortar'].forEach(n => observar(n));
  setInterval(publicarEstado, 2000);      // garante que o celular não fique defasado
  publicarEstado();

  // ---------- QR code para abrir o controle no celular ----------
  const QR = { info: null, rede: 0, modo: 'app' };
  const SEM_REDE = '<div class="qr-vazio">Este PC não está numa rede Wi-Fi/cabo — conecte e clique em Atualizar endereço</div>';
  const PASSOS = {
    app: [
      'Conecte o celular no <b>mesmo Wi-Fi</b> do computador.',
      'Abra a <b>câmera</b> do celular e aponte para o QR code.',
      'Toque em <b>Instalar app</b> (ou “Adicionar à tela inicial”). Das próximas vezes é só abrir o ícone <b>BibleLyrics Controle</b>.',
    ],
    direto: [
      'Conecte o celular no <b>mesmo Wi-Fi</b> do computador.',
      'Escaneie o QR code: o controle abre direto, <b>sem precisar de internet</b>.',
      'Esse modo não instala o app — use quando o celular estiver sem internet.',
    ],
  };

  function desenharQr() {
    const info = QR.info;
    if (!info) return;
    const e = info.enderecos[QR.rede];
    const svg = e ? (QR.modo === 'app' ? e.qrApp : e.qrDireto) : SEM_REDE;
    const link = e ? (QR.modo === 'app' ? e.app : e.direto) : '';

    // aba "Saída": QR pequeno
    const box = $('controleInfo');
    if (box) {
      box.innerHTML = `<div class="qr-mini">
          <div class="qr" title="Clique para ampliar">${e ? e.qrApp : SEM_REDE}</div>
          <div class="qr-lado">
            <div class="pin">Senha do controle: <b>${info.pin}</b></div>
            <button type="button" data-qr-ampliar>${icone('smartphone', 'ico-antes')}Mostrar QR code grande</button>
          </div>
        </div>`;
      box.querySelectorAll('.qr, [data-qr-ampliar]').forEach(el => el.onclick = abrirQr);
    }

    // janela
    $('qrGrande').innerHTML = svg;
    $('qrPin').textContent = info.pin;
    $('qrLink').value = link;
    $('qrPassos').innerHTML = PASSOS[QR.modo].map(p => `<li>${p}</li>`).join('');
    $('qrRedeBox').hidden = info.enderecos.length < 2;
    $('qrRede').innerHTML = info.enderecos.map((x, i) => `<option value="${i}">${x.host}${i === 0 ? ' (recomendado)' : ''}</option>`).join('');
    $('qrRede').value = QR.rede;
    $('qrAviso').innerHTML = 'Não conectou? Confira se o celular está no mesmo Wi-Fi e, se o Windows perguntar sobre o '
      + '<b>firewall</b>, permita o BibleLyrics em redes privadas.';
    document.querySelectorAll('#segQr button').forEach(b => b.classList.toggle('on', b.dataset.v === QR.modo));
  }

  async function carregarQr() {
    try { QR.info = await ponte.remoteInfo(); } catch (e) { return; }
    if (QR.rede >= QR.info.enderecos.length) QR.rede = 0;
    desenharQr();
  }
  function abrirQr() { carregarQr(); abrirModal('modalCelular'); }

  $('btnCelular').onclick = abrirQr;
  $('qrAtualizar').onclick = () => carregarQr().then(() => toast('Endereço atualizado'));
  $('qrRede').onchange = e => { QR.rede = +e.target.value; desenharQr(); };
  document.querySelectorAll('#segQr button').forEach(b => b.onclick = () => { QR.modo = b.dataset.v; desenharQr(); });
  $('qrCopiar').onclick = () => navigator.clipboard.writeText($('qrLink').value).then(() => toast('Link copiado!'));

  // o servidor pode demorar um instante para abrir a porta; e a rede pode mudar com o app aberto
  setTimeout(carregarQr, 800);
  setInterval(() => { if (!$('modalCelular').classList.contains('on')) carregarQr(); }, 30000);
}
