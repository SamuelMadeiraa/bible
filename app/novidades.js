// Janela "Novidades" da tela Início: aparece uma vez depois de cada atualização, contando o que mudou.
// Quem acabou de instalar não vê (para essa pessoa tudo é novo: o guia passo a passo cuida disso).
// Na versão de teste aparece a cada abertura do app, para dar para conferir.
// Ao lançar uma versão com novidades, troque VERSAO e ITENS.
(function () {
  const VERSAO = '3.7.1';
  const ITENS = [
    { icone: 'image', titulo: 'PDF em imagens',
      texto: 'Recebeu os avisos ou as fotos num PDF? Cada página vira uma imagem Full HD. Marque as páginas que quer e crie um preset com elas, pronto para o culto.',
      botao: 'Experimentar', acao: () => $('btnPdfHero') && $('btnPdfHero').click() },
    { icone: 'mouse-pointer-click', titulo: 'Botão Ajuda',
      texto: 'Ficou com dúvida em algum botão? Ligue a Ajuda (no topo) e passe o mouse sobre ele: aparece o que ele faz. Enquanto ela está ligada, nada é clicado.',
      botao: 'Ligar a Ajuda', acao: () => window.Guia && Guia.ajuda() },
    { icone: 'sparkles', titulo: 'Guia passo a passo',
      texto: 'Um tour que mostra cada parte da tela Início, da operação e do criador de vídeo. Reabra quando quiser pelo botão Guia, no topo.',
      botao: 'Fazer o tour', acao: () => window.Guia && Guia.abrir() },
  ];

  const CHAVE = 'blNovidadesVistas';
  const teste = !!(ponte && ponte.teste);
  const ler = (area, k) => { try { return area.getItem(k); } catch (e) { return null; } };
  const gravar = (area, k, v) => { try { area.setItem(k, v); } catch (e) {} };

  // instalação nova: ainda não há nada guardado do app neste computador
  let usouAntes = false;
  try { for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith('bibleStudio')) { usouAntes = true; break; } } catch (e) {}

  const jaViu = teste ? ler(sessionStorage, CHAVE) === VERSAO : ler(localStorage, CHAVE) === VERSAO;
  if (!teste && !usouAntes) gravar(localStorage, CHAVE, VERSAO);
  if (jaViu || (!teste && !usouAntes)) return;
  gravar(teste ? sessionStorage : localStorage, CHAVE, VERSAO);
  window.NOVIDADES_ABERTAS = true;          // o guia não abre sozinho por cima desta janela

  const lista = $('novidadesLista');
  $('novidadesVersao').textContent = 'Versão ' + VERSAO;
  ITENS.forEach(it => {
    const d = document.createElement('div');
    d.className = 'nov-item';
    d.innerHTML = `${icone(it.icone)}<div><b>${esc(it.titulo)}</b><span>${esc(it.texto)}</span></div>
      <button class="btn pequeno">${esc(it.botao)}</button>`;
    d.querySelector('button').onclick = () => { fechar(); setTimeout(it.acao, 150); };
    lista.appendChild(d);
  });
  const fechar = () => $('modalNovidades').classList.remove('on');
  $('novidadesOk').onclick = fechar;
  setTimeout(() => abrir('modalNovidades'), 500);
})();
