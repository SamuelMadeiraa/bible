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
    cron: $('cronValor') ? { valor: $('cronValor').textContent, rotulo: $('cronRotulo').textContent, classe: $('cron').className } : null,
    resultados: ultimosResultados,
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
    case 'midiaVolume':
      $('pVol').value = cmd.valor;
      $('pVol').dispatchEvent(new Event('input'));
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

  // links e senha do controle na aba "Saída"
  (async () => {
    const info = await ponte.remoteInfo();
    const box = $('controleInfo');
    if (!box || !info.urls.length) return;
    box.innerHTML = '';
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.innerHTML = `Senha do controle: <b>${info.pin}</b>`;
    box.appendChild(pin);
    info.urls.forEach((u, i) => {
      if (i === 0) return;                 // o primeiro é localhost, não serve para o celular
      const d = document.createElement('div');
      d.className = 'link';
      const inp = document.createElement('input');
      inp.type = 'text'; inp.readOnly = true; inp.value = u;
      const cp = document.createElement('button');
      cp.textContent = 'Copiar';
      cp.onclick = () => navigator.clipboard.writeText(u).then(() => toast('Link copiado!'));
      d.append(inp, cp);
      box.appendChild(d);
    });
    if (info.urls.length <= 1) box.insertAdjacentHTML('beforeend',
      '<p class="hint">Este PC não está numa rede Wi-Fi/cabo, então não há endereço para o celular.</p>');
  })();
}
