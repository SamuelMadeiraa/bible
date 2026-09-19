// Arquivos .bible nas telas: exportar preset, fazer e restaurar backup, abrir por duplo clique
// e backup automático. O trabalho pesado (ZIP, pastas, mídias) fica no processo principal.
window.Biblioteca = (function () {
  const ponteB = window.bridge;
  // chaves que não vão para o backup (pedidos de passagem entre telas)
  const TEMPORARIAS = ['bibleStudioAbrir', 'bibleStudioPendentes'];
  const EXT_MIDIA = /\.(mp4|webm|mkv|avi|mov|wmv|m4v|mpg|mpeg|ts|mp3|m4a|aac|wav|ogg|opus|flac|m4b|oga|weba|mka|wma|aif|aiff|amr|ac3|jpg|jpeg|png|webp|gif|bmp)$/i;

  function dadosDoApp() {
    const d = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('bibleStudio') && !TEMPORARIAS.includes(k)) d[k] = localStorage.getItem(k);
    }
    return d;
  }
  // caminhos de mídia citados nos dados (roteiro, presets, criador de vídeo)
  function midiasEm(textos) {
    const achados = new Set();
    const re = /"([A-Za-z]:\\\\(?:[^"\\]|\\.)*)"/g;
    for (const t of textos) {
      let m;
      while ((m = re.exec(t))) {
        try { const c = JSON.parse('"' + m[1] + '"'); if (EXT_MIDIA.test(c)) achados.add(c); } catch (e) {}
      }
    }
    return [...achados];
  }
  // troca os caminhos antigos pelos novos (onde as mídias foram extraídas) dentro do texto JSON
  function remapear(texto, mapa) {
    for (const [antigo, novo] of Object.entries(mapa || {})) {
      texto = texto.split(JSON.stringify(antigo).slice(1, -1)).join(JSON.stringify(novo).slice(1, -1));
    }
    return texto;
  }
  const hoje = () => new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

  async function exportarPreset(preset, incluirMidias = true) {
    const midias = midiasEm([JSON.stringify(preset.itens || [])]);
    const r = await ponteB.exportarBible({ tipo: 'preset', nome: preset.nome, dados: { preset }, midias, incluirMidias });
    if (r) toast(`Preset salvo: ${nomeArquivo(r.caminho)}` + (r.midias ? ` (com ${r.midias} ${r.midias === 1 ? 'mídia' : 'mídias'})` : ''));
    return r;
  }
  async function fazerBackup(incluirMidias) {
    const dados = dadosDoApp();
    const midias = incluirMidias ? midiasEm(Object.values(dados)) : [];
    const r = await ponteB.exportarBible({ tipo: 'backup', nome: 'Backup BibleLyrics ' + hoje(), dados, midias, incluirMidias });
    if (r) toast(`Backup salvo: ${nomeArquivo(r.caminho)}`);
    return r;
  }
  const nomeArquivo = c => c.split(/[\\/]/).pop();

  // abre um .bible: preset entra na lista; backup substitui os dados do app (com confirmação)
  async function abrir(caminho) {
    let r;
    try { r = await ponteB.lerBible(caminho); } catch (e) { toast('Não consegui abrir: ' + (e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); return null; }
    if (!r) return null;
    if (r.manifest.tipo === 'preset') {
      const p = JSON.parse(remapear(JSON.stringify(r.dados.preset || {}), r.mapa));
      let presets = [];
      try { presets = JSON.parse(localStorage.getItem('bibleStudioPresets') || '[]'); } catch (e) {}
      let nome = (p.nome || 'Preset importado').slice(0, 60);
      const base = nome;
      for (let n = 2; presets.some(x => x.nome.toLowerCase() === nome.toLowerCase()); n++) nome = `${base} (${n})`;
      const agora = Date.now();
      const novo = { id: 'e' + agora.toString(36) + Math.random().toString(36).slice(2, 6), nome, criado: agora, alterado: agora, itens: p.itens || [] };
      presets.unshift(novo);
      localStorage.setItem('bibleStudioPresets', JSON.stringify(presets));
      toast(`Preset “${nome}” importado` + (Object.keys(r.mapa).length ? ` com ${Object.keys(r.mapa).length} mídia(s)` : ''));
      return { tipo: 'preset', preset: novo };
    }
    if (r.manifest.tipo === 'backup') {
      const quando = new Date(r.manifest.criado).toLocaleString('pt-BR');
      if (!confirm(`Restaurar o backup de ${quando}?\n\nPresets, roteiro, estilos e configurações deste computador serão trocados pelos do backup.`)) return null;
      // guarda os dados atuais antes, por segurança
      try { await ponteB.exportarBible({ tipo: 'backup', nome: 'Antes de restaurar', dados: dadosDoApp(), auto: true }); } catch (e) {}
      for (const [k, v] of Object.entries(r.dados)) {
        if (k.startsWith('bibleStudio') && typeof v === 'string') localStorage.setItem(k, remapear(v, r.mapa));
      }
      toast('Backup restaurado');
      return { tipo: 'backup' };
    }
    toast('Tipo de arquivo desconhecido');
    return null;
  }

  // uma vez por dia, um backup sem as mídias na pasta Backups
  async function backupAutomatico() {
    try {
      const info = await ponteB.pastaInfo();
      if (!info.backupAuto || Date.now() - (info.ultimoBackup || 0) < 20 * 3600 * 1000) return;
      await ponteB.exportarBible({ tipo: 'backup', nome: 'Backup automático', dados: dadosDoApp(), auto: true });
    } catch (e) {}
  }

  // .bible aberto pelo Windows (duplo clique): quem estiver na tela cuida
  function ouvirArquivosAbertos(depois) {
    const verificar = async () => {
      const c = await ponteB.biblePendente();
      if (c) { const r = await abrir(c); if (r && depois) depois(r); }
    };
    ponteB.on('bible:abrir', verificar);
    setTimeout(verificar, 800);
  }

  return { exportarPreset, fazerBackup, abrir, backupAutomatico, ouvirArquivosAbertos, midiasEm };
})();
