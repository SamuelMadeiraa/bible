// Ao abrir a operação: aplica o que foi pedido na tela Início (preset, programação, janelas)
// e coloca no roteiro os arquivos que ficaram esperando (ex.: vídeo gerado no criador).
(function () {
  const ler = chave => { try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { return null; } };
  const apagar = chave => { try { localStorage.removeItem(chave); } catch (e) {} };

  // arquivos que chegaram enquanto a operação estava fechada
  const pendentes = ler('bibleStudioPendentes');
  apagar('bibleStudioPendentes');
  if (Array.isArray(pendentes) && pendentes.length) setTimeout(() => adicionarArquivos(pendentes), 300);

  // backup automático do dia (sem as mídias) e aviso de versão nova baixada
  setTimeout(() => Biblioteca.backupAutomatico(), 5000);
  if (ponte) ponte.on('atualizacao', a => {
    if (a.pronta) toast(`BibleLyrics ${a.pronta} baixado — será instalado quando você fechar o app`);
    else if (a.fase === 'baixando' && !a.porcento) toast(`Versão ${a.versao} do BibleLyrics disponível — baixando em segundo plano`);
  });

  const pedido = ler('bibleStudioAbrir');
  apagar('bibleStudioAbrir');
  if (!pedido) return;

  setTimeout(() => {
    // preset: troca o roteiro pelo preset (a tela Início já confirmou com o operador)
    if (pedido.preset) {
      const p = meusPresets.find(x => x.id === pedido.preset);
      if (!p) toast('Preset não encontrado');
      else {
        pararMidia();
        MP.itens = [];
        MP.idx = R.prevIdx = R.liveIdx = -1;
        esconderPreviaEvento();
        if (p.itens.length) usarPreset(p, 'substituir');
        else { salvarMidia(); montarLista(); definirPresetAtivo(p.id); toast(`Preset “${p.nome}” aberto — monte o roteiro e clique em “Salvar no preset”`); }
      }
    }

    // programação montada no Início: os eventos vêm por posição no roteiro (os ids mudam ao abrir um preset)
    if (pedido.prog && window.Programacao) {
      const g = pedido.prog;
      const idPor = i => (MP.itens[i] || {}).id;
      Programacao.configurar({
        inicio: g.inicio || '', culto: g.culto || '', repetir: g.repetir !== false, seg: g.seg || 10,
        itens: (g.itensIdx || []).map(idPor).filter(Boolean),
        abertura: g.aberturaIdx >= 0 ? idPor(g.aberturaIdx) || '' : '',
      });
      if (g.acao === 'agora') Programacao.iniciar();
      else Programacao.agendar();
    }

    if (pedido.abrir === 'programacao' && window.Programacao) Programacao.abrir();
    if (pedido.abrir === 'presets') abrirPresets();
    if (pedido.abrir === 'celular') $('btnCelular').click();
  }, 400);
})();
