// Playlist de músicas do computador.
// Toca no computador, separada do roteiro: dá para ter louvor de fundo enquanto o
// versículo está na tela. O celular controla tocar, trocar e o volume.
window.Musicas = (function () {
  const CHAVE = 'bibleStudioMusicas';
  // tenta tocar qualquer formato de áudio; se o Windows/Chromium não souber, o item avisa
  const EXT = /\.(mp3|m4a|m4b|aac|wav|ogg|oga|opus|flac|weba|mka|wma|aif|aiff|amr|ac3|mp2|wv|ape|alac|dsf)$/i;

  // repetir: volta ao começo da playlist quando acaba a última
  // loop: repete sem parar a música que está tocando
  const M = { itens: [], idx: -1, volume: 70, repetir: true, aleatorio: false, loop: false };
  try { Object.assign(M, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) {}
  M.itens = (M.itens || []).filter(x => x && x.caminho);

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = M.volume / 100;
  let tocando = false;

  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ ...M, itens: M.itens.map(({ id, caminho, nome, dur, erro }) => ({ id, caminho, nome, dur, erro })) })); } catch (e) {} };
  const novoId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const nomeDoArquivo = c => c.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
  const atual = () => M.itens[M.idx] || null;

  // ---------- lista ----------
  async function adicionar(caminhos) {
    let aceitos = (caminhos || []).filter(c => EXT.test(c));
    const fora = (caminhos || []).length - aceitos.length;
    if (aceitos.length && ponte && ponte.guardarMidias) {
      try { aceitos = await ponte.guardarMidias(aceitos); } catch (e) {}
    }
    const novos = aceitos.map(c => ({ id: novoId(), caminho: c, nome: nomeDoArquivo(c) }));
    M.itens.push(...novos);
    salvar();
    montar();
    novos.forEach(medirDuracao);
    if (novos.length) toast(`${novos.length} ${novos.length === 1 ? 'música' : 'músicas'} na playlist`);
    else if (fora) toast('Só dá para colocar arquivos de música aqui');
    return novos.length;
  }
  // lê a duração (e já descobre se o formato toca neste computador)
  function medirDuracao(item) {
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => { item.dur = Math.round(a.duration) || 0; delete item.erro; salvar(); montar(); };
    a.onerror = () => { item.erro = 'este formato não toca no Windows'; salvar(); montar(); };
    a.src = urlArquivo(item.caminho);
  }
  function remover(i) {
    if (i < 0 || i >= M.itens.length) return;
    const eraAtual = i === M.idx;
    M.itens.splice(i, 1);
    if (eraAtual) { parar(); M.idx = Math.min(i, M.itens.length - 1); }
    else if (i < M.idx) M.idx--;
    salvar();
    montar();
  }
  function limpar() { parar(); M.itens = []; M.idx = -1; salvar(); montar(); }

  // ---------- tocar ----------
  function tocar(i) {
    const item = M.itens[i];
    if (!item) return;
    M.idx = i;
    audio.src = urlArquivo(item.caminho);
    audio.loop = M.loop;
    audio.volume = M.volume / 100;
    audio.play().then(() => { tocando = true; delete item.erro; montar(); })
      .catch(() => { tocando = false; item.erro = 'não consegui tocar este arquivo'; montar(); });
    montar();
  }
  function alternarPlay() {
    if (!M.itens.length) return;
    if (M.idx < 0) return tocar(0);
    if (tocando) { audio.pause(); tocando = false; } else { audio.play().catch(() => {}); tocando = true; }
    montar();
  }
  function parar() { audio.pause(); audio.currentTime = 0; tocando = false; montar(); }
  function pular(d) {
    if (!M.itens.length) return;
    if (M.aleatorio && M.itens.length > 1) {
      let n = M.idx;
      while (n === M.idx) n = Math.floor(Math.random() * M.itens.length);
      return tocar(n);
    }
    const n = (M.idx + d + M.itens.length) % M.itens.length;
    tocar(n);
  }
  function definirVolume(v) {
    M.volume = Math.max(0, Math.min(100, Math.round(v)));
    audio.volume = M.volume / 100;
    salvar();
    montar();
  }
  const mudarVolume = d => definirVolume(M.volume + d);
  function irPara(t) { if (isFinite(t)) audio.currentTime = Math.max(0, t); montar(); }

  audio.addEventListener('ended', () => {
    if (M.loop) { audio.currentTime = 0; audio.play().catch(() => {}); montar(); return; }
    if (M.repetir || M.idx < M.itens.length - 1) pular(1);
    else { tocando = false; montar(); }
  });
  // repetir a música atual (botão no PC e no celular)
  function definirLoop(v) {
    M.loop = !!v;
    audio.loop = M.loop;        // sem cortes entre uma volta e outra
    salvar();
    montar();
  }
  const alternarLoop = () => definirLoop(!M.loop);
  audio.addEventListener('timeupdate', () => { if (Math.abs(audio.currentTime - (audio.__ultimo || 0)) > 0.9) { audio.__ultimo = audio.currentTime; montar(); } });

  // ---------- tela ----------
  function montar() {
    const box = $('listaMusicas');
    if (!box) return;
    box.innerHTML = '';
    if (!M.itens.length) {
      box.innerHTML = '<p class="hint" style="padding:10px">Nenhuma música ainda. Use <b>Adicionar músicas</b> ou arraste os arquivos para cá.</p>';
    }
    M.itens.forEach((item, i) => {
      const d = document.createElement('div');
      d.className = 'mus-item' + (i === M.idx ? ' on' : '') + (item.erro ? ' ruim' : '');
      d.innerHTML = `<span class="mus-n">${i + 1}</span>
        <span class="mus-nome">${esc(item.nome)}${item.erro ? `<small>${esc(item.erro)}</small>` : ''}</span>
        <span class="mus-dur">${item.dur ? fmt(item.dur) : ''}</span>
        <button class="mus-x" title="Tirar da playlist">×</button>`;
      d.onclick = e => { if (!e.target.closest('.mus-x')) tocar(i); };
      d.querySelector('.mus-x').onclick = () => remover(i);
      box.appendChild(d);
    });
    const item = atual();
    if ($('musAgora')) $('musAgora').textContent = item ? item.nome : 'Nada tocando';
    if ($('musTempo')) $('musTempo').textContent = item ? `${fmt(audio.currentTime || 0)} / ${item.dur ? fmt(item.dur) : '—'}` : '';
    if ($('musPlay')) porIcone($('musPlay').querySelector('i') || $('musPlay'), tocando ? 'pause' : 'play');
    if ($('musVol')) $('musVol').value = M.volume;
    if ($('musVolTxt')) $('musVolTxt').textContent = M.volume + '%';
    if ($('musLoop')) { $('musLoop').checked = M.loop; $('musLoop').closest('.check')?.classList.toggle('ligado', M.loop); }
    if ($('musRepetir')) $('musRepetir').checked = M.repetir;
    if ($('musAleatorio')) $('musAleatorio').checked = M.aleatorio;
    if (typeof publicarEstado === 'function') publicarEstado();
  }

  // ---------- estado para o celular ----------
  function estado() {
    const item = atual();
    return {
      itens: M.itens.map(x => ({ nome: x.nome, dur: x.dur || 0, erro: x.erro || '' })),
      idx: M.idx,
      tocando,
      volume: M.volume,
      loop: M.loop,
      repetir: M.repetir,
      aleatorio: M.aleatorio,
      t: Math.round(audio.currentTime || 0),
      dur: Math.round((item && item.dur) || 0),
      nome: item ? item.nome : '',
    };
  }

  function ligarBotoes() {
    if (!$('musPlay')) return;
    $('musPlay').onclick = alternarPlay;
    $('musParar').onclick = parar;
    $('musProx').onclick = () => pular(1);
    $('musAnt').onclick = () => pular(-1);
    $('musVol').addEventListener('input', e => definirVolume(+e.target.value));
    $('musLoop').addEventListener('change', e => definirLoop(e.target.checked));
    $('musRepetir').addEventListener('change', e => { M.repetir = e.target.checked; salvar(); });
    $('musAleatorio').addEventListener('change', e => { M.aleatorio = e.target.checked; salvar(); });
    $('btnAddMusicas').onclick = async () => {
      if (!ponte || !ponte.escolherArquivo) return toast('Abra pelo aplicativo para escolher arquivos');
      const caminhos = await ponte.escolherArquivo({ tipo: 'audio', varios: true });
      if (caminhos && caminhos.length) adicionar(caminhos);
    };
    // arrastar arquivos para o painel
    const bloco = $('blocoMusicas');
    bloco.addEventListener('dragover', e => { e.preventDefault(); bloco.classList.add('soltar'); });
    bloco.addEventListener('dragleave', () => bloco.classList.remove('soltar'));
    bloco.addEventListener('drop', e => {
      bloco.classList.remove('soltar');
      if (!ponte || !ponte.caminhoDoArquivo) return;
      const caminhos = [...e.dataTransfer.files].map(f => ponte.caminhoDoArquivo(f)).filter(Boolean);
      if (caminhos.length) { e.preventDefault(); e.stopPropagation(); adicionar(caminhos); }
    }, true);
    montar();
    M.itens.filter(x => !x.dur && !x.erro).forEach(medirDuracao);
  }
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', ligarBotoes) : ligarBotoes();

  audio.loop = M.loop;
  return { adicionar, tocar, alternarPlay, parar, pular, definirVolume, mudarVolume, irPara, remover, limpar, estado, montar, definirLoop, alternarLoop };
})();
