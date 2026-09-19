// Programação da reunião: pré-culto automático e abertura no horário do culto.
// Antes do culto, os eventos marcados passam sozinhos, em sequência (e podem repetir).
// No horário do culto, a sequência para e a "abertura" (ex.: o louvor) vai para o ar.
// Depois disso tudo fica manual, pelo PC ou pelo celular.
window.Programacao = (function () {
  const CHAVE = 'bibleStudioProg';
  const C = { inicio: '', culto: '', abertura: '', itens: [], repetir: true, seg: 10, armado: false };
  try { Object.assign(C, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) {}
  const salvarCfg = () => { try { localStorage.setItem(CHAVE, JSON.stringify(C)); } catch (e) {} };

  // parada | agendada | rodando | pausada | aguardando (sequência acabou, esperando o culto)
  let fase = 'parada';
  let atual = null;           // id do evento do pré-culto que está no ar
  let timer = null;
  let aberturaNoAr = null;    // id da abertura enquanto ela toca (depois dela nada segue sozinho)
  let loopAntes = null;       // "Repetir (loop)" do player é desligado durante o pré-culto
  const disparou = { inicio: '', culto: '' };   // dia em que cada horário já disparou

  const doisDig = n => String(n).padStart(2, '0');
  const agoraHM = () => { const d = new Date(); return doisDig(d.getHours()) + ':' + doisDig(d.getMinutes()); };
  const hoje = () => new Date().toLocaleDateString('sv');
  const idxDe = id => MP.itens.findIndex(e => e.id === id);
  const podeNoPreCulto = ev => !!ev && ev.tipo !== 'web';
  const sequencia = () => MP.itens.filter(e => C.itens.includes(e.id) && podeNoPreCulto(e));
  const ativa = () => fase !== 'parada';

  function segundosAte(hm) {
    if (!hm) return null;
    const [h, m] = hm.split(':').map(Number);
    const alvo = new Date(); alvo.setHours(h, m, 0, 0);
    return Math.round((alvo - Date.now()) / 1000);
  }
  function fmtFalta(s) {
    if (s == null) return '';
    if (s <= 0) return 'agora';
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return h ? `${h}h${doisDig(m)}` : `${m}:${doisDig(x)}`;
  }

  // o próprio pré-culto corta; qualquer outro corte é o operador assumindo
  let cortandoAqui = false;
  function cortarAqui(i) {
    cortandoAqui = true;
    try { selecionarPrevia(i); cortar(); } finally { cortandoAqui = false; }
  }

  function desligarLoop() { if (loopAntes === null) { loopAntes = MP.loop; MP.loop = false; } }
  function restaurarLoop() { if (loopAntes !== null) { MP.loop = loopAntes; loopAntes = null; } }

  function tocarProximo() {
    clearTimeout(timer);
    const seq = sequencia();
    if (!seq.length) { fase = C.armado ? 'aguardando' : 'parada'; atual = null; return atualizar(); }
    const pos = atual ? seq.findIndex(e => e.id === atual) : -1;
    let prox = seq[pos + 1];
    if (!prox) {
      if (!C.repetir) { fase = C.armado && C.culto ? 'aguardando' : 'parada'; atual = null; if (fase === 'parada') restaurarLoop(); return atualizar(); }
      prox = seq[0];
    }
    atual = prox.id;
    fase = 'rodando';
    cortarAqui(idxDe(prox.id));
    // vídeo e áudio seguem quando terminam (aoFimDaMidia); o resto fica "seg" segundos
    if (prox.tipo !== 'video' && prox.tipo !== 'audio') timer = setTimeout(tocarProximo, Math.max(3, C.seg) * 1000);
    else if (prox.semSuporte) timer = setTimeout(tocarProximo, 1500);
    atualizar();
  }

  // chamado pelo player quando uma mídia termina; true = a programação cuidou
  function aoFimDaMidia(i) {
    const ev = MP.itens[i];
    if (!ev) return false;
    if (aberturaNoAr && ev.id === aberturaNoAr) {    // acabou a abertura: daqui em diante é manual
      aberturaNoAr = null;
      pararMidia();
      return true;
    }
    if (fase === 'rodando' && ev.id === atual) {
      if (ev.tipo === 'imagem') return true;           // a foto fica o tempo da programação
      tocarProximo();
      return true;
    }
    return false;
  }

  function iniciar() {
    if (!sequencia().length) { toast('Marque na Programação o que passa no pré-culto'); return false; }
    desligarLoop();
    atual = null;
    disparou.inicio = hoje();
    const falta = segundosAte(C.culto);
    C.armado = falta != null && falta > 0;          // com horário do culto no futuro, a abertura fica agendada
    salvarCfg();
    tocarProximo();
    toast('Pré-culto começou' + (C.armado ? ` • abertura às ${C.culto}` : ''));
    analytics('programacao_iniciada', { eventos: sequencia().length, com_abertura: !!C.abertura });
    return true;
  }

  function retomar() {
    if (fase !== 'pausada' && fase !== 'aguardando') return;
    desligarLoop();
    tocarProximo();
    toast('Pré-culto retomado');
  }

  function pausar(msg) {
    clearTimeout(timer);
    fase = 'pausada';
    atual = null;
    toast(msg);
    atualizar();
  }

  function soltarAbertura() {
    clearTimeout(timer);
    const estavaRodando = fase === 'rodando';
    atual = null;
    fase = 'parada';
    C.armado = false;
    salvarCfg();
    restaurarLoop();
    const i = idxDe(C.abertura);
    if (i >= 0) {
      const ev = MP.itens[i];
      aberturaNoAr = ehMidia(ev) ? ev.id : null;
      cortarAqui(i);
      toast('Horário do culto: abertura no ar — agora é tudo manual');
    } else {
      if (estavaRodando) { pararMidia(); definirModo('clear'); }
      toast('Horário do culto: pré-culto encerrado — agora é tudo manual');
    }
    analytics('programacao_abertura', { com_abertura: i >= 0 });
    atualizar();
  }

  function parar() {
    clearTimeout(timer);
    const estavaRodando = fase === 'rodando';
    fase = 'parada';
    atual = null;
    aberturaNoAr = null;
    C.armado = false;
    salvarCfg();
    restaurarLoop();
    if (estavaRodando) pararMidia();
    toast('Programação parada');
    atualizar();
  }

  function agendar() {
    const fi = segundosAte(C.inicio), fc = segundosAte(C.culto);
    if (!C.inicio && !C.culto) { toast('Coloque o horário de início ou o horário do culto'); return false; }
    if (C.culto && fc <= 0) { toast(`O horário do culto (${C.culto}) já passou hoje`); return false; }
    if (C.inicio && C.culto && C.inicio >= C.culto) { toast('O pré-culto precisa começar antes do horário do culto'); return false; }
    if (C.inicio && !sequencia().length) { toast('Marque o que passa no pré-culto'); return false; }
    C.armado = true;
    salvarCfg();
    if (fase === 'parada') fase = 'agendada';
    disparou.inicio = disparou.culto = '';
    if (C.inicio && fi <= 0 && fase === 'agendada') iniciar();    // o início já passou: começa agora
    else toast(C.inicio ? `Pré-culto agendado para ${C.inicio}` : `Abertura agendada para ${C.culto}`);
    atualizar();
    return true;
  }

  // relógio: dispara os horários e percebe quando o operador assume
  function tique() {
    const d = hoje(), hm = agoraHM();
    if (C.armado) {
      if (C.culto && hm >= C.culto && disparou.culto !== d) { disparou.culto = d; soltarAbertura(); return; }
      if (C.inicio && fase === 'agendada' && hm >= C.inicio && disparou.inicio !== d) { disparou.inicio = d; iniciar(); return; }
    }
    if (fase === 'rodando' && atual && !cortandoAqui) {
      const i = idxDe(atual);
      if (i < 0) tocarProximo();                                  // o evento saiu do roteiro
      else if (R.liveIdx !== i) pausar('Você colocou outra coisa no ar — o pré-culto pausou' + (C.armado && C.abertura ? '. A abertura continua agendada.' : '.'));
    }
    atualizar();
  }

  // ---------- estado para a tela e o celular ----------
  function texto() {
    const falta = C.armado && C.culto ? fmtFalta(segundosAte(C.culto)) : '';
    const abertura = MP.itens[idxDe(C.abertura)];
    const quando = falta ? ` • ${abertura ? 'abertura' : 'culto'} em ${falta}` : '';
    switch (fase) {
      case 'agendada': return (C.inicio ? `Pré-culto às ${C.inicio}` : 'Pré-culto manual') + (C.culto ? ` • abertura às ${C.culto}` : '');
      case 'rodando': {
        const seq = sequencia(), k = seq.findIndex(e => e.id === atual);
        const ev = seq[k];
        return `Pré-culto no ar: ${ev ? rotulo(ev).titulo : '—'} (${k + 1}/${seq.length})` + quando;
      }
      case 'pausada': return 'Pré-culto pausado (você assumiu)' + quando;
      case 'aguardando': return 'Pré-culto terminou' + quando;
      default: return '';
    }
  }
  const estado = () => ({ fase, texto: texto(), armado: !!C.armado, temSequencia: sequencia().length > 0 });

  function atualizar() {
    const barra = $('progBarra');
    if (barra) {
      barra.hidden = !ativa();
      barra.className = 'prog-barra fase-' + fase;
      $('progTxt').textContent = texto();
      $('progRetomar').hidden = !(fase === 'pausada' || fase === 'aguardando');
      $('progComecar').hidden = fase !== 'agendada';
    }
    $('btnProgramacao')?.classList.toggle('ativo', ativa());
    if (typeof publicarEstado === 'function') publicarEstado();
  }

  // ---------- janela de configuração ----------
  function montarJanela() {
    $('progInicio').value = C.inicio;
    $('progCulto').value = C.culto;
    $('progRepetir').checked = C.repetir;
    $('progSeg').value = C.seg;
    const opcoes = MP.itens.map(ev => `<option value="${ev.id}">${esc(rotulo(ev).titulo || '')}</option>`).join('');
    $('progAbertura').innerHTML = '<option value="">Nada — só encerra o pré-culto</option>' + opcoes;
    $('progAbertura').value = idxDe(C.abertura) >= 0 ? C.abertura : '';
    const lista = $('progLista');
    lista.innerHTML = '';
    const candidatos = MP.itens.filter(podeNoPreCulto);
    if (!candidatos.length) lista.innerHTML = '<p class="hint">O roteiro está vazio. Adicione os testemunhos, fotos, avisos e o louvor de abertura — dá para arrastar os arquivos do Windows direto para o roteiro.</p>';
    candidatos.forEach(ev => {
      const r = rotulo(ev);
      const l = document.createElement('label');
      l.className = 'prog-item';
      l.innerHTML = `<input type="checkbox" value="${ev.id}"${C.itens.includes(ev.id) ? ' checked' : ''}>${icone(r.icone, 'prog-ico')}<span><b>${esc(r.titulo || '')}</b><small>${esc(r.sub || '')}</small></span>`;
      lista.appendChild(l);
    });
    $('progResumo').textContent = texto();
    $('progParar').hidden = !ativa();
  }
  function lerJanela() {
    C.inicio = $('progInicio').value;
    C.culto = $('progCulto').value;
    C.abertura = $('progAbertura').value;
    C.repetir = $('progRepetir').checked;
    C.seg = Math.max(3, Math.min(600, +$('progSeg').value || 10));
    C.itens = [...$('progLista').querySelectorAll('input:checked')].map(x => x.value);
    salvarCfg();
  }
  function abrir() { montarJanela(); abrirModal('modalProg'); }

  $('btnProgramacao').onclick = abrir;
  $('progAgendar').onclick = () => { lerJanela(); if (agendar()) fecharModal('modalProg'); };
  $('progAgora').onclick = () => { lerJanela(); if (iniciar()) fecharModal('modalProg'); };
  $('progParar').onclick = () => { parar(); fecharModal('modalProg'); };
  $('progBarraParar').onclick = parar;
  $('progRetomar').onclick = retomar;
  $('progComecar').onclick = iniciar;
  $('progConfig').onclick = abrir;

  // ao abrir o app: continua agendada; se o horário do culto já passou, desarma
  if (C.armado) {
    const fc = segundosAte(C.culto);
    if (C.culto && fc <= 0) { C.armado = false; salvarCfg(); }
    else fase = 'agendada';
  }
  setInterval(tique, 1000);
  setTimeout(tique, 1500);
  atualizar();

  // usado pela tela Início: grava a configuração e agenda (ou começa, se o início já passou)
  function configurar(cfg) {
    Object.assign(C, cfg);
    salvarCfg();
    atualizar();
  }

  return {
    aoFimDaMidia, iniciar, parar, retomar, estado, abrir, configurar, agendar,
    noPreCulto: id => C.itens.includes(id),
    ehAbertura: id => C.abertura === id,
    alternarItem(id) {
      C.itens = C.itens.includes(id) ? C.itens.filter(x => x !== id) : [...C.itens, id];
      salvarCfg();
      toast(C.itens.includes(id) ? 'Incluído no pré-culto' : 'Tirado do pré-culto');
      atualizar();
    },
    definirAbertura(id) {
      C.abertura = C.abertura === id ? '' : id;
      salvarCfg();
      toast(C.abertura ? 'Abertura do culto definida — ajuste o horário em Programação' : 'Abertura removida');
      atualizar();
    },
  };
})();
